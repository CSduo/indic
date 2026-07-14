import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable, submissionsTable } from "@workspace/db";
import { eq, and, desc, ilike, inArray, or, sql } from "drizzle-orm";
import { categorySlugCandidates } from "../lib/publication-sync";

const router = Router();

// GET /api/articles
router.get("/articles", async (req, res) => {
  try {
    const { category, featured, q, limit: lim, offset: off } = req.query;
    const limit = Math.min(parseInt(String(lim || "20")), 50);
    const offset = parseInt(String(off || "0"));

    const conditions = [
      eq(articlesTable.status, "PUBLISHED"),
      eq(articlesTable.deleted, false),
    ];
    if (category) {
      const normalizedCategory = sql<string>`trim(both '-' from lower(regexp_replace(replace(${articlesTable.categorySlug}, '_', '-'), '[^a-z0-9]+', '-', 'g')))`;
      conditions.push(inArray(normalizedCategory, categorySlugCandidates(String(category))));
    }
    if (featured === "true") conditions.push(eq(articlesTable.featured, true));
    if (q) {
      const searchTerm = `%${q}%`;
      conditions.push(or(
        ilike(articlesTable.title, searchTerm),
        ilike(articlesTable.subtitle, searchTerm),
        ilike(articlesTable.excerpt, searchTerm),
      )!);
    }

    const articles = await db
      .select({ article: articlesTable, category: categoriesTable })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(and(...conditions))
      .orderBy(desc(articlesTable.featured), desc(articlesTable.publishedAt))
      .limit(limit).offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articlesTable)
      .where(and(...conditions));

    const result = articles.map(r => {
      const art = { ...r.article, category: r.category };
      // If readingMinutes is not stored, compute from body word count
      if (!art.readingMinutes && art.body) {
        const words = art.body.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
        art.readingMinutes = Math.max(1, Math.round(words / 200));
      }
      return art;
    });
    return res.json({ articles: result, total: Number(count), limit, offset });

  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// GET /api/articles/:slug
router.get("/articles/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [row] = await db
      .select({ article: articlesTable, category: categoriesTable })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(and(eq(articlesTable.slug, slug), eq(articlesTable.status, "PUBLISHED")))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Article not found" });
    // Filter out soft-deleted articles
    if (row.article.deleted) return res.status(404).json({ error: "Article not found" });
    return res.json({ article: { ...row.article, category: row.category } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// PATCH /api/articles/:slug/edit — author can update their own published article
router.patch("/articles/:slug/edit", async (req, res) => {
  try {
    const { getUserAuth } = await import("../lib/auth");
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "You must be logged in to edit" });

    const { slug } = req.params;
    const [row] = await db
      .select({
        article: articlesTable,
        submissionUserId: submissionsTable.userId
      })
      .from(articlesTable)
      .leftJoin(submissionsTable, eq(articlesTable.submissionId, submissionsTable.id))
      .where(and(eq(articlesTable.slug, slug), eq(articlesTable.status, "PUBLISHED")))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Article not found" });
    if (row.article.deleted) return res.status(404).json({ error: "Article not found" });

    // Only the original author (by submission's userId) can self-edit
    if (row.submissionUserId !== auth.userId) {
      return res.status(403).json({ error: "You can only edit your own articles" });
    }


    const { title, excerpt, body, heroImageUrl } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (typeof title === "string" && title.trim()) updates.title = title.trim();
    if (typeof excerpt === "string") updates.excerpt = excerpt.trim();
    if (typeof body === "string") updates.body = body;
    if (typeof heroImageUrl === "string") updates.heroImageUrl = heroImageUrl;

    const [updated] = await db
      .update(articlesTable)
      .set(updates)
      .where(eq(articlesTable.slug, slug))
      .returning();

    return res.json({ success: true, article: updated });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update article" });
  }
});

export default router;

