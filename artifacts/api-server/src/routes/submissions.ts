import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, articlesTable, papersTable, usersTable } from "@workspace/db";
import { eq, and, isNull, isNotNull, or, ilike, desc } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { ownsAuthoredWork, resolveViewer, type Viewer } from "../lib/viewer";
import {
  normalizeCategorySlug,
  slugify,
  syncSubmissionFromPublication,
} from "../lib/publication-sync";
import { z } from "zod";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";
import { countUnresolvedArticleImages, sanitizeArticleBody, MAX_BODY_CHARS } from "../lib/content";
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
    try {
      const blob = await put(`anvikshiki/${filename}`, file.buffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (blob?.url) return blob.url;
    } catch (blobErr) {
      console.warn("Vercel Blob upload failed, attempting fallback...", blobErr);
    }
  }

  // 2. If Cloudinary is configured
  if (process.env.CLOUDINARY_URL) {
    try {
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
      if (uploadResult?.secure_url) {
        return uploadResult.secure_url;
      }
    } catch (cloudErr) {
      console.warn("Cloudinary upload failed, attempting fallback...", cloudErr);
    }
  }

  // 3. Fallback to local / serverless disk (/tmp or UPLOADS_DIR)
  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.promises.writeFile(filePath, file.buffer);
    const apiBase = process.env.API_BASE_URL || "";
    return `${apiBase}/api/uploads/${filename}`;
  } catch (diskErr) {
    console.warn("Disk upload failed, attempting Base64 Data URI fallback...", diskErr);
  }

  // 4. In-memory Base64 Data URI fallback for images up to 5MB
  if (file.mimetype.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  }

  throw new Error("Unable to store uploaded file across all storage providers.");
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

/**
 * The byline of a submission is the account's own name, never a typed-in value.
 * A signed-in author's profile name is authoritative: it is what the account
 * desk matches ownership against and what appears on the published page, so
 * letting the form supply a different string produced work the author could no
 * longer find or edit. The submitted name is used only for guests, who have no
 * account name to draw on.
 */
async function resolveSubmitterIdentity(auth: any, fallbackName?: string | null, fallbackEmail?: string | null) {
  const userId: string | null = auth?.userId || null;
  let name = (fallbackName || "").trim();
  let email = (fallbackEmail || auth?.email || "").trim().toLowerCase();

  if (userId) {
    try {
      const [user] = await db
        .select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (user?.name?.trim()) name = user.name.trim();
      if (user?.email) email = user.email.trim().toLowerCase();
    } catch {}
  }

  return { userId, name: name || "Anonymous Scholar", email };
}

// POST /api/submissions (JSON body)
router.post("/submissions", async (req, res) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const auth = await getUserAuth(req);
    const data = parsed.data;

    if (!data.consent) return res.status(400).json({ error: "Consent is required" });

    const identity = await resolveSubmitterIdentity(auth, data.submitterName, data.submitterEmail);

    const [submission] = await db.insert(submissionsTable).values({
      userId: identity.userId,
      submitterName: identity.name,
      submitterEmail: identity.email,
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

// POST /api/uploads/cloudinary-signature â€” request upload signature for direct browser uploads
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

// POST /api/submissions/upload â€” handles metadata and Cloudinary URLs (JSON) or local file upload fallback (multipart)
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
      const identity = await resolveSubmitterIdentity(auth, submitterName, submitterEmail);

      const [submission] = await db.insert(submissionsTable).values({
        userId: identity.userId,
        submitterName: identity.name,
        submitterEmail: identity.email,
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
// revisions, and may manage/hide/trash their submitted or published works from their desk.
// Kept in step with the account desk's own list. When the two disagreed, the
// desk offered an "Edit" button for statuses the API refused, so the author saw
// a save fail for no stated reason. Accepted and published work is handled
// separately below by forwarding the edit to the live article or paper.
const USER_EDITABLE_STATUSES = ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED"];
const USER_DELETABLE_STATUSES = ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "REJECTED", "PUBLISHED", "ACCEPTED", "ARCHIVED"];

const SUBMISSION_LIST_COLUMNS = {
  id: submissionsTable.id,
  userId: submissionsTable.userId,
  submitterName: submissionsTable.submitterName,
  submitterEmail: submissionsTable.submitterEmail,
  type: submissionsTable.type,
  title: submissionsTable.title,
  domain: submissionsTable.domain,
  abstract: submissionsTable.abstract,
  notes: submissionsTable.notes,
  coverImageUrl: submissionsTable.coverImageUrl,
  manuscriptUrl: submissionsTable.manuscriptUrl,
  audioUrl: submissionsTable.audioUrl,
  status: submissionsTable.status,
  publishedAt: submissionsTable.publishedAt,
  deletedAt: submissionsTable.deletedAt,
  createdAt: submissionsTable.createdAt,
  updatedAt: submissionsTable.updatedAt,
};

const ARTICLE_LIST_COLUMNS = {
  id: articlesTable.id,
  slug: articlesTable.slug,
  title: articlesTable.title,
  subtitle: articlesTable.subtitle,
  excerpt: articlesTable.excerpt,
  categorySlug: articlesTable.categorySlug,
  authorName: articlesTable.authorName,
  heroImageUrl: articlesTable.heroImageUrl,
  audioUrl: articlesTable.audioUrl,
  status: articlesTable.status,
  publishedAt: articlesTable.publishedAt,
  deletedAt: articlesTable.deletedAt,
  createdAt: articlesTable.createdAt,
  updatedAt: articlesTable.updatedAt,
  sourceSubmissionId: articlesTable.sourceSubmissionId,
};

const PAPER_LIST_COLUMNS = {
  id: papersTable.id,
  slug: papersTable.slug,
  title: papersTable.title,
  abstract: papersTable.abstract,
  categorySlug: papersTable.categorySlug,
  authorName: papersTable.authorName,
  coverImageUrl: papersTable.coverImageUrl,
  pdfUrl: papersTable.pdfUrl,
  status: papersTable.status,
  publishedAt: papersTable.publishedAt,
  deletedAt: papersTable.deletedAt,
  createdAt: papersTable.createdAt,
  updatedAt: papersTable.updatedAt,
  sourceSubmissionId: papersTable.sourceSubmissionId,
};

// POST /api/submissions/write â€” full essay written in browser
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
      body: z.string().max(MAX_BODY_CHARS).optional().default(""),
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

    // Only signed-in users may save drafts â€” drafts must be resumable/owned.
    if (isDraft && !auth) return res.status(401).json({ error: "Sign in to save a draft" });

    // Full submissions still require the declaration + minimum content.
    if (!isDraft) {
      if (!data.consent) return res.status(400).json({ error: "Consent is required" });
      if (!data.abstract.trim()) return res.status(400).json({ error: "Abstract is required" });
      if (!data.body.trim() || data.body.length < 1) return res.status(400).json({ error: "Essay body is required" });
    }

    const identity = await resolveSubmitterIdentity(auth, data.submitterName, data.submitterEmail);

    const [submission] = await db.insert(submissionsTable).values({
      userId: identity.userId,
      submitterName: identity.name || (isDraft ? "Draft Author" : "Anonymous Scholar"),
      submitterEmail: identity.email || auth?.email || "",
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

// GET /api/submissions (user's own â€” includes drafts and published essays/papers)
// ?deleted=true returns only soft-deleted submissions; otherwise excludes them
router.get("/submissions", async (req, res) => {
  try {
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });

    const trashed = req.query.trashed === "true" || req.query.deleted === "true";

    // 1. The author's own submission rows, matched by account id or email.
    const userEmail = viewer.email ? viewer.email.trim().toLowerCase() : "";
    const ownsSubmission = userEmail
      ? or(eq(submissionsTable.userId, viewer.userId), ilike(submissionsTable.submitterEmail, userEmail))!
      : eq(submissionsTable.userId, viewer.userId);

    const [submissionsResult, ownArticlesResult, ownPapersResult] = await Promise.all([
      db.select(SUBMISSION_LIST_COLUMNS).from(submissionsTable)
        .where(and(
          ownsSubmission,
          trashed ? isNotNull(submissionsTable.deletedAt) : isNull(submissionsTable.deletedAt),
        ))
        .orderBy(desc(submissionsTable.createdAt))
        .catch(err => {
          req.log?.warn?.({ err }, "Failed to query submissionsTable in GET /submissions");
          return [] as any[];
        }),
      (async () => {
        const conds: any[] = [];
        if (viewer.name) conds.push(ilike(articlesTable.authorName, viewer.name));
        if (viewer.email) {
          const prefix = viewer.email.split("@")[0];
          if (prefix && prefix.length >= 3) conds.push(ilike(articlesTable.authorName, `%${prefix}%`));
        }
        if (conds.length === 0) return [] as any[];
        return db.select(ARTICLE_LIST_COLUMNS).from(articlesTable)
          .where(and(
            trashed ? isNotNull(articlesTable.deletedAt) : isNull(articlesTable.deletedAt),
            conds.length === 1 ? conds[0] : or(...conds)!
          ))
          .catch(err => {
            req.log?.warn?.({ err }, "Failed to query articlesTable for author works");
            return [] as any[];
          });
      })(),
      (async () => {
        const conds: any[] = [];
        if (viewer.name) conds.push(ilike(papersTable.authorName, viewer.name));
        if (viewer.email) {
          const prefix = viewer.email.split("@")[0];
          if (prefix && prefix.length >= 3) conds.push(ilike(papersTable.authorName, `%${prefix}%`));
        }
        if (conds.length === 0) return [] as any[];
        return db.select(PAPER_LIST_COLUMNS).from(papersTable)
          .where(and(
            trashed ? isNotNull(papersTable.deletedAt) : isNull(papersTable.deletedAt),
            conds.length === 1 ? conds[0] : or(...conds)!
          ))
          .catch(err => {
            req.log?.warn?.({ err }, "Failed to query papersTable for author works");
            return [] as any[];
          });
      })(),
    ]);

    const submissions = submissionsResult || [];
    const ownArticles = ownArticlesResult || [];
    const ownPapers = ownPapersResult || [];

    // 3. Give every submission the slug of the work it was published as.
    const enriched: any[] = submissions.map(s => {
      const sTitle = (s?.title || "").toLowerCase().trim();
      const matchingArt = ownArticles.find(a => 
        (a.sourceSubmissionId && a.sourceSubmissionId === s.id) || 
        (sTitle && (a.title || "").toLowerCase().trim() === sTitle)
      );
      const matchingPaper = ownPapers.find(p => 
        (p.sourceSubmissionId && p.sourceSubmissionId === s.id) || 
        (sTitle && (p.title || "").toLowerCase().trim() === sTitle)
      );
      return {
        ...s,
        slug: matchingArt?.slug || matchingPaper?.slug || slugify(s?.title),
        itemType: s?.type === "PAPER" ? "PAPER" : "ESSAY",
      };
    });

    // 4. Append published works that no longer have (or never had) a submission row.
    const existingTitles = new Set(enriched.map(e => (e.title || "").toLowerCase().trim()).filter(Boolean));
    const existingIds = new Set(enriched.map(e => e.id).filter(Boolean));

    for (const art of ownArticles) {
      const title = (art?.title || "").toLowerCase().trim();
      if (title && existingTitles.has(title)) continue;
      if (art.sourceSubmissionId && existingIds.has(art.sourceSubmissionId)) continue;
      enriched.push({
        id: `art-${art.id}`,
        userId: viewer.userId,
        submitterName: art.authorName || viewer.name || "Author",
        submitterEmail: viewer.email,
        type: "ESSAY",
        title: art.title || "Untitled Article",
        domain: art.categorySlug || "philosophy",
        abstract: art.excerpt || art.subtitle || "",
        notes: null,
        manuscriptUrl: null,
        coverImageUrl: art.heroImageUrl,
        audioUrl: art.audioUrl,
        status: art.status || "PUBLISHED",
        publishedAt: art.publishedAt,
        deletedAt: art.deletedAt,
        createdAt: art.publishedAt || art.createdAt,
        updatedAt: art.updatedAt,
        slug: art.slug || slugify(art.title),
        itemType: "ESSAY",
      });
      if (title) existingTitles.add(title);
    }

    for (const paper of ownPapers) {
      const title = (paper?.title || "").toLowerCase().trim();
      if (title && existingTitles.has(title)) continue;
      if (paper.sourceSubmissionId && existingIds.has(paper.sourceSubmissionId)) continue;
      enriched.push({
        id: `paper-${paper.id}`,
        userId: viewer.userId,
        submitterName: paper.authorName || viewer.name || "Author",
        submitterEmail: viewer.email,
        type: "PAPER",
        title: paper.title || "Untitled Paper",
        domain: paper.categorySlug || "papers",
        abstract: paper.abstract || "",
        notes: null,
        manuscriptUrl: paper.pdfUrl,
        coverImageUrl: paper.coverImageUrl,
        audioUrl: null,
        status: paper.status || "PUBLISHED",
        publishedAt: paper.publishedAt,
        deletedAt: paper.deletedAt,
        createdAt: paper.publishedAt || paper.createdAt,
        updatedAt: paper.updatedAt,
        slug: paper.slug || slugify(paper.title),
        itemType: "PAPER",
      });
      if (title) existingTitles.add(title);
    }

    enriched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.json({ submissions: enriched });
  } catch (err) {
    req.log?.error?.({ err }, "GET /submissions unexpected error");
    return res.status(500).json({ error: "Failed to load submissions" });
  }
});

// GET /api/submissions/:id (single submission by ID)
router.get("/submissions/:id", async (req, res) => {
  try {
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });
    const auth = { userId: viewer.userId, email: viewer.email, role: viewer.isAdmin ? "ADMIN" : "USER" };

    const trashed = req.query.trashed === "true" || req.query.deleted === "true";
    const id = req.params.id;

    if (id.startsWith("art-")) {
      const realId = id.replace("art-", "");
      const [art] = await db.select().from(articlesTable)
        .where(and(
          eq(articlesTable.id, realId),
          trashed ? isNotNull(articlesTable.deletedAt) : isNull(articlesTable.deletedAt),
        )).limit(1);
      if (!art) return res.status(404).json({ error: "Article not found" });
      if (!ownsAuthoredWork(viewer, art.authorName)) return res.status(403).json({ error: "Forbidden" });
      return res.json({
        submission: {
          id,
          userId: auth.userId,
          title: art.title,
          type: "ESSAY",
          domain: art.categorySlug,
          abstract: art.excerpt || "",
          body: sanitizeArticleBody(art.body),
          status: art.status,
          slug: art.slug,
          coverImageUrl: art.heroImageUrl,
        }
      });
    }

    if (id.startsWith("paper-")) {
      const realId = id.replace("paper-", "");
      const [paper] = await db.select().from(papersTable)
        .where(and(
          eq(papersTable.id, realId),
          trashed ? isNotNull(papersTable.deletedAt) : isNull(papersTable.deletedAt),
        )).limit(1);
      if (!paper) return res.status(404).json({ error: "Paper not found" });
      if (!ownsAuthoredWork(viewer, paper.authorName)) return res.status(403).json({ error: "Forbidden" });
      return res.json({
        submission: {
          id,
          userId: auth.userId,
          title: paper.title,
          type: "PAPER",
          domain: paper.categorySlug,
          abstract: paper.abstract || "",
          body: sanitizeArticleBody(paper.body),
          status: paper.status,
          slug: paper.slug,
          coverImageUrl: paper.coverImageUrl,
        }
      });
    }

    const [submission] = await db.select().from(submissionsTable)
      .where(and(
        eq(submissionsTable.id, id),
        trashed ? isNotNull(submissionsTable.deletedAt) : isNull(submissionsTable.deletedAt),
      ))
      .limit(1);

    if (!submission) return res.status(404).json({ error: "Submission not found" });

    if (submission.userId !== auth.userId && (auth as any).role !== "ADMIN" && submission.submitterEmail !== auth.email) {
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

/**
 * Update a published article or paper that the account desk surfaced under a
 * synthetic `art-` / `paper-` id. Without this the id was passed straight to a
 * `submissions.id` lookup, which matched nothing and â€” once the column type
 * rejected the prefixed value â€” failed the whole request with a bare 500. This
 * is why "Edit" on a published work never saved.
 */
async function updateSyntheticPublication(req: any, res: any, viewer: Viewer, id: string) {
  const isPaper = id.startsWith("paper-");
  const table = isPaper ? papersTable : articlesTable;
  const realId = id.replace(isPaper ? "paper-" : "art-", "");

  const [existing] = await db.select().from(table as any).where(eq((table as any).id, realId)).limit(1);
  if (!existing) return res.status(404).json({ error: isPaper ? "Paper not found" : "Article not found" });
  if (!ownsAuthoredWork(viewer, (existing as any).authorName)) {
    return res.status(403).json({ error: "You can only edit work published under your own name" });
  }
  if ((existing as any).deletedAt) {
    return res.status(409).json({ error: "Restore this work from Trash before editing it" });
  }

  const schema = z.object({
    title: z.string().trim().max(500).optional().or(z.literal("")),
    abstract: z.string().trim().max(10_000).optional(),
    body: z.string().max(MAX_BODY_CHARS).optional(),
    domain: z.string().trim().max(160).optional(),
    submitterName: z.string().trim().max(160).optional().or(z.literal("")),
    coverUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
    coverImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
    audioUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const data = parsed.data;
  if (data.body !== undefined) {
    const unresolvedImages = countUnresolvedArticleImages(data.body);
    if (unresolvedImages > 0) {
      return res.status(400).json({
        error: `${unresolvedImages} embedded image${unresolvedImages === 1 ? " is" : "s are"} not stored. Import the DOCX or upload the images before saving.`,
        code: "UNRESOLVED_ARTICLE_IMAGES",
      });
    }
  }

  const cover = data.coverUrl !== undefined ? data.coverUrl : data.coverImageUrl;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (data.title) updates.title = data.title;
  // Byline follows the account; only an administrator may reattribute a work.
  if (viewer.isAdmin && data.submitterName) updates.authorName = data.submitterName;
  else if (viewer.name) updates.authorName = viewer.name;
  if (data.domain !== undefined) updates.categorySlug = normalizeCategorySlug(data.domain);
  if (data.body !== undefined) updates.body = sanitizeArticleBody(data.body);
  if (data.abstract !== undefined) {
    if (isPaper) updates.abstract = data.abstract;
    else updates.excerpt = data.abstract;
  }
  if (cover !== undefined) {
    if (isPaper) updates.coverImageUrl = cover || null;
    else updates.heroImageUrl = cover || null;
  }
  if (!isPaper && data.audioUrl !== undefined) updates.audioUrl = data.audioUrl || null;

  const [updated] = await db.update(table as any).set(updates)
    .where(and(eq((table as any).id, realId), isNull((table as any).deletedAt)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Work not found" });

  // Keep the editorial record in step so a later re-sync cannot overwrite the
  // author's edit with the older submission text.
  await syncSubmissionFromPublication(updated as any, isPaper ? "paper" : "article")
    .catch(err => req.log?.warn?.({ err }, "Submission back-sync after synthetic edit failed"));

  return res.json({
    success: true,
    submission: {
      id,
      title: (updated as any).title,
      slug: (updated as any).slug,
      status: (updated as any).status,
      type: isPaper ? "PAPER" : "ESSAY",
      abstract: isPaper ? (updated as any).abstract : (updated as any).excerpt,
      body: sanitizeArticleBody((updated as any).body),
      coverImageUrl: isPaper ? (updated as any).coverImageUrl : (updated as any).heroImageUrl,
    },
    publication: { kind: isPaper ? "paper" : "article", id: realId, slug: (updated as any).slug },
  });
}

// PUT /api/submissions/:id â€” owner updates a draft, or submits a saved draft for review
router.put("/submissions/:id", async (req, res) => {
  try {
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });
    const auth = { userId: viewer.userId, email: viewer.email, role: viewer.isAdmin ? "ADMIN" : "USER" };

    if (req.params.id.startsWith("art-") || req.params.id.startsWith("paper-")) {
      return await updateSyntheticPublication(req, res, viewer, req.params.id);
    }

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN" && existing.submitterEmail !== auth.email) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (existing.deletedAt) return res.status(409).json({ error: "Restore this submission before editing it" });

    if (!USER_EDITABLE_STATUSES.includes(existing.status)) {
      // Once a work is accepted or live, the public article/paper is the record
      // that matters. Rejecting the save outright stranded authors with an
      // "Edit" button that could never succeed; forward the edit to the linked
      // publication instead, so what they typed reaches the page readers see.
      const [linkedArticle] = await db.select({ id: articlesTable.id })
        .from(articlesTable).where(eq(articlesTable.sourceSubmissionId, existing.id)).limit(1);
      if (linkedArticle) {
        return await updateSyntheticPublication(req, res, viewer, `art-${linkedArticle.id}`);
      }
      const [linkedPaper] = await db.select({ id: papersTable.id })
        .from(papersTable).where(eq(papersTable.sourceSubmissionId, existing.id)).limit(1);
      if (linkedPaper) {
        return await updateSyntheticPublication(req, res, viewer, `paper-${linkedPaper.id}`);
      }
      return res.status(403).json({
        error: "This submission is with the editors and has no published version yet, so it cannot be edited right now.",
      });
    }

    const schema = z.object({
      type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]).optional(),
      submitterName: z.string().trim().max(160).optional().or(z.literal("")),
      submitterEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")).or(z.null()),
      title: z.string().trim().max(500).optional().or(z.literal("")),
      domain: z.string().trim().max(160).optional(),
      abstract: z.string().trim().max(10000).optional(),
      body: z.string().max(MAX_BODY_CHARS).optional(),
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

    if (data.body) {
      const unresolvedImages = countUnresolvedArticleImages(data.body);
      if (unresolvedImages > 0) {
        return res.status(400).json({
          error: `${unresolvedImages} embedded image${unresolvedImages === 1 ? " is" : "s are"} not stored. Import the DOCX or upload the images before saving.`,
          code: "UNRESOLVED_ARTICLE_IMAGES",
        });
      }
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.type) updates.type = data.type;
    // Keep the byline pinned to the account name so an edit cannot detach the
    // work from the author who owns it. Admins may still reattribute.
    if (viewer.isAdmin) {
      if (data.submitterName !== undefined) updates.submitterName = data.submitterName;
      if (data.submitterEmail !== undefined) updates.submitterEmail = data.submitterEmail;
    } else {
      if (viewer.name) updates.submitterName = viewer.name;
      if (viewer.email) updates.submitterEmail = viewer.email;
    }
    if (data.title !== undefined) updates.title = data.title;
    if (data.domain !== undefined) updates.domain = normalizeCategorySlug(data.domain);
    if (data.abstract !== undefined) updates.abstract = data.abstract;
    if (data.body !== undefined) updates.body = sanitizeArticleBody(data.body);
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.audioUrl !== undefined) updates.audioUrl = data.audioUrl || null;
    if (data.audioPublicId !== undefined) updates.audioPublicId = data.audioPublicId || null;
    if (data.coverUrl !== undefined) updates.coverImageUrl = data.coverUrl || null;
    if (data.coverImageUrl !== undefined) updates.coverImageUrl = data.coverImageUrl || null;

    const wantsSubmit = data.status === "RECEIVED" && existing.status === "DRAFT";
    if (wantsSubmit) {
      const title = data.title !== undefined ? data.title : existing.title;
      const body = data.body !== undefined ? data.body : existing.body;
      const abstract = data.abstract !== undefined ? data.abstract : existing.abstract;
      const submitterName = data.submitterName !== undefined ? data.submitterName : existing.submitterName;
      const submitterEmail = data.submitterEmail !== undefined ? data.submitterEmail : existing.submitterEmail;

      if (!title || !title.trim()) return res.status(400).json({ error: "Title is required to submit" });
      if (!body || !body.trim()) return res.status(400).json({ error: "Essay body is required to submit" });
      if (!abstract || !abstract.trim()) return res.status(400).json({ error: "Abstract is required to submit" });
      if (!submitterName || !submitterName.trim()) return res.status(400).json({ error: "Full Name is required to submit" });
      if (!submitterEmail || !submitterEmail.trim()) return res.status(400).json({ error: "Email is required to submit" });
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

// DELETE /api/submissions/:id â€” move an active submission or article/paper to Trash
router.delete("/submissions/:id", async (req, res) => {
  try {
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });
    const auth = { userId: viewer.userId, email: viewer.email, role: viewer.isAdmin ? "ADMIN" : "USER" };

    const id = req.params.id;
    const now = new Date();

    // Handle direct article deletion
    if (id.startsWith("art-")) {
      const realId = id.replace("art-", "");
      const [existingArt] = await db.select().from(articlesTable).where(eq(articlesTable.id, realId)).limit(1);
      if (!existingArt) return res.status(404).json({ error: "Article not found" });
      if (!ownsAuthoredWork(viewer, existingArt.authorName)) return res.status(403).json({ error: "Forbidden" });

      const [art] = await db.update(articlesTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(articlesTable.id, realId), isNull(articlesTable.deletedAt)))
        .returning();
      if (!art) return res.status(409).json({ error: "Article is already in Trash" });
      return res.json({ success: true, submission: { id, title: art.title, deletedAt: now, status: art.status } });
    }

    // Handle direct paper deletion
    if (id.startsWith("paper-")) {
      const realId = id.replace("paper-", "");
      const [existingPaper] = await db.select().from(papersTable).where(eq(papersTable.id, realId)).limit(1);
      if (!existingPaper) return res.status(404).json({ error: "Paper not found" });
      if (!ownsAuthoredWork(viewer, existingPaper.authorName)) return res.status(403).json({ error: "Forbidden" });

      const [paper] = await db.update(papersTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(papersTable.id, realId), isNull(papersTable.deletedAt)))
        .returning();
      if (!paper) return res.status(409).json({ error: "Paper is already in Trash" });
      return res.json({ success: true, submission: { id, title: paper.title, deletedAt: now, status: paper.status } });
    }

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN" && existing.submitterEmail !== auth.email) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (existing.deletedAt) return res.status(409).json({ error: "Submission is already in Trash" });

    const [submission] = await db.update(submissionsTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(submissionsTable.id, id), isNull(submissionsTable.deletedAt)))
      .returning();
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    // Also soft-delete any linked article or paper so it is hidden from public view
    await db.update(articlesTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(
        or(eq(articlesTable.sourceSubmissionId, id), eq(articlesTable.id, id.replace("sub-", ""))),
        isNull(articlesTable.deletedAt)
      ))
      .catch(() => {});
    await db.update(papersTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(
        or(eq(papersTable.sourceSubmissionId, id), eq(papersTable.id, id.replace("sub-", ""))),
        isNull(papersTable.deletedAt)
      ))
      .catch(() => {});

    return res.json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete submission" });
  }
});

// POST /api/submissions/:id/restore â€” restore an item from Trash
router.post("/submissions/:id/restore", async (req, res) => {
  try {
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });
    const auth = { userId: viewer.userId, email: viewer.email, role: viewer.isAdmin ? "ADMIN" : "USER" };

    const id = req.params.id;
    const now = new Date();

    if (id.startsWith("art-")) {
      const realId = id.replace("art-", "");
      const [existingArt] = await db.select().from(articlesTable).where(eq(articlesTable.id, realId)).limit(1);
      if (!existingArt) return res.status(404).json({ error: "Article not found" });
      if (!ownsAuthoredWork(viewer, existingArt.authorName)) return res.status(403).json({ error: "Forbidden" });

      const [art] = await db.update(articlesTable)
        .set({ deletedAt: null, updatedAt: now })
        .where(and(eq(articlesTable.id, realId), isNotNull(articlesTable.deletedAt)))
        .returning();
      if (!art) return res.status(409).json({ error: "Article is not in Trash" });
      return res.json({ success: true, submission: { id, title: art.title, deletedAt: null, status: art.status } });
    }

    if (id.startsWith("paper-")) {
      const realId = id.replace("paper-", "");
      const [existingPaper] = await db.select().from(papersTable).where(eq(papersTable.id, realId)).limit(1);
      if (!existingPaper) return res.status(404).json({ error: "Paper not found" });
      if (!ownsAuthoredWork(viewer, existingPaper.authorName)) return res.status(403).json({ error: "Forbidden" });

      const [paper] = await db.update(papersTable)
        .set({ deletedAt: null, updatedAt: now })
        .where(and(eq(papersTable.id, realId), isNotNull(papersTable.deletedAt)))
        .returning();
      if (!paper) return res.status(409).json({ error: "Paper is not in Trash" });
      return res.json({ success: true, submission: { id, title: paper.title, deletedAt: null, status: paper.status } });
    }

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN" && existing.submitterEmail !== auth.email) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!existing.deletedAt) return res.status(409).json({ error: "Submission is not in Trash" });

    const [submission] = await db.update(submissionsTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(submissionsTable.id, id), isNotNull(submissionsTable.deletedAt)))
      .returning();

    // Also restore any linked article or paper
    await db.update(articlesTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(
        or(eq(articlesTable.sourceSubmissionId, id), eq(articlesTable.id, id.replace("sub-", ""))),
        isNotNull(articlesTable.deletedAt)
      ))
      .catch(() => {});
    await db.update(papersTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(
        or(eq(papersTable.sourceSubmissionId, id), eq(papersTable.id, id.replace("sub-", ""))),
        isNotNull(papersTable.deletedAt)
      ))
      .catch(() => {});

    return res.json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to restore submission" });
  }
});

// DELETE /api/submissions/:id/permanent â€” permanently erase item from DB
router.delete("/submissions/:id/permanent", async (req, res) => {
  try {
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "Unauthorized" });
    const auth = { userId: viewer.userId, email: viewer.email, role: viewer.isAdmin ? "ADMIN" : "USER" };

    const id = req.params.id;

    // Permanent erasure is only ever allowed on an item the caller owns and
    // has already moved to Trash â€” never on live published work.
    if (id.startsWith("art-")) {
      const realId = id.replace("art-", "");
      const [art] = await db.select().from(articlesTable).where(eq(articlesTable.id, realId)).limit(1);
      if (!art) return res.status(404).json({ error: "Article not found" });
      if (!ownsAuthoredWork(viewer, art.authorName)) return res.status(403).json({ error: "Forbidden" });
      if (!art.deletedAt) return res.status(409).json({ error: "Move this work to Trash before permanently deleting it" });
      await db.delete(articlesTable).where(and(eq(articlesTable.id, realId), isNotNull(articlesTable.deletedAt)));
      return res.json({ success: true });
    }

    if (id.startsWith("paper-")) {
      const realId = id.replace("paper-", "");
      const [paper] = await db.select().from(papersTable).where(eq(papersTable.id, realId)).limit(1);
      if (!paper) return res.status(404).json({ error: "Paper not found" });
      if (!ownsAuthoredWork(viewer, paper.authorName)) return res.status(403).json({ error: "Forbidden" });
      if (!paper.deletedAt) return res.status(409).json({ error: "Move this work to Trash before permanently deleting it" });
      await db.delete(papersTable).where(and(eq(papersTable.id, realId), isNotNull(papersTable.deletedAt)));
      return res.json({ success: true });
    }

    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.userId !== auth.userId && (auth as any).role !== "ADMIN" && existing.submitterEmail !== auth.email) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!existing.deletedAt) return res.status(409).json({ error: "Move the submission to Trash before permanently deleting it" });

    // Remove linked article/paper first to satisfy foreign key constraints
    await db.delete(articlesTable).where(or(eq(articlesTable.sourceSubmissionId, id), eq(articlesTable.id, id.replace("sub-", "")))).catch(() => {});
    await db.delete(papersTable).where(or(eq(papersTable.sourceSubmissionId, id), eq(papersTable.id, id.replace("sub-", "")))).catch(() => {});

    await db.delete(submissionsTable)
      .where(and(eq(submissionsTable.id, id), isNotNull(submissionsTable.deletedAt)));

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to permanently delete submission" });
  }
});

export { UPLOADS_DIR };
export default router;
