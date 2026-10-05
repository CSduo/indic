import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import app from "../../../artifacts/api-server/src/app";

/**
 * Integrity and crawl-control regressions from the October 2026 SEO audit.
 *
 * Each block pins down a finding that was exploitable or misleading on the live
 * site, so that it cannot quietly come back.
 */

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("Search Console verification cannot be claimed by third parties (ANV-CRAWL-01)", () => {
  it("does not echo arbitrary google<token>.html verification files", async () => {
    const token = `google${Math.random().toString(16).slice(2, 14)}.html`;
    const res = await request(app).get(`/${token}`);

    expect(res.status).toBe(404);
    expect(res.text).not.toContain("google-site-verification:");
  });

  it("does not serve the generic /google-site-verification.html responder", async () => {
    const res = await request(app).get("/google-site-verification.html");

    expect(res.status).toBe(404);
    expect(res.text).not.toContain("google-site-verification:");
  });

  it("no longer rewrites /google* paths to the serverless function", () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "vercel.json"), "utf-8"));
    const sources = (vercel.rewrites || []).map((r: { source: string }) => r.source);

    expect(sources.some((s: string) => s.startsWith("/google"))).toBe(false);
  });
});

describe("One truthful sitemap (ANV-CRAWL-04/05/19)", () => {
  it("permanently redirects the old /api/sitemap.xml to /sitemap.xml", async () => {
    const res = await request(app).get("/api/sitemap.xml");

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/sitemap.xml");
  });

  it("serves /sitemap.xml without boilerplate, form-only or broken URLs", async () => {
    const res = await request(app).get("/sitemap.xml");

    expect(res.status).toBe(200);
    expect(res.text).not.toContain("<changefreq>");
    for (const path of ["/privacy", "/terms", "/submit", "/community", "/domains"]) {
      expect(res.text).not.toContain(`<loc>https://anvikshikijournal.in${path}</loc>`);
    }
    expect(res.text).toContain("<loc>https://anvikshikijournal.in/authors/arya-ambadi</loc>");
  });

  it("dates static pages with a fixed content date rather than the request time", async () => {
    const res = await request(app).get("/sitemap.xml");
    const about = res.text.match(/<loc>https:\/\/anvikshikijournal\.in\/about<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/);

    expect(about).not.toBeNull();
    expect(Date.now() - new Date(about![1]).getTime()).toBeGreaterThan(60_000);
  });
});

describe("Search-engine automation requires authentication (ANV-CRAWL-18)", () => {
  const CRON_SECRET = "test-cron-secret-for-integrity-suite";
  let saved: string | undefined;

  beforeAll(() => {
    saved = process.env.CRON_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterAll(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  it.each([
    ["post", "/api/seo/reindex"],
    ["post", "/seo/reindex"],
    ["post", "/api/indexnow/notify"],
    ["post", "/indexnow/notify"],
    ["get", "/api/admin/seo-reindex"],
    ["post", "/api/admin/seo-reindex"],
    ["post", "/api/admin/seo/reindex-all"],
    ["get", "/api/admin/seo/status"],
  ])("rejects anonymous %s %s", async (method, url) => {
    const res = await (request(app) as any)[method](url).send({ urls: ["https://evil.example/"] });
    expect(res.status).toBe(401);
  });

  it("no longer accepts the JWT signing secret as an x-seo-secret header", async () => {
    process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || "admin-secret-under-test";
    const res = await request(app)
      .post("/api/admin/seo/reindex-all")
      .set("x-seo-secret", process.env.ADMIN_SECRET)
      .send({});
    expect(res.status).toBe(401);
  });

  it("lets the Vercel cron run a sweep, ignoring any caller-supplied URL list", async () => {
    const res = await request(app)
      .post("/api/seo/reindex")
      .set("Authorization", `Bearer ${CRON_SECRET}`)
      .send({ urls: ["https://evil.example/spam"] });

    expect(res.status).toBe(200);
    expect(res.text).not.toContain("evil.example");
    expect(res.body).not.toHaveProperty("google");
  });

  it("public /api/seo/status exposes no dispatch history", async () => {
    const res = await request(app).get("/api/seo/status");

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("recentDispatches");
    expect(res.body.googleIndexingApi.usedForJournalPages).toBe(false);
  });
});
