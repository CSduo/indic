import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, articlesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /categories
router.get("/categories", async (_req, res) => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.ordering);

  const counts = await db
    .select({ categoryId: articlesTable.categoryId, count: sql<number>`count(*)::int` })
    .from(articlesTable)
    .where(eq(articlesTable.status, "published"))
    .groupBy(articlesTable.categoryId);

  const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));

  res.json(
    categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      colorAccent: c.colorAccent,
      ordering: c.ordering,
      articleCount: countMap.get(c.id) ?? 0,
    })),
  );
});

export default router;
