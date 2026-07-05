import { Router } from "express";
import { db, mediaAssetsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { getUserAuth } from "../lib/auth";

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

// Always store in memory so we can stream to Cloudinary without touching the filesystem
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req: any, file: any, cb: any): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error("Unsupported file type. Only JPEG, PNG, WEBP, and GIF images are allowed."));
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
    const context = req.body.context || "avatar";
    let url: string;
    let storageKey: string;

    // Upload to Cloudinary if configured, otherwise fall back to local disk
    if (process.env.CLOUDINARY_URL) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `anvikshiki/${context}`,
            resource_type: "image",
            transformation: context === "avatar"
              ? [{ width: 400, height: 400, crop: "fill", gravity: "face" }]
              : [{ width: 1200, crop: "limit" }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      url = uploadResult.secure_url;
      storageKey = uploadResult.public_id;
    } else {
      // Fallback: return a data URL (dev only — no persistent storage without Cloudinary)
      return res.status(503).json({
        error: "Image storage is not configured. Please set CLOUDINARY_URL.",
        code: "STORAGE_NOT_CONFIGURED",
      });
    }

    const extension = path.extname(file.originalname).toLowerCase();
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

export default router;
