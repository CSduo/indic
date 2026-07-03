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
  destination: (_req: any, _file: any, cb: any) => cb(null, UPLOADS_DIR),
  filename: (_req: any, file: any, cb: any) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 52 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const manuscriptTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const imageTypes = ["image/jpeg", "image/png", "image/webp"];

    if (file.fieldname === "coverImage") {
      // Cover images: only allow image MIME types
      if (imageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("File type not allowed"));
      }
    } else if (file.fieldname === "manuscript") {
      // Manuscripts: allow document + image types
      const allowed = [...manuscriptTypes, ...imageTypes];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("File type not allowed"));
      }
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

// Statuses a user is still allowed to delete or edit — anything not yet
// finalized by editorial review. Once ACCEPTED/PUBLISHED/ARCHIVED, the user
// can no longer delete or edit their own submission.
const USER_DELETABLE_STATUSES = ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "REJECTED"];
const USER_EDITABLE_STATUSES = ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED"];

// POST /api/submissions/write — full essay written in browser
router.post("/submissions/write", async (req, res) => {
  try {
    const auth = await getUserAuth(req);

    const schema = z.object({
      type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]),
      submitterName: z.string().min(1).max(160),
      submitterEmail: z.string().email(),
      title: z.string().min(1).max(500),
      abstract: z.string().max(10000).optional().default(""),
      body: z.string().optional().default(""),
      notes: z.string().max(5000).optional(),
      consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional().transform(v => v === true || v === "true"),
      status: z.enum(["DRAFT", "RECEIVED"]).optional().default("RECEIVED"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const data = parsed.data;
    const isDraft = data.status === "DRAFT";

    // Only signed-in users may save drafts — drafts must be resumable/owned.
    if (isDraft && !auth) return res.status(401).json({ error: "Sign in to save a draft" });

    // Full submissions still require the declaration + minimum content.
    if (!isDraft) {
      if (!data.consent) return res.status(400).json({ error: "Consent is required" });
      if (!data.abstract.trim()) return res.status(400).json({ error: "Abstract is required" });
      if (!data.body.trim() || data.body.length < 1) return res.status(400).json({ error: "Essay body is required" });
    }

    const [submission] = await db.insert(submissionsTable).values({
      userId: auth?.userId || null,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      type: data.type,
      title: data.title,
      abstract: data.abstract || "",
      body: data.body || "",
      notes: data.notes || null,
      consent: !isDraft,
      status: isDraft ? "DRAFT" : "RECEIVED",
    }).returning();

    return res.status(201).json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Write submission failed" });
  }
});

// GET /api/submissions (user's own — includes drafts, never shown to admin)
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

// GET /api/submissions/:id (single submission by ID)
router.get("/submissions/:id", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [submission] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id))
      .limit(1);

    if (!submission) return res.status(404).json({ error: "Submission not found" });

    // Only the owning user (or an admin via separate admin routes) can view
    if (submission.userId !== auth.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// PUT /api/submissions/:id — owner updates a draft, or submits a saved draft for review
router.put("/submissions/:id", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId) return res.status(403).json({ error: "Forbidden" });
    if (!USER_EDITABLE_STATUSES.includes(existing.status)) {
      return res.status(403).json({ error: "This submission can no longer be edited" });
    }

    const schema = z.object({
      type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]).optional(),
      submitterName: z.string().min(1).max(160).optional(),
      submitterEmail: z.string().email().optional(),
      title: z.string().min(1).max(500).optional(),
      abstract: z.string().max(10000).optional(),
      body: z.string().optional(),
      notes: z.string().max(5000).optional(),
      consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
      status: z.enum(["DRAFT", "RECEIVED"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    const data = parsed.data;

    const wantsSubmit = data.status === "RECEIVED";
    if (wantsSubmit) {
      const consent = data.consent === true || data.consent === "true";
      const abstract = data.abstract ?? existing.abstract ?? "";
      const body = data.body ?? existing.body ?? "";
      if (!consent) return res.status(400).json({ error: "Consent is required" });
      if (!abstract.trim()) return res.status(400).json({ error: "Abstract is required" });
      if (!body.trim()) return res.status(400).json({ error: "Essay body is required" });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.type !== undefined) updates.type = data.type;
    if (data.submitterName !== undefined) updates.submitterName = data.submitterName;
    if (data.submitterEmail !== undefined) updates.submitterEmail = data.submitterEmail;
    if (data.title !== undefined) updates.title = data.title;
    if (data.abstract !== undefined) updates.abstract = data.abstract;
    if (data.body !== undefined) updates.body = data.body;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (wantsSubmit) {
      updates.status = "RECEIVED";
      updates.consent = true;
    } else if (data.status === "DRAFT") {
      updates.status = "DRAFT";
    }

    const [submission] = await db.update(submissionsTable)
      .set(updates)
      .where(eq(submissionsTable.id, req.params.id))
      .returning();

    return res.json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update submission" });
  }
});

// DELETE /api/submissions/:id — owner can delete their own submission/draft
// as long as it has not yet been accepted/published by an admin.
router.delete("/submissions/:id", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId) return res.status(403).json({ error: "Forbidden" });
    if (!USER_DELETABLE_STATUSES.includes(existing.status)) {
      return res.status(403).json({ error: "This submission has already been approved and can no longer be deleted" });
    }

    await db.delete(submissionsTable).where(eq(submissionsTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete submission" });
  }
});

export { UPLOADS_DIR };
export default router;
