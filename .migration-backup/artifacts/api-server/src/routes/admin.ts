import { Router } from "express";
import { db } from "@workspace/db";
import {
  adminsTable, articlesTable, papersTable, submissionsTable,
  newsletterSubscribersTable, categoriesTable
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  hashPassword, comparePassword, createAdminToken,
  getAdminAuth, setAdminCookie, clearAdminCookie
} from "../lib/auth";
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
      db.select({ total: sql<number>`count(*)` }).from(submissionsTable),
      db.select({ total: sql<number>`count(*)` }).from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.isActive, true)),
      db.select().from(submissionsTable).orderBy(desc(submissionsTable.createdAt)).limit(5),
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
router.get("/admin/submissions", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = status ? [eq(submissionsTable.status, status as any)] : [];
    const submissions = await db.select().from(submissionsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(submissionsTable.createdAt));
    return res.json({ submissions, total: submissions.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// PATCH /api/admin/submissions/:id
router.patch("/admin/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(["RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "ACCEPTED", "REJECTED", "PUBLISHED", "ARCHIVED"]).optional(),
      editorNotes: z.string().optional(),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const [submission] = await db.update(submissionsTable).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(submissionsTable.id, req.params.id)).returning();
    if (!submission) return res.status(404).json({ error: "Not found" });
    return res.json({ submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/admin/submissions/:id
router.delete("/admin/submissions/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(submissionsTable).where(eq(submissionsTable.id, req.params.id));
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

export default router;
