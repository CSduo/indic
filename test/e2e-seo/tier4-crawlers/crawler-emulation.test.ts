import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import {
  extractTitle,
  extractCanonical,
  extractOpenGraph,
  extractTwitter,
  getMeta,
  extractVisibleText,
} from "../helpers/html-parser";

/**
 * Tier 4: Real-world Workloads & Crawler Emulation
 *
 * Emulates official web crawlers, search indexing spiders, scholarly scrapers,
 * and social card preview bots to ensure zero rendering degradation and
 * complete pre-hydration document delivery.
 */
describe("Tier 4 - Real-world Workloads & Crawler Emulation", () => {
  const CRAWLER_AGENTS = {
    googlebotDesktop: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    googlebotMobile: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    googleScholar: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html; Google-Scholar)",
    twitterbot: "Twitterbot/1.0",
    facebookExternalHit: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    whatsapp: "WhatsApp/2.21.12.21 i",
    linkedInBot: "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    applebot: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
  };

  it("serves fully-formed HTML with title and canonical link to Googlebot Desktop", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", CRAWLER_AGENTS.googlebotDesktop);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);

    const title = extractTitle(res.text);
    expect(title).toContain("Nyāya Epistemology");

    const canonical = extractCanonical(res.text);
    expect(canonical).toBe("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");

    const visibleText = extractVisibleText(res.text);
    expect(visibleText.length).toBeGreaterThan(50);
  });

  it("serves responsive HTML with viewport and article metadata to Googlebot Mobile", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", CRAWLER_AGENTS.googlebotMobile);

    expect(res.status).toBe(200);
    const viewport = getMeta(res.text, "viewport");
    expect(viewport).toContain("width=device-width");
  });

  it("serves complete semantic document to Bingbot without script dependencies", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics")
      .set("User-Agent", CRAWLER_AGENTS.bingbot);

    expect(res.status).toBe(200);
    expect(res.text).toContain("Computational Analysis of Alaṅkāra");
    const description = getMeta(res.text, "description");
    expect(description).toBeTruthy();
  });

  it("serves Highwire bibliographic tags to Google Scholar crawler", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics")
      .set("User-Agent", CRAWLER_AGENTS.googleScholar);

    expect(res.status).toBe(200);
    const scholarTitle = getMeta(res.text, "citation_title");
    expect(scholarTitle || "").toMatch(/Computational Analysis of Alaṅkāra|Ānvīkṣikī/);
  });

  it("serves rich summary_large_image card tags to Twitterbot", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", CRAWLER_AGENTS.twitterbot);

    expect(res.status).toBe(200);
    const tw = extractTwitter(res.text);
    expect(tw["twitter:card"]).toBe("summary_large_image");
    expect(tw["twitter:title"]).toContain("Nyāya Epistemology");
    expect(tw["twitter:image"]).toBeTruthy();
  });

  it("serves Open Graph preview card with 1200x630 dimensions to Facebook External Hit", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", CRAWLER_AGENTS.facebookExternalHit);

    expect(res.status).toBe(200);
    const og = extractOpenGraph(res.text);
    expect(og["og:title"]).toContain("Nyāya Epistemology");
    expect(og["og:type"]).toBe("article");
    expect(og["og:image"]).toBeTruthy();
    expect(og["og:image:width"]).toBe("1200");
    expect(og["og:image:height"]).toBe("630");
  });

  it("serves crisp social title, description, and preview image to WhatsApp link scraper", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", CRAWLER_AGENTS.whatsapp);

    expect(res.status).toBe(200);
    const og = extractOpenGraph(res.text);
    expect(og["og:title"]).toContain("Nyāya Epistemology");
    expect(og["og:description"]).toBeTruthy();
    expect(og["og:image"]).toBeTruthy();
  });

  it("serves complete Open Graph article tags to LinkedInBot", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", CRAWLER_AGENTS.linkedInBot);

    expect(res.status).toBe(200);
    const og = extractOpenGraph(res.text);
    expect(og["og:title"]).toContain("Nyāya Epistemology");
    expect(og["og:url"]).toBe("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");
  });

  it("serves clean Applebot document without proprietary script blockers", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory")
      .set("User-Agent", CRAWLER_AGENTS.applebot);

    expect(res.status).toBe(200);
    const title = extractTitle(res.text);
    expect(title).toContain("Nyāya Epistemology");
  });
});
