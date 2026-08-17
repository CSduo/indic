/* Ānvīkṣikī service worker — browser notifications only.
 *
 * Deliberately does not cache anything. A caching service worker on a site
 * that publishes and edits content is a way to serve people stale articles
 * long after they change, and it is very hard to reason about. This worker
 * exists solely to receive push messages and open the right page. */

self.addEventListener("install", () => {
  // Take over immediately rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Ānvīkṣikī";
  const origin = self.location.origin;
  const iconUrl = payload.icon || (origin + "/favicon.png");
  const badgeUrl = payload.badge || (origin + "/brand-emblem.png");

  const options = {
    body: payload.body || "",
    icon: iconUrl,
    badge: badgeUrl,
    image: payload.image || undefined,
    // A tag collapses repeats, so ten replies to one thread do not become ten
    // separate notifications on the lock screen.
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/account/notifications" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/account/notifications";

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Prefer focusing a tab that is already open on this site rather than
    // opening yet another one.
    for (const client of clientList) {
      if ("focus" in client) {
        try {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        } catch {
          // Fall through to opening a new window.
        }
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
