/**
 * A counter that increments whenever this browser publishes, edits, or deletes
 * something.
 *
 * Public listings are cached at the CDN edge for a short window so that ordinary
 * visitors are served without waking a serverless function. That window is fine
 * for a reader, but not for the editor who just pressed Publish and wants to see
 * their work on the site. Appending this counter to the request URL produces a
 * distinct cache key, which is guaranteed to miss the edge cache and reach the
 * origin — so the person who made the change sees it at once, while everyone
 * else keeps the benefit of the cache.
 *
 * It is deliberately per-tab and not persisted: it only needs to outlive the
 * moment between making a change and looking at the result.
 */

const STORAGE_KEY = "anv_content_version";

function initial(): number {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

let version = typeof window === "undefined" ? 0 : initial();

export function getContentVersion(): number {
  return version;
}

/** Called when this browser changes published content. */
export function bumpContentVersion(): number {
  version += 1;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(version));
  } catch {
    // Session storage unavailable — the in-memory counter still works.
  }
  return version;
}

/**
 * Add the cache-busting parameter to a public content URL, but only once this
 * browser has actually changed something. A visitor who has published nothing
 * never sends it, and so is always served from the edge cache.
 */
export function withContentVersion(url: string): string {
  if (version === 0) return url;
  return `${url}${url.includes("?") ? "&" : "?"}_v=${version}`;
}

if (typeof window !== "undefined") {
  window.addEventListener("anv:content-changed", () => {
    bumpContentVersion();
  });
}
