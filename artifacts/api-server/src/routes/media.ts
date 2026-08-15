import { Router } from "express";
import { db, mediaAssetsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import { getAdminAuth, getUserAuth } from "../lib/auth";
import { sanitizeArticleBody } from "../lib/content";
import { hasExpectedFileSignature } from "../lib/file-validation";
import { persistUploadedFile } from "../lib/storage";
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

/** A .docx is a zip archive: "PK\x03\x04". */
function startsWithZipSignature(buffer: Buffer): boolean {
  return buffer.length >= 4
    && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

/** A legacy .doc is an OLE2 compound file. */
function startsWithLegacyDocSignature(buffer: Buffer): boolean {
  const magic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return buffer.length >= 8 && magic.every((b, i) => buffer[i] === b);
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
    // Accept on extension alone and let the handler judge the actual bytes.
    // Browsers and operating systems disagree about the MIME type of a .docx —
    // Chrome on one machine sends the wordprocessingml type, another sends
    // application/zip, a file dragged from some clients sends nothing at all.
    // Requiring the header to match rejected perfectly good documents before
    // anything had looked inside them, reported as a bare "extraction failed".
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".docx" && ext !== ".txt" && ext !== ".doc") {
      cb(new Error("Import a .docx or .txt file. If your document is a PDF or a Word 97-2003 .doc, re-export it as .docx first."));
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

    const filename = `${context}-${crypto.randomUUID()}${extension}`;

    let stored;
    try {
      stored = await persistUploadedFile({
        buffer: file.buffer,
        filename,
        mimeType: file.mimetype,
        folder: context,
      });
    } catch (storageErr: any) {
      return res.status(500).json({
        error: storageErr?.message || "Failed to store uploaded file across all storage providers.",
        code: "STORAGE_FAILED",
      });
    }

    // The URL is what the article body will reference, so it must be returned
    // even if the bookkeeping row cannot be written. Failing the whole upload
    // because media_assets is unavailable discards a file already stored.
    let asset: any = null;
    try {
      [asset] = await db.insert(mediaAssetsTable).values({
        url: stored.url,
        storageKey: stored.storageKey,
        mimeType: file.mimetype,
        extension,
        sizeBytes: file.size,
        context,
      }).returning();
    } catch (assetErr) {
      req.log?.warn?.({ err: assetErr }, "Stored the upload but could not record the media asset");
    }

    return res.status(201).json({
      success: true,
      url: stored.url,
      storageProvider: stored.provider,
      mediaAsset: asset || { url: stored.url, storageKey: stored.storageKey },
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

      // A .docx is a zip; a .doc is an OLE compound file. Word silently accepts
      // either, so people rename one to the other and cannot understand why the
      // import fails. Detect it from the bytes and say exactly what to do.
      if (ext !== ".txt" && !startsWithZipSignature(file.buffer)) {
        if (startsWithLegacyDocSignature(file.buffer)) {
          return res.status(415).json({
            error: "This is a Word 97-2003 document (.doc), which cannot be read directly. Open it in Word or Google Docs and use \"Save as\" / \"Download as\" to produce a .docx, then import that.",
            code: "LEGACY_DOC_FORMAT",
          });
        }
        if (file.buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
          return res.status(415).json({
            error: "This is a PDF. Import a .docx or .txt file instead, or paste the text directly into the editor.",
            code: "PDF_NOT_SUPPORTED",
          });
        }
        return res.status(415).json({
          error: "This file is not a .docx document. If it came from Word or Google Docs, re-export it as .docx and try again.",
          code: "NOT_A_DOCX",
        });
      }

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

      // The zip check above already established these bytes are a .docx
      // container. Re-checking by file extension here would reject a document
      // that is genuinely a .docx but happens to be named .doc — a rename that
      // Word itself tolerates, so authors do it without realising.

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
          const ext = MIME_TO_EXTENSIONS[contentType][0];
          const filename = `doc-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
          const stored = await persistUploadedFile({
            buffer,
            filename,
            mimeType: contentType,
            folder: "doc_imports",
          });
          return { src: stored.url };
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

      const html = sanitizeArticleBody(result.value || "");

      // Images that could not be stored no longer discard the import. Throwing
      // away a whole manuscript because one picture failed is a far worse
      // outcome than importing the text and saying which images are missing —
      // especially as the author cannot tell from the old message what to fix.
      if (imageImportErrors.length > 0) {
        req.log?.warn(
          { imageErrorCount: imageImportErrors.length, firstError: imageImportErrors[0] },
          "Imported document text, but some embedded images could not be stored",
        );
      }

      if (!html.trim()) {
        return res.status(422).json({
          error: "This document appears to be empty, or its text is stored as images rather than as text. Nothing could be imported.",
          code: "DOCUMENT_EMPTY",
        });
      }

      return res.json({
        html,
        imagesFailed: imageImportErrors.length,
        warning: imageImportErrors.length > 0
          ? `The text was imported, but ${imageImportErrors.length} embedded image${imageImportErrors.length === 1 ? "" : "s"} could not be stored. Add ${imageImportErrors.length === 1 ? "it" : "them"} with "Add Image".`
          : undefined,
      });
    } catch (err: any) {
      req.log?.error({ err }, "Document extraction failed");
      // mammoth's own messages are written for the person holding the file
      // ("Are you sure this is a valid .docx file?"). Replacing them with a
      // blanket "Document extraction failed" left the author with nothing to
      // act on — which is exactly how this was reported.
      const detail = typeof err?.message === "string" && err.message.trim() ? err.message.trim() : "";
      return res.status(422).json({
        error: detail
          ? `The document could not be read: ${detail}`
          : "The document could not be read. Re-export it as a .docx from Word or Google Docs and try again.",
        code: "DOCUMENT_EXTRACTION_FAILED",
      });
    }
  }
);

export default router;
