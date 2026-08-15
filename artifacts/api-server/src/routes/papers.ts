import { Router } from "express";
import { db } from "@workspace/db";
import { papersTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { eq, and, desc, ilike, inArray, or, sql, isNull } from "drizzle-orm";
import { categorySlugCandidates, normalizeCategorySlug, syncSubmissionFromPublication } from "../lib/publication-sync";
import { ownsAuthoredWork, resolveViewer } from "../lib/viewer";
import { countUnresolvedArticleImages, sanitizeArticleBody, MAX_BODY_CHARS } from "../lib/content";
import { parsePagination, toLikePattern, PUBLIC_CONTENT_CACHE_CONTROL } from "../lib/request";
import { z } from "zod";

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
        body: papersTable.body,
        coverImageUrl: papersTable.coverImageUrl,
        categorySlug: papersTable.categorySlug,
        authorName: papersTable.authorName,
        peerReviewed: papersTable.peerReviewed,
        readingMinutes: papersTable.readingMinutes,
        status: papersTable.status,
        publishedAt: papersTable.publishedAt,
        updatedAt: papersTable.updatedAt,
        pdfUrl: papersTable.pdfUrl,
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

    const result = papers.map((r: any) => {
      const rawContent = (r.body || r.abstract || "")
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
      const blockLines = (r.body || r.abstract || "")
        .split(/\r?\n|<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/i)
        .map((l: string) => l.replace(/<[^>]*>/g, "").trim())
        .filter(Boolean);
      const lines = Math.max(blockLines.length, words > 0 ? Math.ceil(words / 13) : 0);
      const calcMinutes = words > 0 ? (words < 100 ? 1 : Math.max(1, Math.ceil(words / 200))) : (r.readingMinutes || 1);

      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        abstract: r.abstract,
        coverImageUrl: r.coverImageUrl,
        categorySlug: r.categorySlug,
        authorName: r.authorName,
        peerReviewed: r.peerReviewed,
        status: r.status,
        readingMinutes: calcMinutes,
        wordCount: words,
        lineCount: lines,
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt,
        pdfUrl: r.pdfUrl,
        category: r.category,
        ...(includeBody && r.body ? { body: sanitizeArticleBody(r.body) } : {}),
      };
    });

    res.setHeader("Cache-Control", PUBLIC_CONTENT_CACHE_CONTROL);
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
        paper: {
          id: papersTable.id,
          slug: papersTable.slug,
          title: papersTable.title,
          abstract: papersTable.abstract,
          body: papersTable.body,
          categorySlug: papersTable.categorySlug,
          tags: papersTable.tags,
          authorName: papersTable.authorName,
          pdfUrl: papersTable.pdfUrl,
          coverImageUrl: papersTable.coverImageUrl,
          citationText: papersTable.citationText,
          peerReviewed: papersTable.peerReviewed,
          paperType: papersTable.paperType,
          status: papersTable.status,
          publishedAt: papersTable.publishedAt,
          deletedAt: papersTable.deletedAt,
          createdAt: papersTable.createdAt,
          updatedAt: papersTable.updatedAt,
        },
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

const paperEditSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  authorName: z.string().trim().min(1).max(160).optional(),
  institution: z.string().trim().max(300).optional().or(z.literal("")),
  categorySlug: z.string().trim().min(1).max(100).optional(),
  abstract: z.string().max(10_000).optional(),
  body: z.string().max(MAX_BODY_CHARS).optional(),
  coverImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  pdfUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  manuscriptUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  citationText: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
  doi: z.string().max(255).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  references: z.array(z.object({
    id: z.string().max(120).optional(),
    title: z.string().max(500),
    url: z.string().max(2_000).optional(),
    citation: z.string().max(2_000).optional(),
  })).max(200).optional(),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(500).optional().or(z.literal("")),
});

// PATCH /api/papers/:slug/edit â€” author can update their own paper
router.patch("/papers/:slug/edit", async (req, res) => {
  try {
    const viewer = await resolveViewer(req);
    if (!viewer) return res.status(401).json({ error: "You must be logged in to edit" });

    const { slug } = req.params;
    const [existing] = await db
      .select({
        id: papersTable.id,
        slug: papersTable.slug,
        authorName: papersTable.authorName,
        sourceSubmissionId: papersTable.sourceSubmissionId,
      })
      .from(papersTable)
      .where(and(eq(papersTable.slug, slug), isNull(papersTable.deletedAt)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Paper not found" });
    if (!ownsAuthoredWork(viewer, existing.authorName)) {
      return res.status(403).json({ error: "You can only edit papers published under your own name" });
    }

    const parsed = paperEditSchema.safeParse(req.body);
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
    // The byline follows the account; only an administrator may reattribute.
    if (viewer.isAdmin && data.authorName?.trim()) {
      updates.authorName = data.authorName.trim();
    } else if (viewer.name) {
      updates.authorName = viewer.name;
    }
    if (data.categorySlug?.trim()) updates.categorySlug = normalizeCategorySlug(data.categorySlug);
    if (typeof data.abstract === "string") updates.abstract = data.abstract.trim();
    if (typeof data.citationText === "string") updates.citationText = data.citationText.trim();
    if (data.doi !== undefined) updates.doi = data.doi || null;
    const pdf = data.pdfUrl !== undefined ? data.pdfUrl : data.manuscriptUrl;
    if (pdf !== undefined) updates.pdfUrl = pdf || null;
    if (data.coverImageUrl !== undefined) updates.coverImageUrl = data.coverImageUrl || null;
    if (data.tags !== undefined) updates.tags = data.tags;
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
      .update(papersTable)
      .set(updates)
      .where(and(eq(papersTable.id, existing.id), isNull(papersTable.deletedAt)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Paper not found" });

    await syncSubmissionFromPublication(updated, "paper")
      .catch(err => console.warn("Submission back-sync after paper edit failed:", err));

    return res.json({
      success: true,
      paper: { ...updated, body: sanitizeArticleBody(updated.body) },
    });
  } catch (err: any) {
    console.error("PATCH /api/papers/:slug/edit ERROR:", err);
    return res.status(500).json({ error: err.message || "Failed to update paper" });
  }
});

export default router;
