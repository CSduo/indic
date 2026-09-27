import * as fs from "fs";
import * as crypto from "crypto";
import { importPKCS8, SignJWT } from "jose";
import { logger } from "./logger";
import { CANONICAL_HOST, CANONICAL_BASE_URL, submitIndexNow } from "./indexnow";

export { CANONICAL_HOST, CANONICAL_BASE_URL };

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

/**
 * Normalizes, strips quotes, replaces escaped line breaks, and standardizes RSA/PKCS8 PEM keys
 * so that both Node.js crypto and jose importPKCS8 can parse them reliably without formatting errors.
 */
export function sanitizePrivateKey(rawKey: string): string {
  if (!rawKey || typeof rawKey !== "string") return "";
  let key = rawKey.trim();

  // Strip wrapping single or double quotes
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Normalize all forms of escaped newlines and CRLF
  key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  try {
    const keyObj = crypto.createPrivateKey(key);
    return keyObj.export({ type: "pkcs8", format: "pem" }).toString();
  } catch {
    // If standard parsing fails (e.g. malformed headers or single-line PEM),
    // attempt fallback reconstruction if the string contains a private key payload
    if (key.includes("PRIVATE KEY")) {
      const clean = key
        .replace(/-----BEGIN[ A-Z_-]+-----/g, "")
        .replace(/-----END[ A-Z_-]+-----/g, "")
        .replace(/\s+/g, "");

      if (/^[A-Za-z0-9+/=]+$/.test(clean) && clean.length > 50) {
        const chunked = clean.match(/.{1,64}/g)?.join("\n") || clean;
        const reconstructed = `-----BEGIN PRIVATE KEY-----\n${chunked}\n-----END PRIVATE KEY-----\n`;
        try {
          const retryKey = crypto.createPrivateKey(reconstructed);
          return retryKey.export({ type: "pkcs8", format: "pem" }).toString();
        } catch {
          return reconstructed;
        }
      }
    }
    return key;
  }
}

function unwrapCredentialsObject(obj: any): any {
  if (!obj || typeof obj !== "object") return null;
  // If wrapped in envelope like { credentials: { ... } } or { service_account: { ... } }
  if (obj.credentials && typeof obj.credentials === "object") {
    return unwrapCredentialsObject(obj.credentials);
  }
  if (obj.service_account && typeof obj.service_account === "object") {
    return unwrapCredentialsObject(obj.service_account);
  }
  return obj;
}

function tryParseServiceAccountJson(raw: string): any | null {
  if (!raw || typeof raw !== "string") return null;
  let text = raw.trim();

  // Strip wrapping quotes
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }

  // 1. Direct JSON parse
  try {
    let parsed = JSON.parse(text);
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    if (parsed && typeof parsed === "object") {
      return unwrapCredentialsObject(parsed);
    }
  } catch {}

  // 2. Unescape escaped quotes (e.g. {\"type\": ...})
  try {
    const unescaped = text.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    let parsed = JSON.parse(unescaped);
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    if (parsed && typeof parsed === "object") {
      return unwrapCredentialsObject(parsed);
    }
  } catch {}

  // 3. Base64 encoded JSON
  try {
    const cleanB64 = text.replace(/\s+/g, "");
    const decoded = Buffer.from(cleanB64, "base64").toString("utf-8").trim();
    if (decoded.startsWith("{") && decoded.endsWith("}")) {
      let parsed = JSON.parse(decoded);
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {}
      }
      if (parsed && typeof parsed === "object") {
        return unwrapCredentialsObject(parsed);
      }
    }
  } catch {}

  // 4. File path on disk
  try {
    if (fs.existsSync(text)) {
      const fileContent = fs.readFileSync(text, "utf-8").trim();
      return tryParseServiceAccountJson(fileContent);
    }
  } catch {}

  return null;
}

export interface GoogleServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id?: string;
  token_uri?: string;
  source?: string;
}

export interface GoogleServiceAccountStatus {
  configured: boolean;
  source: string | null;
  clientEmail: string | null;
  projectId: string | null;
  validKey: boolean;
  keyError?: string;
  lastApiError?: string | null;
}

let lastGoogleApiError: string | null = null;

export function parseGoogleServiceAccountCredentials(): GoogleServiceAccountKey | null {
  // 1. Check all candidate JSON / file environment variables
  const jsonCandidates: { env: string; val: string | undefined }[] = [
    { env: "GOOGLE_SERVICE_ACCOUNT_KEY", val: process.env.GOOGLE_SERVICE_ACCOUNT_KEY },
    { env: "GOOGLE_SERVICE_ACCOUNT_JSON", val: process.env.GOOGLE_SERVICE_ACCOUNT_JSON },
    { env: "GOOGLE_APPLICATION_CREDENTIALS", val: process.env.GOOGLE_APPLICATION_CREDENTIALS },
    { env: "GOOGLE_CREDENTIALS", val: process.env.GOOGLE_CREDENTIALS },
    { env: "GCP_SERVICE_ACCOUNT_KEY", val: process.env.GCP_SERVICE_ACCOUNT_KEY },
    { env: "GCP_CREDENTIALS", val: process.env.GCP_CREDENTIALS },
  ];

  for (const { env, val } of jsonCandidates) {
    if (!val || typeof val !== "string" || !val.trim()) continue;
    try {
      const parsed = tryParseServiceAccountJson(val);
      if (parsed && parsed.client_email && parsed.private_key) {
        return {
          client_email: String(parsed.client_email).trim(),
          private_key: sanitizePrivateKey(String(parsed.private_key)),
          project_id: parsed.project_id ? String(parsed.project_id).trim() : undefined,
          token_uri: parsed.token_uri ? String(parsed.token_uri).trim() : "https://oauth2.googleapis.com/token",
          source: env,
        };
      }
    } catch (err: any) {
      logger.warn({ env, err: err?.message }, "[Google Indexing] Failed parsing candidate credentials env var");
    }
  }

  // 2. Check individual environment variables
  const clientEmail = (
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GCP_CLIENT_EMAIL
  )?.trim();

  const privateKey = (
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GCP_PRIVATE_KEY
  )?.trim();

  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: sanitizePrivateKey(privateKey),
      project_id: (process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID)?.trim() || undefined,
      token_uri: process.env.GOOGLE_TOKEN_URI?.trim() || "https://oauth2.googleapis.com/token",
      source: "GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY",
    };
  }

  return null;
}

export function getGoogleServiceAccountStatus(): GoogleServiceAccountStatus {
  const creds = parseGoogleServiceAccountCredentials();
  if (!creds) {
    return {
      configured: false,
      source: null,
      clientEmail: null,
      projectId: null,
      validKey: false,
      lastApiError: lastGoogleApiError,
    };
  }

  let validKey = false;
  let keyError: string | undefined;

  try {
    const keyPem = sanitizePrivateKey(creds.private_key);
    const keyObj = crypto.createPrivateKey(keyPem);
    validKey = Boolean(keyObj);
  } catch (err: any) {
    validKey = false;
    keyError = err?.message || "Invalid RSA/PKCS8 private key";
  }

  // Mask client email for security: e.g. "my-servic...iam.gserviceaccount.com"
  const rawEmail = creds.client_email;
  let maskedEmail = rawEmail;
  if (rawEmail && rawEmail.includes("@")) {
    const [user, domain] = rawEmail.split("@");
    const maskedUser = user.length > 6 ? `${user.slice(0, 4)}...${user.slice(-2)}` : user;
    maskedEmail = `${maskedUser}@${domain}`;
  }

  return {
    configured: true,
    source: creds.source || "unknown",
    clientEmail: maskedEmail,
    projectId: creds.project_id || null,
    validKey,
    keyError,
    lastApiError: lastGoogleApiError,
  };
}

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

export function resetGoogleTokenCache() {
  cachedGoogleToken = null;
  lastGoogleApiError = null;
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
    const privateKeyPem = sanitizePrivateKey(credentials.private_key);
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
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      lastGoogleApiError = `OAuth token exchange failed (HTTP ${tokenRes.status}): ${errText}`;
      logger.warn({ status: tokenRes.status, errText }, "[Google Indexing] OAuth token exchange failed");
      return null;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string; expires_in?: number };
    const expiresIn = tokenData.expires_in || 3600;
    cachedGoogleToken = {
      token: tokenData.access_token,
      expiresAt: now + expiresIn,
    };
    lastGoogleApiError = null;
    return tokenData.access_token;
  } catch (err: any) {
    lastGoogleApiError = `Token generation error: ${err?.message}`;
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
      error: lastGoogleApiError || "OAuth2 token acquisition failed; fell back to sitemap ping",
    };
  }

  let submitted = 0;
  let failed = 0;
  const errors: string[] = [];

  // Concurrently submit in chunks of 5 for optimal performance in serverless functions
  const CONCURRENCY = 5;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const chunk = urls.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (url) => {
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
            let errMsg = errJson?.error?.message || (typeof errJson?.error === "string" ? errJson.error : "") || `HTTP ${res.status}`;
            if (res.status === 403) {
              errMsg = `Search Console permission denied. Ensure service account '${creds.client_email}' is added as Owner in Google Search Console for '${CANONICAL_BASE_URL}'. Details: ${errMsg}`;
            }
            errors.push(`${url}: ${errMsg}`);
            lastGoogleApiError = errMsg;
            logger.warn({ url, status: res.status, errMsg }, "[Google Indexing] Google API rejected URL notification");
          }
        } catch (err: any) {
          failed++;
          const msg = `${url}: ${err?.message || "Network error"}`;
          errors.push(msg);
          lastGoogleApiError = err?.message || "Network error";
          logger.warn({ url, err: err?.message }, "[Google Indexing] Network error submitting URL to Google");
        }
      })
    );
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

/**
 * Triggers a comprehensive re-indexing pass across ALL published content in the journal.
 * Dispatches to IndexNow (Bing, Yandex, Seznam, Naver), Google Indexing API, and sitemap pings.
 */
export async function reindexAllPublicContent(urlsOverride?: string[]): Promise<{
  success: boolean;
  totalUrls: number;
  indexNow: { success: boolean; count: number; error?: string };
  google: { success: boolean; submitted: number; failed: number; error?: string };
  urls: string[];
}> {
  let urls = urlsOverride;
  if (!urls || urls.length === 0) {
    try {
      const { getAllPublicUrls } = await import("../routes/sitemap");
      urls = await getAllPublicUrls();
    } catch (err: any) {
      logger.warn({ err: err?.message }, "[SEO Engine] Failed to load public URLs from database; using static fallback");
      urls = [
        `${CANONICAL_BASE_URL}`,
        `${CANONICAL_BASE_URL}/browse`,
        `${CANONICAL_BASE_URL}/domains`,
        `${CANONICAL_BASE_URL}/papers`,
        `${CANONICAL_BASE_URL}/archive`,
        `${CANONICAL_BASE_URL}/sitemap.xml`,
      ];
    }
  }

  const normalizedUrls = normalizeCanonicalUrls(urls);

  // 1. Submit batch to IndexNow
  const indexNowResult = await submitIndexNow(normalizedUrls);

  // 2. Submit to Google Indexing API
  const googleResult = await triggerGoogleIndexing(normalizedUrls, "URL_UPDATED").catch((err) => {
    logger.warn({ err: err?.message }, "[Google Indexing] Batch submission notice");
    return { success: false, submitted: 0, failed: normalizedUrls.length, error: err?.message };
  });

  // 3. Ping search engine sitemaps
  pingSearchEngineSitemaps().catch(() => {});

  recordDispatch({
    timestamp: new Date().toISOString(),
    reason: "batch-reindex-all",
    urls: normalizedUrls,
    success: indexNowResult.success || googleResult.success,
    count: normalizedUrls.length,
    engines: ["IndexNow", "Google Indexing API", "Google Sitemap Ping", "Bing Sitemap Ping"],
    error: indexNowResult.error || googleResult.error,
  });

  return {
    success: indexNowResult.success || googleResult.success,
    totalUrls: normalizedUrls.length,
    indexNow: indexNowResult,
    google: googleResult,
    urls: normalizedUrls,
  };
}


