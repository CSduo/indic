import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { parseRssItems } from "../helpers/html-parser";

/**
 * Requirement R6: RSS Feed Generation
 *
 * Ensure /api/rss produces valid, well-escaped XML feeds with canonical links and real publication dates.
 */
describe("Tier 1 - Feature 7: RSS Feed Generation (R6)", () => {
  it("serves valid RSS 2.0 XML with correct Content-Type", async () => {
    const res = await request(app).get("/api/rss");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/rss\+xml|application\/xml|text\/xml/);
    expect(res.text).toContain("<rss version=\"2.0\">");
    expect(res.text).toContain("<channel>");
  });

  it("includes channel metadata with canonical site link and title", async () => {
    const res = await request(app).get("/api/rss");

    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>Ānvīkṣikī");
    expect(res.text).toContain("<link>https://anvikshikijournal.in</link>");
    expect(res.text).toContain("<language>en-us</language>");
  });

  it("includes published articles and research papers with canonical links", async () => {
    const res = await request(app).get("/api/rss");

    expect(res.status).toBe(200);
    const items = parseRssItems(res.text);

    expect(items.length).toBeGreaterThanOrEqual(1);
    const links = items.map(i => i.link);
    expect(links.some(l => l.includes("/articles/nyaya-epistemology-pramana-theory"))).toBe(true);
    expect(links.some(l => l.includes("/papers/kavya-alamkara-computational-poetics"))).toBe(true);
  });

  it("provides valid RFC 822 / UTC formatted pubDate for each item", async () => {
    const res = await request(app).get("/api/rss");

    expect(res.status).toBe(200);
    const items = parseRssItems(res.text);

    for (const item of items) {
      expect(item.pubDate).toBeTruthy();
      const parsedTime = new Date(item.pubDate).getTime();
      expect(parsedTime).not.toBeNaN();
    }
  });

  it("orders RSS items in descending chronological order", async () => {
    const res = await request(app).get("/api/rss");

    expect(res.status).toBe(200);
    const items = parseRssItems(res.text);

    if (items.length >= 2) {
      for (let i = 0; i < items.length - 1; i++) {
        const timeA = new Date(items[i].pubDate).getTime();
        const timeB = new Date(items[i + 1].pubDate).getTime();
        expect(timeA).toBeGreaterThanOrEqual(timeB);
      }
    }
  });

  it("safely escapes XML entities or encloses titles and descriptions in CDATA blocks", async () => {
    const res = await request(app).get("/api/rss");

    expect(res.status).toBe(200);
    // Unescaped standalone ampersands outside entities or CDATA break XML
    const rawXml = res.text;
    expect(rawXml).not.toMatch(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
  });
});
