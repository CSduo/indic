import { Router } from "express";
import { db } from "@workspace/db";
import { papersTable, categoriesTable, authorsTable, tagsTable, paperTagsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import { z } from "zod/v4";

const router = Router();

type PaperRow = typeof papersTable.$inferSelect;
type CategoryRow = typeof categoriesTable.$inferSelect;
type AuthorRow = typeof authorsTable.$inferSelect;

async function getTagsForPaper(paperId: number): Promise<string[]> {
  const rows = await db
    .select({ name: tagsTable.name })
    .from(paperTagsTable)
    .innerJoin(tagsTable, eq(paperTagsTable.tagId, tagsTable.id))
    .where(eq(paperTagsTable.paperId, paperId));
  return rows.map((r) => r.name);
}

async function upsertPaperTags(tagNames: string[], paperId: number) {
  await db.delete(paperTagsTable).where(eq(paperTagsTable.paperId, paperId));
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let [tag] = await db.select().from(tagsTable).where(eq(tagsTable.slug, slug)).limit(1);
    if (!tag) {
      [tag] = await db.insert(tagsTable).values({ slug, name }).returning();
    }
    await db.insert(paperTagsTable).values({ paperId, tagId: tag!.id }).onConflictDoNothing();
  }
}

function formatPaper(p: PaperRow, cat: CategoryRow | undefined, author: AuthorRow | undefined, tags: string[]) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    abstract: p.abstract,
    pdfUrl: p.pdfUrl,
    categoryId: p.categoryId ?? 0,
    categorySlug: cat?.slug ?? "",
    categoryName: cat?.name ?? "",
    authorId: p.authorId ?? 0,
    authorName: author?.name ?? "",
    status: p.status,
    peerReviewed: p.peerReviewed,
    citationText: p.citationText,
    publicationType: p.publicationType,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    downloadCount: p.downloadCount,
    tags,
  };
}

// GET /papers
router.get("/papers", async (req, res) => {
  const { status, category, peerReviewed, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (status) conditions.push(eq(papersTable.status, status));
  else conditions.push(eq(papersTable.status, "published"));
  if (category) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, category)).limit(1);
    if (cat) conditions.push(eq(papersTable.categoryId, cat.id));
  }
  if (peerReviewed === "true") conditions.push(eq(papersTable.peerReviewed, true));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [papers, total] = await Promise.all([
    db.select().from(papersTable).where(where).orderBy(desc(papersTable.publishedAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(papersTable).where(where),
  ]);

  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const authors = await db.select().from(authorsTable);
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const result = await Promise.all(
    papers.map(async (p) => {
      const tags = await getTagsForPaper(p.id);
      return formatPaper(p, catMap.get(p.categoryId ?? 0), authorMap.get(p.authorId ?? 0), tags);
    }),
  );

  const totalCount = total[0]?.count ?? 0;
  res.json({ papers: result, total: totalCount, page: pageNum, limit: limitNum, hasMore: offset + limitNum < totalCount });
});

// POST /papers
router.post("/papers", requireAdmin, async (req, res) => {
  const schema = z.object({
    slug: z.string().optional(),
    title: z.string().min(1),
    abstract: z.string().default(""),
    pdfUrl: z.string().optional(),
    categoryId: z.number().int(),
    authorId: z.number().int(),
    status: z.enum(["draft", "published"]).default("draft"),
    peerReviewed: z.boolean().default(false),
    citationText: z.string().optional(),
    publicationType: z.string().optional(),
    tags: z.array(z.string()).default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }

  const { tags, ...data } = parsed.data;
  const slug = data.slug ?? data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").substring(0, 80);

  const [paper] = await db.insert(papersTable).values({
    ...data,
    slug,
    publishedAt: data.status === "published" ? new Date() : null,
  }).returning();

  await upsertPaperTags(tags, paper!.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, paper!.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, paper!.authorId ?? 0));
  res.status(201).json(formatPaper(paper!, cat, author, tags));
});

// GET /papers/latest
router.get("/papers/latest", async (req, res) => {
  const { limit = "6" } = req.query as Record<string, string>;
  const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

  const papers = await db.select().from(papersTable).where(eq(papersTable.status, "published")).orderBy(desc(papersTable.publishedAt)).limit(limitNum);
  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const authors = await db.select().from(authorsTable);
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const result = await Promise.all(
    papers.map(async (p) => {
      const tags = await getTagsForPaper(p.id);
      return formatPaper(p, catMap.get(p.categoryId ?? 0), authorMap.get(p.authorId ?? 0), tags);
    }),
  );
  res.json(result);
});

// GET /papers/:slug
router.get("/papers/:slug", async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const [paper] = await db.select().from(papersTable).where(eq(papersTable.slug, slug)).limit(1);
  if (!paper) { res.status(404).json({ error: "Paper not found" }); return; }

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, paper.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, paper.authorId ?? 0));
  const tags = await getTagsForPaper(paper.id);
  res.json(formatPaper(paper, cat, author, tags));
});

// PATCH /papers/:slug
router.patch("/papers/:slug", requireAdmin, async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const [existing] = await db.select().from(papersTable).where(eq(papersTable.slug, slug)).limit(1);
  if (!existing) { res.status(404).json({ error: "Paper not found" }); return; }

  const schema = z.object({
    title: z.string().min(1).optional(),
    abstract: z.string().optional(),
    pdfUrl: z.string().optional(),
    categoryId: z.number().int().optional(),
    authorId: z.number().int().optional(),
    status: z.enum(["draft", "published"]).optional(),
    peerReviewed: z.boolean().optional(),
    citationText: z.string().optional(),
    publicationType: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }

  const { tags, ...data } = parsed.data;
  const update: Record<string, unknown> = { ...data };
  if (data.status === "published" && existing.status !== "published") update["publishedAt"] = new Date();

  const [paper] = await db.update(papersTable).set(update).where(eq(papersTable.id, existing.id)).returning();
  if (tags !== undefined) await upsertPaperTags(tags, existing.id);

  const finalTags = tags ?? await getTagsForPaper(existing.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, paper!.categoryId ?? 0));
  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, paper!.authorId ?? 0));
  res.json(formatPaper(paper!, cat, author, finalTags));
});

// DELETE /papers/:slug
router.delete("/papers/:slug", requireAdmin, async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  await db.delete(papersTable).where(eq(papersTable.slug, slug));
  res.status(204).send();
});

// POST /papers/:slug/download
router.post("/papers/:slug/download", async (req, res) => {
  const slug = String(req.params["slug"]);
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const [paper] = await db.update(papersTable)
    .set({ downloadCount: sql`${papersTable.downloadCount} + 1` })
    .where(eq(papersTable.slug, slug))
    .returning({ downloadCount: papersTable.downloadCount });
  
  if (!paper) { res.status(404).json({ error: "Paper not found" }); return; }
  res.json({ downloadCount: paper.downloadCount });
});

export default router;
