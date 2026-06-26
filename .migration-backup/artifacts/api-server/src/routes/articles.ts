import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable } from "@workspace/db";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";

const router = Router();

// GET /api/articles
router.get("/articles", async (req, res) => {
  try {
    const { category, featured, q, limit: lim, offset: off } = req.query;
    const limit = Math.min(parseInt(String(lim || "20")), 50);
    const offset = parseInt(String(off || "0"));

    let query = db
      .select({ article: articlesTable, category: categoriesTable })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(eq(articlesTable.status, "PUBLISHED"))
      .orderBy(desc(articlesTable.featured), desc(articlesTable.publishedAt))
      .limit(limit).offset(offset);

    const conditions = [eq(articlesTable.status, "PUBLISHED")];
    if (category) conditions.push(eq(articlesTable.categorySlug, String(category)));
    if (featured === "true") conditions.push(eq(articlesTable.featured, true));
    if (q) {
      const searchTerm = `%${q}%`;
      conditions.push(or(
        ilike(articlesTable.title, searchTerm),
        ilike(articlesTable.subtitle || "", searchTerm),
        ilike(articlesTable.excerpt || "", searchTerm),
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

    const result = articles.map(r => ({ ...r.article, category: r.category }));
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
    return res.json({ article: { ...row.article, category: row.category } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
