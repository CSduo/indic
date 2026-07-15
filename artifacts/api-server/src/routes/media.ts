import { Router } from "express";
import { db, mediaAssetsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "./submissions";
import { v2 as cloudinary } from "cloudinary";
import { getUserAuth } from "../lib/auth";
import { sanitizeArticleBody } from "../lib/content";
import { hasExpectedFileSignature } from "../lib/file-validation";
import { put } from "@vercel/blob";
// @ts-ignore — mammoth has no bundled types but works fine
import mammoth from "mammoth";

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/m4a",
  "audio/x-m4a"
]);
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".webm",
  ".ogg",
  ".wav",
  ".mp3",
  ".mpeg",
  ".m4a"
]);

// Always store in memory so we can stream to Cloudinary without touching the filesystem
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max (audios can be slightly larger)
  fileFilter: (_req: any, file: any, cb: any): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error("Unsupported file type. Only JPEG, PNG, WEBP, GIF images, and WebM, MP3, OGG, WAV, M4A audio files are allowed."));
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
      (ext === ".docx" && file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
      (ext === ".txt" && ["text/plain", "application/octet-stream"].includes(file.mimetype));
    if (!allowed) {
      cb(new Error("Only DOCX or plain-text files are accepted."));
      return;
    }
    cb(null, true);
  },
});

router.post("/media/upload", async (req: any, res: any, next: any): Promise<void> => {
  const auth = await getUserAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}, (req: any, res: any, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
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
    const context = req.body.context || "avatar";
    const isAudio = file.mimetype.startsWith("audio/") || [".webm", ".mp3", ".ogg", ".wav", ".m4a"].includes(path.extname(file.originalname).toLowerCase());

    const extension = path.extname(file.originalname).toLowerCase();
    let url: string;
    let storageKey: string;

    // 1. Upload to Vercel Blob if configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const filename = `${context}-${crypto.randomUUID()}${extension}`;
      const blob = await put(`anvikshiki/${filename}`, file.buffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      url = blob.url;
      storageKey = blob.url;
    }
    // 2. Upload to Cloudinary if configured
    else if (process.env.CLOUDINARY_URL) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadOptions: any = {
          folder: `anvikshiki/${context}`,
          resource_type: isAudio ? "video" : "image",
        };
        
        if (!isAudio) {
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

      url = uploadResult.secure_url;
      storageKey = uploadResult.public_id;
    }
    // 3. Fallback to local disk sandbox ONLY in development/local test environment
    else if (process.env.NODE_ENV === "development" || process.env.VITEST) {
      const filename = `${context}-${crypto.randomUUID()}${extension}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      await fs.promises.writeFile(filePath, file.buffer);
      const apiBase = process.env.API_BASE_URL || "";
      url = `${apiBase}/api/uploads/${filename}`;
      storageKey = filename;
    }
    else {
      return res.status(503).json({
        error: "Storage is not configured. Please set BLOB_READ_WRITE_TOKEN or CLOUDINARY_URL.",
        code: "STORAGE_NOT_CONFIGURED",
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
    return res.status(500).json({ error: "Media upload failed", detail: err?.message });
  }
});

// ── Extract document content (DOCX / TXT) → HTML ──
router.post("/media/extract-doc",
  async (req: any, res: any, next: any): Promise<void> => {
    const auth = await getUserAuth(req);
    if (!auth) { res.status(401).json({ error: "Unauthorized" }); return; }
    next();
  },
  (req: any, res: any, next: any) => {
    docUpload.single("file")(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });
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
          .map((p: string) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
          .join("");
        return res.json({ html: sanitizeArticleBody(html) });
      }

      if (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) {
        return res.status(400).json({ error: "The uploaded file is not a valid DOCX document" });
      }

      // DOCX — use mammoth to convert to HTML
      // If Cloudinary is configured, embedded images are uploaded and returned as <img> tags
      const imageImportErrors: unknown[] = [];
      const imageHandler = async (image: any) => {
        try {
          const buffer: Buffer = await image.readAsBuffer();
          const contentType = image.contentType; // e.g. "image/png" or "image/jpeg"
          const ext = contentType.split("/")[1] || "png";

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

          // 3. Fallback to local disk sandbox ONLY in development/local test environment
          if (process.env.NODE_ENV === "development" || process.env.VITEST) {
            const filename = `doc-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const filePath = path.join(UPLOADS_DIR, filename);
            await fs.promises.writeFile(filePath, buffer);
            const apiBase = process.env.API_BASE_URL || "http://localhost:3001";
            const baseClean = apiBase.replace(/\/$/, "");
            return { src: `${baseClean}/api/uploads/${filename}` };
          }

          throw new Error("No persistent storage configured for document images");
        } catch (err) {
          imageImportErrors.push(err);
          throw err;
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
