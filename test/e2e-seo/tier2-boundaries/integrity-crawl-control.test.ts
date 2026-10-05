import { describe, it, expect } from "vitest";
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
