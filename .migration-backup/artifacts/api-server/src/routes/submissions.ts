import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR || "/tmp/anvikshiki-uploads";
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 52 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype) || file.fieldname === "coverImage") {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

const submissionSchema = z.object({
  type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]),
  submitterName: z.string().min(1).max(160),
  submitterEmail: z.string().email(),
  title: z.string().min(1).max(500),
  abstract: z.string().min(1).max(5000),
  notes: z.string().max(2000).optional(),
  consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform(v => v === true || v === "true"),
});

// POST /api/submissions (JSON body)
router.post("/submissions", async (req, res) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const auth = await getUserAuth(req);
    const data = parsed.data;

    if (!data.consent) return res.status(400).json({ error: "Consent is required" });

    const [submission] = await db.insert(submissionsTable).values({
      userId: auth?.userId || null,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      type: data.type,
      title: data.title,
      abstract: data.abstract,
      notes: data.notes,
      consent: true,
    }).returning();

    return res.status(201).json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/submissions/upload — multipart form with optional file
router.post(
  "/submissions/upload",
  upload.fields([
    { name: "manuscript", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  async (req: any, res) => {
    try {
      const submitterName = (req.body.submitterName || "").trim();
      const submitterEmail = (req.body.submitterEmail || "").trim();
      const title = (req.body.title || "").trim();
      const abstract = (req.body.abstract || "Submitted via upload form").trim();
      const typeRaw = (req.body.type || "ESSAY").toUpperCase();
      const validTypes = ["ESSAY", "PAPER", "REVIEW", "COMMENTARY"];
      const type = validTypes.includes(typeRaw) ? typeRaw as "ESSAY" | "PAPER" | "REVIEW" | "COMMENTARY" : "ESSAY";

      if (!submitterName || !submitterEmail || !title) {
        return res.status(400).json({ error: "Missing required fields: submitterName, submitterEmail, title" });
      }

      const manuscriptFile = req.files?.["manuscript"]?.[0];
      const coverFile = req.files?.["coverImage"]?.[0];

      const apiBase = process.env.API_BASE_URL || "";
      const manuscriptUrl = manuscriptFile
        ? `${apiBase}/api/uploads/${path.basename(manuscriptFile.path)}`
        : null;
      const coverUrl = coverFile
        ? `${apiBase}/api/uploads/${path.basename(coverFile.path)}`
        : null;

      const noteLines = [
        manuscriptFile ? `Manuscript: ${manuscriptFile.originalname} (${(manuscriptFile.size / 1024).toFixed(1)} KB)` : null,
        manuscriptUrl ? `Manuscript URL: ${manuscriptUrl}` : null,
        coverFile ? `Cover Image: ${coverFile.originalname}` : null,
        coverUrl ? `Cover URL: ${coverUrl}` : null,
        req.body.domain ? `Domain: ${req.body.domain}` : null,
        req.body.keywords ? `Keywords: ${req.body.keywords}` : null,
        req.body.notes ? `Notes: ${req.body.notes}` : null,
      ].filter(Boolean).join("\n");

      const auth = await getUserAuth(req);

      const [submission] = await db.insert(submissionsTable).values({
        userId: auth?.userId || null,
        submitterName,
        submitterEmail,
        type,
        title,
        abstract,
        notes: noteLines || null,
        consent: true,
      }).returning();

      return res.status(201).json({
        success: true,
        submission,
        files: {
          manuscriptUrl,
          coverUrl,
        },
      });
    } catch (err: any) {
      req.log.error(err);
      return res.status(500).json({ error: "Upload failed", detail: err?.message });
    }
  }
);

// POST /api/submissions/write — full essay written in browser
router.post("/submissions/write", async (req, res) => {
  try {
    const schema = z.object({
      type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]),
      submitterName: z.string().min(1).max(160),
      submitterEmail: z.string().email(),
      title: z.string().min(1).max(500),
      abstract: z.string().min(1).max(10000),
      body: z.string().min(1),
      notes: z.string().max(5000).optional(),
      consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform(v => v === true || v === "true"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const auth = await getUserAuth(req);
    const data = parsed.data;
    if (!data.consent) return res.status(400).json({ error: "Consent is required" });

    const [submission] = await db.insert(submissionsTable).values({
      userId: auth?.userId || null,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      type: data.type,
      title: data.title,
      abstract: data.abstract,
      body: data.body,
      notes: data.notes || null,
      consent: true,
    }).returning();

    return res.status(201).json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Write submission failed" });
  }
});

// GET /api/submissions (user's own)
router.get("/submissions", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const submissions = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.userId, auth.userId))
      .orderBy(submissionsTable.createdAt);

    return res.json({ submissions });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export { UPLOADS_DIR };
export default router;
