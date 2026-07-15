import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { toLikePattern } from "../lib/request";
import { sanitizeArticleBody } from "../lib/content";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q || q.length < 2) {
      return res.json({
        query: q,
        articles: [],
        papers: [],
        categories: [],
        suggestions: ["Ethics", "Consciousness", "Statecraft", "Civilisation", "Memory", "Science", "Geopolitics", "Philosophy"],
      });
    }

    if (q.length > 200) return res.status(400).json({ error: "Search query is too long" });
    const st = toLikePattern(q);
    const [articles, papers, categories] = await Promise.all([
      db.select({ article: articlesTable, category: categoriesTable })
        .from(articlesTable)
        .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
        .where(and(eq(articlesTable.status, "PUBLISHED"), eq(articlesTable.deleted, false), or(
          ilike(articlesTable.title, st),
          sql`coalesce(${articlesTable.subtitle}, '') ilike ${st}`,
          sql`coalesce(${articlesTable.excerpt}, '') ilike ${st}`,
        )!))
        .limit(10),
      db.select({ paper: papersTable, category: categoriesTable })
        .from(papersTable)
        .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
        .where(and(eq(papersTable.status, "PUBLISHED"), eq(papersTable.deleted, false), or(
          ilike(papersTable.title, st),
          sql`coalesce(${papersTable.abstract}, '') ilike ${st}`,
        )!))
        .limit(10),
      db.select().from(categoriesTable)
        .where(and(eq(categoriesTable.visible, true), or(
          ilike(categoriesTable.name, st),
          sql`coalesce(${categoriesTable.description}, '') ilike ${st}`,
        )!))
        .limit(8),
    ]);

    const articleResults = articles.map(r => ({
      ...r.article,
      body: sanitizeArticleBody(r.article.body),
      category: r.category,
    }));
    const paperResults = papers.map(r => ({
      ...r.paper,
      body: sanitizeArticleBody(r.paper.body),
      category: r.category,
    }));

    return res.json({
      query: q,
      articles: articleResults,
      papers: paperResults,
      categories,
      totalCount: articleResults.length + paperResults.length + categories.length,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Search failed" });
  }
});

export default router;
