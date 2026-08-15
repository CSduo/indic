import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { eq, and, desc, ilike, inArray, or, sql, isNull } from "drizzle-orm";
import { categorySlugCandidates, normalizeCategorySlug, syncSubmissionFromPublication } from "../lib/publication-sync";
import { ownsAuthoredWork, resolveViewer } from "../lib/viewer";
import { countUnresolvedArticleImages, sanitizeArticleBody, MAX_BODY_CHARS } from "../lib/content";
import { recoverLegacyInlineImages } from "../lib/legacy-content";
import { z } from "zod";
import { parsePagination, toLikePattern, PUBLIC_CONTENT_CACHE_CONTROL } from "../lib/request";

const router = Router();

// GET /api/articles
router.get("/articles", async (req, res) => {
  try {
    const { category, featured, q, limit: lim, offset: off } = req.query;
    const { limit, offset } = parsePagination(lim, off);

    const conditions: any[] = [
      eq(articlesTable.status, "PUBLISHED"),
      isNull(articlesTable.deletedAt),
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

    const selectFields: Record<string, any> = {
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      subtitle: articlesTable.subtitle,
      excerpt: articlesTable.excerpt,
      body: articlesTable.body,
      heroImageUrl: articlesTable.heroImageUrl,
      categorySlug: articlesTable.categorySlug,
      authorName: articlesTable.authorName,
      featured: articlesTable.featured,
      status: articlesTable.status,
      readingMinutes: articlesTable.readingMinutes,
      publishedAt: articlesTable.publishedAt,
      updatedAt: articlesTable.updatedAt,
      category: categoriesTable,
    };

    const [articles, [{ count }]] = await Promise.all([
      db
        .select(selectFields)
        .from(articlesTable)
        .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
        .where(and(...conditions))
        .orderBy(desc(articlesTable.publishedAt), desc(articlesTable.id))
        .limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(articlesTable)
        .where(and(...conditions)),
    ]);

    const result = articles.map((r: any) => {
      const rawContent = (r.body || r.excerpt || "")
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "")
        .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim();

      const words = rawContent ? rawContent.split(/\s+/).filter(Boolean).length : 0;
      const blockLines = (r.body || r.excerpt || "")
        .split(/\r?\n|<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/i)
        .map((l: string) => l.replace(/<[^>]*>/g, "").trim())
        .filter(Boolean);
      const lines = Math.max(blockLines.length, words > 0 ? Math.ceil(words / 13) : 0);
      const calcMinutes = words > 0 ? (words < 100 ? 1 : Math.max(1, Math.ceil(words / 200))) : (r.readingMinutes || 1);

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
        readingMinutes: calcMinutes,
        wordCount: words,
        lineCount: lines,
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt,
        category: r.category,
      };
      if (includeBody && r.body) {
        art.body = sanitizeArticleBody(recoverLegacyInlineImages(r.slug, r.body));
      }

      return art;
    });

    res.setHeader("Cache-Control", PUBLIC_CONTENT_CACHE_CONTROL);
    return res.json({ articles: result, total: Number(count), limit, offset });
  } catch (err: any) {
    console.error("GET /api/articles ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch articles" });
  }
});



// GET /api/articles/:slug
router.get("/articles/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const cleanSlug = slug.replace(/-[a-f0-9]{4,8}$/, "");

    const [row] = await db
      .select({
        article: {
          id: articlesTable.id,
          slug: articlesTable.slug,
          title: articlesTable.title,
          subtitle: articlesTable.subtitle,
          excerpt: articlesTable.excerpt,
          body: articlesTable.body,
          categorySlug: articlesTable.categorySlug,
          tags: articlesTable.tags,
          authorName: articlesTable.authorName,
          readingMinutes: articlesTable.readingMinutes,
          heroImageUrl: articlesTable.heroImageUrl,
          heroImageAlt: articlesTable.heroImageAlt,
          keyTakeaways: articlesTable.keyTakeaways,
          references: articlesTable.references,
          seoTitle: articlesTable.seoTitle,
          seoDescription: articlesTable.seoDescription,
          audioUrl: articlesTable.audioUrl,
          status: articlesTable.status,
          featured: articlesTable.featured,
          publishedAt: articlesTable.publishedAt,
          createdAt: articlesTable.createdAt,
          updatedAt: articlesTable.updatedAt,
        },
        category: categoriesTable,
      })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categorySlug, categoriesTable.slug))
      .where(and(
        or(eq(articlesTable.id, slug), eq(articlesTable.slug, slug), eq(articlesTable.slug, cleanSlug), ilike(articlesTable.slug, `${cleanSlug}%`)),
        eq(articlesTable.status, "PUBLISHED"),
        isNull(articlesTable.deletedAt)
      ))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Article not found" });

    const rawText = (row.article.body || row.article.excerpt || "")
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "")
      .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
    const blockLines = (row.article.body || row.article.excerpt || "")
      .split(/\r?\n|<br\s*\/?>|<\/p>|<\/div>|<\/li>/i)
      .map(l => l.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean);
    const lines = Math.max(blockLines.length, words > 0 ? Math.ceil(words / 13) : 0);
    const calcMinutes = words > 0 ? (words < 100 ? 1 : Math.max(1, Math.ceil(words / 200))) : (row.article.readingMinutes || 1);

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
        readingMinutes: calcMinutes,
        wordCount: words,
        lineCount: lines,
        authorId: authorUser ? authorUser.id : "f6200aac-6489-49df-94d8-301aa3539557",
        authorAvatarUrl: authorUser?.avatarUrl || null,
        authorBio: authorUser?.bio || null,
        body: sanitizeArticleBody(recoverLegacyInlineImages(row.article.slug, row.article.body)),
        rawBody: row.article.body,
        category: row.category,
      },
    });
  } catch (err) {
    console.error("GET /api/articles/:slug error:", err);
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

const articleEditSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  subtitle: z.string().max(1_000).optional().or(z.literal("")).or(z.null()),
  authorName: z.string().trim().min(1).max(160).optional(),
  categorySlug: z.string().trim().min(1).max(100).optional(),
  excerpt: z.string().max(5_000).optional(),
  body: z.string().max(MAX_BODY_CHARS).optional(),
  heroImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  heroImageAlt: z.string().max(500).optional().or(z.literal("")).or(z.null()),
  audioUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  keyTakeaways: z.array(z.string().max(1_000)).max(20).optional(),
  references: z.array(z.object({
    id: z.string().max(120).optional(),
    title: z.string().max(500),
    url: z.string().max(2_000).optional(),
    citation: z.string().max(2_000).optional(),
  })).max(200).optional(),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(500).optional().or(z.literal("")),
});

// PATCH /api/articles/:slug/edit â€” author can update their own article
router.patch("/articles/:slug/edit", async (req, res) => {
  try {
    // Ownership is resolved before anything is read or written. This endpoint
    // previously accepted any signed-in session, so one reader could rewrite
    // another author's published article.
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "You must be logged in to edit" });

    const { slug } = req.params;
    // Drafts and archived pieces are editable too â€” restricting the lookup to
    // PUBLISHED made "Edit" return "Article not found" for everything else.
    const [existing] = await db
      .select({
        id: articlesTable.id,
        slug: articlesTable.slug,
        authorName: articlesTable.authorName,
        sourceSubmissionId: articlesTable.sourceSubmissionId,
      })
      .from(articlesTable)
      .where(and(eq(articlesTable.slug, slug), isNull(articlesTable.deletedAt)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Article not found" });
    if (!ownsAuthoredWork(viewer, existing.authorName)) {
      return res.status(403).json({ error: "You can only edit articles published under your own name" });
    }

    const parsed = articleEditSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const data = parsed.data;

    if (data.body !== undefined) {
      const unresolved = countUnresolvedArticleImages(data.body);
      if (unresolved > 0) {
        return res.status(400).json({
          error: `${unresolved} embedded image${unresolved === 1 ? " is" : "s are"} not stored. Upload the images before saving.`,
          code: "UNRESOLVED_ARTICLE_IMAGES",
        });
      }
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.title?.trim()) updates.title = data.title.trim();
    if (data.subtitle !== undefined) updates.subtitle = data.subtitle || null;
    // The byline follows the account, not a free-text field: only an
    // administrator may attribute a work to a different name.
    if (viewer.isAdmin && data.authorName?.trim()) {
      updates.authorName = data.authorName.trim();
    } else if (viewer.name) {
      updates.authorName = viewer.name;
    }
    if (data.categorySlug?.trim()) updates.categorySlug = normalizeCategorySlug(data.categorySlug);
    if (typeof data.excerpt === "string") updates.excerpt = data.excerpt.trim();
    if (data.heroImageUrl !== undefined) updates.heroImageUrl = data.heroImageUrl || null;
    if (data.heroImageAlt !== undefined) updates.heroImageAlt = data.heroImageAlt || null;
    if (data.audioUrl !== undefined) updates.audioUrl = data.audioUrl || null;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.keyTakeaways !== undefined) updates.keyTakeaways = data.keyTakeaways;
    if (data.references !== undefined) updates.references = data.references;
    if (data.seoTitle !== undefined) updates.seoTitle = data.seoTitle || null;
    if (data.seoDescription !== undefined) updates.seoDescription = data.seoDescription || null;
    if (data.body !== undefined) {
      const sanitized = sanitizeArticleBody(data.body);
      updates.body = sanitized;
      const rawText = sanitized.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const words = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
      updates.readingMinutes = words > 0 ? (words < 100 ? 1 : Math.max(1, Math.ceil(words / 200))) : 1;
    }

    const [updated] = await db
      .update(articlesTable)
      .set(updates)
      .where(and(eq(articlesTable.id, existing.id), isNull(articlesTable.deletedAt)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Article not found" });

    // Push the edit back onto the originating submission, otherwise the next
    // reconciliation pass copies the stale submission text over this change.
    await syncSubmissionFromPublication(updated, "article")
      .catch(err => console.warn("Submission back-sync after article edit failed:", err));

    return res.json({
      success: true,
      article: { ...updated, body: sanitizeArticleBody(updated.body) },
    });
  } catch (err: any) {
    console.error("PATCH /api/articles/:slug/edit ERROR:", err);
    return res.status(500).json({ error: err.message || "Failed to update article" });
  }
});

export default router;
