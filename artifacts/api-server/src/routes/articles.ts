import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { eq, and, desc, ilike, inArray, or, sql } from "drizzle-orm";
import { categorySlugCandidates } from "../lib/publication-sync";
import { sanitizeArticleBody } from "../lib/content";
import { recoverLegacyInlineImages } from "../lib/legacy-content";
import { z } from "zod";
import { parsePagination, toLikePattern } from "../lib/request";

const router = Router();

// GET /api/articles
router.get("/articles", async (req, res) => {
  try {
    const { category, featured, q, limit: lim, offset: off } = req.query;
    const { limit, offset } = parsePagination(lim, off);

    const { not } = await import("drizzle-orm");
    const conditions: any[] = [
      eq(articlesTable.status, "PUBLISHED"),
      not(ilike(articlesTable.title, "%Codex%")),
      not(ilike(articlesTable.title, "%1783272873341%")),
    ];
    if (category) {
      const normalizedCategory = sql<string>`trim(both '-' from lower(regexp_replace(replace(${articlesTable.categorySlug}, '_', '-'), '[^a-z0-9]+', '-', 'g')))`;
      conditions.push(inArray(normalizedCategory, categorySlugCandidates(String(category))));
    }
    if (featured === "true") conditions.push(eq(articlesTable.featured, true));
    if (q) {
      const searchTerm = toLikePattern(String(q));
      conditions.push(or(
        ilike(articlesTable.title, searchTerm),
        ilike(articlesTable.subtitle, searchTerm),
        ilike(articlesTable.excerpt, searchTerm),
      )!);
    }

    const includeBody = req.query.includeBody === "true";

    const articles = await db
      .select({
        id: articlesTable.id,
        slug: articlesTable.slug,
        title: articlesTable.title,
        subtitle: articlesTable.subtitle,
        excerpt: articlesTable.excerpt,
        heroImageUrl: articlesTable.heroImageUrl,
        categorySlug: articlesTable.categorySlug,
        authorName: articlesTable.authorName,
        featured: articlesTable.featured,
        status: articlesTable.status,
        readingMinutes: articlesTable.readingMinutes,
        publishedAt: articlesTable.publishedAt,
        updatedAt: articlesTable.updatedAt,
        ...(includeBody ? { body: articlesTable.body } : {}),
        category: categoriesTable,
      })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(and(...conditions))
      .orderBy(desc(articlesTable.publishedAt), desc(articlesTable.id))
      .limit(limit).offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articlesTable)
      .where(and(...conditions));

    const result = articles.map(r => {
      const art: any = {
        id: r.id,
        slug: r.slug,
        title: r.title,
        subtitle: r.subtitle,
        excerpt: r.excerpt,
        heroImageUrl: r.heroImageUrl,
        categorySlug: r.categorySlug,
        authorName: r.authorName,
        featured: r.featured,
        status: r.status,
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt,
        category: r.category,
      };

      if (includeBody && (r as any).body) {
        art.body = sanitizeArticleBody(recoverLegacyInlineImages(r.slug, (r as any).body));
      }

      if (r.readingMinutes) {
        art.readingMinutes = r.readingMinutes;
      } else if (art.body) {
        const words = art.body.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
        art.readingMinutes = Math.max(1, Math.round(words / 200));
      } else {
        art.readingMinutes = 5;
      }

      return art;
    });

    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=600");
    return res.json({ articles: result, total: Number(count), limit, offset });

  } catch (err: any) {
    console.error("GET /api/articles ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch articles", details: String(err?.message || err) });
  }
});

// GET /api/articles/:slug
router.get("/articles/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const cleanSlug = slug.replace(/-[a-f0-9]{4,8}$/, "");

    const [row] = await db
      .select({
        article: articlesTable,
        category: categoriesTable,
      })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(and(
        or(eq(articlesTable.slug, slug), eq(articlesTable.slug, cleanSlug), ilike(articlesTable.slug, `${cleanSlug}%`)),
        eq(articlesTable.status, "PUBLISHED")
      ))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Article not found" });

    const [authorUser] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    }).from(usersTable).where(
      or(
        eq(usersTable.role, "ADMIN"),
        ilike(usersTable.name, row.article.authorName || "%")
      )
    ).limit(1);

    return res.json({
      article: {
        ...row.article,
        authorId: authorUser ? authorUser.id : "f6200aac-6489-49df-94d8-301aa3539557",
        authorAvatarUrl: authorUser?.avatarUrl || null,
        authorBio: authorUser?.bio || null,
        body: sanitizeArticleBody(recoverLegacyInlineImages(row.article.slug, row.article.body)),
        rawBody: row.article.body,
        category: row.category,
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// PATCH /api/articles/:slug/edit — author can update their own published article
router.patch("/articles/:slug/edit", async (req, res) => {
  try {
    const { getUserAuth } = await import("../lib/auth");
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "You must be logged in to edit" });

    const { slug } = req.params;
    const [row] = await db
      .select({
        article: articlesTable,
      })
      .from(articlesTable)
      .where(and(eq(articlesTable.slug, slug), eq(articlesTable.status, "PUBLISHED")))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Article not found" });


    const parsed = z.object({
      title: z.string().trim().min(1).max(500).optional(),
      excerpt: z.string().max(5_000).optional(),
      body: z.string().max(500_000).optional(),
      heroImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { title, excerpt, body, heroImageUrl } = parsed.data;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (typeof title === "string" && title.trim()) updates.title = title.trim();
    if (typeof excerpt === "string") updates.excerpt = excerpt.trim();
    if (body !== undefined) updates.body = sanitizeArticleBody(body);
    if (heroImageUrl !== undefined) updates.heroImageUrl = heroImageUrl || null;

    const [updated] = await db
      .update(articlesTable)
      .set(updates)
      .where(eq(articlesTable.slug, slug))
      .returning();

    return res.json({
      success: true,
      article: { ...updated, body: sanitizeArticleBody(updated.body) },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update article" });
  }
});

export default router;

