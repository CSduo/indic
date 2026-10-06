import { logger } from "./logger";
import { isIndexNowEnabled } from "./indexnow";

/*
 * WebSub (W3C) lets a feed announce updates to a hub, which then tells
 * subscribers straight away instead of waiting for their next poll. Google
 * operates the public hub below. The RSS feed declares it (atom:link rel="hub")
 * and publishing pings it, so a new essay is announced to Google the moment it
 * goes live. IndexNow covers Bing, Yandex, Seznam and Naver separately.
 */
export const WEBSUB_HUB = "https://pubsubhubbub.appspot.com/";

/** Announce that a feed changed. Never throws; returns whether the hub accepted. */
export async function pingWebSubHub(feedUrl: string): Promise<boolean> {
  // Same production gate as IndexNow, so previews and tests never ping.
  if (!isIndexNowEnabled()) return false;
  try {
    const response = await fetch(WEBSUB_HUB, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "hub.mode": "publish", "hub.url": feedUrl }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    // The hub answers 204 No Content when it accepts a publish notification.
    const ok = response.status === 204 || response.ok;
    logger.info({ feedUrl, status: response.status }, "[SEO Engine] WebSub hub notified");
    return ok;
  } catch (err: any) {
    logger.warn({ err: err?.message, feedUrl }, "[SEO Engine] WebSub hub ping failed");
    return false;
  }
}
