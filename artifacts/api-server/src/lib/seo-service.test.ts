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
  sanitizePrivateKey,
  parseGoogleServiceAccountCredentials,
  getGoogleServiceAccountStatus,
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
];

describe("Automated SEO Service", () => {
  const savedEnvs: Record<string, string | undefined> = {};
  let fetchSpy: any;
  const publishedUrls: { url: string; type: string }[] = [];

  beforeEach(() => {
    resetGoogleTokenCache();
    publishedUrls.length = 0;
    for (const k of ENV_VARS_TO_CLEAR) {
      savedEnvs[k] = process.env[k];
      delete process.env[k];
    }

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
    for (const k of ENV_VARS_TO_CLEAR) {
      if (savedEnvs[k] !== undefined) {
        process.env[k] = savedEnvs[k];
      } else {
        delete process.env[k];
      }
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
