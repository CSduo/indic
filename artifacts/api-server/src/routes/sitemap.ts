import { Router } from "express";
import { getSitemapEntries, renderSitemapXml } from "../lib/sitemap-entries";

/**
 * GET /sitemap.xml — the only sitemap.
 *
 * Mounted at the site root. /api/sitemap.xml permanently redirects here (see
 * app.ts) so search engines see a single sitemap URL. The URL list and lastmod
 * rules live in lib/sitemap-entries.ts.
 */
const router = Router();

/** Absolute URLs of every sitemap entry (kept for callers that want a list). */
export async function getAllPublicUrls(): Promise<string[]> {
  return (await getSitemapEntries()).map(entry => entry.loc);
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const xml = renderSitemapXml(await getSitemapEntries());
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=1800, s-maxage=3600");
    return res.send(xml);
  } catch (err) {
    req.log.error(err);
    return res.status(500).send("Failed to generate sitemap");
  }
});

export default router;
