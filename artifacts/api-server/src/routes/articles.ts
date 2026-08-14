import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { eq, and, desc, ilike, inArray, or, sql, isNull } from "drizzle-orm";
import { categorySlugCandidates, ensureLiveSubmissionsPublished, ensurePublicPublicationForSubmission } from "../lib/publication-sync";
import { sanitizeArticleBody } from "../lib/content";
import { recoverLegacyInlineImages } from "../lib/legacy-content";
import { z } from "zod";
import { parsePagination, toLikePattern } from "../lib/request";

const router = Router();

// GET /api/sync-live-publications — explicit live publication synchronization
router.get("/sync-live-publications", async (req, res) => {
  try {
    await ensureLiveSubmissionsPublished();
    const published = await db.select({
      id: articlesTable.id,
      title: articlesTable.title,
      slug: articlesTable.slug,
      authorName: articlesTable.authorName,
      status: articlesTable.status,
      publishedAt: articlesTable.publishedAt,
    }).from(articlesTable).where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)));

    return res.json({ success: true, count: published.length, articles: published });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/debug-submissions
router.get("/debug-submissions", async (req, res) => {
  try {
    const subs = await db.select({
      id: submissionsTable.id,
      title: submissionsTable.title,
      submitterName: submissionsTable.submitterName,
      status: submissionsTable.status,
      type: submissionsTable.type,
      domain: submissionsTable.domain,
      deletedAt: submissionsTable.deletedAt,
    }).from(submissionsTable);
    return res.json({ submissions: subs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/debug-publish-slave-trade
router.get("/debug-publish-slave-trade", async (req, res) => {
  try {
    const SUBMISSION_ID = "b92ea6a1-4150-403f-bc0a-2c8808f7e06d";
    const now = new Date();

    // Step 1: Get the submission directly
    const [sub] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, SUBMISSION_ID));
    if (!sub) return res.json({ error: "submission not found" });

    // Step 2: Check if source_submission_id column exists in articles table
    const colCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'articles' AND column_name = 'source_submission_id'
    `);
    const hasCol = (colCheck.rows?.length ?? 0) > 0;

    // Step 3: Update the submission status to PUBLISHED
    await db.update(submissionsTable).set({
      status: "PUBLISHED",
      submitterName: "Xiyato Saanvi",
      publishedAt: now,
      updatedAt: now,
    }).where(eq(submissionsTable.id, SUBMISSION_ID));

    // Step 4: ensure history category exists
    await db.execute(sql`
      INSERT INTO categories (slug, name, description, icon, sort_order)
      VALUES ('history', 'History', 'Historical chronicles, narratives, and research', 'History', 2)
      ON CONFLICT (slug) DO NOTHING
    `);

    const slug = "the-human-tapestry-of-the-slave-trade";
    const title = sub.title || "The Human Tapestry of the Slave Trade";
    const body = sub.body || sub.abstract || title;
    const excerpt = sub.abstract || title;

    let articleId: string | null = null;
    let articleSlug: string | null = null;

    if (hasCol) {
      // Check if article already linked via source_submission_id
      const linked = await db.execute(sql`
        SELECT id, slug FROM articles WHERE source_submission_id = ${SUBMISSION_ID} LIMIT 1
      `);
      if (linked.rows?.length) {
        articleId = (linked.rows[0] as any).id;
        articleSlug = (linked.rows[0] as any).slug;
        // Update it to be published
        await db.execute(sql`
          UPDATE articles SET status = 'PUBLISHED', author_name = 'Xiyato Saanvi',
            published_at = ${now}, deleted_at = NULL, updated_at = ${now}
          WHERE id = ${articleId}
        `);
      }
    }

    if (!articleId) {
      // Check by slug or title
      const bySlug = await db.execute(sql`
        SELECT id, slug FROM articles WHERE slug = ${slug} OR title = ${title} LIMIT 1
      `);
      if (bySlug.rows?.length) {
        articleId = (bySlug.rows[0] as any).id;
        articleSlug = (bySlug.rows[0] as any).slug;
        if (hasCol) {
          await db.execute(sql`
            UPDATE articles SET status = 'PUBLISHED', author_name = 'Xiyato Saanvi',
              source_submission_id = ${SUBMISSION_ID},
              published_at = ${now}, deleted_at = NULL, updated_at = ${now}
            WHERE id = ${articleId}
          `);
        } else {
          await db.execute(sql`
            UPDATE articles SET status = 'PUBLISHED', author_name = 'Xiyato Saanvi',
              published_at = ${now}, deleted_at = NULL, updated_at = ${now}
            WHERE id = ${articleId}
          `);
        }
      } else {
        // Insert fresh article
        const newId = crypto.randomUUID();
        if (hasCol) {
          await db.execute(sql`
            INSERT INTO articles (id, slug, title, excerpt, body, category_slug, tags, author_name,
              hero_image_url, hero_image_alt, key_takeaways, status, featured, published_at,
              source_submission_id, created_at, updated_at)
            VALUES (${newId}, ${slug}, ${title}, ${excerpt}, ${body}, 'history', '{}',
              'Xiyato Saanvi', '/images/provided/home-falcon-city-panorama-hero.jpg',
              ${title}, '{}', 'PUBLISHED', false, ${now}, ${SUBMISSION_ID}, ${now}, ${now})
          `);
        } else {
          await db.execute(sql`
            INSERT INTO articles (id, slug, title, excerpt, body, category_slug, tags, author_name,
              hero_image_url, hero_image_alt, key_takeaways, status, featured, published_at,
              created_at, updated_at)
            VALUES (${newId}, ${slug}, ${title}, ${excerpt}, ${body}, 'history', '{}',
              'Xiyato Saanvi', '/images/provided/home-falcon-city-panorama-hero.jpg',
              ${title}, '{}', 'PUBLISHED', false, ${now}, ${now}, ${now})
          `);
        }
        articleId = newId;
        articleSlug = slug;
      }
    }

    return res.json({ success: true, articleId, articleSlug, hasSourceSubmissionIdCol: hasCol, submission: sub });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
});


// GET /api/articles
router.get("/articles", async (req, res) => {
  try {
    await ensureLiveSubmissionsPublished();

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

    const articles = await db
      .select({
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
      const rawText = (r.body || r.excerpt || "")
        .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "")
        .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const words = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
      const blockLines = (r.body || r.excerpt || "")
        .split(/\r?\n|<br\s*\/?>|<\/p>|<\/div>|<\/li>/i)
        .map(l => l.replace(/<[^>]*>/g, "").trim())
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

    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=600");
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
        article: articlesTable,
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
      .where(and(eq(articlesTable.slug, slug), eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)))
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
      .where(and(eq(articlesTable.slug, slug), isNull(articlesTable.deletedAt)))
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

