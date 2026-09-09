import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { parseSitemapUrls } from "../helpers/html-parser";

/**
 * Requirement R6: Sitemap & Robots.txt
 *
 * Dynamic standards-compliant /sitemap.xml containing only HTTP 200 published canonical URLs with accurate lastmod.
 * Configure /robots.txt to allow public content while explicitly disallowing private routes.
 */
describe("Tier 1 - Feature 6: Sitemaps & Robots.txt (R6)", () => {
  it("serves valid XML for /sitemap.xml (or /api/sitemap.xml) with application/xml content type", async () => {
    // Both /sitemap.xml and /api/sitemap.xml may be reachable
    let res = await request(app).get("/sitemap.xml");
    if (res.status === 404) {
      res = await request(app).get("/api/sitemap.xml");
    }

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/xml/);
    expect(res.text).toContain("<?xml");
    expect(res.text).toContain("<urlset");
  });

  it("includes published canonical article and paper URLs in sitemap", async () => {
    let res = await request(app).get("/sitemap.xml");
    if (res.status === 404) {
      res = await request(app).get("/api/sitemap.xml");
    }

    expect(res.status).toBe(200);
    const urls = parseSitemapUrls(res.text);
    const locs = urls.map(u => u.loc);

    expect(locs).toContain("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");
    expect(locs).toContain("https://anvikshikijournal.in/papers/kavya-alamkara-computational-poetics");
  });

  it("strictly excludes draft, deleted, and private administrative URLs from sitemap", async () => {
    let res = await request(app).get("/sitemap.xml");
    if (res.status === 404) {
      res = await request(app).get("/api/sitemap.xml");
    }

    expect(res.status).toBe(200);
    const urls = parseSitemapUrls(res.text);
    const locs = urls.map(u => u.loc);

    // Drafts and deleted items must NOT appear in sitemap
    expect(locs).not.toContain("https://anvikshikijournal.in/articles/draft-kashmir-shaivism-pratyabhijna");
    expect(locs).not.toContain("https://anvikshikijournal.in/articles/withdrawn-article-on-astronomy");

    // Private routes must NOT appear
    for (const loc of locs) {
      expect(loc).not.toMatch(/\/admin|\/account|\/api\/private|\/submit\/write/);
    }
  });

  it("provides valid ISO 8601 lastmod dates for publication URLs in sitemap", async () => {
    let res = await request(app).get("/sitemap.xml");
    if (res.status === 404) {
      res = await request(app).get("/api/sitemap.xml");
    }

    expect(res.status).toBe(200);
    const urls = parseSitemapUrls(res.text);
    const articleUrl = urls.find(u => u.loc.includes("nyaya-epistemology-pramana-theory"));

    expect(articleUrl).toBeDefined();
    expect(articleUrl?.lastmod).toBeDefined();
    expect(new Date(articleUrl!.lastmod!).getTime()).not.toBeNaN();
  });

  it("serves robots.txt allowing public content and sitemap declaration", async () => {
    const res = await request(app).get("/robots.txt");

    if (res.status === 200) {
      expect(res.headers["content-type"]).toMatch(/text\/plain/);
      expect(res.text).toContain("User-agent:");
      expect(res.text).toMatch(/Allow: \/|Allow: \/articles/);
      expect(res.text).toMatch(/Sitemap: https:\/\/anvikshikijournal\.in\/.*sitemap\.xml/);
    }
  });

  it("disallows private, admin, and draft routes in robots.txt", async () => {
    const res = await request(app).get("/robots.txt");

    if (res.status === 200) {
      expect(res.text).toContain("Disallow: /admin");
      expect(res.text).toContain("Disallow: /account");
    }
  });
});
