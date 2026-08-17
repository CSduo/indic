import { Router } from "express";
import { z } from "zod";
import { db, contentViewsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";

/**
 * Readership.
 *
 * Two endpoints: one the reader's browser writes to as they read, and one the
 * author reads to see what happened.
 *
 * What is deliberately *not* here is any way for an author to find out who
 * read their work. A reader's identity is recorded only so that their own
 * progress can be restored on another device, and it is never returned to
 * anybody else. Reading is private; knowing that forty people read an essay is
 * useful, and knowing which forty changes what people feel free to read.
 */

const router = Router();

const recordSchema = z.object({
  kind: z.enum(["ARTICLE", "PAPER", "PROFILE"]),
  /** Article/paper slug, or a user id for a profile. */
  targetId: z.string().trim().min(1).max(500),
  /** Random, browser-held, meaningless on its own. */
  sessionKey: z.string().trim().min(8).max(100),
  progressPct: z.number().int().min(0).max(100).optional(),
  readSeconds: z.number().int().min(0).max(24 * 60 * 60).optional(),
  referrer: z.string().max(2000).optional(),
});

/** Host only. A full URL can carry a search query, which is somebody's words. */
function hostOf(referrer: string | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host.slice(0, 120) || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/views — record or extend one reader's engagement.
 *
 * Idempotent by (kind, target, session): the first call creates the row, every
 * later one advances it. Progress and time only ever move forward, so a reader
 * who scrolls back up, or opens the piece again the next day and skims, does
 * not lose the fact that they once read all of it.
 */
router.post("/views", async (req, res) => {
  try {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", code: "INVALID_VIEW" });

    const { kind, targetId, sessionKey, progressPct = 0, readSeconds = 0 } = parsed.data;
    const auth = await getUserAuth(req).catch(() => null);

    // Resolve who owns the thing, so author statistics need no join later.
    // An article carries an author *name*, not a user id, so ownership is
    // traced through the submission that produced it.
    const authorId = kind === "PROFILE"
      ? targetId
      : await authorIdForArticle(targetId);

    await db.insert(contentViewsTable).values({
      kind,
      targetId,
      authorId,
      viewerId: auth?.userId || null,
      sessionKey,
      progressPct,
      readSeconds,
      referrerHost: hostOf(parsed.data.referrer),
    }).onConflictDoUpdate({
      target: [contentViewsTable.kind, contentViewsTable.targetId, contentViewsTable.sessionKey],
      set: {
        progressPct: sql`greatest(${contentViewsTable.progressPct}, ${progressPct})`,
        readSeconds: sql`greatest(${contentViewsTable.readSeconds}, ${readSeconds})`,
        viewerId: auth?.userId || sql`${contentViewsTable.viewerId}`,
        updatedAt: new Date(),
      },
    });

    return res.status(204).end();
  } catch (err) {
    // A failed measurement must never interrupt reading.
    req.log?.warn({ err }, "Could not record a view");
    return res.status(204).end();
  }
});

/** Which user, if any, an article or paper belongs to. */
async function authorIdForArticle(slug: string): Promise<string | null> {
  try {
    const rows: any = await db.execute(sql`
      SELECT s.user_id AS "userId"
      FROM articles a
      LEFT JOIN submissions s ON s.id = a.source_submission_id
      WHERE a.slug = ${slug}
      LIMIT 1
    `);
    const list = rows?.rows ?? rows ?? [];
    if (list[0]?.userId) return list[0].userId;

    const pRows: any = await db.execute(sql`
      SELECT coalesce(s.user_id, p.author_id) AS "userId"
      FROM papers p
      LEFT JOIN submissions s ON s.id = p.source_submission_id
      WHERE p.slug = ${slug}
      LIMIT 1
    `);
    const pList = pRows?.rows ?? pRows ?? [];
    return pList[0]?.userId || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/views/mine?target=<slug> — how far this reader got last time.
 *
 * Answers only about the person asking. There is no form of this request that
 * returns somebody else's progress.
 */
router.get("/views/mine", async (req, res) => {
  try {
    const target = String(req.query.target || "").trim();
    const sessionKey = String(req.query.sessionKey || "").trim();
    if (!target || !sessionKey) return res.json({ progressPct: 0 });

    const [row] = await db
      .select({ progressPct: contentViewsTable.progressPct })
      .from(contentViewsTable)
      .where(and(
        eq(contentViewsTable.targetId, target),
        eq(contentViewsTable.sessionKey, sessionKey),
      ))
      .limit(1);

    return res.json({ progressPct: row?.progressPct ?? 0 });
  } catch {
    return res.json({ progressPct: 0 });
  }
});

/**
 * GET /api/stats/me — the author's own readership.
 *
 * Counts and distributions of unique accounts/readers only.
 * Excludes self-views by the author so figures reflect genuine readership.
 */
router.get("/stats/me", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Not authenticated" });

    const [totals, profile, perArticle, byReferrer] = await Promise.all([
      db.execute(sql`
        SELECT
          count(*)::int                                                  AS "views",
          count(DISTINCT coalesce(viewer_id, session_key))::int           AS "readers",
          coalesce(round(avg(nullif(progress_pct, 0)))::int, 0)          AS "avgProgress",
          coalesce(sum(read_seconds)::int, 0)                            AS "totalSeconds",
          coalesce(count(*) FILTER (WHERE progress_pct >= 90)::int, 0)   AS "finished"
        FROM content_views
        WHERE author_id = ${auth.userId}
          AND kind <> 'PROFILE'
          AND (viewer_id IS NULL OR viewer_id <> ${auth.userId})
      `),
      db.execute(sql`
        SELECT
          count(*)::int                                                  AS "views",
          count(DISTINCT coalesce(viewer_id, session_key))::int           AS "visitors"
        FROM content_views
        WHERE kind = 'PROFILE'
          AND target_id = ${auth.userId}
          AND (viewer_id IS NULL OR viewer_id <> ${auth.userId})
      `),
      db.execute(sql`
        SELECT
          v.target_id                                                   AS "slug",
          a.title                                                       AS "title",
          count(*)::int                                                 AS "views",
          coalesce(round(avg(nullif(v.progress_pct, 0)))::int, 0)      AS "avgProgress",
          coalesce(round(avg(nullif(v.read_seconds, 0)))::int, 0)      AS "avgSeconds"
        FROM content_views v
        LEFT JOIN articles a ON a.slug = v.target_id
        WHERE v.author_id = ${auth.userId}
          AND v.kind = 'ARTICLE'
          AND (v.viewer_id IS NULL OR v.viewer_id <> ${auth.userId})
        GROUP BY v.target_id, a.title
        ORDER BY count(*) DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT coalesce(referrer_host, 'direct') AS "source", count(*)::int AS "views"
        FROM content_views
        WHERE author_id = ${auth.userId}
          AND kind <> 'PROFILE'
          AND (viewer_id IS NULL OR viewer_id <> ${auth.userId})
        GROUP BY 1 ORDER BY 2 DESC LIMIT 6
      `),
    ]);

    const rows = (r: any) => r?.rows ?? r ?? [];

    return res.json({
      readership: rows(totals)[0] || { views: 0, readers: 0, avgProgress: 0, totalSeconds: 0, finished: 0 },
      profile: rows(profile)[0] || { views: 0, visitors: 0 },
      articles: rows(perArticle),
      sources: rows(byReferrer),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to load author statistics");
    return res.status(500).json({ error: "Could not load your statistics.", code: "LOAD_FAILED" });
  }
});

export default router;
