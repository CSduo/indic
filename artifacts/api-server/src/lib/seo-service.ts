import * as fs from "fs";
import * as crypto from "crypto";
import { importPKCS8, SignJWT } from "jose";
import { logger } from "./logger";
import { CANONICAL_HOST, CANONICAL_BASE_URL, submitIndexNow, type IndexNowResult } from "./indexnow";
import { pingWebSubHub } from "./websub";

export { CANONICAL_HOST, CANONICAL_BASE_URL };

/*
  Search-engine notification for Ānvīkṣikī.

  What this does, and deliberately does not do:

  - IndexNow (Bing, Yandex, Seznam, Naver) is told about URLs that actually
    changed: the work just published or updated, its author page, and — for the
    daily job — sitemap entries whose lastmod moved since the previous run.
  - The Google Indexing API is NOT used for journal pages. Google permits it only
    for pages with JobPosting or BroadcastEvent (livestream) structured data;
    articles, papers, author and domain pages are none of those. The client code
    is kept below behind an explicit content-type guard so it cannot be pointed
    at ordinary pages by accident. Google discovers our pages through
    /sitemap.xml, which is submitted once in Search Console.
  - Sitemap "ping" URLs are not called: Google retired its ping endpoint in 2023
    and Bing's ping is likewise deprecated in favour of IndexNow.
*/

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

const CANONICAL_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

/**
 * Turn paths and our own absolute URLs into canonical apex URLs.
 *
 * Anything on another host is dropped, never passed through: these URLs are
 * submitted under the site's IndexNow key.
 */
export function normalizeCanonicalUrls(urls: string[]): string[] {
  const normalized = new Set<string>();

  for (const raw of urls) {
    if (!raw || typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    try {
      if (/^https?:\/\//i.test(trimmed)) {
        const parsed = new URL(trimmed);
        if (!CANONICAL_HOSTS.has(parsed.hostname.toLowerCase())) continue;
        normalized.add(`${CANONICAL_BASE_URL}${parsed.pathname}${parsed.search}`);
      } else if (!trimmed.includes("://")) {
        const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
        normalized.add(new URL(cleanPath, CANONICAL_BASE_URL).href);
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
 * Page types for which Google allows the Indexing API.
 * https://developers.google.com/search/apis/indexing-api/v3/quickstart
 */
export type GoogleIndexingContentType = "JobPosting" | "BroadcastEvent";
const GOOGLE_INDEXING_ALLOWED_TYPES = new Set<string>(["JobPosting", "BroadcastEvent"]);

export interface GoogleIndexingResult {
  success: boolean;
  submitted: number;
  failed: number;
  skipped?: number;
  error?: string;
}

/**
 * Google Indexing API client — DISABLED for journal content.
 *
 * Only runs when the caller states that the URLs are JobPosting or
 * BroadcastEvent pages. No route in this codebase does, so in practice this
 * returns without any network call. Kept (rather than deleted) so the decision
 * is visible and the credential tooling keeps working for status reporting.
 */
export async function triggerGoogleIndexing(
  urlOrUrls: string | string[],
  action: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED",
  options: { contentType?: GoogleIndexingContentType } = {},
): Promise<GoogleIndexingResult> {
  const rawList = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  const urls = normalizeCanonicalUrls(rawList);

  if (urls.length === 0) {
    return { success: true, submitted: 0, failed: 0 };
  }

  if (!options.contentType || !GOOGLE_INDEXING_ALLOWED_TYPES.has(options.contentType)) {
    return {
      success: true,
      submitted: 0,
      failed: 0,
      skipped: urls.length,
      error: "Google Indexing API is only permitted for JobPosting and BroadcastEvent pages; not submitted",
    };
  }

  const creds = parseGoogleServiceAccountCredentials();
  if (!creds) {
    return {
      success: true,
      submitted: 0,
      failed: 0,
      error: "Google Service Account not configured",
    };
  }

  const token = await getGoogleOAuth2AccessToken(creds);
  if (!token) {
    return {
      success: false,
      submitted: 0,
      failed: urls.length,
      error: lastGoogleApiError || "OAuth2 token acquisition failed",
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
 * Tell IndexNow about URLs that changed. Never throws, never blocks the caller
 * on failure, and never submits anything outside the canonical host.
 */
export async function submitUrlsToSearchEngines(
  rawUrls: string[],
  reason: string = "content-update"
): Promise<IndexNowResult> {
  const urls = normalizeCanonicalUrls(rawUrls);
  if (urls.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const indexNowResult = await submitIndexNow(urls);

    recordDispatch({
      timestamp: new Date().toISOString(),
      reason,
      urls,
      success: indexNowResult.success,
      count: indexNowResult.count,
      engines: ["IndexNow (Bing/Yandex/Seznam/Naver)"],
      error: indexNowResult.error,
    });

    logger.info(
      { count: urls.length, reason, indexNowSuccess: indexNowResult.success, skipped: indexNowResult.skipped },
      "[SEO Engine] IndexNow notification completed"
    );

    return indexNowResult;
  } catch (err: any) {
    logger.warn({ err: err?.message, urls }, "[SEO Engine] Failed to dispatch SEO notification");
    recordDispatch({
      timestamp: new Date().toISOString(),
      reason,
      urls,
      success: false,
      count: 0,
      engines: ["IndexNow"],
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
 * Called when public content is published or updated. Notifies IndexNow about
 * the changed page itself, in the background so HTTP handlers respond at once.
 *
 * Listing pages that change as a result (the author page, the domain hub, the
 * home page) are left to the daily changed-URL pass, which takes them from the
 * sitemap at their canonical URLs; the authorSlug a caller has to hand is a slug
 * of the display name and may not be the canonical handle URL. Profile edits are
 * not pushed for the same reason. Sitemap and feed URLs are never submitted:
 * IndexNow is for pages, and /profile/<id> is a redirect.
 */
export function triggerPublicContentSeo(payload: ContentPublicationPayload): Promise<IndexNowResult | null> {
  const task = async () => {
    try {
      const urls: string[] = [];

      if (payload.type === "article") {
        urls.push(`${CANONICAL_BASE_URL}/articles/${encodeURIComponent(payload.slug)}`);
      } else if (payload.type === "paper") {
        urls.push(`${CANONICAL_BASE_URL}/papers/${encodeURIComponent(payload.slug)}`);
      } else if (payload.type === "category") {
        urls.push(`${CANONICAL_BASE_URL}/domains/${encodeURIComponent(payload.slug)}`);
      } else {
        return null;
      }

      const result = await submitUrlsToSearchEngines(urls, `publish-${payload.type}:${payload.slug}`);
      // A new or updated essay or paper changes the feed: announce it to Google's WebSub hub.
      if (payload.type === "article" || payload.type === "paper") {
        await pingWebSubHub(`${CANONICAL_BASE_URL}/rss.xml`);
      }
      return result;
    } catch (err: any) {
      logger.warn({ err: err?.message, payload }, "[SEO Engine] Background publication trigger caught error");
      return null;
    }
  };

  return task();
}

/** Default look-back for the daily job: a day plus slack for scheduling drift. */
export const DEFAULT_REINDEX_WINDOW_HOURS = 26;

export interface ReindexOptions {
  /**
   * "changed" (default): only sitemap URLs whose lastmod falls inside the
   * window. "all": every sitemap URL — for a one-off resubmission after a
   * site-wide change, triggered by an administrator.
   */
  scope?: "changed" | "all";
  sinceHours?: number;
  now?: Date;
}

export interface ReindexResult {
  success: boolean;
  scope: "changed" | "all";
  totalUrls: number;
  indexNow: IndexNowResult;
  urls: string[];
}

/**
 * IndexNow sweep over the sitemap. URLs always come from the sitemap generator,
 * never from the caller, so only canonical, indexable pages are submitted.
 */
export async function reindexAllPublicContent(options: ReindexOptions = {}): Promise<ReindexResult> {
  const scope = options.scope === "all" ? "all" : "changed";
  const windowHours = Math.min(Math.max(Number(options.sinceHours) || DEFAULT_REINDEX_WINDOW_HOURS, 1), 24 * 30);
  const cutoff = (options.now ?? new Date()).getTime() - windowHours * 60 * 60 * 1000;

  const { getSitemapEntries } = await import("./sitemap-entries");
  const entries = await getSitemapEntries();
  const selected = scope === "all"
    ? entries
    : entries.filter(entry => entry.lastmod && new Date(entry.lastmod).getTime() >= cutoff);
  const urls = normalizeCanonicalUrls(selected.map(entry => entry.loc));

  const indexNow: IndexNowResult = urls.length > 0
    ? await submitIndexNow(urls)
    : { success: true, count: 0 };

  recordDispatch({
    timestamp: new Date().toISOString(),
    reason: scope === "all" ? "reindex-all" : `reindex-changed-${windowHours}h`,
    urls,
    success: indexNow.success,
    count: indexNow.count,
    engines: ["IndexNow (Bing/Yandex/Seznam/Naver)"],
    error: indexNow.error,
  });

  return {
    success: indexNow.success,
    scope,
    totalUrls: urls.length,
    indexNow,
    urls,
  };
}

/** Parse the optional `{ scope, sinceHours }` an administrator may send. */
export function parseReindexOptions(body: unknown): ReindexOptions {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  return {
    scope: input.scope === "all" ? "all" : "changed",
    sinceHours: typeof input.sinceHours === "number" ? input.sinceHours : undefined,
  };
}
