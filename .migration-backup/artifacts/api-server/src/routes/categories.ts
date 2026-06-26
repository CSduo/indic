import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, articlesTable, papersTable } from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";

const router = Router();

// GET /api/categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.visible, true))
      .orderBy(asc(categoriesTable.sortOrder));

    // Get counts per category
    const articleCounts = await db
      .select({ slug: articlesTable.categorySlug, count: sql<number>`count(*)` })
      .from(articlesTable)
      .where(eq(articlesTable.status, "PUBLISHED"))
      .groupBy(articlesTable.categorySlug);

    const paperCounts = await db
      .select({ slug: papersTable.categorySlug, count: sql<number>`count(*)` })
      .from(papersTable)
      .where(eq(papersTable.status, "PUBLISHED"))
      .groupBy(papersTable.categorySlug);

    const articleMap = Object.fromEntries(articleCounts.map(r => [r.slug, Number(r.count)]));
    const paperMap = Object.fromEntries(paperCounts.map(r => [r.slug, Number(r.count)]));

    const result = categories.map(cat => ({
      ...cat,
      articleCount: articleMap[cat.slug] || 0,
      paperCount: paperMap[cat.slug] || 0,
      totalCount: (articleMap[cat.slug] || 0) + (paperMap[cat.slug] || 0),
    }));

    return res.json({ categories: result });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/categories/:slug
router.get("/categories/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug)).limit(1);
    if (!category) return res.status(404).json({ error: "Not found" });

    const articles = await db.select().from(articlesTable)
      .where(and(eq(articlesTable.categorySlug, slug), eq(articlesTable.status, "PUBLISHED")));
    const papers = await db.select().from(papersTable)
      .where(and(eq(papersTable.categorySlug, slug), eq(papersTable.status, "PUBLISHED")));

    return res.json({ category, articles, papers });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
