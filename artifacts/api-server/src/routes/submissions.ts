import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, articlesTable, papersTable } from "@workspace/db";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import {
  normalizeCategorySlug,
  slugify,
} from "../lib/publication-sync";
import { z } from "zod";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";
import { countUnresolvedArticleImages, sanitizeArticleBody } from "../lib/content";
import { hasExpectedFileSignature } from "../lib/file-validation";
import { put } from "@vercel/blob";

import { sendSubmissionNotification } from "../lib/notifier";

const router = Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR || "/tmp/anvikshiki-uploads";
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.memoryStorage();
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024;

async function saveFile(file: any, subFolder: string): Promise<string> {
  if (!hasExpectedFileSignature(file)) {
    throw new Error("Uploaded file content does not match its extension");
  }
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${subFolder}-${crypto.randomUUID()}${extension}`;

  // 1. If Vercel Blob is configured (highest priority)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`anvikshiki/${filename}`, file.buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // 2. If Cloudinary is configured
  if (process.env.CLOUDINARY_URL) {
    const isAudio = file.mimetype.startsWith("audio/") || [".webm", ".mp3", ".ogg", ".wav", ".m4a"].includes(extension);
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `anvikshiki/${subFolder}`,
          resource_type: isAudio ? "video" : "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });
    if (!uploadResult?.secure_url) {
      throw new Error("STORAGE_UPLOAD_FAILED");
    }
    return uploadResult.secure_url;
  }

  // 3. Fallback to local disk ONLY in development/local test environment
  if (process.env.NODE_ENV === "development" || process.env.VITEST) {
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.promises.writeFile(filePath, file.buffer);
    const apiBase = process.env.API_BASE_URL || "";
    return `${apiBase}/api/uploads/${filename}`;
  }

  // Error out if running in production without cloud storage configured
  throw new Error("BLOB_STORAGE_MISSING");
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
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const audioTypes = ["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"];

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
    } else if (file.fieldname === "audio") {
      if (audioTypes.includes(file.mimetype)) {
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
  submitterName: z.string().trim().min(1).max(160),
  submitterEmail: z.string().trim().toLowerCase().email(),
  title: z.string().trim().min(1).max(500),
  domain: z.string().trim().max(160).optional(),
  abstract: z.string().trim().min(1).max(5000),
  notes: z.string().trim().max(2000).optional(),
  consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform(v => v === true || v === "true"),
  audioUrl: z.string().optional().or(z.literal("")).or(z.null()),
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

    // Trigger SMS/WhatsApp/Telegram notification asynchronously
    sendSubmissionNotification(submission).catch((err) => {
      req.log.error(err, "Failed to send submission notification");
    });

    return res.status(201).json({ success: true, submission, publication: null });
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
    const folder = `anvikshiki/submissions/${auth.userId}`;

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
      const uploadSchema = z.object({
        submitterName: z.string().trim().min(1).max(160),
        submitterEmail: z.string().trim().toLowerCase().email(),
        title: z.string().trim().min(1).max(500),
        domain: z.string().max(160).optional(),
        abstract: z.string().trim().min(1).max(10_000).default("Submitted via upload form"),
        type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]).default("ESSAY"),
        consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform(v => v === true || v === "true"),
        manuscriptUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
        manuscriptPublicId: z.string().max(500).optional(),
        manuscriptResourceType: z.string().max(50).optional(),
        coverUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
        coverImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
        coverPublicId: z.string().max(500).optional(),
        coverImagePublicId: z.string().max(500).optional(),
        coverResourceType: z.string().max(50).optional(),
        coverImageResourceType: z.string().max(50).optional(),
        audioUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
        audioPublicId: z.string().max(500).optional(),
        keywords: z.string().max(2_000).optional(),
        notes: z.string().max(5_000).optional(),
      });
      const parsed = uploadSchema.safeParse({
        ...req.body,
        type: String(req.body.type || "ESSAY").toUpperCase(),
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid submission", details: parsed.error.flatten() });
      }
      if (!parsed.data.consent) return res.status(400).json({ error: "Consent is required" });

      const data = parsed.data;
      const submitterName = data.submitterName;
      const submitterEmail = data.submitterEmail;
      const title = data.title;
      const domain = data.domain ? normalizeCategorySlug(data.domain) : null;
      const abstract = data.abstract;
      const type = data.type;

      let manuscriptUrl = data.manuscriptUrl || null;
      let manuscriptPublicId = data.manuscriptPublicId || null;
      let manuscriptResourceType = data.manuscriptResourceType || null;

      let coverImageUrl = data.coverUrl || data.coverImageUrl || null;
      let coverImagePublicId = data.coverPublicId || data.coverImagePublicId || null;
      let coverImageResourceType = data.coverResourceType || data.coverImageResourceType || null;

      let audioUrl = data.audioUrl || null;
      let audioPublicId = data.audioPublicId || null;

      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("multipart/form-data")) {
        const manuscriptFile = req.files?.["manuscript"]?.[0];
        const coverFile = req.files?.["coverImage"]?.[0];
        const audioFile = req.files?.["audio"]?.[0];

        if (coverFile && coverFile.size > MAX_IMAGE_BYTES) {
          return res.status(413).json({ error: "Cover images must be 10 MB or smaller" });
        }
        if (manuscriptFile && manuscriptFile.size > (manuscriptFile.mimetype.startsWith("image/") ? MAX_IMAGE_BYTES : MAX_MANUSCRIPT_BYTES)) {
          return res.status(413).json({ error: "The uploaded manuscript exceeds the allowed file size" });
        }
        if (audioFile && audioFile.size > MAX_AUDIO_BYTES) {
          return res.status(413).json({ error: "Audio files must be 30 MB or smaller" });
        }

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
        data.keywords ? `Keywords: ${data.keywords}` : null,
        data.notes ? `Notes: ${data.notes}` : null,
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

      // Trigger notifications asynchronously
      sendSubmissionNotification(submission).catch((err) => {
        req.log.error(err, "Failed to send upload submission notification");
      });

      return res.status(201).json({
        success: true,
        submission,
        publication: null,
        files: {
          manuscriptUrl,
          coverUrl: coverImageUrl,
          audioUrl,
        },
      });
    } catch (err: any) {
      req.log.error(err);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

// Publication is an editorial action. Authors may work on drafts and submitted
// revisions, but cannot modify a published source or independently publish it.
const USER_EDITABLE_STATUSES = ["DRAFT", "RECEIVED", "REVISION_REQUESTED"];
const USER_DELETABLE_STATUSES = ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "REJECTED"];

// POST /api/submissions/write — full essay written in browser
router.post("/submissions/write", async (req, res) => {
  try {
    const auth = await getUserAuth(req);

    const schema = z.object({
      type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]).optional(),
      submitterName: z.string().trim().max(160).optional().or(z.literal("")),
      submitterEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")).or(z.null()),
      title: z.string().trim().max(500).optional().or(z.literal("")),
      domain: z.string().trim().max(160).optional(),
      abstract: z.string().trim().max(10000).optional().default(""),
      body: z.string().max(500_000).optional().default(""),
      notes: z.string().trim().max(5000).optional(),
      consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional().transform(v => v === true || v === "true"),
      status: z.enum(["DRAFT", "RECEIVED"]).optional().default("RECEIVED"),
      audioUrl: z.string().optional().or(z.literal("")).or(z.null()),
      audioPublicId: z.string().optional().or(z.literal("")).or(z.null()),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const data = parsed.data;
    const isDraft = data.status === "DRAFT";

    const unresolvedImages = countUnresolvedArticleImages(data.body);
    if (unresolvedImages > 0) {
      return res.status(400).json({
        error: `${unresolvedImages} embedded image${unresolvedImages === 1 ? " is" : "s are"} not stored. Import the DOCX or upload the images before saving.`,
        code: "UNRESOLVED_ARTICLE_IMAGES",
      });
    }

    // Only signed-in users may save drafts — drafts must be resumable/owned.
    if (isDraft && !auth) return res.status(401).json({ error: "Sign in to save a draft" });

    // Full submissions still require the declaration + minimum content.
    if (!isDraft) {
      if (!data.consent) return res.status(400).json({ error: "Consent is required" });
      if (!data.submitterName?.trim()) return res.status(400).json({ error: "Full Name is required" });
      if (!data.submitterEmail?.trim() || !data.submitterEmail.includes("@")) {
        return res.status(400).json({ error: "A valid Email Address is required" });
      }
      if (!data.abstract.trim()) return res.status(400).json({ error: "Abstract is required" });
      if (!data.body.trim() || data.body.length < 1) return res.status(400).json({ error: "Essay body is required" });
    }

    const [submission] = await db.insert(submissionsTable).values({
      userId: auth?.userId || null,
      submitterName: data.submitterName || "Draft Author",
      submitterEmail: data.submitterEmail || auth?.email || "",
      type: data.type || "ESSAY",
      title: data.title || "Untitled draft",
      domain: data.domain ? normalizeCategorySlug(data.domain) : null,
      abstract: data.abstract || "",
      body: sanitizeArticleBody(data.body || ""),
      notes: data.notes || null,
      consent: !isDraft,
      status: isDraft ? "DRAFT" : "RECEIVED",
      audioUrl: data.audioUrl || null,
      audioPublicId: data.audioPublicId || null,
    }).returning();

    if (!isDraft) {
      sendSubmissionNotification(submission).catch((err) => {
        req.log.error(err, "Failed to send write submission notification");
      });
    }

    return res.status(201).json({ success: true, submission, publication: null });
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

    const trashed = req.query.trashed === "true" || req.query.deleted === "true";

    const conditions = [
      eq(submissionsTable.userId, auth.userId),
      trashed ? isNotNull(submissionsTable.deletedAt) : isNull(submissionsTable.deletedAt),
    ];

    const submissions = await db.select().from(submissionsTable)
      .where(and(...conditions))
      .orderBy(submissionsTable.createdAt);

    const articles = await db.select({ slug: articlesTable.slug, sourceSubmissionId: articlesTable.sourceSubmissionId }).from(articlesTable)
      .where(isNull(articlesTable.deletedAt));

    const enriched = submissions.map(s => {
      const slugCandidate = slugify(s.title);
      const matchingArt = articles.find(a => a.sourceSubmissionId === s.id);
      return {
        ...s,
        body: sanitizeArticleBody(s.body),
        slug: matchingArt ? matchingArt.slug : slugCandidate,
      };
    });

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

    const trashed = req.query.trashed === "true" || req.query.deleted === "true";
    const [submission] = await db.select().from(submissionsTable)
      .where(and(
        eq(submissionsTable.id, req.params.id),
        trashed ? isNotNull(submissionsTable.deletedAt) : isNull(submissionsTable.deletedAt),
      ))
      .limit(1);

    if (!submission) return res.status(404).json({ error: "Submission not found" });

    if (submission.userId !== auth.userId && (auth as any).role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({
      submission: { ...submission, body: sanitizeArticleBody(submission.body) },
    });
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
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });
    if (existing.deletedAt) return res.status(409).json({ error: "Restore this submission before editing it" });
    if (!USER_EDITABLE_STATUSES.includes(existing.status)) {
      return res.status(403).json({ error: "This submission can no longer be edited" });
    }

    const schema = z.object({
      type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]).optional(),
      submitterName: z.string().trim().max(160).optional().or(z.literal("")),
      submitterEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")).or(z.null()),
      title: z.string().trim().max(500).optional().or(z.literal("")),
      domain: z.string().trim().max(160).optional(),
      abstract: z.string().trim().max(10000).optional(),
      body: z.string().max(500_000).optional(),
      notes: z.string().trim().max(5000).optional(),
      consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
      status: z.enum(["DRAFT", "RECEIVED"]).optional(),
      audioUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
      audioPublicId: z.string().max(500).optional().or(z.literal("")).or(z.null()),
      coverUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
      coverImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    const data = parsed.data;

    const unresolvedImages = countUnresolvedArticleImages(data.body ?? existing.body);
    if (unresolvedImages > 0) {
      return res.status(400).json({
        error: `${unresolvedImages} embedded image${unresolvedImages === 1 ? " is" : "s are"} not stored. Import the DOCX or upload the images before saving.`,
        code: "UNRESOLVED_ARTICLE_IMAGES",
      });
    }

    const wantsSubmit = data.status === "RECEIVED";
    if (wantsSubmit) {
      const consent = data.consent === true || data.consent === "true";
      const abstract = data.abstract ?? existing.abstract ?? "";
      const body = data.body ?? existing.body ?? "";
      const name = data.submitterName ?? existing.submitterName ?? "";
      const email = data.submitterEmail ?? existing.submitterEmail ?? "";
      if (!consent) return res.status(400).json({ error: "Consent is required" });
      if (!name.trim()) return res.status(400).json({ error: "Full Name is required" });
      if (!email.trim() || !email.includes("@")) return res.status(400).json({ error: "A valid Email Address is required" });
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
    if (data.body !== undefined) updates.body = sanitizeArticleBody(data.body);
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.audioUrl !== undefined) updates.audioUrl = data.audioUrl;
    if (data.audioPublicId !== undefined) updates.audioPublicId = data.audioPublicId;
    if (data.coverUrl !== undefined || data.coverImageUrl !== undefined) {
      updates.coverImageUrl = data.coverUrl || data.coverImageUrl || null;
    }
    if (wantsSubmit) {
      updates.status = "RECEIVED";
      updates.consent = true;
    } else if (data.status === "DRAFT") {
      updates.status = "DRAFT";
    }

    const [submission] = await db.update(submissionsTable)
      .set(updates)
      .where(and(eq(submissionsTable.id, req.params.id), isNull(submissionsTable.deletedAt)))
      .returning();

    return res.json({
      success: true,
      submission: { ...submission, body: sanitizeArticleBody(submission.body) },
      publication: null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update submission" });
  }
});

// DELETE /api/submissions/:id — move an active submission to Trash by setting deletedAt.
router.delete("/submissions/:id", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });
    if (existing.deletedAt) return res.status(409).json({ error: "Submission is already in Trash" });
    if (!USER_DELETABLE_STATUSES.includes(existing.status)) {
      return res.status(409).json({ error: "This submission is managed by the editorial team and cannot be deleted from your account" });
    }

    const now = new Date();
    const [submission] = await db.update(submissionsTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(submissionsTable.id, req.params.id), isNull(submissionsTable.deletedAt)))
      .returning();
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    return res.json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete submission" });
  }
});

// POST /api/submissions/:id/restore — clear deletedAt and retain the original status.
router.post("/submissions/:id/restore", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });
    if (!existing.deletedAt) return res.status(409).json({ error: "Submission is not in Trash" });

    const [submission] = await db.update(submissionsTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(submissionsTable.id, req.params.id), isNotNull(submissionsTable.deletedAt)))
      .returning();

    return res.json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to restore submission" });
  }
});

// DELETE /api/submissions/:id/permanent — permanently erase submission from DB
router.delete("/submissions/:id/permanent", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });
    if (!existing.deletedAt) return res.status(409).json({ error: "Move the submission to Trash before permanently deleting it" });

    const [linkedArticle] = await db.select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.sourceSubmissionId, req.params.id))
      .limit(1);
    const [linkedPaper] = await db.select({ id: papersTable.id })
      .from(papersTable)
      .where(eq(papersTable.sourceSubmissionId, req.params.id))
      .limit(1);
    if (linkedArticle || linkedPaper) {
      return res.status(409).json({ error: "Permanently delete the linked article or paper first" });
    }

    await db.delete(submissionsTable)
      .where(and(eq(submissionsTable.id, req.params.id), isNotNull(submissionsTable.deletedAt)));

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to permanently delete submission" });
  }
});

export { UPLOADS_DIR };
export default router;
