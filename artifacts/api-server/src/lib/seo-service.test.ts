import { describe, it, expect, vi } from "vitest";
import {
  normalizeCanonicalUrls,
  submitUrlsToSearchEngines,
  pingSearchEngineSitemaps,
  triggerPublicContentSeo,
  getSeoDispatchLog,
} from "./seo-service";
import { CANONICAL_BASE_URL } from "./indexnow";

describe("Automated SEO Service", () => {
  it("normalizes relative paths and variant URLs to canonical host", () => {
    const raw = [
      "/articles/nyaya-epistemology",
      "papers/kavya-alamkara",
      "https://anvikshiki.com/articles/vedanta",
      "https://anvikshikijournal.in/authors/xiyatosaanvi",
      "",
      "   ",
    ];

    const normalized = normalizeCanonicalUrls(raw);

    expect(normalized).toContain(`${CANONICAL_BASE_URL}/articles/nyaya-epistemology`);
    expect(normalized).toContain(`${CANONICAL_BASE_URL}/papers/kavya-alamkara`);
    expect(normalized).toContain(`${CANONICAL_BASE_URL}/articles/vedanta`);
    expect(normalized).toContain(`${CANONICAL_BASE_URL}/authors/xiyatosaanvi`);
    expect(normalized.length).toBe(4);
  });

  it("handles empty URL arrays gracefully", async () => {
    const res = await submitUrlsToSearchEngines([]);
    expect(res.success).toBe(true);
    expect(res.count).toBe(0);
  });

  it("pings search engine sitemaps without throwing errors", async () => {
    // Should never throw, even if offline or mock environment
    const result = await pingSearchEngineSitemaps();
    expect(result).toBeDefined();
    expect(typeof result.google).toBe("boolean");
    expect(typeof result.bing).toBe("boolean");
  });

  it("submits URLs to IndexNow and records in recent dispatch logs", async () => {
    const testUrls = [`${CANONICAL_BASE_URL}/articles/test-seo-article`];
    const res = await submitUrlsToSearchEngines(testUrls, "test-suite-run");

    expect(res).toBeDefined();
    const logs = getSeoDispatchLog();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].reason).toBe("test-suite-run");
    expect(logs[0].urls).toContain(`${CANONICAL_BASE_URL}/articles/test-seo-article`);
  });

  it("triggers background SEO updates for published content", async () => {
    await triggerPublicContentSeo({
      type: "article",
      slug: "test-bg-article",
      authorSlug: "test-scholar",
      title: "Test Article Title",
      tags: ["Nyaya", "Epistemology"],
    });

    const logs = getSeoDispatchLog();
    const found = logs.find(l => l.reason.includes("publish-article:test-bg-article"));
    expect(found).toBeDefined();
    expect(found?.urls).toContain(`${CANONICAL_BASE_URL}/articles/test-bg-article`);
    expect(found?.urls).toContain(`${CANONICAL_BASE_URL}/authors/test-scholar`);
    expect(found?.urls).toContain(`${CANONICAL_BASE_URL}/sitemap.xml`);
  });
});
