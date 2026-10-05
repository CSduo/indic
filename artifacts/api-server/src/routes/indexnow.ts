import { Router, type Request, type Response } from "express";
import { DEFAULT_INDEXNOW_KEY, CANONICAL_HOST, isAllowedHost, isIndexNowEnabled, submitIndexNow } from "../lib/indexnow";
import { requireCronOrAdmin } from "../lib/automation-auth";
import { parseReindexOptions, reindexAllPublicContent } from "../lib/seo-service";

/**
 * Search-engine notification endpoints.
 *
 * This router is mounted both under /api and at the site root (app.ts), so every
 * route here is reachable at two paths. Anything that makes the site contact a
 * search engine requires the cron secret or an admin session; the public status
 * route reveals configuration flags only, never dispatch history or keys.
 */
const router = Router();

// GET /api/seo/status - public, non-sensitive indexing configuration
router.get("/seo/status", (_req: Request, res: Response) => {
  return res.status(200).json({
    canonicalDomain: "https://" + CANONICAL_HOST,
    sitemapUrl: `https://${CANONICAL_HOST}/sitemap.xml`,
    rssFeedUrl: `https://${CANONICAL_HOST}/feed`,
    indexNow: {
      enabled: isIndexNowEnabled(),
      host: CANONICAL_HOST,
      keyUrl: `https://${CANONICAL_HOST}/indexnow-key.txt`,
    },
    googleIndexingApi: {
      // Google allows the Indexing API only for JobPosting/BroadcastEvent pages.
      usedForJournalPages: false,
    },
    googleSiteVerification: {
      // Ownership is proven through the DNS-verified Domain property. No
      // wildcard google<token>.html responder exists any more.
      htmlFileVerificationSupported: false,
      metaConfigured: Boolean(process.env.GOOGLE_SITE_VERIFICATION),
    },
  });
});

// POST /api/seo/reindex - IndexNow sweep over sitemap URLs (cron or admin only)
// Body (optional): { "scope": "changed" | "all", "sinceHours": number }.
// URLs are never taken from the request.
router.post("/seo/reindex", requireCronOrAdmin, async (req: Request, res: Response) => {
  try {
    const result = await reindexAllPublicContent(parseReindexOptions(req.body));
    return res.status(200).json({
      success: result.success,
      message: `IndexNow ${result.scope === "all" ? "full" : "changed-URL"} sweep covered ${result.totalUrls} URLs`,
      scope: result.scope,
      totalUrls: result.totalUrls,
      indexNow: result.indexNow,
    });
  } catch (err: any) {
    req.log?.error?.({ err }, "Reindexing failed");
    return res.status(500).json({ error: "Reindexing failed" });
  }
});

// POST /api/indexnow/notify - submit specific changed URLs (cron or admin only)
router.post("/indexnow/notify", requireCronOrAdmin, async (req: Request, res: Response) => {
  const { urlList } = req.body || {};

  if (!urlList || !Array.isArray(urlList) || urlList.length === 0 || urlList.length > 10_000) {
    return res.status(400).json({
      error: "Invalid payload: urlList must be a non-empty array of URL strings",
      code: "BAD_REQUEST",
    });
  }

  // Strictly enforce that all URLs belong to the canonical apex host
  const foreignUrls = urlList.filter(u => typeof u !== "string" || !isAllowedHost(u));
  if (foreignUrls.length > 0) {
    return res.status(400).json({
      error: "Invalid URLs: all submitted URLs must strictly belong to https://" + CANONICAL_HOST,
      rejectedUrls: foreignUrls.slice(0, 20),
      code: "INVALID_HOST",
    });
  }

  try {
    const result = await submitIndexNow(urlList);
    return res.status(200).json({
      success: result.success,
      submitted: result.count,
      skipped: Boolean(result.skipped),
      engine: "IndexNow",
    });
  } catch (err: any) {
    req.log?.error?.({ err }, "IndexNow notification failed");
    return res.status(500).json({ error: "Failed to dispatch IndexNow notification" });
  }
});

// GET /api/indexnow/status - never leaks secret keys
router.get("/indexnow/status", (_req: Request, res: Response) => {
  return res.status(200).json({
    enabled: isIndexNowEnabled(),
    host: CANONICAL_HOST,
    engine: "https://api.indexnow.org/indexnow",
  });
});

// GET /indexnow-key.txt or /api/indexnow-key.txt — the exact IndexNow key file
router.get(["/indexnow-key.txt", "/api/indexnow-key.txt"], (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send(DEFAULT_INDEXNOW_KEY);
});

export default router;
