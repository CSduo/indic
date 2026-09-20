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

/**
 * Submits URLs to search engines (IndexNow + Sitemap pings) in a fire-and-forget
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

    // 2. Ping sitemap updates to Google & Bing
    const sitemapUrl = `${CANONICAL_BASE_URL}/sitemap.xml`;
    pingSearchEngineSitemaps(sitemapUrl).catch(() => {});

    const dispatchEvent: SeoDispatchEvent = {
      timestamp: new Date().toISOString(),
      reason,
      urls,
      success: indexNowResult.success,
      count: indexNowResult.count || urls.length,
      engines: ["IndexNow (Bing/Yandex/Naver)", "Google Sitemap Ping", "Bing Sitemap Ping"],
      error: indexNowResult.error,
    };

    recordDispatch(dispatchEvent);

    logger.info(
      { count: urls.length, reason, success: indexNowResult.success },
      "[SEO Engine] Automated search engine notification completed"
    );

    return {
      success: indexNowResult.success,
      count: urls.length,
      error: indexNowResult.error,
    };
  } catch (err: any) {
    logger.warn({ err: err?.message, urls }, "[SEO Engine] Failed to dispatch SEO notification");
    recordDispatch({
      timestamp: new Date().toISOString(),
      reason,
      urls,
      success: false,
      count: 0,
      engines: ["IndexNow", "Google"],
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

      return await submitUrlsToSearchEngines(urls, `publish-${payload.type}:${payload.slug}`);
    } catch (err: any) {
      logger.warn({ err: err?.message, payload }, "[SEO Engine] Background publication trigger caught error");
      return null;
    }
  };

  return task();
}
