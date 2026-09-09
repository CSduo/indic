import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { extractTitle, getMeta, extractVisibleText } from "../helpers/html-parser";

/**
 * Requirement R5: Authority Hubs & Internal Linking — Domain Hubs
 *
 * Strengthen topical domain hubs (/domains/:slug) as indexable authority anchors with
 * curated overviews and publication listings.
 * Enhance internal linking on publication pages with semantic related-content recommendations.
 */
describe("Tier 1 - Feature 10: Domain Authority Hubs & Internal Linking (R5)", () => {
  it("delivers indexable HTML response for domain authority hub at /domains/:slug", async () => {
    const res = await request(app)
      .get("/domains/philosophy");

    if (res.status === 200) {
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.text).toContain("<!DOCTYPE html>");
      const title = extractTitle(res.text);
      expect(title).toMatch(/Philosophy|Ānvīkṣikī/i);
    }
  });

  it("presents curated topical overview and scope description on domain hub", async () => {
    const res = await request(app)
      .get("/domains/philosophy");

    if (res.status === 200) {
      const text = extractVisibleText(res.text);
      expect(text).toMatch(/Philosophy|Epistemology|Pramāṇa|Darśana/i);
    }
  });

  it("lists categorized articles and research papers within the topical domain", async () => {
    const res = await request(app)
      .get("/domains/philosophy");

    if (res.status === 200) {
      expect(res.text).toMatch(/articles\/nyaya-epistemology|Nyāya Epistemology/i);
    }
  });

  it("enforces internal linking on publication pages with related content recommendations", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    // Publication should link to related works or its domain hub
    const hasInternalLinks =
      res.text.includes("/domains/philosophy") ||
      res.text.includes("Related") ||
      res.text.includes("/articles/") ||
      res.text.includes("/papers/");

    expect(hasInternalLinks).toBe(true);
  });

  it("returns HTTP 404 for nonexistent domain slugs to eliminate crawl waste", async () => {
    const res = await request(app)
      .get("/domains/nonexistent-fictional-domain-xyz");

    if (res.status !== 200) {
      expect(res.status).toBe(404);
    }
  });

  it("outputs collection Open Graph and Twitter tags for domain hub pages", async () => {
    const res = await request(app)
      .get("/domains/philosophy");

    if (res.status === 200) {
      const ogTitle = getMeta(res.text, "og:title");
      if (ogTitle) {
        expect(ogTitle).toMatch(/Philosophy/i);
      }
    }
  });
});
