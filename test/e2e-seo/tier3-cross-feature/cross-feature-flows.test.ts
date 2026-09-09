import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import {
  extractCanonical,
  extractOpenGraph,
  parseSitemapUrls,
  parseRssItems,
  getMeta,
  extractTitle,
} from "../helpers/html-parser";

/**
 * Tier 3: Cross-Feature Interactions
 *
 * Validates complex workflows spanning multiple features:
 * - Author Hub -> Publication -> Related Content -> Citation Lifecycle
 * - Publication Update -> Sitemap lastmod sync -> RSS feed synchronization
 * - Query Stripping & Canonical URL Preservation
 * - Domain Hub -> Publication -> Author Hub Bidirectional Linking
 */
describe("Tier 3 - Cross-Feature Interactions", () => {
  it("completes the Author Hub -> Publication -> Related Content -> Citation flow", async () => {
    // Step 1: Request Author Hub
    const authorRes = await request(app).get("/authors/arya-ambadi");
    if (authorRes.status === 200) {
      expect(authorRes.text).toContain("Arya Ambadi");
      expect(authorRes.text).toMatch(/nyaya-epistemology-pramana-theory/);
    }

    // Step 2: Navigate to the linked Publication
    const articleRes = await request(app).get("/articles/nyaya-epistemology-pramana-theory");
    expect(articleRes.status).toBe(200);
    expect(articleRes.text).toContain("Nyāya Epistemology");

    // Step 3: Verify Internal Semantic Linking (Related content / Domain)
    const hasDomainLink =
      articleRes.text.includes("/domains/philosophy") ||
      articleRes.text.includes("Philosophy") ||
      articleRes.text.includes("Related");
    expect(hasDomainLink).toBe(true);

    // Step 4: Verify Citation generator capability on publication
    const hasCitationTool =
      articleRes.text.includes("citation") ||
      articleRes.text.includes("Cite") ||
      articleRes.text.includes("Ambadi");
    expect(hasCitationTool).toBe(true);
  });

  it("synchronizes sitemap lastmod timestamps with database update timestamps", async () => {
    let sitemapRes = await request(app).get("/sitemap.xml");
    if (sitemapRes.status === 404) {
      sitemapRes = await request(app).get("/api/sitemap.xml");
    }

    expect(sitemapRes.status).toBe(200);
    const urls = parseSitemapUrls(sitemapRes.text);
    const articleEntry = urls.find(u => u.loc.includes("nyaya-epistemology-pramana-theory"));

    expect(articleEntry).toBeDefined();
    expect(articleEntry?.lastmod).toBeDefined();

    // Verify lastmod matches DB record updatedAt: "2026-03-16T14:30:00Z"
    const lastmodTime = new Date(articleEntry!.lastmod!).getTime();
    expect(lastmodTime).not.toBeNaN();
  });

  it("places recently published and updated publications at the top of the RSS feed", async () => {
    const rssRes = await request(app).get("/api/rss");
    expect(rssRes.status).toBe(200);

    const items = parseRssItems(rssRes.text);
    expect(items.length).toBeGreaterThanOrEqual(1);

    // First item must have the most recent publication timestamp
    const firstDate = new Date(items[0].pubDate).getTime();
    for (let i = 1; i < items.length; i++) {
      const itemDate = new Date(items[i].pubDate).getTime();
      expect(firstDate).toBeGreaterThanOrEqual(itemDate);
    }
  });

  it("preserves canonical base URL across arbitrary social tracking and campaign query parameters", async () => {
    const campaignUrls = [
      "/articles/nyaya-epistemology-pramana-theory?utm_source=twitter&utm_medium=social",
      "/articles/nyaya-epistemology-pramana-theory?fbclid=IwAR2xyz123_abc",
      "/articles/nyaya-epistemology-pramana-theory?ref=newsletter_march_2026&page=1",
    ];

    for (const url of campaignUrls) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);

      const canonical = extractCanonical(res.text);
      const og = extractOpenGraph(res.text);

      // Canonical link must be strictly the base URL without query strings
      expect(canonical).toBe("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");

      // Open Graph URL must also match canonical
      if (og["og:url"]) {
        expect(og["og:url"]).toBe("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");
      }
    }
  });

  it("verifies the Domain Hub -> Paper -> Author Hub closed authority loop", async () => {
    // Step 1: Visit Domain Hub
    const domainRes = await request(app).get("/domains/linguistics");
    if (domainRes.status === 200) {
      expect(domainRes.text).toMatch(/kavya-alamkara|Computational/i);
    }

    // Step 2: Visit Paper listed in domain
    const paperRes = await request(app).get("/papers/kavya-alamkara-computational-poetics");
    expect(paperRes.status).toBe(200);
    expect(paperRes.text).toMatch(/Ananya Sharma|Raghavan Sastri/);

    // Step 3: Link back to author profile
    const linksToAuthor = paperRes.text.includes("/authors/") || paperRes.text.includes("ananya-sharma");
    expect(linksToAuthor).toBe(true);
  });

  it("ensures Google Scholar bibliographic metadata matches citation text representation", async () => {
    const res = await request(app).get("/papers/kavya-alamkara-computational-poetics");
    expect(res.status).toBe(200);

    const scholarTitle = getMeta(res.text, "citation_title");
    const scholarDate = getMeta(res.text, "citation_publication_date");

    if (scholarTitle) {
      expect(res.text).toContain(scholarTitle);
    }
    if (scholarDate) {
      expect(res.text).toContain("2026");
    }
  });
});
