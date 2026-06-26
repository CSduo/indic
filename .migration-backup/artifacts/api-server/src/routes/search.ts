import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";

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

    const st = `%${q}%`;
    const [articles, papers, categories] = await Promise.all([
      db.select({ article: articlesTable, category: categoriesTable })
        .from(articlesTable)
        .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
        .where(and(eq(articlesTable.status, "PUBLISHED"), or(
          ilike(articlesTable.title, st),
          ilike(articlesTable.subtitle || "", st),
          ilike(articlesTable.excerpt || "", st),
        )!))
        .limit(10),
      db.select({ paper: papersTable, category: categoriesTable })
        .from(papersTable)
        .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
        .where(and(eq(papersTable.status, "PUBLISHED"), or(
          ilike(papersTable.title, st),
          ilike(papersTable.abstract || "", st),
        )!))
        .limit(10),
      db.select().from(categoriesTable)
        .where(and(eq(categoriesTable.visible, true), or(
          ilike(categoriesTable.name, st),
          ilike(categoriesTable.description || "", st),
        )!))
        .limit(8),
    ]);

    const articleResults = articles.map(r => ({ ...r.article, category: r.category }));
    const paperResults = papers.map(r => ({ ...r.paper, category: r.category }));

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
