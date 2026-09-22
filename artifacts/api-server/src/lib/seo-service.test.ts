import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  normalizeCanonicalUrls,
  submitUrlsToSearchEngines,
  pingSearchEngineSitemaps,
  triggerPublicContentSeo,
  triggerGoogleIndexing,
  resetGoogleTokenCache,
  getSeoDispatchLog,
} from "./seo-service";
import { CANONICAL_BASE_URL } from "./indexnow";

// Generate genuine PKCS8 key for test mock
const testKeyPair = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const mockCredentials = {
  client_email: "test-indexer@anvikshiki-journal.iam.gserviceaccount.com",
  private_key: testKeyPair.privateKey,
  project_id: "anvikshiki-journal",
  token_uri: "https://oauth2.googleapis.com/token",
};

describe("Automated SEO Service", () => {
  const originalEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let fetchSpy: any;
  const publishedUrls: { url: string; type: string }[] = [];

  beforeEach(() => {
    resetGoogleTokenCache();
    publishedUrls.length = 0;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: any, init?: any) => {
      const urlStr = typeof input === "string" ? input : input.url || input.toString();

      // OAuth Token Exchange
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({ access_token: "mock-google-bearer-token", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Google Indexing API publish
      if (urlStr.includes("indexing.googleapis.com/v3/urlNotifications:publish")) {
        const body = init?.body ? JSON.parse(init.body) : {};
        publishedUrls.push(body);
        return new Response(
          JSON.stringify({
            urlNotificationMetadata: {
              url: body.url,
              latestUpdate: { url: body.url, type: body.type, notifyTime: new Date().toISOString() },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // IndexNow API
      if (urlStr.includes("api.indexnow.org")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Sitemap pings (Google & Bing)
      if (urlStr.includes("google.com/ping") || urlStr.includes("bing.com/ping")) {
        return new Response("OK", { status: 200 });
      }

      return new Response("Not Found", { status: 404 });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalEnv !== undefined) {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = originalEnv;
    } else {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    }
  });

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
    const result = await pingSearchEngineSitemaps();
    expect(result).toBeDefined();
    expect(result.google).toBe(true);
    expect(result.bing).toBe(true);
  });

  it("submits URLs to IndexNow and records in recent dispatch logs", async () => {
    const testUrls = [`${CANONICAL_BASE_URL}/articles/test-seo-article`];
    const res = await submitUrlsToSearchEngines(testUrls, "test-suite-run");

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
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

  describe("Google Indexing API (triggerGoogleIndexing)", () => {
    it("gracefully falls back to sitemap ping when service account credentials are not configured", async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

      const result = await triggerGoogleIndexing(`${CANONICAL_BASE_URL}/articles/fallback-test`);
      expect(result.success).toBe(true);
      expect(result.submitted).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.error).toContain("sitemap ping");

      // Verify ping was triggered
      const hasPingCall = fetchSpy.mock.calls.some((call: any[]) =>
        call[0].includes("google.com/ping") || call[0].includes("bing.com/ping")
      );
      expect(hasPingCall).toBe(true);
    });

    it("successfully exchanges JWT and submits single URL to Google Indexing API", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      const testUrl = `${CANONICAL_BASE_URL}/articles/nyaya-epistemology-pramana-theory`;
      const result = await triggerGoogleIndexing(testUrl, "URL_UPDATED");

      expect(result.success).toBe(true);
      expect(result.submitted).toBe(1);
      expect(result.failed).toBe(0);
      expect(publishedUrls.length).toBe(1);
      expect(publishedUrls[0].url).toBe(testUrl);
      expect(publishedUrls[0].type).toBe("URL_UPDATED");
    });

    it("supports URL_DELETED action type", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      const testUrl = `${CANONICAL_BASE_URL}/articles/retracted-paper`;
      const result = await triggerGoogleIndexing(testUrl, "URL_DELETED");

      expect(result.success).toBe(true);
      expect(result.submitted).toBe(1);
      expect(publishedUrls.length).toBe(1);
      expect(publishedUrls[0].type).toBe("URL_DELETED");
    });

    it("submits multiple URLs in batch and normalizes them", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      const batch = [
        "/articles/batch-1",
        "/papers/batch-2",
        "https://anvikshikijournal.in/domains/darshana",
      ];

      const result = await triggerGoogleIndexing(batch);

      expect(result.success).toBe(true);
      expect(result.submitted).toBe(3);
      expect(result.failed).toBe(0);
      expect(publishedUrls.length).toBe(3);
      expect(publishedUrls.map(p => p.url)).toEqual([
        `${CANONICAL_BASE_URL}/articles/batch-1`,
        `${CANONICAL_BASE_URL}/papers/batch-2`,
        `${CANONICAL_BASE_URL}/domains/darshana`,
      ]);
    });

    it("handles Google API errors defensively by triggering sitemap ping fallback", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      // Re-mock indexing endpoint to simulate 403 Forbidden (ownership not verified)
      fetchSpy.mockImplementation(async (input: any) => {
        const urlStr = typeof input === "string" ? input : input.url || input.toString();
        if (urlStr.includes("oauth2.googleapis.com/token")) {
          return new Response(JSON.stringify({ access_token: "mock-token", expires_in: 3600 }), {
            status: 200,
          });
        }
        if (urlStr.includes("indexing.googleapis.com")) {
          return new Response(
            JSON.stringify({
              error: {
                code: 403,
                message: "Permission denied. Failed to verify the URL ownership.",
                status: "PERMISSION_DENIED",
              },
            }),
            { status: 403 }
          );
        }
        return new Response("OK", { status: 200 });
      });

      const result = await triggerGoogleIndexing(`${CANONICAL_BASE_URL}/articles/unverified-site`);

      expect(result.success).toBe(false);
      expect(result.submitted).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.error).toContain("Permission denied");

      // Verify sitemap ping was triggered as fallback
      const hasPingCall = fetchSpy.mock.calls.some((call: any[]) =>
        call[0].includes("google.com/ping") || call[0].includes("bing.com/ping")
      );
      expect(hasPingCall).toBe(true);
    });
  });
});
