import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, categoriesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { sanitizeArticleBody } from "../lib/content";

const router = Router();

router.get("/archive", async (req, res) => {
  try {
    const [articles, papers] = await Promise.all([
      db.select({ article: articlesTable, category: categoriesTable })
        .from(articlesTable)
        .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
        .where(and(eq(articlesTable.status, "PUBLISHED"), eq(articlesTable.deleted, false)))
        .orderBy(desc(articlesTable.publishedAt))
        .limit(500),
      db.select({ paper: papersTable, category: categoriesTable })
        .from(papersTable)
        .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
        .where(and(eq(papersTable.status, "PUBLISHED"), eq(papersTable.deleted, false)))
        .orderBy(desc(papersTable.publishedAt))
        .limit(500),
    ]);

    return res.json({
      articles: articles.map(r => ({
        ...r.article,
        body: sanitizeArticleBody(r.article.body),
        category: r.category,
      })),
      papers: papers.map(r => ({
        ...r.paper,
        body: sanitizeArticleBody(r.paper.body),
        category: r.category,
      })),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
