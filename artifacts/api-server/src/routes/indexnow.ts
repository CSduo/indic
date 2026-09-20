import { Router, type Request, type Response } from "express";
import { DEFAULT_INDEXNOW_KEY, CANONICAL_HOST, isAllowedHost, submitIndexNow } from "../lib/indexnow";

const router = Router();

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
