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

    // Get counts per category (excluding soft-deleted ones)
    const articleCounts = await db
      .select({ slug: articlesTable.categorySlug, count: sql<number>`count(*)` })
      .from(articlesTable)
      .where(and(eq(articlesTable.status, "PUBLISHED"), eq(articlesTable.deleted, false)))
      .groupBy(articlesTable.categorySlug);

    const paperCounts = await db
      .select({ slug: papersTable.categorySlug, count: sql<number>`count(*)` })
      .from(papersTable)
      .where(and(eq(papersTable.status, "PUBLISHED"), eq(papersTable.deleted, false)))
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
    const target = slug.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");

    const [category] = await db.select()
      .from(categoriesTable)
      .where(sql`lower(replace(replace(${categoriesTable.slug}, ' ', '-'), '_', '-')) = ${target}`)
      .limit(1);

    if (!category) return res.status(404).json({ error: "Not found" });

    // Use normalized categorySlug comparison to query articles and papers robustly
    const articles = await db.select().from(articlesTable)
      .where(and(
        sql`lower(replace(replace(${articlesTable.categorySlug}, ' ', '-'), '_', '-')) = ${target}`,
        eq(articlesTable.status, "PUBLISHED"),
        eq(articlesTable.deleted, false)
      ));

    const papers = await db.select().from(papersTable)
      .where(and(
        sql`lower(replace(replace(${papersTable.categorySlug}, ' ', '-'), '_', '-')) = ${target}`,
        eq(papersTable.status, "PUBLISHED"),
        eq(papersTable.deleted, false)
      ));

    return res.json({ category, articles, papers });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
