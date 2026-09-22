import * as fs from "fs";
import { importPKCS8, SignJWT } from "jose";
import { logger } from "./logger";
import { CANONICAL_HOST, CANONICAL_BASE_URL, submitIndexNow } from "./indexnow";

export interface SeoDispatchEvent {
  timestamp: string;
  reason: string;
  urls: string[];
  success: boolean;
  count: number;
  engines: string[];
  error?: string;
}

// In-memory circular buffer for recent SEO dispatch events
const recentDispatches: SeoDispatchEvent[] = [];
const MAX_DISPATCH_LOGS = 50;

function recordDispatch(event: SeoDispatchEvent) {
  recentDispatches.unshift(event);
  if (recentDispatches.length > MAX_DISPATCH_LOGS) {
    recentDispatches.pop();
  }
}

export function getSeoDispatchLog(): SeoDispatchEvent[] {
  return [...recentDispatches];
}

/**
 * Ping search engines with the updated sitemap URL.
 * Even when engines crawl on their own schedule, submitting sitemap pings
 * prompts search engine crawlers to immediately queue an update pass.
 */
export async function pingSearchEngineSitemaps(sitemapUrl: string = `${CANONICAL_BASE_URL}/sitemap.xml`): Promise<{ google: boolean; bing: boolean }> {
  const results = { google: false, bing: false };
  const encodedSitemap = encodeURIComponent(sitemapUrl);

  const pings = [
    {
      engine: "google" as const,
      url: `https://www.google.com/ping?sitemap=${encodedSitemap}`,
    },
    {
      engine: "bing" as const,
      url: `https://www.bing.com/ping?sitemap=${encodedSitemap}`,
    },
  ];

  await Promise.all(
    pings.map(async ({ engine, url }) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, {
          method: "GET",
          headers: { "User-Agent": "AnvikshikiJournal-SEO-Notifier/1.0" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        // Any 2xx or 3xx or 404 (if deprecated) is safe and non-fatal
        results[engine] = res.ok || res.status < 500;
      } catch (err: any) {
        logger.debug({ engine, err: err?.message }, "Search engine sitemap ping non-fatal notice");
        results[engine] = false;
      }
    })
  );

  return results;
}

/**
 * Normalizes input URLs to ensure absolute canonical URLs for the journal domain.
 */
export function normalizeCanonicalUrls(urls: string[]): string[] {
  const normalized = new Set<string>();

  for (const raw of urls) {
    if (!raw || typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const parsed = new URL(trimmed);
        // Replace host with CANONICAL_HOST if it belongs to anvikshiki variants
        if (parsed.hostname.includes("anvikshiki") || parsed.hostname.includes("vercel.app")) {
          normalized.add(`${CANONICAL_BASE_URL}${parsed.pathname}${parsed.search}`);
        } else {
          normalized.add(trimmed);
        }
      } else {
        const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
        normalized.add(`${CANONICAL_BASE_URL}${cleanPath}`);
      }
    } catch {
      // Ignore unparseable strings
    }
  }

  return Array.from(normalized);
}

export interface GoogleServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id?: string;
  token_uri?: string;
}

export function parseGoogleServiceAccountCredentials(): GoogleServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw) return null;

  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed);
    }
    // Base64 encoded JSON
    if (trimmed.startsWith("ey")) {
      try {
        const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
        if (decoded.trim().startsWith("{")) {
          return JSON.parse(decoded);
        }
      } catch {
        // ignore
      }
    }
    // File path
    if (fs.existsSync(trimmed)) {
      const content = fs.readFileSync(trimmed, "utf-8");
      return JSON.parse(content);
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "[Google Indexing] Failed to parse service account credentials");
  }
  return null;
}

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

export function resetGoogleTokenCache() {
  cachedGoogleToken = null;
}

export async function getGoogleOAuth2AccessToken(creds?: GoogleServiceAccountKey | null): Promise<string | null> {
  const credentials = creds || parseGoogleServiceAccountCredentials();
  if (!credentials || !credentials.client_email || !credentials.private_key) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > now + 60) {
    return cachedGoogleToken.token;
  }

  try {
    let privateKeyPem = credentials.private_key;
    if (!privateKeyPem.includes("\n") && privateKeyPem.includes("\\n")) {
      privateKeyPem = privateKeyPem.replace(/\\n/g, "\n");
    }

    const privateKey = await importPKCS8(privateKeyPem, "RS256");

    const jwt = await new SignJWT({
      scope: "https://www.googleapis.com/auth/indexing",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(credentials.client_email)
      .setSubject(credentials.client_email)
      .setAudience(credentials.token_uri || "https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const tokenRes = await fetch(credentials.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      logger.warn({ status: tokenRes.status, errText }, "[Google Indexing] OAuth token exchange failed");
      return null;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string; expires_in?: number };
    const expiresIn = tokenData.expires_in || 3600;
    cachedGoogleToken = {
      token: tokenData.access_token,
      expiresAt: now + expiresIn,
    };
    return tokenData.access_token;
  } catch (err: any) {
    logger.warn({ err: err?.message }, "[Google Indexing] Token generation error");
    return null;
  }
}

/**
 * Triggers Google Indexing API (https://indexing.googleapis.com/v3/urlNotifications:publish)
 * for one or more URLs.
 * If credentials are not present or errors occur, gracefully falls back to sitemap ping.
 */
export async function triggerGoogleIndexing(
  urlOrUrls: string | string[],
  action: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<{ success: boolean; submitted: number; failed: number; error?: string }> {
  const rawList = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  const urls = normalizeCanonicalUrls(rawList);

  if (urls.length === 0) {
    return { success: true, submitted: 0, failed: 0 };
  }

  const creds = parseGoogleServiceAccountCredentials();
  if (!creds) {
    logger.info("[Google Indexing] No Google Service Account key provided, triggering sitemap ping fallback");
    pingSearchEngineSitemaps().catch(() => {});
    return {
      success: true,
      submitted: 0,
      failed: 0,
      error: "Google Service Account not configured; fell back to sitemap ping",
    };
  }

  const token = await getGoogleOAuth2AccessToken(creds);
  if (!token) {
    logger.warn("[Google Indexing] Unable to acquire OAuth2 token, triggering sitemap ping fallback");
    pingSearchEngineSitemaps().catch(() => {});
    return {
      success: false,
      submitted: 0,
      failed: urls.length,
      error: "OAuth2 token acquisition failed; fell back to sitemap ping",
    };
  }

  let submitted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url,
          type: action,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok || res.status === 200) {
        submitted++;
        logger.info({ url, action }, "[Google Indexing] URL notification submitted successfully");
      } else {
        failed++;
        const errJson = (await res.json().catch(() => null)) as any;
        const errMsg = errJson?.error?.message || (typeof errJson?.error === "string" ? errJson.error : "") || `HTTP ${res.status}`;
        errors.push(`${url}: ${errMsg}`);
        logger.warn({ url, status: res.status, errMsg }, "[Google Indexing] Google API rejected URL notification");
      }
    } catch (err: any) {
      failed++;
      errors.push(`${url}: ${err?.message || "Network error"}`);
      logger.warn({ url, err: err?.message }, "[Google Indexing] Network error submitting URL to Google");
    }
  }

  // If any submissions failed (e.g. quota or permission), trigger fallback sitemap ping
  if (failed > 0) {
    pingSearchEngineSitemaps().catch(() => {});
  }

  const success = submitted > 0 || failed === 0;
  const error = errors.length > 0 ? errors.join("; ") : undefined;

  recordDispatch({
    timestamp: new Date().toISOString(),
    reason: `google-indexing:${action.toLowerCase()}`,
    urls,
    success,
    count: submitted,
    engines: ["Google Indexing API"],
    error,
  });

  return { success, submitted, failed, error };
}

/**
 * Submits URLs to search engines (IndexNow + Google Indexing + Sitemap pings) in a fire-and-forget
 * background task that never throws or blocks the caller.
 */
export async function submitUrlsToSearchEngines(
  rawUrls: string[],
  reason: string = "content-update"
): Promise<{ success: boolean; count: number; error?: string }> {
  const urls = normalizeCanonicalUrls(rawUrls);
  if (urls.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    // 1. Submit to IndexNow (Bing, Yandex, Seznam, Naver)
    const indexNowResult = await submitIndexNow(urls);

    // 2. Submit to Google Indexing API
    const googleResult = await triggerGoogleIndexing(urls, "URL_UPDATED").catch((err) => {
      logger.warn({ err: err?.message }, "[Google Indexing] Non-fatal indexing trigger error");
      return { success: false, submitted: 0, failed: urls.length, error: err?.message };
    });

    // 3. Ping sitemap updates to Google & Bing
    const sitemapUrl = `${CANONICAL_BASE_URL}/sitemap.xml`;
    pingSearchEngineSitemaps(sitemapUrl).catch(() => {});

    const dispatchEvent: SeoDispatchEvent = {
      timestamp: new Date().toISOString(),
      reason,
      urls,
      success: indexNowResult.success || googleResult.success,
      count: Math.max(indexNowResult.count || 0, googleResult.submitted || 0, urls.length),
      engines: [
        "IndexNow (Bing/Yandex/Naver)",
        "Google Indexing API",
        "Google Sitemap Ping",
        "Bing Sitemap Ping",
      ],
      error: indexNowResult.error || googleResult.error,
    };

    recordDispatch(dispatchEvent);

    logger.info(
      {
        count: urls.length,
        reason,
        indexNowSuccess: indexNowResult.success,
        googleSubmitted: googleResult.submitted,
      },
      "[SEO Engine] Automated search engine notification completed"
    );

    return {
      success: indexNowResult.success || googleResult.success,
      count: urls.length,
      error: indexNowResult.error || googleResult.error,
    };
  } catch (err: any) {
    logger.warn({ err: err?.message, urls }, "[SEO Engine] Failed to dispatch SEO notification");
    recordDispatch({
      timestamp: new Date().toISOString(),
      reason,
      urls,
      success: false,
      count: 0,
      engines: ["IndexNow", "Google Indexing API", "Google Sitemap Ping"],
      error: err?.message || "Unknown error",
    });
    return { success: false, count: 0, error: err?.message };
  }
}

export interface ContentPublicationPayload {
  type: "article" | "paper" | "profile" | "category";
  slug: string;
  authorSlug?: string | null;
  authorId?: string | null;
  tags?: string[];
  title?: string;
}

/**
 * Triggers an automated SEO update pass whenever public content is uploaded or updated.
 * Dispatches asynchronously in the background so callers (HTTP endpoints) respond instantly.
 */
export function triggerPublicContentSeo(payload: ContentPublicationPayload): Promise<any> {
  const task = async () => {
    try {
      const urls: string[] = [];

      if (payload.type === "article") {
        urls.push(`${CANONICAL_BASE_URL}/articles/${encodeURIComponent(payload.slug)}`);
      } else if (payload.type === "paper") {
        urls.push(`${CANONICAL_BASE_URL}/papers/${encodeURIComponent(payload.slug)}`);
      } else if (payload.type === "category") {
        urls.push(`${CANONICAL_BASE_URL}/domains/${encodeURIComponent(payload.slug)}`);
      } else if (payload.type === "profile") {
        urls.push(`${CANONICAL_BASE_URL}/authors/${encodeURIComponent(payload.slug)}`);
      }

      if (payload.authorSlug) {
        urls.push(`${CANONICAL_BASE_URL}/authors/${encodeURIComponent(payload.authorSlug)}`);
      } else if (payload.authorId) {
        urls.push(`${CANONICAL_BASE_URL}/profile/${encodeURIComponent(payload.authorId)}`);
      }

      // Always include dynamic sitemap and RSS feed so crawlers pick up the new entry immediately
      urls.push(`${CANONICAL_BASE_URL}/sitemap.xml`);
      urls.push(`${CANONICAL_BASE_URL}/feed`);

      // 1. Submit primary URL to Google Indexing API directly
      const primaryUrl = urls[0];
      if (primaryUrl) {
        triggerGoogleIndexing(primaryUrl, "URL_UPDATED").catch((err) => {
          logger.warn({ err: err?.message, primaryUrl }, "[SEO Engine] Background Google Indexing trigger non-fatal notice");
        });
      }

      // 2. Submit all associated URLs to search engines (IndexNow + Google Indexing + Sitemap pings)
      return await submitUrlsToSearchEngines(urls, `publish-${payload.type}:${payload.slug}`);
    } catch (err: any) {
      logger.warn({ err: err?.message, payload }, "[SEO Engine] Background publication trigger caught error");
      return null;
    }
  };

  return task();
}

