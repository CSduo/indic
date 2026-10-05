import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { extractOpenGraph, extractTwitter, getMeta } from "../helpers/html-parser";

/**
 * Requirement R3: Comprehensive Scholarly & Social Metadata
 *
 * Open Graph (og:title, og:description, og:type=article, og:url, og:image, article:published_time, etc.)
 * Twitter (twitter:card=summary_large_image, twitter:title, twitter:description, twitter:image).
 * Dynamic fallback branded 1200x630 social card for publications lacking custom hero images.
 */
describe("Tier 1 - Feature 3: Open Graph & Twitter Cards (R3)", () => {
  it("outputs required Open Graph core properties for published articles", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    const og = extractOpenGraph(res.text);

    expect(og["og:title"]).toContain("Nyāya Epistemology");
    expect(og["og:description"]).toBeTruthy();
    expect(og["og:type"]).toBe("article");
    expect(og["og:url"]).toBe("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");
    expect(og["og:image"]).toMatch(/^https?:\/\//);
  });

  // Changed deliberately: dimensions are declared only when they are known to
  // be true (the 1200x630 default card, or a Cloudinary 1200x630 crop). An
  // uploaded hero image of unknown size is sent without claimed dimensions.
  it("declares 1200x630 for the default social card and no invented size for other images", async () => {
    const fallback = await request(app)
      .get(`/articles/${encodeURIComponent("samkhya-purusa-prakrti-सङ्ख्य-दर्शने")}`);
    expect(fallback.status).toBe(200);
    const fallbackOg = extractOpenGraph(fallback.text);
    expect(fallbackOg["og:image"]).toBe("https://anvikshikijournal.in/og-default.jpg");
    expect(fallbackOg["og:image:width"]).toBe("1200");
    expect(fallbackOg["og:image:height"]).toBe("630");

    const own = await request(app).get("/articles/nyaya-epistemology-pramana-theory");
    expect(own.status).toBe(200);
    const ownOg = extractOpenGraph(own.text);
    expect(ownOg["og:image"]).toBe("https://anvikshikijournal.in/images/nyaya-hero.jpg");
    expect(ownOg["og:image:width"]).toBeUndefined();
    expect(ownOg["og:image:height"]).toBeUndefined();
  });

  it("outputs article temporal and author metadata in Open Graph namespace", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    const og = extractOpenGraph(res.text);

    // article:author or og:article:author
    const author = og["article:author"] || og["og:article:author"] || getMeta(res.text, "article:author");
    expect(author || "").toMatch(/Arya Ambadi|Ānvīkṣikī/);

    const pubTime = og["article:published_time"] || getMeta(res.text, "article:published_time");
    if (pubTime) {
      expect(new Date(pubTime).getTime()).not.toBeNaN();
    }
  });

  it("outputs Twitter Card tags configuring summary_large_image preview", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    const tw = extractTwitter(res.text);

    expect(tw["twitter:card"]).toBe("summary_large_image");
    expect(tw["twitter:title"]).toContain("Nyāya Epistemology");
    expect(tw["twitter:description"]).toBeTruthy();
    expect(tw["twitter:image"]).toMatch(/^https?:\/\//);
  });

  it("provides fallback branded social card (1200x630) for publications lacking custom hero images", async () => {
    const res = await request(app)
      .get("/articles/samkhya-purusa-prakrti-सङ्ख्य-दर्शने");

    expect(res.status).toBe(200);
    const og = extractOpenGraph(res.text);
    const tw = extractTwitter(res.text);

    // When heroImageUrl is null, a branded fallback card must be served
    const image = og["og:image"] || tw["twitter:image"];
    expect(image).toBeTruthy();
    expect(image).toMatch(/opengraph|og-default|og-fallback|api\/og/i);
    expect(image).toMatch(/^https?:\/\//);
  });

  it("outputs correct Open Graph metadata for research papers", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const og = extractOpenGraph(res.text);

    expect(og["og:title"]).toContain("Computational Analysis of Alaṅkāra");
    expect(og["og:type"]).toBe("article");
    expect(og["og:url"]).toBe("https://anvikshikijournal.in/papers/kavya-alamkara-computational-poetics");
    expect(og["og:image"]).toBeTruthy();
  });
});
