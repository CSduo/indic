import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, categoriesTable, authorsTable } from "@workspace/db";
import { eq, ilike, or, and, desc } from "drizzle-orm";
import { searchRateLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// GET /search?q=&type=&category=
router.get("/search", searchRateLimiter, async (req, res) => {
  const { q = "", type = "all", category } = req.query as Record<string, string>;

  if (!q || q.trim().length < 2) {
    res.json({ query: q, articles: [], papers: [], categories: [], total: 0 });
    return;
  }

  const term = `%${q.trim()}%`;
  const results: { articles: unknown[]; papers: unknown[]; categories: unknown[] } = {
    articles: [],
    papers: [],
    categories: [],
  };

  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const authors = await db.select().from(authorsTable);
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  let catFilter: number | undefined;
  if (category) {
    const cat = categories.find((c) => c.slug === category);
    catFilter = cat?.id;
  }

  if (type === "all" || type === "article") {
    const conds = [
      eq(articlesTable.status, "published"),
      or(ilike(articlesTable.title, term), ilike(articlesTable.excerpt, term), ilike(articlesTable.subtitle, term))!,
    ];
    if (catFilter) conds.push(eq(articlesTable.categoryId, catFilter));
    const arts = await db.select().from(articlesTable).where(and(...conds)).orderBy(desc(articlesTable.publishedAt)).limit(20);
    results.articles = arts.map((a) => {
      const cat = catMap.get(a.categoryId ?? 0);
      const author = authorMap.get(a.authorId ?? 0);
      return {
        id: a.id, slug: a.slug, title: a.title, subtitle: a.subtitle, excerpt: a.excerpt,
        coverImage: a.coverImage, categoryId: a.categoryId ?? 0, categorySlug: cat?.slug ?? "",
        categoryName: cat?.name ?? "", authorId: a.authorId ?? 0, authorName: author?.name ?? "",
        status: a.status, featured: a.featured, publishedAt: a.publishedAt?.toISOString() ?? null,
        updatedAt: a.updatedAt.toISOString(), readingTime: a.readingTime, audioUrl: a.audioUrl,
        keyTakeaways: a.keyTakeaways, references: a.referencesList, tags: [], views: a.views,
      };
    });
  }

  if (type === "all" || type === "paper") {
    const conds = [
      eq(papersTable.status, "published"),
      or(ilike(papersTable.title, term), ilike(papersTable.abstract, term))!,
    ];
    if (catFilter) conds.push(eq(papersTable.categoryId, catFilter));
    const pps = await db.select().from(papersTable).where(and(...conds)).orderBy(desc(papersTable.publishedAt)).limit(20);
    results.papers = pps.map((p) => {
      const cat = catMap.get(p.categoryId ?? 0);
      const author = authorMap.get(p.authorId ?? 0);
      return {
        id: p.id, slug: p.slug, title: p.title, abstract: p.abstract, pdfUrl: p.pdfUrl,
        categoryId: p.categoryId ?? 0, categorySlug: cat?.slug ?? "", categoryName: cat?.name ?? "",
        authorId: p.authorId ?? 0, authorName: author?.name ?? "", status: p.status,
        peerReviewed: p.peerReviewed, citationText: p.citationText, publicationType: p.publicationType,
        publishedAt: p.publishedAt?.toISOString() ?? null, downloadCount: p.downloadCount, tags: [],
      };
    });
  }

  if (type === "all" || type === "category") {
    const cats = categories.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.toLowerCase().includes(q.toLowerCase()));
    results.categories = cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, icon: c.icon, colorAccent: c.colorAccent, ordering: c.ordering, articleCount: 0 }));
  }

  const total = results.articles.length + results.papers.length + results.categories.length;
  res.json({ query: q, ...results, total });
});

export default router;
