/**
 * Cache policy for public content listings and pages.
 *
 * Two failure modes to avoid, pulling in opposite directions:
 *
 *   - `s-maxage=300, stale-while-revalidate=600` (the original) let the CDN
 *     serve a cached listing for five minutes and a *stale* one for ten more.
 *     A freshly published article was missing from the home page for up to
 *     fifteen minutes, for everyone, with no way to force a refresh.
 *
 *   - `s-maxage=0` (the overcorrection) removed edge caching entirely, so every
 *     visit to the busiest endpoint on the site paid for a serverless
 *     invocation and a database round trip, including the cold starts.
 *
 * The resolution is a short edge cache plus an explicit bypass. Visitors are
 * served from the edge and a new piece surfaces within a minute on its own.
 * The client appends a version parameter after any publish, edit, or delete,
 * which is a distinct cache key and therefore always a miss — so whoever just
 * made the change sees it immediately rather than waiting out the window.
 *
 * `max-age=0` keeps the browser itself from holding a private copy, so the
 * revalidation actually reaches the edge.
 */
export const PUBLIC_CONTENT_CACHE_CONTROL =
  process.env.PUBLIC_CONTENT_CACHE_CONTROL
  || "public, max-age=0, s-maxage=60, stale-while-revalidate=120";

export function parsePagination(
  rawLimit: unknown,
  rawOffset: unknown,
  options: { defaultLimit?: number; maxLimit?: number } = {},
) {
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 50;
  const parsedLimit = Number.parseInt(String(rawLimit ?? ""), 10);
  const parsedOffset = Number.parseInt(String(rawOffset ?? ""), 10);
  return {
    limit: Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), maxLimit)
      : defaultLimit,
    offset: Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0,
  };
}

export function toLikePattern(value: string, maxLength = 200): string {
  const escaped = value.trim().slice(0, maxLength).replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}
