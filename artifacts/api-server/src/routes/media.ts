import { Router } from "express";
import { db, mediaAssetsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "./submissions";
import { getUserAuth } from "../lib/auth";

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, UPLOADS_DIR),
  filename: (_req: any, file: any, cb: any) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

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
    const apiBase = process.env.API_BASE_URL || "";
    const filename = path.basename(file.path);
    const url = `${apiBase}/api/uploads/${filename}`;
    const extension = path.extname(file.originalname).toLowerCase();

    const [asset] = await db.insert(mediaAssetsTable).values({
      url,
      storageKey: filename,
      mimeType: file.mimetype,
      extension,
      sizeBytes: file.size,
      context: req.body.context || "submission_cover",
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
