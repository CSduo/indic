import { Router } from "express";
import { db } from "@workspace/db";
import {
  adminsTable, articlesTable, papersTable, submissionsTable,
  newsletterSubscribersTable, categoriesTable, usersTable, siteSettingsTable,
  notificationsTable
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
import { sanitizeArticleBody } from "../lib/content";

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
  body: z.string().max(500_000).optional(),
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
  body: z.string().max(500_000).optional(),
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
    const parsedStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).safeParse(status);
    if (status && !parsedStatus.success) return res.status(400).json({ error: "Invalid status" });
    const conditions = parsedStatus.success ? [eq(articlesTable.status, parsedStatus.data)] : [];
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
    return res.status(500).json({ error: "Failed" });
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
    return res.status(500).json({ error: "Failed" });
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
      .where(eq(articlesTable.id, req.params.id)).returning();
    if (!article) return res.status(404).json({ error: "Not found" });
    return res.json({ article });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/admin/articles/:id
router.delete("/admin/articles/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const now = new Date();
    const [article] = await db.update(articlesTable)
      .set({ deleted: true, deletedAt: now, updatedAt: now })
      .where(eq(articlesTable.id, req.params.id))
      .returning({ id: articlesTable.id });
    if (!article) return res.status(404).json({ error: "Not found" });
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
    const parsedStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).safeParse(status);
    if (status && !parsedStatus.success) return res.status(400).json({ error: "Invalid status" });
    const conditions = parsedStatus.success ? [eq(papersTable.status, parsedStatus.data)] : [];
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
    return res.status(500).json({ error: "Failed" });
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
    return res.status(500).json({ error: "Failed" });
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
      .where(eq(papersTable.id, req.params.id)).returning();
    if (!paper) return res.status(404).json({ error: "Not found" });
    return res.json({ paper });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/admin/papers/:id
router.delete("/admin/papers/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
  try {
    const now = new Date();
    const [paper] = await db.update(papersTable)
      .set({ deleted: true, deletedAt: now, updatedAt: now })
      .where(eq(papersTable.id, req.params.id))
      .returning({ id: papersTable.id });
    if (!paper) return res.status(404).json({ error: "Not found" });
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
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/submissions/sync-public
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
    }).from(submissionsTable)
      .where(eq(submissionsTable.id, req.params.id))
      .limit(1);
    if (!previous) return res.status(404).json({ error: "Not found" });

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
        if (previous.status !== "PUBLISHED" && previous.userId) {
          await db.insert(notificationsTable).values({
            userId: previous.userId,
            type: "SUBMISSION_STATUS",
            message: `Your submission "${previous.title}" is now published.`,
            href: "/account",
          });
        }
        return res.json({ submission, publication });
      } catch (publicationErr: any) {
        await db.update(submissionsTable).set({
          status: previous.status,
          publishedAt: previous.publishedAt,
          updatedAt: new Date(),
        }).where(eq(submissionsTable.id, req.params.id));
        req.log.error({ err: publicationErr }, "Failed to auto-create public document from submission");
        return res.status(500).json({
          error: "Submission was marked published, but its public page could not be created. Retry publishing or run the public sync.",
          submission,
        });
      }
    }

    if (parsed.data.status && parsed.data.status !== previous.status && previous.userId) {
      await db.insert(notificationsTable).values({
        userId: previous.userId,
        type: "SUBMISSION_STATUS",
        message: `Your submission "${previous.title}" is now ${parsed.data.status.toLowerCase().replace(/_/g, " ")}.`,
        href: "/account",
      });
    }

    return res.json({ submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/admin/submissions/:id — admin soft-deletes a submission
router.delete("/admin/submissions/:id", requireAdmin, requireAdminRole("ADMIN", "EDITOR"), async (req, res) => {
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
    return res.status(500).json({ error: "Failed" });
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
    return res.status(500).json({ error: "Failed" });
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
    return res.status(500).json({ error: "Failed" });
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
    return res.status(500).json({ error: "Failed" });
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
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/submissions/sync-public-archives - manually sync and backfill published submissions
router.post("/admin/submissions/sync-public-archives", requireAdmin, requireAdminRole("ADMIN"), async (req, res) => {
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
