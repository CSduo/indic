import { Router } from "express";
import { db } from "@workspace/db";
import { papersTable, categoriesTable } from "@workspace/db";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";

const router = Router();

// GET /api/papers
router.get("/papers", async (req, res) => {
  try {
    const { category, peerReviewed, q, limit: lim, offset: off } = req.query;
    const limit = Math.min(parseInt(String(lim || "20")), 50);
    const offset = parseInt(String(off || "0"));

    const conditions = [eq(papersTable.status, "PUBLISHED")];
    if (category) conditions.push(eq(papersTable.categorySlug, String(category)));
    if (peerReviewed === "true") conditions.push(eq(papersTable.peerReviewed, true));
    if (q) {
      const searchTerm = `%${q}%`;
      conditions.push(or(
        ilike(papersTable.title, searchTerm),
        ilike(papersTable.abstract || "", searchTerm),
      )!);
    }

    const papers = await db
      .select({ paper: papersTable, category: categoriesTable })
      .from(papersTable)
      .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
      .where(and(...conditions))
      .orderBy(desc(papersTable.publishedAt))
      .limit(limit).offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(papersTable)
      .where(and(...conditions));

    const result = papers.map(r => ({ ...r.paper, category: r.category }));
    return res.json({ papers: result, total: Number(count), limit, offset });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/papers/:slug
router.get("/papers/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [row] = await db
      .select({ paper: papersTable, category: categoriesTable })
      .from(papersTable)
      .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
      .where(and(eq(papersTable.slug, slug), eq(papersTable.status, "PUBLISHED")))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Paper not found" });
    return res.json({ paper: { ...row.paper, category: row.category } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
