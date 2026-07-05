import { Router } from "express";
import { db } from "@workspace/db";
import {
  adminsTable, articlesTable, papersTable, submissionsTable,
  newsletterSubscribersTable, categoriesTable, usersTable, siteSettingsTable
} from "@workspace/db";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import {
  hashPassword, comparePassword, createAdminToken,
  getAdminAuth, setAdminCookie, clearAdminCookie
} from "../lib/auth";
import {
  ensurePublicPublicationForSubmission,
  normalizeCategorySlug,
  syncPublishedSubmissions,
} from "../lib/publication-sync";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const articleInputSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  categorySlug: z.string().min(1),
  tags: z.array(z.string()).default([]),
  authorName: z.string().optional(),
  heroImageUrl: z.string().optional(),
  heroImageAlt: z.string().optional(),
  keyTakeaways: z.array(z.string()).default([]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  audioUrl: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  publishedAt: z.string().optional(),
});

const paperInputSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1),
  abstract: z.string().optional(),
  body: z.string().optional(),
  categorySlug: z.string().min(1),
  tags: z.array(z.string()).default([]),
  authorName: z.string().optional(),
  pdfUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  citationText: z.string().optional(),
  peerReviewed: z.boolean().default(false),
  paperType: z.enum(["RESEARCH_PAPER", "WORKING_PAPER", "REVIEW_ESSAY", "MONOGRAPH", "TRANSLATION", "ARCHIVAL_NOTE"]).default("RESEARCH_PAPER"),
  year: z.number().optional(),
  doi: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
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
      const envPlain = process.env.ADMIN_PASSWORD;

      let valid = false;
      if (envHash) {
        valid = await comparePassword(password, envHash);
      } else if (envPlain) {
        valid = password === envPlain;
      }

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
    return res.status(500).json({ error: "Failed" });
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
      [{ total: newsletterCount }],
      recentSubmissions,
    ] = await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(articlesTable),
      db.select({ total: sql<number>`count(*)` }).from(articlesTable).where(eq(articlesTable.status, "PUBLISHED")),
      db.select({ total: sql<number>`count(*)` }).from(articlesTable).where(eq(articlesTable.status, "DRAFT")),
      db.select({ total: sql<number>`count(*)` }).from(papersTable),
      db.select({ total: sql<number>`count(*)` }).from(papersTable).where(eq(papersTable.status, "PUBLISHED")),
      db.select({ total: sql<number>`count(*)` }).from(submissionsTable).where(eq(submissionsTable.status, "RECEIVED")),
      db.select({ total: sql<number>`count(*)` }).from(submissionsTable).where(ne(submissionsTable.status, "DRAFT")),
      db.select({ total: sql<number>`count(*)` }).from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.isActive, true)),
      db.select().from(submissionsTable).where(ne(submissionsTable.status, "DRAFT")).orderBy(desc(submissionsTable.createdAt)).limit(5),
    ]);

    return res.json({
      articles: { total: Number(totalArticles), published: Number(publishedArticles), drafts: Number(draftArticles) },
      papers: { total: Number(totalPapers), published: Number(publishedPapers) },
      submissions: { total: Number(totalSubmissions), new: Number(newSubmissions) },
      newsletter: { subscribers: Number(newsletterCount) },
      recentSubmissions,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/articles
router.get("/admin/articles", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = status ? [eq(articlesTable.status, status as any)] : [];
    const articles = await db.select({ article: articlesTable, category: categoriesTable })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(articlesTable.updatedAt))
      .limit(100);
    return res.json({ articles: articles.map(r => ({ ...r.article, category: r.category })), total: articles.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/articles
router.post("/admin/articles", requireAdmin, async (req, res) => {
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
      body: data.body || "",
      categorySlug: data.categorySlug,
      tags: data.tags,
      authorName: data.authorName,
      heroImageUrl: data.heroImageUrl,
      heroImageAlt: data.heroImageAlt,
      keyTakeaways: data.keyTakeaways,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      audioUrl: data.audioUrl,
      status: data.status,
      featured: data.featured,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    }).returning();

    return res.status(201).json({ success: true, article });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// PATCH /api/admin/articles/:id
router.patch("/admin/articles/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = articleInputSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const updates: any = { ...parsed.data, updatedAt: new Date() };
    if (updates.publishedAt) updates.publishedAt = new Date(updates.publishedAt);

    const [article] = await db.update(articlesTable).set(updates)
      .where(eq(articlesTable.id, req.params.id)).returning();
    if (!article) return res.status(404).json({ error: "Not found" });
    return res.json({ article });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/admin/articles/:id
router.delete("/admin/articles/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(articlesTable).where(eq(articlesTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/papers
router.get("/admin/papers", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = status ? [eq(papersTable.status, status as any)] : [];
    const papers = await db.select({ paper: papersTable, category: categoriesTable })
      .from(papersTable)
      .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(papersTable.updatedAt));
    return res.json({ papers: papers.map(r => ({ ...r.paper, category: r.category })), total: papers.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/papers
router.post("/admin/papers", requireAdmin, async (req, res) => {
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
      body: data.body || "",
      categorySlug: data.categorySlug,
      tags: data.tags,
      authorName: data.authorName,
      pdfUrl: data.pdfUrl,
      coverImageUrl: data.coverImageUrl,
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
    return res.status(500).json({ error: "Failed" });
  }
});

// PATCH /api/admin/papers/:id
router.patch("/admin/papers/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = paperInputSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const updates: any = { ...parsed.data, updatedAt: new Date() };
    if (updates.publishedAt) updates.publishedAt = new Date(updates.publishedAt);

    const [paper] = await db.update(papersTable).set(updates)
      .where(eq(papersTable.id, req.params.id)).returning();
    if (!paper) return res.status(404).json({ error: "Not found" });
    return res.json({ paper });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/admin/papers/:id
router.delete("/admin/papers/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(papersTable).where(eq(papersTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/submissions
// Drafts are private working copies and must never surface here, regardless
// of the requested status filter.
router.get("/admin/submissions", requireAdmin, async (req, res) => {
  try {
    const { status, deleted } = req.query;
    const showDeleted = deleted === "true";
    const conditions = [
      ne(submissionsTable.status, "DRAFT"),
      eq(submissionsTable.deleted, showDeleted)
    ];
    if (status && status !== "DRAFT") conditions.push(eq(submissionsTable.status, status as any));
    const submissions = await db.select().from(submissionsTable)
      .where(and(...conditions))
      .orderBy(desc(submissionsTable.createdAt));
    return res.json({ submissions, total: submissions.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/submissions/sync-public
router.post("/admin/submissions/sync-public", requireAdmin, async (req, res) => {
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

    const now = new Date();
    const { categorySlug, ...submissionPatch } = parsed.data;
    const updates: Record<string, any> = {
      ...submissionPatch,
      updatedAt: now,
    };
    if (updates.domain) updates.domain = normalizeCategorySlug(updates.domain);
    if (parsed.data.status === "PUBLISHED") updates.publishedAt = now;

    const [submission] = await db.update(submissionsTable).set(updates)
      .where(eq(submissionsTable.id, req.params.id)).returning();
    if (!submission) return res.status(404).json({ error: "Not found" });

    if (parsed.data.status === "PUBLISHED") {
      try {
        const publication = await ensurePublicPublicationForSubmission(submission, {
          categorySlug,
          publishedAt: submission.publishedAt || now,
        });
        return res.json({ submission, publication });
      } catch (publicationErr: any) {
        req.log.error({ err: publicationErr }, "Failed to auto-create public document from submission");
        return res.status(500).json({
          error: "Submission was marked published, but its public page could not be created. Retry publishing or run the public sync.",
          submission,
        });
      }
    }

    return res.json({ submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/admin/submissions/:id — admin soft-deletes a submission
router.delete("/admin/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const [existing] = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found" });

    const now = new Date();
    await db.update(submissionsTable)
      .set({ deleted: true, deletedAt: now, updatedAt: now })
      .where(eq(submissionsTable.id, req.params.id));

    // Also soft-delete any linked public article/paper.
    try {
      const [bySubId] = await db.select({ id: articlesTable.id })
        .from(articlesTable)
        .where(eq(articlesTable.submissionId, existing.id))
        .limit(1);
      if (bySubId) {
        await db.update(articlesTable)
          .set({ deleted: true, deletedAt: now, updatedAt: now })
          .where(eq(articlesTable.id, bySubId.id));
      } else {
        const [byTitle] = await db.select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.title, existing.title))
          .limit(1);
        if (byTitle) {
          await db.update(articlesTable)
            .set({ deleted: true, deletedAt: now, updatedAt: now })
            .where(eq(articlesTable.id, byTitle.id));
        }
      }

      const [paperBySubId] = await db.select({ id: papersTable.id })
        .from(papersTable)
        .where(eq(papersTable.submissionId, existing.id))
        .limit(1);
      if (paperBySubId) {
        await db.update(papersTable)
          .set({ deleted: true, deletedAt: now, updatedAt: now })
          .where(eq(papersTable.id, paperBySubId.id));
      }
    } catch {
      // Best effort
    }

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/categories
router.get("/admin/categories", requireAdmin, async (req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.sortOrder);
    return res.json({ categories });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/categories
router.post("/admin/categories", requireAdmin, async (req, res) => {
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
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/newsletter
router.get("/admin/newsletter", requireAdmin, async (req, res) => {
  try {
    const subscribers = await db.select().from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.isActive, true))
      .orderBy(desc(newsletterSubscribersTable.createdAt));
    return res.json({ subscribers, total: subscribers.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/users
router.get("/admin/users", requireAdmin, async (req, res) => {
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
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/site-settings
router.get("/admin/site-settings", requireAdmin, async (req, res) => {
  try {
    const settings = await db.select().from(siteSettingsTable).orderBy(siteSettingsTable.key);
    return res.json({ settings });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// PUT /api/admin/site-settings/:key
router.put("/admin/site-settings/:key", requireAdmin, async (req, res) => {
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
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/submissions/sync-public-archives - manually sync and backfill published submissions
router.post("/admin/submissions/sync-public-archives", requireAdmin, async (req, res) => {
  try {
    const { syncPublishedArchives } = await import("../lib/publishHelper");
    const count = await syncPublishedArchives();
    return res.json({ success: true, message: `Successfully synchronized public archives. Restored ${count} publications.` });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Sync failed", detail: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
