/**
 * Cache policy for public content listings and pages.
 *
 * These endpoints previously sent `s-maxage=300, stale-while-revalidate=600`,
 * which let the CDN serve a cached listing for five minutes and a *stale* one
 * for ten minutes after that. The effect was that a freshly published article
 * was missing from the home page for up to fifteen minutes, for every visitor,
 * with no way to force a refresh — the work was live but invisible.
 *
 * Publication is an editorial action whose whole point is that the result
 * appears immediately, so these responses must always be revalidated. The
 * queries behind them are small and indexed; the saved round trip was not
 * worth publishing into a void.
 */
export const PUBLIC_CONTENT_CACHE_CONTROL = "public, max-age=0, s-maxage=0, must-revalidate";

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
