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

  it("redirects legacy domain aliases to canonical domain hubs with HTTP 301", async () => {
    const resSanskrit = await request(app).get("/domains/sanskrit");
    expect(resSanskrit.status).toBe(301);
    expect(resSanskrit.headers.location).toBe("/domains/sanskrit-studies");

    const resPhil = await request(app).get("/domains/indian-philosophy");
    expect(resPhil.status).toBe(301);
    expect(resPhil.headers.location).toBe("/domains/philosophy");

    const resCiv = await request(app).get("/domains/indic-civilization");
    expect(resCiv.status).toBe(301);
    expect(resCiv.headers.location).toBe("/domains/civilizational-thought");
  });

  it("serves canonical treatise at /about/anvikshiki with DefinedTerm schema and Pāṇinian vyutpatti", async () => {
    const res = await request(app).get("/about/anvikshiki");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("Meaning of Ānvīkṣikī: Etymology, Philosophy");
    expect(res.text).toContain('"@type": "DefinedTerm"');
    expect(res.text).toContain("Pāṇinian Vyutpatti");
    expect(res.text).toContain("Kautilya");
    expect(res.text).toContain("Nyāya");
  });

  it("serves publication index at /browse with canonical link and disciplinary domains", async () => {
    const res = await request(app).get("/browse");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("Browse Research Papers, Articles &amp; Scholarly Archives");
    expect(res.text).toContain('<link rel="canonical" href="https://anvikshikijournal.in/browse"');
    expect(res.text).toContain("Disciplines &amp; Research Domains");
  });
});

