import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, or, sql, desc, asc } from "drizzle-orm";
import { toLikePattern } from "../lib/request";
import { sanitizeArticleBody } from "../lib/content";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const domain = req.query.domain ? String(req.query.domain).trim() : null;
    const type = req.query.type ? String(req.query.type).trim().toLowerCase() : null;
    const sort = req.query.sort ? String(req.query.sort).trim().toLowerCase() : "relevance";

    if (!q || q.length < 2) {
      return res.json({
        query: q,
        articles: [],
        papers: [],
        categories: [],
        totalCount: 0,
        suggestions: ["Ethics", "Consciousness", "Statecraft", "Civilisation", "Memory", "Science", "Geopolitics", "Philosophy"],
      });
    }

    if (q.length > 200) return res.status(400).json({ error: "Search query is too long" });
    const st = toLikePattern(q);

    // Common query components
    let articleQuery = db.select({ article: articlesTable, category: categoriesTable }).from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug));
      
    let paperQuery = db.select({ paper: papersTable, category: categoriesTable }).from(papersTable)
      .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug));

    let categoryQuery = db.select().from(categoriesTable);

    const articleConditions = [
      eq(articlesTable.status, "PUBLISHED"),
      eq(articlesTable.deleted, false),
      or(
        ilike(articlesTable.title, st),
        sql`coalesce(${articlesTable.subtitle}, '') ilike ${st}`,
        sql`coalesce(${articlesTable.excerpt}, '') ilike ${st}`
      )!
    ];

    const paperConditions = [
      eq(papersTable.status, "PUBLISHED"),
      eq(papersTable.deleted, false),
      or(
        ilike(papersTable.title, st),
        sql`coalesce(${papersTable.abstract}, '') ilike ${st}`
      )!
    ];

    const categoryConditions = [
      eq(categoriesTable.visible, true),
      or(
        ilike(categoriesTable.name, st),
        sql`coalesce(${categoriesTable.description}, '') ilike ${st}`
      )!
    ];

    if (domain) {
      articleConditions.push(eq(articlesTable.categorySlug, domain));
      paperConditions.push(eq(papersTable.categorySlug, domain));
      categoryConditions.push(eq(categoriesTable.slug, domain));
    }

    let articles: any[] = [];
    let papers: any[] = [];
    let categories: any[] = [];

    // Sorting Order
    // default relevance order - Title matches weighted higher
    const articleRelevanceOrder = sql`CASE WHEN ${articlesTable.title} ILIKE ${st} THEN 0 ELSE 1 END, ${articlesTable.publishedAt} DESC`;
    const paperRelevanceOrder = sql`CASE WHEN ${papersTable.title} ILIKE ${st} THEN 0 ELSE 1 END, ${papersTable.publishedAt} DESC`;
    const categoryRelevanceOrder = sql`CASE WHEN ${categoriesTable.name} ILIKE ${st} THEN 0 ELSE 1 END`;

    const getArticleOrderBy = () => {
      if (sort === "newest") return desc(articlesTable.publishedAt);
      if (sort === "oldest") return asc(articlesTable.publishedAt);
      return articleRelevanceOrder;
    };

    const getPaperOrderBy = () => {
      if (sort === "newest") return desc(papersTable.publishedAt);
      if (sort === "oldest") return asc(papersTable.publishedAt);
      return paperRelevanceOrder;
    };

    const getCategoryOrderBy = () => {
      return categoryRelevanceOrder; // Newest/oldest doesn't make sense for categories typically
    };

    if (!type || type === "article") {
      articles = await articleQuery
        .where(and(...articleConditions))
        .orderBy(getArticleOrderBy())
        .limit(20); // increased limit since filtering is applied
    }

    if (!type || type === "paper") {
      papers = await paperQuery
        .where(and(...paperConditions))
        .orderBy(getPaperOrderBy())
        .limit(20);
    }

    if (!type) {
      categories = await categoryQuery
        .where(and(...categoryConditions))
        .orderBy(getCategoryOrderBy())
        .limit(8);
    }

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
