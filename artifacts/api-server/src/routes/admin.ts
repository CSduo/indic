import { Router } from "express";
import { db, repairDatabaseSchema, withDbRetry } from "@workspace/db";
import {
  adminsTable, articlesTable, papersTable, submissionsTable,
  newsletterSubscribersTable, categoriesTable, usersTable, siteSettingsTable,
  notificationsTable
} from "@workspace/db";
import { eq, desc, sql, and, ne, isNull, isNotNull } from "drizzle-orm";
import {
  hashPassword, comparePassword, createAdminToken,
  getAdminAuth, setAdminCookie, clearAdminCookie
} from "../lib/auth";
import {
  ensurePublicPublicationForSubmission,
  normalizeCategorySlug,
  repairMissingPublications,
  syncPublishedSubmissions,
  unpublishPublicPublicationForSubmission,
} from "../lib/publication-sync";
import { z } from "zod";
import { notifyUser, notifyFollowersOfNewWork } from "../lib/notify";
import { sanitizeArticleBody, MAX_BODY_CHARS } from "../lib/content";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const articleInputSchema = z.object({
  slug: z.string().trim().max(500).optional(),
  title: z.string().trim().min(1).max(500),
  subtitle: z.string().max(1_000).optional(),
  excerpt: z.string().max(5_000).optional(),
  body: z.string().max(MAX_BODY_CHARS).optional(),
  categorySlug: z.string().trim().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  authorName: z.string().trim().max(200).optional(),
  heroImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  heroImageAlt: z.string().max(500).optional(),
  keyTakeaways: z.array(z.string().max(1_000)).max(20).default([]),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  audioUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  publishedAt: z.string().optional(),
});

const paperInputSchema = z.object({
  slug: z.string().trim().max(500).optional(),
  title: z.string().trim().min(1).max(500),
  abstract: z.string().max(10_000).optional(),
  body: z.string().max(MAX_BODY_CHARS).optional(),
  categorySlug: z.string().trim().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  authorName: z.string().trim().max(200).optional(),
  pdfUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  coverImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  citationText: z.string().max(5_000).optional(),
  peerReviewed: z.boolean().default(false),
  paperType: z.enum(["RESEARCH_PAPER", "WORKING_PAPER", "REVIEW_ESSAY", "MONOGRAPH", "TRANSLATION", "ARCHIVAL_NOTE"]).default("RESEARCH_PAPER"),
  year: z.number().optional(),
  doi: z.string().max(255).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  publishedAt: z.string().optional(),
});

// Admin auth middleware
async function requireAdmin(req: any, res: any, next: any) {
  const auth = await getAdminAuth(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  req.adminAuth = auth;
  next();
}

function requireAdminRole(...roles: Array<"ADMIN" | "EDITOR" | "REVIEWER">) {
  return (req: any, res: any, next: any) => {
    if (!req.adminAuth || !roles.includes(req.adminAuth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// POST /api/admin/login
router.post("/admin/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const { email, password } = parsed.data;

    // Check env-based admin first
    const envEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (envEmail && email.toLowerCase() === envEmail) {
      const envHash = process.env.ADMIN_PASSWORD_HASH;
      const valid = envHash ? await comparePassword(password, envHash) : false;

      if (valid) {
        let [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, envEmail)).limit(1);
        if (!admin) {
          const hashedPw = envHash || await hashPassword(password);
          [admin] = await db.insert(adminsTable).values({ email: envEmail, password: hashedPw, name: "System Admin" }).returning();
        }
        const token = await createAdminToken(admin.id, admin.email, admin.role);
        setAdminCookie(res, token);
        return res.json({ success: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
      }
    }

    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email.toLowerCase())).limit(1);
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await comparePassword(password, admin.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = await createAdminToken(admin.id, admin.email, admin.role);
    setAdminCookie(res, token);
    return res.json({ success: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/admin/logout
router.post("/admin/logout", (req, res) => {
  clearAdminCookie(res);
  return res.json({ success: true });
});

// GET /api/admin/me
router.get("/admin/me", requireAdmin, async (req: any, res) => {
  try {
    const [admin] = await db.select({ id: adminsTable.id, email: adminsTable.email, name: adminsTable.name, role: adminsTable.role })
      .from(adminsTable).where(eq(adminsTable.id, req.adminAuth.adminId)).limit(1);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    return res.json({ admin });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load your admin session. Please try again.", code: "LOAD_FAILED" });
  }
});

// GET /api/admin/stats
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [
      [{ total: totalArticles }],
      [{ total: publishedArticles }],
      [{ total: draftArticles }],
      [{ total: totalPapers }],
      [{ total: publishedPapers }],
      [{ total: newSubmissions }],
      [{ total: totalSubmissions }],
      [{ total: trashedArticles }],
      [{ total: trashedPapers }],
      [{ total: trashedSubmissions }],
      [{ total: newsletterCount }],
      recentSubmissions,
    ] = await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(articlesTable).where(isNull(articlesTable.deletedAt)),
      db.select({ total: sql<number>`count(*)` }).from(articlesTable).where(and(isNull(articlesTable.deletedAt), eq(articlesTable.status, "PUBLISHED"))),
      db.select({ total: sql<number>`count(*)` }).from(articlesTable).where(and(isNull(articlesTable.deletedAt), eq(articlesTable.status, "DRAFT"))),
      db.select({ total: sql<number>`count(*)` }).from(papersTable).where(isNull(papersTable.deletedAt)),
      db.select({ total: sql<number>`count(*)` }).from(papersTable).where(and(isNull(papersTable.deletedAt), eq(papersTable.status, "PUBLISHED"))),
      db.select({ total: sql<number>`count(*)` }).from(submissionsTable).where(and(isNull(submissionsTable.deletedAt), eq(submissionsTable.status, "RECEIVED"))),
      db.select({ total: sql<number>`count(*)` }).from(submissionsTable).where(and(isNull(submissionsTable.deletedAt), ne(submissionsTable.status, "DRAFT"))),
      db.select({ total: sql<number>`count(*)` }).from(articlesTable).where(isNotNull(articlesTable.deletedAt)),
      db.select({ total: sql<number>`count(*)` }).from(papersTable).where(isNotNull(papersTable.deletedAt)),
      db.select({ total: sql<number>`count(*)` }).from(submissionsTable).where(isNotNull(submissionsTable.deletedAt)),
      db.select({ total: sql<number>`count(*)` }).from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.isActive, true)),
      db.select().from(submissionsTable).where(and(isNull(submissionsTable.deletedAt), ne(submissionsTable.status, "DRAFT"))).orderBy(desc(submissionsTable.createdAt)).limit(5),
    ]);

    return res.json({
      articles: { total: Number(totalArticles), published: Number(publishedArticles), drafts: Number(draftArticles) },
      papers: { total: Number(totalPapers), published: Number(publishedPapers) },
      submissions: { total: Number(totalSubmissions), new: Number(newSubmissions) },
      trash: { articles: Number(trashedArticles), papers: Number(trashedPapers), submissions: Number(trashedSubmissions) },
      newsletter: { subscribers: Number(newsletterCount) },
      recentSubmissions,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load the dashboard figures. Please try again.", code: "LOAD_FAILED" });
  }
});

// GET /api/admin/articles
router.get("/admin/articles", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const trashed = req.query.trashed === "true";
    const parsedStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).safeParse(status);
    const conditions = [trashed ? isNotNull(articlesTable.deletedAt) : isNull(articlesTable.deletedAt)];
    if (parsedStatus.success) conditions.push(eq(articlesTable.status, parsedStatus.data));
    const articles = await db.select({ article: articlesTable, category: categoriesTable })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(articlesTable.updatedAt))
      .limit(100);
    return res.json({
      articles: articles.map(r => ({
        ...r.article,
        body: sanitizeArticleBody(r.article.body),
        category: r.category,
      })),
      total: articles.length,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load articles. Please try again.", code: "LOAD_FAILED" });
  }
});

// POST /api/admin/articles
router.post("/admin/articles", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const parsed = articleInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const data = parsed.data;
    let slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.slug, slug)).limit(1);
    if (existing) slug = `${slug}-${Date.now()}`;

    const [article] = await db.insert(articlesTable).values({
      slug,
      title: data.title,
      subtitle: data.subtitle,
      excerpt: data.excerpt,
      body: sanitizeArticleBody(data.body || ""),
      categorySlug: normalizeCategorySlug(data.categorySlug),
      tags: data.tags,
      authorName: data.authorName,
      heroImageUrl: data.heroImageUrl || null,
      heroImageAlt: data.heroImageAlt,
      keyTakeaways: data.keyTakeaways,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      audioUrl: data.audioUrl || null,
      status: data.status,
      featured: data.featured,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    }).returning();

    return res.status(201).json({ success: true, article });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save that article. Please try again.", code: "SAVE_FAILED" });
  }
});

// PATCH /api/admin/articles/:id
router.patch("/admin/articles/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const parsed = articleInputSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const updates: any = { ...parsed.data, updatedAt: new Date() };
    if (updates.body !== undefined) updates.body = sanitizeArticleBody(updates.body);
    if (updates.categorySlug !== undefined) updates.categorySlug = normalizeCategorySlug(updates.categorySlug);
    if (updates.heroImageUrl === "") updates.heroImageUrl = null;
    if (updates.audioUrl === "") updates.audioUrl = null;
    if (updates.publishedAt) updates.publishedAt = new Date(updates.publishedAt);

    const [article] = await db.update(articlesTable).set(updates)
      .where(and(eq(articlesTable.id, req.params.id), isNull(articlesTable.deletedAt))).returning();
    if (!article) return res.status(404).json({ error: "Not found" });
    return res.json({ article });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save changes to that article. Please try again.", code: "UPDATE_FAILED" });
  }
});

// DELETE /api/admin/articles/:id
router.delete("/admin/articles/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const now = new Date();
    const [article] = await db.update(articlesTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(articlesTable.id, req.params.id), isNull(articlesTable.deletedAt)))
      .returning({ id: articlesTable.id, deletedAt: articlesTable.deletedAt });
    if (!article) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true, article });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not remove that article. Please try again.", code: "DELETE_FAILED" });
  }
});

router.post("/admin/articles/:id/restore", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const [article] = await db.update(articlesTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(articlesTable.id, req.params.id), isNotNull(articlesTable.deletedAt)))
      .returning();
    if (!article) return res.status(404).json({ error: "Article not found in Trash" });
    return res.json({ success: true, article });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save that article. Please try again.", code: "SAVE_FAILED" });
  }
});

router.delete("/admin/articles/:id/permanent", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const [existing] = await db.select({ id: articlesTable.id, deletedAt: articlesTable.deletedAt })
      .from(articlesTable).where(eq(articlesTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Article not found" });
    if (!existing.deletedAt) return res.status(409).json({ error: "Move the article to Trash before permanently deleting it" });

    await db.delete(articlesTable)
      .where(and(eq(articlesTable.id, req.params.id), isNotNull(articlesTable.deletedAt)));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not remove that article. Please try again.", code: "DELETE_FAILED" });
  }
});

// GET /api/admin/papers
router.get("/admin/papers", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const trashed = req.query.trashed === "true";
    const parsedStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).safeParse(status);
    if (status && !parsedStatus.success) return res.status(400).json({ error: "Invalid status" });
    const conditions = [trashed ? isNotNull(papersTable.deletedAt) : isNull(papersTable.deletedAt)];
    if (parsedStatus.success) conditions.push(eq(papersTable.status, parsedStatus.data));
    const papers = await db.select({ paper: papersTable, category: categoriesTable })
      .from(papersTable)
      .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(papersTable.updatedAt));
    return res.json({
      papers: papers.map(r => ({
        ...r.paper,
        body: sanitizeArticleBody(r.paper.body),
        category: r.category,
      })),
      total: papers.length,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load papers. Please try again.", code: "LOAD_FAILED" });
  }
});

// POST /api/admin/papers
router.post("/admin/papers", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const parsed = paperInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const data = parsed.data;
    let slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [existing] = await db.select().from(papersTable).where(eq(papersTable.slug, slug)).limit(1);
    if (existing) slug = `${slug}-${Date.now()}`;

    const [paper] = await db.insert(papersTable).values({
      slug,
      title: data.title,
      abstract: data.abstract,
      body: sanitizeArticleBody(data.body || ""),
      categorySlug: normalizeCategorySlug(data.categorySlug),
      tags: data.tags,
      authorName: data.authorName,
      pdfUrl: data.pdfUrl || null,
      coverImageUrl: data.coverImageUrl || null,
      citationText: data.citationText,
      peerReviewed: data.peerReviewed,
      paperType: data.paperType,
      year: data.year,
      doi: data.doi,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      status: data.status,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    }).returning();

    return res.status(201).json({ success: true, paper });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save that paper. Please try again.", code: "SAVE_FAILED" });
  }
});

// PATCH /api/admin/papers/:id
router.patch("/admin/papers/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const parsed = paperInputSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const updates: any = { ...parsed.data, updatedAt: new Date() };
    if (updates.body !== undefined) updates.body = sanitizeArticleBody(updates.body);
    if (updates.categorySlug !== undefined) updates.categorySlug = normalizeCategorySlug(updates.categorySlug);
    if (updates.pdfUrl === "") updates.pdfUrl = null;
    if (updates.coverImageUrl === "") updates.coverImageUrl = null;
    if (updates.publishedAt) updates.publishedAt = new Date(updates.publishedAt);

    const [paper] = await db.update(papersTable).set(updates)
      .where(and(eq(papersTable.id, req.params.id), isNull(papersTable.deletedAt))).returning();
    if (!paper) return res.status(404).json({ error: "Not found" });
    return res.json({ paper });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save changes to that paper. Please try again.", code: "UPDATE_FAILED" });
  }
});

// DELETE /api/admin/papers/:id
router.delete("/admin/papers/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const now = new Date();
    const [paper] = await db.update(papersTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(papersTable.id, req.params.id), isNull(papersTable.deletedAt)))
      .returning({ id: papersTable.id, deletedAt: papersTable.deletedAt });
    if (!paper) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true, paper });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not remove that paper. Please try again.", code: "DELETE_FAILED" });
  }
});

router.post("/admin/papers/:id/restore", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const [paper] = await db.update(papersTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(papersTable.id, req.params.id), isNotNull(papersTable.deletedAt)))
      .returning();
    if (!paper) return res.status(404).json({ error: "Paper not found in Trash" });
    return res.json({ success: true, paper });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save that paper. Please try again.", code: "SAVE_FAILED" });
  }
});

router.delete("/admin/papers/:id/permanent", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const [existing] = await db.select({ id: papersTable.id, deletedAt: papersTable.deletedAt })
      .from(papersTable).where(eq(papersTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Paper not found" });
    if (!existing.deletedAt) return res.status(409).json({ error: "Move the paper to Trash before permanently deleting it" });

    await db.delete(papersTable)
      .where(and(eq(papersTable.id, req.params.id), isNotNull(papersTable.deletedAt)));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not remove that paper. Please try again.", code: "DELETE_FAILED" });
  }
});

// GET /api/admin/submissions
// Drafts are private working copies and must never surface here, regardless
// of the requested status filter.
router.get("/admin/submissions", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const trashed = req.query.trashed === "true";
    const conditions = [
      trashed ? isNotNull(submissionsTable.deletedAt) : isNull(submissionsTable.deletedAt),
    ];
    if (!trashed) conditions.push(ne(submissionsTable.status, "DRAFT"));
    const parsedStatus = z.enum(["RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "ACCEPTED", "REJECTED", "PUBLISHED", "ARCHIVED"]).safeParse(status);
    if (status && !parsedStatus.success) return res.status(400).json({ error: "Invalid status" });
    if (parsedStatus.success) conditions.push(eq(submissionsTable.status, parsedStatus.data));
    const submissions = await db.select().from(submissionsTable)
      .where(and(...conditions))
      .orderBy(desc(submissionsTable.createdAt));
    return res.json({
      submissions: submissions.map(submission => ({
        ...submission,
        body: sanitizeArticleBody(submission.body),
      })),
      total: submissions.length,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load submissions. Please try again.", code: "LOAD_FAILED" });
  }
});

// POST /api/admin/submissions/sync-public
// Reconciles already-linked public records only; it never backfills or creates content.
router.post("/admin/submissions/sync-public", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
  try {
    const summary = await syncPublishedSubmissions();
    return res.json({ success: true, summary });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to sync public submissions" });
  }
});

// PATCH /api/admin/submissions/:id
router.patch("/admin/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(["RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "ACCEPTED", "REJECTED", "PUBLISHED", "ARCHIVED"]).optional(),
      editorNotes: z.string().optional(),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
      categorySlug: z.string().optional(),
      domain: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const [previous] = await db.select({
      status: submissionsTable.status,
      userId: submissionsTable.userId,
      title: submissionsTable.title,
      publishedAt: submissionsTable.publishedAt,
      deletedAt: submissionsTable.deletedAt,
    }).from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id))
      .limit(1);
    if (!previous) return res.status(404).json({ error: "Not found" });
    if (previous.deletedAt) return res.status(409).json({ error: "Restore the submission before editing it" });

    const now = new Date();
    const { categorySlug, ...submissionPatch } = parsed.data;
    const updates: Record<string, any> = {
      ...submissionPatch,
      updatedAt: now,
    };
    // Publishing is idempotent on purpose. A submission can already be marked
    // PUBLISHED while its public article or paper is missing or trashed â€” that
    // is exactly the state an earlier silent failure leaves behind. Running the
    // publication step again on a submission that is already PUBLISHED is what
    // repairs it, so this must not be gated on the status changing.
    const isPublishing = parsed.data.status === "PUBLISHED";
    const isFirstPublish = isPublishing && previous.status !== "PUBLISHED";
    const isUnpublishing = Boolean(
      previous.status === "PUBLISHED"
      && parsed.data.status
      && parsed.data.status !== "PUBLISHED",
    );
    if (updates.domain) updates.domain = normalizeCategorySlug(updates.domain);
    // Only a genuine first publish stamps the date; a repair keeps the original.
    if (isFirstPublish) updates.publishedAt = now;

    const [submission] = await db.update(submissionsTable).set(updates)
      .where(and(eq(submissionsTable.id, req.params.id), isNull(submissionsTable.deletedAt))).returning();
    if (!submission) return res.status(404).json({ error: "Not found" });

    if (isPublishing) {
      let publication: any = null;
      let publicationError: any = null;
      try {
        publication = await ensurePublicPublicationForSubmission(submission, {
          categorySlug,
          publishedAt: submission.publishedAt || now,
          allowCreate: true,
        });
      } catch (publicationErr: any) {
        req.log.error({ err: publicationErr }, "Initial publication attempt failed, retrying with default archive category");
        publicationError = publicationErr;
        try {
          publication = await ensurePublicPublicationForSubmission(submission, {
            categorySlug: "archive",
            publishedAt: submission.publishedAt || now,
            allowCreate: true,
          });
          publicationError = null;
        } catch (retryErr: any) {
          req.log.error({ err: retryErr }, "Publication retry failed");
          publicationError = retryErr;
        }
      }

      // Marking the submission PUBLISHED while no public article or paper
      // exists is the worst possible outcome: the desk claims the work is
      // live, the journal shows nothing, and nobody is told. Put the status
      // back and report the failure instead.
      const publishedPublicly = Boolean(publication)
        && publication.status !== "skipped"
        && Boolean(publication.id);

      if (!publishedPublicly) {
        /*
          This undo is the only thing standing between a failed publish and a
          submission that claims to be live with nothing behind it. It was a
          single unguarded write, so a transient blip while running it produced
          exactly the state the code above exists to prevent — and left no
          trace saying so. It retries now, and if it still cannot be undone
          that fact is reported rather than swallowed.
        */
        let rolledBack = true;
        try {
          await withDbRetry(client => client.update(submissionsTable)
            .set({ status: previous.status, publishedAt: previous.publishedAt, updatedAt: new Date() })
            .where(eq(submissionsTable.id, req.params.id)));
        } catch (rollbackErr: any) {
          rolledBack = false;
          req.log.error(
            { err: rollbackErr, submissionId: req.params.id },
            "Publish failed AND the status could not be rolled back — this submission is marked published with no public record",
          );
        }

        const reason = publication?.reason || publicationError?.message || "unknown";
        if (!rolledBack) {
          return res.status(500).json({
            error: "This work could not be published, and its status could not be put back. Please reload the desk and check it.",
            code: "PUBLICATION_ROLLBACK_FAILED",
            reason,
          });
        }
        req.log.error(
          { submissionId: req.params.id, reason },
          "Publish aborted â€” no public record was created, submission status rolled back",
        );
        return res.status(502).json({
          error: "This work could not be published to the public journal, so its status was left unchanged.",
          code: "PUBLICATION_FAILED",
          reason,
        });
      }

      if (previous.status !== "PUBLISHED" && previous.userId) {
        await notifyUser({
          userId: previous.userId,
          type: "SUBMISSION_STATUS",
          message: `Your submission "${previous.title}" is now published.`,
          href: "/account",
          pushTitle: "Your work is published",
          tag: `submission-${req.params.id}`,
        });

        /*
          And everyone following this author hears about it — only on the
          genuine first publish, so a repair pass over an already-published
          submission never notifies the same people twice.
        */
        const readingHref = publication?.slug
          ? `/${publication.kind === "paper" ? "papers" : "articles"}/${publication.slug}`
          : "/browse";
        await notifyFollowersOfNewWork({
          authorId: previous.userId,
          title: previous.title || "a new piece",
          href: readingHref,
          kind: publication?.kind === "paper" ? "paper" : "essay",
        }).catch(err => req.log.warn({ err }, "Could not notify followers"));
      }
      return res.json({ submission, publication });
    }

    if (isUnpublishing) {
      await unpublishPublicPublicationForSubmission(submission.id);
    }

    if (parsed.data.status && parsed.data.status !== previous.status && previous.userId) {
      await notifyUser({
        userId: previous.userId,
        type: "SUBMISSION_STATUS",
        message: `Your submission "${previous.title}" is now ${parsed.data.status.toLowerCase().replace(/_/g, " ")}.`,
        href: "/account",
        pushTitle: "Update on your submission",
        tag: `submission-${req.params.id}`,
      });
    }

    return res.json({ submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save changes to that submission. Please try again.", code: "UPDATE_FAILED" });
  }
});

// DELETE /api/admin/submissions/:id â€” admin soft-deletes a submission
router.delete("/admin/submissions/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (existing.deletedAt) return res.status(409).json({ error: "Submission is already in Trash" });

    const now = new Date();

    // Trashing a submission also trashes the public article or paper it was
    // published as. Refusing the delete until an editor hunts down the linked
    // record on another screen left the work on the live site, which is the
    // opposite of what "delete" is asked to do. The author-side delete has
    // always cascaded this way; the desk now matches it.
    const [trashedArticle] = await db.update(articlesTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(articlesTable.sourceSubmissionId, existing.id), isNull(articlesTable.deletedAt)))
      .returning({ id: articlesTable.id, slug: articlesTable.slug });
    const [trashedPaper] = await db.update(papersTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(papersTable.sourceSubmissionId, existing.id), isNull(papersTable.deletedAt)))
      .returning({ id: papersTable.id, slug: papersTable.slug });

    const [submission] = await db.update(submissionsTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(submissionsTable.id, req.params.id), isNull(submissionsTable.deletedAt)))
      .returning();
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    return res.json({
      success: true,
      submission,
      alsoTrashed: {
        article: trashedArticle?.slug || null,
        paper: trashedPaper?.slug || null,
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not remove that submission. Please try again.", code: "DELETE_FAILED" });
  }
});

router.post("/admin/submissions/:id/restore", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const now = new Date();
    const [submission] = await db.update(submissionsTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(submissionsTable.id, req.params.id), isNotNull(submissionsTable.deletedAt)))
      .returning();
    if (!submission) return res.status(404).json({ error: "Submission not found in Trash" });

    // Mirror the cascade on delete: a restored submission brings its public
    // article or paper back with it, so a restore is not a half-restore.
    const [restoredArticle] = await db.update(articlesTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(articlesTable.sourceSubmissionId, submission.id), isNotNull(articlesTable.deletedAt)))
      .returning({ slug: articlesTable.slug });
    const [restoredPaper] = await db.update(papersTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(papersTable.sourceSubmissionId, submission.id), isNotNull(papersTable.deletedAt)))
      .returning({ slug: papersTable.slug });

    return res.json({
      success: true,
      submission,
      alsoRestored: {
        article: restoredArticle?.slug || null,
        paper: restoredPaper?.slug || null,
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save that submission. Please try again.", code: "SAVE_FAILED" });
  }
});

router.delete("/admin/submissions/:id/permanent", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const [existing] = await db.select({ id: submissionsTable.id, deletedAt: submissionsTable.deletedAt })
      .from(submissionsTable).where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });
    if (!existing.deletedAt) return res.status(409).json({ error: "Move the submission to Trash before permanently deleting it" });

    const [linkedArticle] = await db.select({ id: articlesTable.id, deletedAt: articlesTable.deletedAt })
      .from(articlesTable)
      .where(eq(articlesTable.sourceSubmissionId, req.params.id))
      .limit(1);
    const [linkedPaper] = await db.select({ id: papersTable.id, deletedAt: papersTable.deletedAt })
      .from(papersTable)
      .where(eq(papersTable.sourceSubmissionId, req.params.id))
      .limit(1);

    // Live public work is never erased as a side effect. Once the linked record
    // is itself in Trash, erasing the submission takes it along — the foreign
    // key would otherwise block the delete and strand the editor.
    if ((linkedArticle && !linkedArticle.deletedAt) || (linkedPaper && !linkedPaper.deletedAt)) {
      return res.status(409).json({
        error: "Move the linked public article or paper to Trash before permanently deleting this submission",
      });
    }

    if (linkedArticle) {
      await db.delete(articlesTable).where(eq(articlesTable.id, linkedArticle.id));
    }
    if (linkedPaper) {
      await db.delete(papersTable).where(eq(papersTable.id, linkedPaper.id));
    }

    await db.delete(submissionsTable)
      .where(and(eq(submissionsTable.id, req.params.id), isNotNull(submissionsTable.deletedAt)));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not remove that submission. Please try again.", code: "DELETE_FAILED" });
  }
});

// GET /api/admin/categories
router.get("/admin/categories", requireAdmin, async (req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.sortOrder);
    return res.json({ categories });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load the domains. Please try again.", code: "LOAD_FAILED" });
  }
});

// POST /api/admin/categories
router.post("/admin/categories", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const schema = z.object({
      slug: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().default(0),
      visible: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const [category] = await db.insert(categoriesTable).values(parsed.data).returning();
    return res.status(201).json({ success: true, category });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save that domain. Please try again.", code: "SAVE_FAILED" });
  }
});

// GET /api/admin/newsletter
router.get("/admin/newsletter", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const subscribers = await db.select().from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.isActive, true))
      .orderBy(desc(newsletterSubscribersTable.createdAt));
    return res.json({ subscribers, total: subscribers.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load the newsletter list. Please try again.", code: "LOAD_FAILED" });
  }
});

// GET /api/admin/users
router.get("/admin/users", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(desc(usersTable.createdAt));
    return res.json({ users, total: users.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load the member list. Please try again.", code: "LOAD_FAILED" });
  }
});

// PATCH /api/admin/users/:id/role - change user role (ADMIN only)
router.patch("/admin/users/:id/role", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      role: z.enum(["USER", "ADMIN"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid role" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newRole = parsed.data.role;

    // Update in usersTable
    await db.update(usersTable).set({ role: newRole as any, updatedAt: new Date() }).where(eq(usersTable.id, id));

    // Sync to adminsTable
    if (newRole === "ADMIN") {
      if (!user.password) {
        return res.status(400).json({ error: "Set a password on this account before granting administrator access" });
      }
      const [existingAdmin] = await db.select().from(adminsTable).where(eq(adminsTable.email, user.email));
      if (!existingAdmin) {
        await db.insert(adminsTable).values({
          email: user.email,
          name: user.name || "Admin User",
          password: user.password,
          role: "ADMIN" as any,
        });
      }
    } else {
      await db.delete(adminsTable).where(eq(adminsTable.email, user.email));
    }

    return res.json({ success: true, message: `Role updated to ${newRole}` });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update role" });
  }
});

// GET /api/admin/site-settings
router.get("/admin/site-settings", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
  try {
    const settings = await db.select().from(siteSettingsTable).orderBy(siteSettingsTable.key);
    return res.json({ settings });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load the site settings. Please try again.", code: "LOAD_FAILED" });
  }
});

// PUT /api/admin/site-settings/:key
router.put("/admin/site-settings/:key", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
  try {
    const schema = z.object({ value: z.string(), description: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const key = req.params.key;
    const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);

    if (existing.length > 0) {
      const [setting] = await db.update(siteSettingsTable)
        .set({ value: parsed.data.value, description: parsed.data.description, updatedAt: new Date() })
        .where(eq(siteSettingsTable.key, key)).returning();
      return res.json({ success: true, setting });
    } else {
      const [setting] = await db.insert(siteSettingsTable)
        .values({ key, value: parsed.data.value, description: parsed.data.description || "" })
        .returning();
      return res.json({ success: true, setting });
    }
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not save that setting. Please try again.", code: "SAVE_FAILED" });
  }
});

/**
 * GET /api/admin/database-info — what is this database, and is it pooled?
 *
 * Exists because the connection string is marked Sensitive in the host's
 * settings and cannot be read back by anybody, which makes an otherwise
 * trivial question — "which provider are we on?" — impossible to answer
 * without either guessing or handing the credential around. The database can
 * simply be asked.
 *
 * Nothing here can expose a credential. It reports the server's own version,
 * which roles and extensions exist, and whether the current connection arrived
 * through a pooler. No password, no host, no connection string.
 */
router.get("/admin/database-info", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
  try {
    const result: any = await db.execute(sql`
      SELECT
        version()                                                       AS "version",
        current_setting('server_version')                               AS "serverVersion",
        current_database()                                              AS "database",
        (SELECT count(*)::int FROM pg_roles
          WHERE rolname LIKE 'supabase%')                               AS "supabaseRoles",
        (SELECT count(*)::int FROM pg_available_extensions
          WHERE name = 'neon')                                          AS "neonExtension",
        (SELECT count(*)::int FROM information_schema.schemata
          WHERE schema_name IN ('auth', 'storage', 'realtime'))         AS "supabaseSchemas",
        -- A pooler (like Neon PgBouncer or Supabase pooler) connects over loopback (::1 / 127.0.0.1) or unix socket (NULL)
        (inet_client_addr() IS NULL OR inet_client_addr() = '::1'::inet OR inet_client_addr() = '127.0.0.1'::inet) AS "looksPooled",
        host(inet_client_addr())                                        AS "clientAddress",
        current_setting('max_connections')                              AS "maxConnections"
    `);
    const row = (result?.rows ?? result ?? [])[0] || {};

    const provider =
      row.supabaseRoles > 0 || row.supabaseSchemas > 0 ? "Supabase"
      : row.neonExtension > 0 ? "Neon"
      : "Unrecognised — check the provider dashboard directly";

    return res.json({
      provider,
      serverVersion: row.serverVersion,
      versionString: row.version,
      database: row.database,
      alreadyPooled: row.looksPooled === true,
      maxConnections: row.maxConnections,
      note: row.looksPooled === true
        ? "This connection already appears to run through a pooler."
        : "This looks like a direct connection — the pooled endpoint should be faster.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to inspect the database");
    return res.status(500).json({ error: "Could not inspect the database.", code: "LOAD_FAILED" });
  }
});

// POST /api/admin/submissions/sync-public-archives â€” rebuild missing public
// records for submissions already marked PUBLISHED. This is the repair path for
// a work that shows as published on the desk but is absent from the journal.
router.post("/admin/submissions/sync-public-archives", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const result = await repairMissingPublications();
    const repaired = result.repaired.length;
    return res.json({
      success: true,
      message: repaired
        ? `Rebuilt ${repaired} missing public publication${repaired === 1 ? "" : "s"} out of ${result.checked} checked.`
        : `All ${result.checked} published works already have a public page.`,
      ...result,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Sync failed" });
  }
});

// POST /api/admin/repair-schema â€” bring the live database in line with the
// application schema. Every statement is `IF NOT EXISTS`; nothing is dropped.
// A drifted database is the usual cause of publishing and editing 500s.
router.post("/admin/repair-schema", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
  try {
    const report = await repairDatabaseSchema();
    return res.json({
      success: true,
      applied: report.applied,
      skipped: report.failed.length,
      failed: report.failed,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Schema repair failed" });
  }
});

export default router;
