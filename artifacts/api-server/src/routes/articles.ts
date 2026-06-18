import { Router } from "express";
import { db } from "@workspace/db";
import {
  articlesTable, categoriesTable, authorsTable,
  tagsTable, articleTagsTable, siteSettingsTable,
} from "@workspace/db";
import { eq, desc, and, ilike, or, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import { z } from "zod/v4";

const router = Router();

type ArticleRow = typeof articlesTable.$inferSelect;
type CategoryRow = typeof categoriesTable.$inferSelect;
type AuthorRow = typeof authorsTable.$inferSelect;

async function getTagsForArticle(articleId: number): Promise<string[]> {
  const rows = await db
    .select({ name: tagsTable.name })
    .from(articleTagsTable)
    .innerJoin(tagsTable, eq(articleTagsTable.tagId, tagsTable.id))
    .where(eq(articleTagsTable.articleId, articleId));
  return rows.map((r) => r.name);
}

async function upsertTags(tagNames: string[], articleId: number) {
  await db.delete(articleTagsTable).where(eq(articleTagsTable.articleId, articleId));
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let [tag] = await db.select().from(tagsTable).where(eq(tagsTable.slug, slug)).limit(1);
    if (!tag) {
      [tag] = await db.insert(tagsTable).values({ slug, name }).returning();
    }
    await db.insert(articleTagsTable).values({ articleId, tagId: tag!.id }).onConflictDoNothing();
  }
}

function formatArticle(
  a: ArticleRow,
  cat: CategoryRow | undefined,
  author: AuthorRow | undefined,
  tags: string[],
) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    excerpt: a.excerpt,
    content: a.content,
    coverImage: a.coverImage,
    categoryId: a.categoryId ?? 0,
    categorySlug: cat?.slug ?? "",
    categoryName: cat?.name ?? "",
    authorId: a.authorId ?? 0,
    authorName: author?.name ?? "",
    status: a.status,
    featured: a.featured,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    updatedAt: a.updatedAt.toISOString(),
    readingTime: a.readingTime,
    audioUrl: a.audioUrl,
    keyTakeaways: a.keyTakeaways,
    references: a.referencesList,
    tags,
    views: a.views,
  };
}

// GET /articles
router.get("/articles", async (req, res) => {
  const { status, category, tag, featured, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (status) conditions.push(eq(articlesTable.status, status));
  else conditions.push(eq(articlesTable.status, "published"));
  if (category) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, category)).limit(1);
    if (cat) conditions.push(eq(articlesTable.categoryId, cat.id));
  }
  if (featured === "true") conditions.push(eq(articlesTable.featured, true));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [articles, total] = await Promise.all([
    db.select().from(articlesTable).where(where).orderBy(desc(articlesTable.publishedAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(articlesTable).where(where),
  ]);

  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const authors = await db.select().from(authorsTable);
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const result = await Promise.all(
    articles.map(async (a) => {
      const tags = await getTagsForArticle(a.id);
      return formatArticle(a, catMap.get(a.categoryId ?? 0), authorMap.get(a.authorId ?? 0), tags);
    }),
  );

  const totalCount = total[0]?.count ?? 0;
  res.json({ articles: result, total: totalCount, page: pageNum, limit: limitNum, hasMore: offset + limitNum < totalCount });
});

// POST /articles
router.post("/articles", requireAdmin, async (req, res) => {
  const schema = z.object({
    slug: z.string().optional(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.string().default(""),
    coverImage: z.string().optional(),
    categoryId: z.number().int(),
    authorId: z.number().int(),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    featured: z.boolean().default(false),
    readingTime: z.number().int().default(5),
    audioUrl: z.string().optional(),
    keyTakeaways: z.array(z.string()).optional(),
    references: z.array(z.string()).optional(),
    tags: z.array(z.string()).default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }

  const { tags, references, ...data } = parsed.data;
  const slug = data.slug ?? data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").substring(0, 80);

  const [article] = await db.insert(articlesTable).values({
    ...data,
    slug,
    referencesList: references,
    publishedAt: data.status === "published" ? new Date() : null,
  }).returning();

  await upsertTags(tags, article!.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, article!.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, article!.authorId ?? 0));
  res.status(201).json(formatArticle(article!, cat, author, tags));
});

// GET /articles/featured
router.get("/articles/featured", async (_req, res) => {
  const [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1));
  
  let article: ArticleRow | undefined;
  if (settings?.featuredArticleId) {
    const rows = await db.select().from(articlesTable).where(eq(articlesTable.id, settings.featuredArticleId)).limit(1);
    article = rows[0];
  }
  if (!article) {
    const rows = await db.select().from(articlesTable).where(and(eq(articlesTable.status, "published"), eq(articlesTable.featured, true))).orderBy(desc(articlesTable.publishedAt)).limit(1);
    article = rows[0];
  }
  if (!article) {
    const rows = await db.select().from(articlesTable).where(eq(articlesTable.status, "published")).orderBy(desc(articlesTable.publishedAt)).limit(1);
    article = rows[0];
  }
  if (!article) { res.status(404).json({ error: "No article found" }); return; }

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, article.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, article.authorId ?? 0));
  const tags = await getTagsForArticle(article.id);
  res.json(formatArticle(article, cat, author, tags));
});

// GET /articles/latest
router.get("/articles/latest", async (req, res) => {
  const { limit = "10", category } = req.query as Record<string, string>;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const conditions = [eq(articlesTable.status, "published")];
  if (category) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, category)).limit(1);
    if (cat) conditions.push(eq(articlesTable.categoryId, cat.id));
  }

  const articles = await db.select().from(articlesTable).where(and(...conditions)).orderBy(desc(articlesTable.publishedAt)).limit(limitNum);
  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const authors = await db.select().from(authorsTable);
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const result = await Promise.all(
    articles.map(async (a) => {
      const tags = await getTagsForArticle(a.id);
      return formatArticle(a, catMap.get(a.categoryId ?? 0), authorMap.get(a.authorId ?? 0), tags);
    }),
  );
  res.json(result);
});

// GET /articles/:slug
router.get("/articles/:slug", async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.slug, slug)).limit(1);
  if (!article) { res.status(404).json({ error: "Article not found" }); return; }

  await db.update(articlesTable).set({ views: article.views + 1 }).where(eq(articlesTable.id, article.id));

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, article.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, article.authorId ?? 0));
  const tags = await getTagsForArticle(article.id);
  res.json(formatArticle({ ...article, views: article.views + 1 }, cat, author, tags));
});

// PATCH /articles/:slug
router.patch("/articles/:slug", requireAdmin, async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.slug, slug)).limit(1);
  if (!existing) { res.status(404).json({ error: "Article not found" }); return; }

  const schema = z.object({
    title: z.string().min(1).optional(),
    subtitle: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.string().optional(),
    coverImage: z.string().optional(),
    categoryId: z.number().int().optional(),
    authorId: z.number().int().optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
    featured: z.boolean().optional(),
    readingTime: z.number().int().optional(),
    audioUrl: z.string().optional(),
    keyTakeaways: z.array(z.string()).optional(),
    references: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }

  const { tags, references, ...data } = parsed.data;
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (references !== undefined) update["referencesList"] = references;
  if (data.status === "published" && existing.status !== "published") update["publishedAt"] = new Date();

  const [article] = await db.update(articlesTable).set(update).where(eq(articlesTable.id, existing.id)).returning();
  if (tags !== undefined) await upsertTags(tags, existing.id);

  const finalTags = tags ?? await getTagsForArticle(existing.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, article!.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, article!.authorId ?? 0));
  res.json(formatArticle(article!, cat, author, finalTags));
});

// DELETE /articles/:slug
router.delete("/articles/:slug", requireAdmin, async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  await db.delete(articlesTable).where(eq(articlesTable.slug, slug));
  res.status(204).send();
});

// PATCH /articles/:slug/feature
router.patch("/articles/:slug/feature", requireAdmin, async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.slug, slug)).limit(1);
  if (!existing) { res.status(404).json({ error: "Article not found" }); return; }

  await db.update(articlesTable).set({ featured: false });
  const [article] = await db.update(articlesTable).set({ featured: true, updatedAt: new Date() }).where(eq(articlesTable.id, existing.id)).returning();
  await db.update(siteSettingsTable).set({ featuredArticleId: existing.id }).where(eq(siteSettingsTable.id, 1));

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, article!.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, article!.authorId ?? 0));
  const tags = await getTagsForArticle(existing.id);
  res.json(formatArticle(article!, cat, author, tags));
});

// PATCH /articles/:slug/publish
router.patch("/articles/:slug/publish", requireAdmin, async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const schema = z.object({ publish: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Missing publish field" }); return; }

  const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.slug, slug)).limit(1);
  if (!existing) { res.status(404).json({ error: "Article not found" }); return; }

  const newStatus = parsed.data.publish ? "published" : "draft";
  const update: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
  if (parsed.data.publish && !existing.publishedAt) update["publishedAt"] = new Date();

  const [article] = await db.update(articlesTable).set(update).where(eq(articlesTable.id, existing.id)).returning();
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, article!.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, article!.authorId ?? 0));
  const tags = await getTagsForArticle(existing.id);
  res.json(formatArticle(article!, cat, author, tags));
});

export default router;
