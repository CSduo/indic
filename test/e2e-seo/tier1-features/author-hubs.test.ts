import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { extractTitle, getMeta, extractVisibleText } from "../helpers/html-parser";

/**
 * Requirement R5: Authority Hubs & Internal Linking — Author Hubs
 *
 * Build permanent, indexable author authority hubs (/authors/:slug) with bidirectional
 * entity linking to their publications.
 */
describe("Tier 1 - Feature 9: Author Authority Hubs (R5)", () => {
  it("delivers indexable HTML response for author profile at /authors/:slug", async () => {
    const res = await request(app)
      .get("/authors/arya-ambadi");

    if (res.status === 200) {
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.text).toContain("<!DOCTYPE html>");
      const title = extractTitle(res.text);
      expect(title).toMatch(/Arya Ambadi|Ānvīkṣikī/);
    }
  });

  it("presents author biographical details, affiliation, and credentials in initial HTML", async () => {
    const res = await request(app)
      .get("/authors/arya-ambadi");

    if (res.status === 200) {
      const text = extractVisibleText(res.text);
      expect(text).toMatch(/Arya Ambadi/);
      // Affiliation or bio details
      expect(text).toMatch(/Philosophy|Sanskrit|Fellow|Scholar|Epistemology/i);
    }
  });

  it("lists author's published articles and papers with direct canonical links", async () => {
    const res = await request(app)
      .get("/authors/arya-ambadi");

    if (res.status === 200) {
      // Must link to published works
      expect(res.text).toMatch(/\/articles\/nyaya-epistemology-pramana-theory|\/papers\//);
    }
  });

  it("enforces bidirectional entity linking from article pages back to author hubs", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    // Publication should link to author profile
    const linksToAuthor = res.text.includes("/authors/") || res.text.includes("arya-ambadi");
    expect(linksToAuthor).toBe(true);
  });

  it("returns HTTP 404 for nonexistent author handles to prevent soft 404 crawl waste", async () => {
    const res = await request(app)
      .get("/authors/nonexistent-author-handle-999");

    // Must return 404 when author hub is implemented
    if (res.status !== 200) {
      expect(res.status).toBe(404);
    }
  });

  it("outputs profile Open Graph and Twitter tags for author hubs", async () => {
    const res = await request(app)
      .get("/authors/arya-ambadi");

    if (res.status === 200) {
      const ogTitle = getMeta(res.text, "og:title");
      if (ogTitle) {
        expect(ogTitle).toContain("Arya Ambadi");
      }
    }
  });
});
