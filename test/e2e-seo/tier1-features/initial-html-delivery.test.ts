import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { extractTitle, getMeta, extractVisibleText } from "../helpers/html-parser";

/**
 * Requirement R1: Crawler & Search Engine Rendering (SSR / Prerender / Bot Document Delivery)
 *
 * Public articles (/articles/:slug), research papers (/papers/:slug), author hubs (/authors/:slug),
 * and domain hubs (/domains/:slug) must deliver semantically rich, fully formed HTML on initial response
 * before client-side hydration.
 */
describe("Tier 1 - Feature 1: Initial HTTP HTML Delivery (R1)", () => {
  it("delivers full HTML document with correct Content-Type for published articles", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("<!DOCTYPE html>");
    const title = extractTitle(res.text);
    expect(title).toContain("Nyāya Epistemology");
  });

  it("delivers published paper with title and abstract in pre-hydration response", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    const title = extractTitle(res.text);
    expect(title).toContain("Computational Analysis of Alaṅkāra");

    const description = getMeta(res.text, "description");
    expect(description).toBeTruthy();
    expect(description).toContain("computational model");
  });

  it("delivers author metadata and publication dates in the initial HTML payload", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

    expect(res.status).toBe(200);
    const metaAuthor = getMeta(res.text, "author") || getMeta(res.text, "article:author");
    expect(metaAuthor).toBeTruthy();
    expect(metaAuthor).toContain("Arya Ambadi");

    const pubTime = getMeta(res.text, "article:published_time");
    if (pubTime) {
      expect(new Date(pubTime).getTime()).not.toBeNaN();
    }
  });

  it("serves visible text content in HTML body without relying on client-side JS", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

    expect(res.status).toBe(200);
    const visibleText = extractVisibleText(res.text);
    // Initial HTML must contain key terms from the article body or summary
    expect(visibleText.length).toBeGreaterThan(50);
    expect(visibleText).toMatch(/Nyāya|pramāṇa|Epistemology/i);
  });

  it("serves indexable HTML for author authority hub (/authors/:slug)", async () => {
    const res = await request(app)
      .get("/authors/arya-ambadi")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

    // Route will either return rendered author hub (200) or client route rewrite
    expect([200, 301]).toContain(res.status);
    if (res.status === 200) {
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.text).toContain("<!DOCTYPE html>");
      expect(res.text).toMatch(/Arya Ambadi|Ānvīkṣikī/i);
    }
  });

  it("serves indexable HTML for domain authority hub (/domains/:slug)", async () => {
    const res = await request(app)
      .get("/domains/philosophy")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

    expect([200, 301]).toContain(res.status);
    if (res.status === 200) {
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.text).toContain("<!DOCTYPE html>");
      expect(res.text).toMatch(/Philosophy|Ānvīkṣikī/i);
    }
  });
});
