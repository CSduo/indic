import { Router } from "express";
import { db } from "@workspace/db";
import { papersTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { eq, and, desc, ilike, inArray, or, sql, isNull } from "drizzle-orm";
import { categorySlugCandidates } from "../lib/publication-sync";
import { sanitizeArticleBody } from "../lib/content";
import { parsePagination, toLikePattern } from "../lib/request";

const router = Router();

// GET /api/papers
router.get("/papers", async (req, res) => {
  try {
    const { category, peerReviewed, q, limit: lim, offset: off } = req.query;
    const { limit, offset } = parsePagination(lim, off);

    const conditions = [
      eq(papersTable.status, "PUBLISHED"),
      isNull(papersTable.deletedAt),
    ];
    if (category) {
      const normalizedCategory = sql<string>`trim(both '-' from lower(regexp_replace(replace(${papersTable.categorySlug}, '_', '-'), '[^a-z0-9]+', '-', 'g')))`;
      conditions.push(inArray(normalizedCategory, categorySlugCandidates(String(category))));
    }
    if (peerReviewed === "true") conditions.push(eq(papersTable.peerReviewed, true));
    if (q) {
      const searchTerm = toLikePattern(String(q));
      conditions.push(or(
        ilike(papersTable.title, searchTerm),
        ilike(papersTable.abstract, searchTerm),
      )!);
    }

    const includeBody = req.query.includeBody === "true";

    const papers = await db
      .select({
        id: papersTable.id,
        slug: papersTable.slug,
        title: papersTable.title,
        abstract: papersTable.abstract,
        coverImageUrl: papersTable.coverImageUrl,
        categorySlug: papersTable.categorySlug,
        authorName: papersTable.authorName,
        peerReviewed: papersTable.peerReviewed,
        status: papersTable.status,
        publishedAt: papersTable.publishedAt,
        updatedAt: papersTable.updatedAt,
        pdfUrl: papersTable.pdfUrl,
        ...(includeBody ? { body: papersTable.body } : {}),
        category: categoriesTable,
      })
      .from(papersTable)
      .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
      .where(and(...conditions))
      .orderBy(desc(papersTable.publishedAt), desc(papersTable.id))
      .limit(limit).offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(papersTable)
      .where(and(...conditions));

    const result = papers.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      abstract: r.abstract,
      coverImageUrl: r.coverImageUrl,
      categorySlug: r.categorySlug,
      authorName: r.authorName,
      peerReviewed: r.peerReviewed,
      status: r.status,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      pdfUrl: r.pdfUrl,
      category: r.category,
      ...((includeBody && (r as any).body) ? { body: sanitizeArticleBody((r as any).body) } : {}),
    }));

    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=600");
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
      .select({
        paper: papersTable,
        category: categoriesTable,
      })
      .from(papersTable)
      .leftJoin(categoriesTable, eq(papersTable.categorySlug, categoriesTable.slug))
      .where(and(eq(papersTable.slug, slug), eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Paper not found" });

    return res.json({
      paper: {
        ...row.paper,
        body: sanitizeArticleBody(row.paper.body),
        category: row.category,
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
