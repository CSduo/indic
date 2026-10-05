import { logger } from "./logger";

export const CANONICAL_HOST = "anvikshikijournal.in";
export const CANONICAL_BASE_URL = `https://${CANONICAL_HOST}`;
export const DEFAULT_INDEXNOW_KEY = process.env.INDEXNOW_KEY || "4a7b9c1d2e3f4a5b6c7d8e9f0a1b2c3d";

/**
 * IndexNow URLs must belong to the host named in the payload. Only the apex is
 * canonical (www redirects to it), so only the apex is accepted.
 */
export function isAllowedHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "https:" && parsed.hostname.toLowerCase() === CANONICAL_HOST;
  } catch {
    return false;
  }
}

/**
 * IndexNow tells Bing, Yandex, Seznam and Naver about URLs on the production
 * domain, so it only runs in production: on Vercel when VERCEL_ENV is
 * "production". Preview deployments, local development and tests never submit.
 * INDEXNOW_ENABLED=true forces it on (for a non-Vercel production host);
 * INDEXNOW_ENABLED=false forces it off.
 */
export function isIndexNowEnabled(): boolean {
  const flag = process.env.INDEXNOW_ENABLED?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.VERCEL_ENV === "production";
}

export interface IndexNowResult {
  success: boolean;
  count: number;
  skipped?: boolean;
  error?: string;
}

export async function submitIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!urls || urls.length === 0) {
    return { success: true, count: 0 };
  }

  // Filter and sanitize strictly for the canonical host
  const validUrls = Array.from(new Set(urls.filter(u => typeof u === "string" && isAllowedHost(u))));
  if (validUrls.length === 0) {
    return { success: false, count: 0, error: "No valid URLs for host " + CANONICAL_HOST };
  }

  if (!isIndexNowEnabled()) {
    logger.info({ count: validUrls.length }, "IndexNow disabled outside production; nothing submitted");
    return { success: true, count: 0, skipped: true, error: "IndexNow is disabled outside production" };
  }

  const payload = {
    host: CANONICAL_HOST,
    key: DEFAULT_INDEXNOW_KEY,
    keyLocation: `${CANONICAL_BASE_URL}/indexnow-key.txt`,
    urlList: validUrls,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "AnvikshikiJournal-IndexNow-Client/1.0",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 200 || response.status === 202) {
      logger.info({ count: validUrls.length }, "IndexNow URLs submitted successfully");
      return { success: true, count: validUrls.length };
    } else {
      const errText = await response.text().catch(() => "");
      logger.warn({ status: response.status, errText }, "IndexNow submission non-fatal status response");
      return { success: false, count: 0, error: `Status ${response.status}: ${errText}` };
    }
  } catch (err: any) {
    // IndexNow submission should never block caller or throw
    logger.warn({ err: err?.message }, "IndexNow background submission non-fatal warning");
    return { success: false, count: 0, error: err?.message || "Request failed" };
  }
}
