import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/archive", async (req, res) => {
  try {
    const [articles, papers] = await Promise.all([
      db.select({ article: articlesTable, category: categoriesTable })
        .from(articlesTable)
        .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
        .where(eq(articlesTable.status, "PUBLISHED")),
      db.select({ paper: papersTable, category: categoriesTable })
        .from(papersTable)
        .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
        .where(eq(papersTable.status, "PUBLISHED")),
    ]);

    return res.json({
      articles: articles.map(r => ({ ...r.article, category: r.category })),
      papers: papers.map(r => ({ ...r.paper, category: r.category })),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
