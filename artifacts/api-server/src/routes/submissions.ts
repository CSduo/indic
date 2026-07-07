import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, articlesTable, papersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import {
  ensurePublicPublicationForSubmission,
  normalizeCategorySlug,
} from "../lib/publication-sync";
import { z } from "zod";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

import { sendSubmissionNotification } from "../lib/notifier";

const router = Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR || "/tmp/anvikshiki-uploads";
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.memoryStorage();

async function saveFile(file: any, subFolder: string): Promise<string> {
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${subFolder}-${safeName}`;

  // Persist to local disk, served statically from /api/uploads.
  // Note: on ephemeral hosting this directory is not guaranteed to survive
  // redeploys — swap in Replit Object Storage (see object-storage skill)
  // if long-term durability across deploys becomes a requirement.
  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(filePath, file.buffer);
  const apiBase = process.env.API_BASE_URL || "";
  return `${apiBase}/api/uploads/${filename}`;
}


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
  domain: z.string().max(160).optional(),
  abstract: z.string().min(1).max(5000),
  notes: z.string().max(2000).optional(),
  consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform(v => v === true || v === "true"),
  audioUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  audioPublicId: z.string().optional().or(z.literal("")).or(z.null()),
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
      domain: data.domain ? normalizeCategorySlug(data.domain) : null,
      abstract: data.abstract,
      notes: data.notes,
      audioUrl: data.audioUrl || null,
      audioPublicId: data.audioPublicId || null,
      consent: true,
    }).returning();

    const publication = await ensurePublicPublicationForSubmission(submission);
    
    // Trigger SMS/WhatsApp/Telegram notification asynchronously
    sendSubmissionNotification(submission).catch((err) => {
      req.log.error(err, "Failed to send submission notification");
    });

    return res.status(201).json({ success: true, submission, publication });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/uploads/cloudinary-signature — request upload signature for direct browser uploads
router.post("/uploads/cloudinary-signature", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!process.env.CLOUDINARY_URL) {
      return res.status(500).json({
        error: "Cloudinary storage is not configured",
        code: "CLOUDINARY_NOT_CONFIGURED"
      });
    }

    const config = cloudinary.config();
    const cloudName = config.cloud_name;
    const apiKey = config.api_key;
    const apiSecret = config.api_secret;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: "Cloudinary configuration is invalid",
        code: "CLOUDINARY_CONFIG_INVALID"
      });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = (req.body.folder || "submissions").trim();

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      apiSecret
    );

    return res.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to generate signature" });
  }
});

// POST /api/submissions/upload — handles metadata and Cloudinary URLs (JSON) or local file upload fallback (multipart)
router.post(
  "/submissions/upload",
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      upload.fields([
        { name: "manuscript", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
        { name: "audio", maxCount: 1 },
      ])(req, res, next);
      return;
    }
    next();
  },
  async (req: any, res) => {
    try {
      const submitterName = (req.body.submitterName || "").trim();
      const submitterEmail = (req.body.submitterEmail || "").trim();
      const title = (req.body.title || "").trim();
      const domain = req.body.domain ? normalizeCategorySlug(String(req.body.domain)) : null;
      const abstract = (req.body.abstract || "Submitted via upload form").trim();
      const typeRaw = (req.body.type || "ESSAY").toUpperCase();
      const validTypes = ["ESSAY", "PAPER", "REVIEW", "COMMENTARY"];
      const type = validTypes.includes(typeRaw) ? typeRaw as "ESSAY" | "PAPER" | "REVIEW" | "COMMENTARY" : "ESSAY";

      if (!submitterName || !submitterEmail || !title) {
        return res.status(400).json({ error: "Missing required fields: submitterName, submitterEmail, title" });
      }

      let manuscriptUrl = req.body.manuscriptUrl || null;
      let manuscriptPublicId = req.body.manuscriptPublicId || null;
      let manuscriptResourceType = req.body.manuscriptResourceType || null;

      let coverImageUrl = req.body.coverUrl || req.body.coverImageUrl || null;
      let coverImagePublicId = req.body.coverPublicId || req.body.coverImagePublicId || null;
      let coverImageResourceType = req.body.coverResourceType || req.body.coverImageResourceType || null;

      let audioUrl = req.body.audioUrl || null;
      let audioPublicId = req.body.audioPublicId || null;

      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("multipart/form-data")) {
        const manuscriptFile = req.files?.["manuscript"]?.[0];
        const coverFile = req.files?.["coverImage"]?.[0];
        const audioFile = req.files?.["audio"]?.[0];

        try {
          if (manuscriptFile) {
            manuscriptUrl = await saveFile(manuscriptFile, "manuscripts");
          }
          if (coverFile) {
            coverImageUrl = await saveFile(coverFile, "covers");
          }
          if (audioFile) {
            audioUrl = await saveFile(audioFile, "voice-notes");
          }
        } catch (err: any) {
          if (err?.message === "BLOB_STORAGE_MISSING") {
            return res.status(500).json({
              error: "Upload storage is not configured. Please configure BLOB_READ_WRITE_TOKEN in your environment variables.",
              code: "BLOB_STORAGE_MISSING"
            });
          }
          throw err;
        }
      }

      const noteLines = [
        manuscriptUrl ? `Manuscript URL: ${manuscriptUrl}` : null,
        coverImageUrl ? `Cover URL: ${coverImageUrl}` : null,
        audioUrl ? `Audio URL: ${audioUrl}` : null,
        domain ? `Domain: ${domain}` : null,
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
        domain,
        abstract,
        notes: noteLines || null,
        consent: true,
        manuscriptUrl,
        manuscriptPublicId,
        manuscriptResourceType,
        coverImageUrl,
        coverImagePublicId,
        coverImageResourceType,
        audioUrl,
        audioPublicId,
      }).returning();

      const publication = await ensurePublicPublicationForSubmission(submission);

      // Trigger notifications asynchronously
      sendSubmissionNotification(submission).catch((err) => {
        req.log.error(err, "Failed to send upload submission notification");
      });

      return res.status(201).json({
        success: true,
        submission,
        publication,
        files: {
          manuscriptUrl,
          coverUrl: coverImageUrl,
          audioUrl,
        },
      });
    } catch (err: any) {
      req.log.error(err);
      return res.status(500).json({ error: "Upload failed", detail: err?.message });
    }
  }
);

// Users can soft-delete any of their own submissions at any time; the article soft-delete
// is handled separately and the admin panel still sees the submissions (just marked deleted).
const USER_DELETABLE_STATUSES = ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "REJECTED", "ACCEPTED", "PUBLISHED", "ARCHIVED"];
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
      domain: z.string().max(160).optional(),
      abstract: z.string().max(10000).optional().default(""),
      body: z.string().optional().default(""),
      notes: z.string().max(5000).optional(),
      consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional().transform(v => v === true || v === "true"),
      status: z.enum(["DRAFT", "RECEIVED"]).optional().default("RECEIVED"),
      audioUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
      audioPublicId: z.string().optional().or(z.literal("")).or(z.null()),
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
      domain: data.domain ? normalizeCategorySlug(data.domain) : null,
      abstract: data.abstract || "",
      body: data.body || "",
      notes: data.notes || null,
      consent: !isDraft,
      status: isDraft ? "DRAFT" : "RECEIVED",
      audioUrl: data.audioUrl || null,
      audioPublicId: data.audioPublicId || null,
    }).returning();

    const publication = isDraft
      ? null
      : await ensurePublicPublicationForSubmission(submission);

    if (!isDraft) {
      sendSubmissionNotification(submission).catch((err) => {
        req.log.error(err, "Failed to send write submission notification");
      });
    }

    return res.status(201).json({ success: true, submission, publication });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Write submission failed" });
  }
});

// GET /api/submissions (user's own — includes drafts, never shown to admin)
// ?deleted=true returns only soft-deleted submissions; otherwise excludes them
router.get("/submissions", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const showDeleted = req.query.deleted === "true";
    const conditions = [
      eq(submissionsTable.userId, auth.userId),
      eq(submissionsTable.deleted, showDeleted),
    ];

    const submissions = await db.select().from(submissionsTable)
      .where(and(...conditions))
      .orderBy(submissionsTable.createdAt);

    // For PUBLISHED submissions, join to find the article slug so the author can edit
    const publishedIds = submissions
      .filter(s => s.status === "PUBLISHED")
      .map(s => s.id);

    let slugMap: Record<string, string> = {};
    if (publishedIds.length > 0) {
      const { inArray: inArr } = await import("drizzle-orm");
      const articles = await db.select({
        submissionId: articlesTable.submissionId,
        slug: articlesTable.slug,
      }).from(articlesTable)
        .where(inArr(articlesTable.submissionId, publishedIds));
      for (const a of articles) {
        if (a.submissionId) slugMap[a.submissionId] = a.slug;
      }
    }

    const enriched = submissions.map(s => ({
      ...s,
      slug: slugMap[s.id] || null,
    }));

    return res.json({ submissions: enriched });
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
      domain: z.string().max(160).optional(),
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
    if (data.domain !== undefined) updates.domain = data.domain ? normalizeCategorySlug(data.domain) : null;
    if (data.abstract !== undefined) updates.abstract = data.abstract;
    if (data.body !== undefined) updates.body = data.body;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.domain !== undefined) updates.domain = data.domain;
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

    const publication = wantsSubmit
      ? await ensurePublicPublicationForSubmission(submission)
      : null;
    return res.json({ success: true, submission, publication });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update submission" });
  }
});

// DELETE /api/submissions/:id — owner soft-deletes their own submission/draft
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

    const now = new Date();
    // Soft-delete the submission
    await db.update(submissionsTable)
      .set({ deleted: true, deletedAt: now, updatedAt: now })
      .where(eq(submissionsTable.id, req.params.id));

    // Also soft-delete any linked article or paper (by submissionId or title match fallback)
    try {
      await db.update(articlesTable)
        .set({ deleted: true, deletedAt: now, updatedAt: now })
        .where(eq(articlesTable.submissionId, existing.id));

      await db.update(papersTable)
        .set({ deleted: true, deletedAt: now, updatedAt: now })
        .where(eq(papersTable.submissionId, existing.id));

      if (existing.title) {
        await db.update(articlesTable)
          .set({ deleted: true, deletedAt: now, updatedAt: now })
          .where(and(eq(articlesTable.title, existing.title), eq(articlesTable.deleted, false)));

        await db.update(papersTable)
          .set({ deleted: true, deletedAt: now, updatedAt: now })
          .where(and(eq(papersTable.title, existing.title), eq(papersTable.deleted, false)));
      }
    } catch {
      // Non-fatal: public document soft-delete is best-effort
    }

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete submission" });
  }
});

// POST /api/submissions/:id/restore — restore a soft-deleted submission
router.post("/submissions/:id/restore", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId) return res.status(403).json({ error: "Forbidden" });
    if (!existing.deleted) return res.status(400).json({ error: "Submission is not deleted" });

    const now = new Date();
    const [restored] = await db.update(submissionsTable)
      .set({ deleted: false, deletedAt: null, updatedAt: now })
      .where(eq(submissionsTable.id, req.params.id))
      .returning();

    // Also restore any linked article or paper
    try {
      await db.update(articlesTable)
        .set({ deleted: false, deletedAt: null, updatedAt: now })
        .where(eq(articlesTable.submissionId, existing.id));

      await db.update(papersTable)
        .set({ deleted: false, deletedAt: null, updatedAt: now })
        .where(eq(papersTable.submissionId, existing.id));
    } catch {
      // best effort
    }

    return res.json({ success: true, submission: restored });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to restore submission" });
  }
});

// DELETE /api/submissions/:id/permanent — permanently destroy a soft-deleted submission
router.delete("/submissions/:id/permanent", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId) return res.status(403).json({ error: "Forbidden" });
    if (!existing.deleted) return res.status(400).json({ error: "Move submission to trash first before permanently deleting" });

    // Hard-delete any linked article or paper first
    try {
      await db.delete(articlesTable).where(eq(articlesTable.submissionId, existing.id));
      await db.delete(papersTable).where(eq(papersTable.submissionId, existing.id));
    } catch {
      // best effort
    }

    await db.delete(submissionsTable).where(eq(submissionsTable.id, req.params.id));

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to permanently delete submission" });
  }
});

export { UPLOADS_DIR };
export default router;
