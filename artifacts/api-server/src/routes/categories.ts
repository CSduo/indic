import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, articlesTable, papersTable } from "@workspace/db";
import { eq, and, asc, inArray, isNull, sql } from "drizzle-orm";
import { categorySlugCandidates, normalizeCategorySlug } from "../lib/publication-sync";

const router = Router();

// GET /api/categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.visible, true))
      .orderBy(asc(categoriesTable.sortOrder));

    // Get counts per category, including legacy category spellings.
    const articleCategorySlug = sql<string>`trim(both '-' from lower(regexp_replace(replace(${articlesTable.categorySlug}, '_', '-'), '[^a-z0-9]+', '-', 'g')))`;
    const paperCategorySlug = sql<string>`trim(both '-' from lower(regexp_replace(replace(${papersTable.categorySlug}, '_', '-'), '[^a-z0-9]+', '-', 'g')))`;
    const articleCounts = await db
      .select({ slug: articleCategorySlug, count: sql<number>`count(*)` })
      .from(articlesTable)
      .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)))
      .groupBy(articleCategorySlug);

    const paperCounts = await db
      .select({ slug: paperCategorySlug, count: sql<number>`count(*)` })
      .from(papersTable)
      .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)))
      .groupBy(paperCategorySlug);

    const articleMap: Record<string, number> = {};
    for (const row of articleCounts) {
      const slug = normalizeCategorySlug(row.slug);
      articleMap[slug] = (articleMap[slug] || 0) + Number(row.count);
    }
    const paperMap: Record<string, number> = {};
    for (const row of paperCounts) {
      const slug = normalizeCategorySlug(row.slug);
      paperMap[slug] = (paperMap[slug] || 0) + Number(row.count);
    }

    const result = categories.map(cat => ({
      ...cat,
      articleCount: articleMap[cat.slug] || 0,
      paperCount: paperMap[cat.slug] || 0,
      totalCount: (articleMap[cat.slug] || 0) + (paperMap[cat.slug] || 0),
    }));

    return res.json({ categories: result });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load the domains. Please try again.", code: "LOAD_FAILED" });
  }
});

// GET /api/categories/:slug
router.get("/categories/:slug", async (req, res) => {
  try {
    const slug = normalizeCategorySlug(req.params.slug);
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug)).limit(1);
    if (!category) return res.status(404).json({ error: "Not found" });

    const candidates = categorySlugCandidates(slug);
    const articleCategory = sql<string>`trim(both '-' from lower(regexp_replace(replace(${articlesTable.categorySlug}, '_', '-'), '[^a-z0-9]+', '-', 'g')))`;
    const paperCategory = sql<string>`trim(both '-' from lower(regexp_replace(replace(${papersTable.categorySlug}, '_', '-'), '[^a-z0-9]+', '-', 'g')))`;

    const articles = await db.select().from(articlesTable)
      .where(and(inArray(articleCategory, candidates), eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)));
    const papers = await db.select().from(papersTable)
      .where(and(inArray(paperCategory, candidates), eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)));

    return res.json({ category, articles, papers });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load that domain. Please try again.", code: "LOAD_FAILED" });
  }
});

export default router;
