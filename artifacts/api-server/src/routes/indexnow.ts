import { Router, type Request, type Response } from "express";
import { DEFAULT_INDEXNOW_KEY, CANONICAL_HOST, isAllowedHost, submitIndexNow } from "../lib/indexnow";
import { parseGoogleServiceAccountCredentials, getSeoDispatchLog } from "../lib/seo-service";

const router = Router();

// GET /api/seo/status - public SEO and search indexing health status
router.get("/seo/status", async (_req: Request, res: Response) => {
  try {
    const creds = parseGoogleServiceAccountCredentials();
    const dispatches = getSeoDispatchLog();
    return res.status(200).json({
      canonicalDomain: "https://" + CANONICAL_HOST,
      sitemapUrl: `https://${CANONICAL_HOST}/sitemap.xml`,
      rssFeedUrl: `https://${CANONICAL_HOST}/feed`,
      indexNow: {
        enabled: true,
        host: CANONICAL_HOST,
        keyUrl: `https://${CANONICAL_HOST}/indexnow-key.txt`,
      },
      googleIndexing: {
        configured: Boolean(creds),
        clientEmail: creds?.client_email ? `${creds.client_email.slice(0, 8)}...` : null,
      },
      googleSiteVerification: {
        htmlFileVerificationSupported: true,
        metaConfigured: Boolean(process.env.GOOGLE_SITE_VERIFICATION),
      },
      dispatchesCount: dispatches.length,
      recentDispatches: dispatches.slice(0, 10),
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read SEO status", message: err?.message });
  }
});

let lastPublicReindex = 0;
const REINDEX_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown for unauthenticated requests

// POST /api/seo/reindex - Trigger full journal reindexing sweep across search engines
router.post("/seo/reindex", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const isCron = authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isAdmin = Boolean((req as any).adminAuth);
    const seoSecret = req.headers["x-seo-secret"];
    const hasSecret = seoSecret && (seoSecret === process.env.ADMIN_SECRET || seoSecret === process.env.AUTH_SECRET);
    const now = Date.now();

    if (!isCron && !isAdmin && !hasSecret) {
      if (now - lastPublicReindex < REINDEX_COOLDOWN_MS) {
        const remainingSec = Math.ceil((REINDEX_COOLDOWN_MS - (now - lastPublicReindex)) / 1000);
        return res.status(429).json({
          error: `Reindex was triggered recently. Please wait ${remainingSec}s before retrying.`,
          retryAfter: remainingSec,
        });
      }
    }

    lastPublicReindex = now;
    const { reindexAllPublicContent } = await import("../lib/seo-service");
    const urlsOverride = Array.isArray(req.body?.urls) ? req.body.urls : undefined;
    const result = await reindexAllPublicContent(urlsOverride);

    return res.status(200).json({
      success: result.success,
      message: `Re-indexing completed for ${result.totalUrls} URLs`,
      totalUrls: result.totalUrls,
      indexNow: result.indexNow,
      google: result.google,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Reindexing failed", message: err?.message });
  }
});


// POST /api/indexnow/notify
router.post("/indexnow/notify", async (req: Request, res: Response) => {
  const { urlList } = req.body || {};

  if (!urlList || !Array.isArray(urlList) || urlList.length === 0) {
    return res.status(400).json({
      error: "Invalid payload: urlList must be a non-empty array of URL strings",
      code: "BAD_REQUEST",
    });
  }

  // Strictly enforce that all URLs belong to anvikshikijournal.in host
  const foreignUrls = urlList.filter(u => typeof u !== "string" || !isAllowedHost(u));
  if (foreignUrls.length > 0) {
    return res.status(400).json({
      error: "Invalid URLs: all submitted URLs must strictly belong to " + CANONICAL_HOST,
      rejectedUrls: foreignUrls,
      code: "INVALID_HOST",
    });
  }

  try {
    const result = await submitIndexNow(urlList);
    return res.status(200).json({
      success: true,
      submitted: result.count,
      engine: "IndexNow",
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to dispatch IndexNow notification",
      message: err?.message,
    });
  }
});

// GET /api/indexnow/status - never leaks secret keys
router.get("/indexnow/status", (_req: Request, res: Response) => {
  return res.status(200).json({
    enabled: true,
    host: CANONICAL_HOST,
    engine: "https://api.indexnow.org/indexnow",
  });
});

// GET /indexnow-key.txt or /api/indexnow-key.txt
router.get(["/indexnow-key.txt", "/api/indexnow-key.txt"], (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send(DEFAULT_INDEXNOW_KEY);
});

export default router;
