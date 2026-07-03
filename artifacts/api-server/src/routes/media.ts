import { Router } from "express";
import { db, mediaAssetsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "./submissions";

const router = Router();

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
});

router.post("/media/upload", upload.single("file"), async (req: any, res) => {
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
