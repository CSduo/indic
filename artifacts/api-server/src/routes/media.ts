import { Router } from "express";
import { db, mediaAssetsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "./submissions";
import { v2 as cloudinary } from "cloudinary";
import { getAdminAuth, getUserAuth } from "../lib/auth";
import { sanitizeArticleBody } from "../lib/content";
import { hasExpectedFileSignature } from "../lib/file-validation";
import { put } from "@vercel/blob";
// @ts-ignore — mammoth has no bundled types but works fine
import mammoth from "mammoth";

const router = Router();

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
]);
const PDF_MIME_TYPE = "application/pdf";
const MIME_TO_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "audio/webm": [".webm"],
  "audio/ogg": [".ogg"],
  "audio/wav": [".wav"],
  "audio/mp3": [".mp3"],
  "audio/mpeg": [".mp3", ".mpeg"],
  "audio/mp4": [".m4a"],
  "audio/m4a": [".m4a"],
  "audio/x-m4a": [".m4a"],
  [PDF_MIME_TYPE]: [".pdf"],
};
const ALLOWED_UPLOAD_CONTEXTS = new Set([
  "article_inline",
  "avatar",
  "paper_pdf",
  "submission_cover",
  "voice_note",
]);
const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
  "application/zip",
]);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
const MAX_PDF_BYTES = 50 * 1024 * 1024;

function getUploadContext(value: unknown): string | null {
  const context = typeof value === "string" && value.trim() ? value.trim() : "article_inline";
  return ALLOWED_UPLOAD_CONTEXTS.has(context) ? context : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

async function getMediaUploadAuth(req: any) {
  return await getUserAuth(req) || await getAdminAuth(req);
}

// Always store in memory so we can stream to Cloudinary without touching the filesystem
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  // PDFs have the largest allowed limit; media-specific limits are enforced
  // after multer has parsed the multipart body.
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (_req: any, file: any, cb: any): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    const expectedExtensions = MIME_TO_EXTENSIONS[file.mimetype];
    if (!expectedExtensions?.includes(ext)) {
      cb(new Error("Unsupported file type. Only JPEG, PNG, WEBP, GIF images; WebM, MP3, OGG, WAV, M4A audio; and PDF paper files are allowed."));
      return;
    }
    cb(null, true);
  },
});

// Separate multer instance for document uploads (docx / txt)
const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req: any, file: any, cb: any): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed =
      (ext === ".docx" && DOCX_MIME_TYPES.has(file.mimetype)) ||
      (ext === ".txt" && ["text/plain", "application/octet-stream"].includes(file.mimetype));
    if (!allowed) {
      cb(new Error("Only DOCX or plain-text files are accepted."));
      return;
    }
    cb(null, true);
  },
});

router.post("/media/upload", async (req: any, res: any, next: any): Promise<void> => {
  const auth = await getMediaUploadAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}, (req: any, res: any, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ error: err.message || "Upload failed" });
    }
    next();
  });
}, async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    if (!hasExpectedFileSignature(file)) {
      return res.status(400).json({ error: "Uploaded file content does not match its extension" });
    }
    const extension = path.extname(file.originalname).toLowerCase();
    const context = getUploadContext(req.body?.context);
    if (!context) {
      return res.status(400).json({ error: "Invalid upload context" });
    }

    const isImage = IMAGE_MIME_TYPES.has(file.mimetype);
    const isAudio = AUDIO_MIME_TYPES.has(file.mimetype);
    const isPdf = file.mimetype === PDF_MIME_TYPE;
    const maxSize = isImage ? MAX_IMAGE_BYTES : isAudio ? MAX_AUDIO_BYTES : MAX_PDF_BYTES;
    if (file.size > maxSize) {
      return res.status(413).json({
        error: isImage
          ? "Image files must be 10 MB or smaller"
          : isAudio
            ? "Audio files must be 30 MB or smaller"
            : "PDF files must be 50 MB or smaller",
      });
    }
    if (isPdf && context !== "paper_pdf") {
      return res.status(400).json({ error: "PDF uploads are only supported for paper files" });
    }
    if (context === "paper_pdf" && !isPdf) {
      return res.status(400).json({ error: "Paper uploads must be PDF files" });
    }

    let url: string | null = null;
    let storageKey: string = `${context}-${crypto.randomUUID()}${extension}`;
    const filename = `${context}-${crypto.randomUUID()}${extension}`;

    // 1. Upload to Vercel Blob if configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`anvikshiki/${filename}`, file.buffer, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        if (blob?.url) {
          url = blob.url;
          storageKey = blob.url;
        }
      } catch (blobErr) {
        console.warn("Media Vercel Blob upload failed, trying fallback...", blobErr);
      }
    }

    // 2. Upload to Cloudinary if configured
    if (!url && process.env.CLOUDINARY_URL) {
      try {
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadOptions: any = {
            folder: `anvikshiki/${context}`,
            resource_type: isAudio ? "video" : isPdf ? "raw" : "image",
          };
          
          if (isImage) {
            uploadOptions.transformation = context === "avatar"
              ? [{ width: 400, height: 400, crop: "fill", gravity: "face" }]
              : [{ width: 1200, crop: "limit" }];
          }

          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });

        if (uploadResult?.secure_url && uploadResult?.public_id) {
          url = uploadResult.secure_url;
          storageKey = uploadResult.public_id;
        }
      } catch (cloudErr) {
        console.warn("Media Cloudinary upload failed, trying fallback...", cloudErr);
      }
    }

    // 3. Fallback to local disk / serverless temp disk (/tmp/anvikshiki-uploads)
    if (!url) {
      try {
        const filePath = path.join(UPLOADS_DIR, filename);
        await fs.promises.writeFile(filePath, file.buffer);
        const apiBase = process.env.API_BASE_URL || "";
        url = `${apiBase}/api/uploads/${filename}`;
        storageKey = filename;
      } catch (diskErr) {
        console.warn("Media disk write failed, trying Base64 fallback...", diskErr);
      }
    }

    // 4. In-memory Base64 Data URI fallback for images up to 5MB
    if (!url && isImage && file.size <= 5 * 1024 * 1024) {
      url = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      storageKey = `inline-${filename}`;
    }

    if (!url) {
      return res.status(500).json({
        error: "Failed to store uploaded file across all storage providers.",
        code: "STORAGE_FAILED",
      });
    }

    const [asset] = await db.insert(mediaAssetsTable).values({
      url,
      storageKey,
      mimeType: file.mimetype,
      extension,
      sizeBytes: file.size,
      context,
    }).returning();

    return res.status(201).json({
      success: true,
      url,
      mediaAsset: asset,
    });
  } catch (err: any) {
    req.log?.error(err);
    return res.status(500).json({ error: "Media upload failed" });
  }
});

// ── Extract document content (DOCX / TXT) → HTML ──
router.post("/media/extract-doc",
  async (req: any, res: any, next: any): Promise<void> => {
    const auth = await getMediaUploadAuth(req);
    if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
    next();
  },
  (req: any, res: any, next: any) => {
    docUpload.single("file")(req, res, (err: any) => {
      if (err) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  },
  async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const file = req.file;
      const ext = path.extname(file.originalname).toLowerCase();

      if (ext === ".txt") {
        if (file.buffer.includes(0)) {
          return res.status(400).json({ error: "The text file contains binary data" });
        }
        const text: string = file.buffer.toString("utf-8");
        const html = text
          .split(/\n{2,}/)
          .filter((p: string) => p.trim())
          .map((p: string) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
          .join("");
        return res.json({ html: sanitizeArticleBody(html) });
      }

      if (!hasExpectedFileSignature(file)) {
        return res.status(400).json({ error: "The uploaded file is not a valid DOCX document" });
      }

      // DOCX — use mammoth to convert to HTML
      // If Cloudinary is configured, embedded images are uploaded and returned as <img> tags
      const imageImportErrors: unknown[] = [];
      const imageHandler = async (image: any) => {
        try {
          const buffer: Buffer = await image.readAsBuffer();
          const contentType = String(image.contentType || "").toLowerCase();
          if (!IMAGE_MIME_TYPES.has(contentType)) {
            throw new Error("The document contains an unsupported embedded image type");
          }
          if (buffer.length > MAX_IMAGE_BYTES) {
            throw new Error("An embedded document image exceeds the 10 MB image limit");
          }
          const ext = MIME_TO_EXTENSIONS[contentType][0].slice(1);

          // 1. If Vercel Blob configured
          if (process.env.BLOB_READ_WRITE_TOKEN) {
            const filename = `doc-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const blob = await put(`anvikshiki/doc_imports/${filename}`, buffer, {
              access: "public",
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            return { src: blob.url };
          }

          // 2. If Cloudinary configured
          if (process.env.CLOUDINARY_URL) {
            const uploadResult = await new Promise<any>((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: "anvikshiki/doc_imports", resource_type: "image" },
                (err: any, result: any) => (err ? reject(err) : resolve(result))
              );
              stream.end(buffer);
            });
            if (!uploadResult?.secure_url) {
              throw new Error("Cloudinary did not return a secure image URL");
            }
            return { src: uploadResult.secure_url };
          }

          // 3. Fallback to local / serverless temp disk (/tmp/anvikshiki-uploads)
          try {
            const filename = `doc-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const filePath = path.join(UPLOADS_DIR, filename);
            await fs.promises.writeFile(filePath, buffer);
            const apiBase = process.env.API_BASE_URL || "";
            return { src: `${apiBase}/api/uploads/${filename}` };
          } catch (diskErr) {
            console.warn("Doc image disk save failed, using Data URI fallback...", diskErr);
          }

          // 4. Fallback to inline Base64 data URI
          return { src: `data:${contentType};base64,${buffer.toString("base64")}` };
        } catch (err) {
          // If individual image error occurs, fall back to inline base64 if possible
          try {
            const buffer: Buffer = await image.readAsBuffer();
            const contentType = String(image.contentType || "image/jpeg").toLowerCase();
            return { src: `data:${contentType};base64,${buffer.toString("base64")}` };
          } catch {
            imageImportErrors.push(err);
            throw err;
          }
        }
      };

      const result = await mammoth.convertToHtml(
        { buffer: file.buffer },
        { convertImage: mammoth.images.imgElement(imageHandler) }
      );

      if (imageImportErrors.length > 0) {
        req.log?.error(
          { imageErrorCount: imageImportErrors.length, firstError: imageImportErrors[0] },
          "Document import failed while persisting embedded images",
        );
        return res.status(502).json({
          error: "The document text was read, but one or more embedded images could not be stored. Nothing was imported; please retry.",
          code: "DOCUMENT_IMAGE_UPLOAD_FAILED",
        });
      }

      return res.json({ html: sanitizeArticleBody(result.value || "") });
    } catch (err: any) {
      req.log?.error(err);
      return res.status(500).json({ error: "Document extraction failed" });
    }
  }
);

export default router;
