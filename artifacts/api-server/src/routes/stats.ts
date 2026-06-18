import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, newsletterSubscribersTable, submissionsTable, categoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /stats
router.get("/stats", async (_req, res) => {
  const [artCount, paperCount, subCount, submissionCount, catCounts] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(articlesTable).where(eq(articlesTable.status, "published")),
    db.select({ count: sql<number>`count(*)::int` }).from(papersTable).where(eq(papersTable.status, "published")),
    db.select({ count: sql<number>`count(*)::int` }).from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.active, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(submissionsTable),
    db.select({ categoryId: articlesTable.categoryId, count: sql<number>`count(*)::int` }).from(articlesTable).where(eq(articlesTable.status, "published")).groupBy(articlesTable.categoryId),
  ]);

  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const categoryCounts = catCounts
    .filter((c) => c.categoryId !== null)
    .map((c) => ({
      categorySlug: catMap.get(c.categoryId!)?.slug ?? "",
      categoryName: catMap.get(c.categoryId!)?.name ?? "",
      count: c.count,
    }));

  res.json({
    totalArticles: artCount[0]?.count ?? 0,
    totalPapers: paperCount[0]?.count ?? 0,
    totalSubscribers: subCount[0]?.count ?? 0,
    totalSubmissions: submissionCount[0]?.count ?? 0,
    categoryCounts,
  });
});

export default router;
