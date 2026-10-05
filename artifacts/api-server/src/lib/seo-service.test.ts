import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  normalizeCanonicalUrls,
  submitUrlsToSearchEngines,
  triggerPublicContentSeo,
  triggerGoogleIndexing,
  reindexAllPublicContent,
  resetGoogleTokenCache,
  getSeoDispatchLog,
  sanitizePrivateKey,
  parseGoogleServiceAccountCredentials,
  getGoogleServiceAccountStatus,
} from "./seo-service";
import { CANONICAL_BASE_URL } from "./indexnow";

// The reindex sweep reads its URLs from the sitemap generator; stub it so these
// tests need no database.
const sitemap = vi.hoisted(() => ({
  entries: [] as Array<{ loc: string; lastmod?: string }>,
}));
vi.mock("./sitemap-entries", () => ({
  getSitemapEntries: async () => sitemap.entries,
}));

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

const ENV_VARS_TO_CLEAR = [
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CREDENTIALS",
  "GCP_SERVICE_ACCOUNT_KEY",
  "GCP_CREDENTIALS",
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_PROJECT_ID",
  "GOOGLE_TOKEN_URI",
  "INDEXNOW_ENABLED",
];

describe("Automated SEO Service", () => {
  const savedEnvs: Record<string, string | undefined> = {};
  let fetchSpy: any;
  const publishedUrls: { url: string; type: string }[] = [];
  const indexNowPayloads: Array<{ urlList: string[] }> = [];

  const calledHosts = () => fetchSpy.mock.calls.map((call: any[]) => String(call[0]));

  beforeEach(() => {
    resetGoogleTokenCache();
    publishedUrls.length = 0;
    indexNowPayloads.length = 0;
    sitemap.entries = [];
    for (const k of ENV_VARS_TO_CLEAR) {
      savedEnvs[k] = process.env[k];
      delete process.env[k];
    }
    // IndexNow only runs in production; force it on so submissions are exercised.
    process.env.INDEXNOW_ENABLED = "true";

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
        indexNowPayloads.push(init?.body ? JSON.parse(init.body) : {});
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    for (const k of ENV_VARS_TO_CLEAR) {
      if (savedEnvs[k] !== undefined) {
        process.env[k] = savedEnvs[k];
      } else {
        delete process.env[k];
      }
    }
  });

  it("normalizes paths and www URLs to the canonical apex, dropping every other host", () => {
    const raw = [
      "/articles/nyaya-epistemology",
      "papers/kavya-alamkara",
      "https://www.anvikshikijournal.in/articles/vedanta",
      "https://anvikshikijournal.in/authors/xiyatosaanvi",
      "https://anvikshiki.com/articles/elsewhere",
      "https://anvikshikijournal.com/aboutjournal.aspx",
      "https://evil.example/phish",
      "",
      "   ",
    ];

    const normalized = normalizeCanonicalUrls(raw);

    expect(normalized).toEqual([
      `${CANONICAL_BASE_URL}/articles/nyaya-epistemology`,
      `${CANONICAL_BASE_URL}/papers/kavya-alamkara`,
      `${CANONICAL_BASE_URL}/articles/vedanta`,
      `${CANONICAL_BASE_URL}/authors/xiyatosaanvi`,
    ]);
  });

  it("handles empty URL arrays gracefully", async () => {
    const res = await submitUrlsToSearchEngines([]);
    expect(res.success).toBe(true);
    expect(res.count).toBe(0);
  });

  it("submits URLs to IndexNow only, and records them in the dispatch log", async () => {
    const testUrls = [`${CANONICAL_BASE_URL}/articles/test-seo-article`];
    const res = await submitUrlsToSearchEngines(testUrls, "test-suite-run");

    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
    expect(indexNowPayloads[0].urlList).toEqual(testUrls);
    expect(calledHosts().some((u: string) => u.includes("google"))).toBe(false);
    expect(calledHosts().some((u: string) => u.includes("bing.com/ping"))).toBe(false);

    const logs = getSeoDispatchLog();
    expect(logs[0].reason).toBe("test-suite-run");
    expect(logs[0].urls).toContain(`${CANONICAL_BASE_URL}/articles/test-seo-article`);
  });

  it("does not submit anything to IndexNow outside production", async () => {
    delete process.env.INDEXNOW_ENABLED;
    const res = await submitUrlsToSearchEngines([`${CANONICAL_BASE_URL}/articles/x`], "preview-run");

    expect(res.skipped).toBe(true);
    expect(res.count).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("notifies IndexNow about a published work only, never sitemap/feed/profile URLs or Google", async () => {
    await triggerPublicContentSeo({
      type: "article",
      slug: "test-bg-article",
      authorSlug: "test-scholar",
      authorId: "user-123",
      title: "Test Article Title",
      tags: ["Nyaya", "Epistemology"],
    });

    const logs = getSeoDispatchLog();
    const found = logs.find(l => l.reason.includes("publish-article:test-bg-article"));
    expect(found).toBeDefined();
    expect(found?.urls).toEqual([`${CANONICAL_BASE_URL}/articles/test-bg-article`]);
    expect(publishedUrls.length).toBe(0);
    expect(calledHosts().some((u: string) => u.includes("google"))).toBe(false);
  });

  it("does not push profile edits", async () => {
    const result = await triggerPublicContentSeo({ type: "profile", slug: "someone", authorId: "user-1" });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("reindexAllPublicContent (IndexNow sweep over the sitemap)", () => {
    const now = new Date("2026-10-05T04:00:00.000Z");

    beforeEach(() => {
      sitemap.entries = [
        { loc: `${CANONICAL_BASE_URL}/articles/fresh`, lastmod: "2026-10-04T20:00:00.000Z" },
        { loc: `${CANONICAL_BASE_URL}/articles/old`, lastmod: "2026-08-21T11:21:00.000Z" },
        { loc: `${CANONICAL_BASE_URL}/about`, lastmod: "2026-09-01T00:00:00.000Z" },
      ];
    });

    it("submits only URLs whose lastmod changed inside the window by default", async () => {
      const result = await reindexAllPublicContent({ now });

      expect(result.scope).toBe("changed");
      expect(result.urls).toEqual([`${CANONICAL_BASE_URL}/articles/fresh`]);
      expect(indexNowPayloads[0].urlList).toEqual([`${CANONICAL_BASE_URL}/articles/fresh`]);
      expect(publishedUrls.length).toBe(0);
    });

    it("submits every sitemap URL when an administrator asks for scope=all", async () => {
      const result = await reindexAllPublicContent({ scope: "all", now });

      expect(result.totalUrls).toBe(3);
      expect(indexNowPayloads[0].urlList).toHaveLength(3);
    });

    it("makes no IndexNow call when nothing changed", async () => {
      const result = await reindexAllPublicContent({ now: new Date("2027-01-01T00:00:00.000Z") });

      expect(result.totalUrls).toBe(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Google Indexing API (triggerGoogleIndexing) — disabled for journal pages", () => {
    it("never submits article or other journal URLs, even with credentials configured", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      const result = await triggerGoogleIndexing(`${CANONICAL_BASE_URL}/articles/nyaya-epistemology-pramana-theory`);

      expect(result.submitted).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.error).toContain("JobPosting");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("reports a missing service account without pinging anything", async () => {
      const result = await triggerGoogleIndexing(`${CANONICAL_BASE_URL}/jobs/example`, "URL_UPDATED", { contentType: "JobPosting" });

      expect(result.success).toBe(true);
      expect(result.submitted).toBe(0);
      expect(result.error).toContain("not configured");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("exchanges a JWT and submits a URL explicitly declared as a JobPosting page", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      const testUrl = `${CANONICAL_BASE_URL}/jobs/editorial-assistant`;
      const result = await triggerGoogleIndexing(testUrl, "URL_UPDATED", { contentType: "JobPosting" });

      expect(result.success).toBe(true);
      expect(result.submitted).toBe(1);
      expect(result.failed).toBe(0);
      expect(publishedUrls.length).toBe(1);
      expect(publishedUrls[0].url).toBe(testUrl);
      expect(publishedUrls[0].type).toBe("URL_UPDATED");
    });

    it("supports URL_DELETED for permitted page types", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      const testUrl = `${CANONICAL_BASE_URL}/live/closed-broadcast`;
      const result = await triggerGoogleIndexing(testUrl, "URL_DELETED", { contentType: "BroadcastEvent" });

      expect(result.success).toBe(true);
      expect(result.submitted).toBe(1);
      expect(publishedUrls[0].type).toBe("URL_DELETED");
    });

    it("normalizes a batch and drops foreign hosts before submitting", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);

      const batch = [
        "/jobs/batch-1",
        "https://www.anvikshikijournal.in/jobs/batch-2",
        "https://evil.example/jobs/batch-3",
      ];

      const result = await triggerGoogleIndexing(batch, "URL_UPDATED", { contentType: "JobPosting" });

      expect(result.submitted).toBe(2);
      expect(publishedUrls.map(p => p.url)).toEqual([
        `${CANONICAL_BASE_URL}/jobs/batch-1`,
        `${CANONICAL_BASE_URL}/jobs/batch-2`,
      ]);
    });

    it("reports Google API errors without falling back to sitemap pings", async () => {
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

      const result = await triggerGoogleIndexing(`${CANONICAL_BASE_URL}/jobs/unverified-site`, "URL_UPDATED", { contentType: "JobPosting" });

      expect(result.success).toBe(false);
      expect(result.submitted).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.error).toContain("Permission denied");
      expect(calledHosts().some((u: string) => u.includes("/ping"))).toBe(false);
    });
  });

  describe("sanitizePrivateKey", () => {
    it("handles keys with escaped \\n characters", () => {
      const escaped = mockCredentials.private_key.replace(/\n/g, "\\n");
      const cleaned = sanitizePrivateKey(escaped);
      expect(cleaned).toContain("-----BEGIN PRIVATE KEY-----");
      expect(cleaned).toContain("-----END PRIVATE KEY-----");
      expect(cleaned.includes("\\n")).toBe(false);
    });

    it("handles keys wrapped in outer quotes", () => {
      const wrapped = `"${mockCredentials.private_key.replace(/\n/g, "\\n")}"`;
      const cleaned = sanitizePrivateKey(wrapped);
      expect(cleaned.startsWith("-----BEGIN PRIVATE KEY-----")).toBe(true);
    });

    it("handles single-line keys where newlines were collapsed to spaces", () => {
      const singleLine = mockCredentials.private_key.replace(/\r?\n/g, " ");
      const cleaned = sanitizePrivateKey(singleLine);
      expect(cleaned).toContain("-----BEGIN PRIVATE KEY-----");
      expect(cleaned).toContain("-----END PRIVATE KEY-----");
      expect(cleaned.split("\n").length).toBeGreaterThan(5);
    });

    it("converts PKCS#1 RSA private keys to standard PKCS#8 format", () => {
      const pkcs1Pair = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs1", format: "pem" },
      });
      const converted = sanitizePrivateKey(pkcs1Pair.privateKey);
      expect(converted).toContain("-----BEGIN PRIVATE KEY-----");
      expect(converted).not.toContain("BEGIN RSA PRIVATE KEY");
    });
  });

  describe("parseGoogleServiceAccountCredentials (Vercel Resilient Parsing)", () => {
    it("parses valid JSON from GOOGLE_SERVICE_ACCOUNT_KEY", () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);
      const creds = parseGoogleServiceAccountCredentials();
      expect(creds).not.toBeNull();
      expect(creds?.client_email).toBe(mockCredentials.client_email);
      expect(creds?.private_key).toContain("-----BEGIN PRIVATE KEY-----");
      expect(creds?.source).toBe("GOOGLE_SERVICE_ACCOUNT_KEY");
    });

    it("parses base64-encoded JSON from GOOGLE_SERVICE_ACCOUNT_KEY", () => {
      const b64 = Buffer.from(JSON.stringify(mockCredentials)).toString("base64");
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = b64;
      const creds = parseGoogleServiceAccountCredentials();
      expect(creds).not.toBeNull();
      expect(creds?.client_email).toBe(mockCredentials.client_email);
    });

    it("parses double-stringified JSON (e.g. pasted into Vercel UI with escaped quotes)", () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(JSON.stringify(mockCredentials));
      const creds = parseGoogleServiceAccountCredentials();
      expect(creds).not.toBeNull();
      expect(creds?.client_email).toBe(mockCredentials.client_email);
    });

    it("parses credentials from GOOGLE_SERVICE_ACCOUNT_JSON fallback alias", () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(mockCredentials);
      const creds = parseGoogleServiceAccountCredentials();
      expect(creds).not.toBeNull();
      expect(creds?.source).toBe("GOOGLE_SERVICE_ACCOUNT_JSON");
    });

    it("parses individual environment variables GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY", () => {
      process.env.GOOGLE_CLIENT_EMAIL = mockCredentials.client_email;
      process.env.GOOGLE_PRIVATE_KEY = mockCredentials.private_key;
      process.env.GOOGLE_PROJECT_ID = "custom-project";

      const creds = parseGoogleServiceAccountCredentials();
      expect(creds).not.toBeNull();
      expect(creds?.client_email).toBe(mockCredentials.client_email);
      expect(creds?.project_id).toBe("custom-project");
      expect(creds?.source).toBe("GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY");
    });

    it("returns null when no credentials environment variables are set", () => {
      const creds = parseGoogleServiceAccountCredentials();
      expect(creds).toBeNull();
    });
  });

  describe("getGoogleServiceAccountStatus", () => {
    it("reports configured=false when no env vars exist", () => {
      const status = getGoogleServiceAccountStatus();
      expect(status.configured).toBe(false);
      expect(status.clientEmail).toBeNull();
      expect(status.validKey).toBe(false);
    });

    it("reports configured=true, validKey=true, and masked client email when configured", () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials);
      const status = getGoogleServiceAccountStatus();
      expect(status.configured).toBe(true);
      expect(status.validKey).toBe(true);
      expect(status.clientEmail).toContain("test");
      expect(status.clientEmail).toContain("gserviceaccount.com");
      expect(status.source).toBe("GOOGLE_SERVICE_ACCOUNT_KEY");
    });

    it("detects malformed/invalid private keys with validKey=false", () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        client_email: "test@domain.com",
        private_key: "not-a-valid-pem-key",
      });
      const status = getGoogleServiceAccountStatus();
      expect(status.configured).toBe(true);
      expect(status.validKey).toBe(false);
      expect(status.keyError).toBeDefined();
    });
  });
});
