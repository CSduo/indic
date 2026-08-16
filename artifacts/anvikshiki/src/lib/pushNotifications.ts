/**
 * Browser notification enrolment.
 *
 * The permission prompt is never shown on page load. A prompt that appears
 * before someone knows what the site is gets dismissed almost every time, and
 * a dismissal is close to permanent — the browser will not ask again, and the
 * only way back is through settings most people never open. So enrolment is
 * always the result of a deliberate action: a switch in account settings, or
 * an explicit "turn these on" offer.
 *
 * Delivery is tied to the signed-in account rather than the device: the
 * subscription is stored against the user id, so signing out stops delivery
 * and signing back in resumes it without asking again.
 */

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: string };

/** Whether this browser can do Web Push at all, and if not, why. */
export function describePushSupport(): PushSupport {
  if (typeof window === "undefined") return { supported: false, reason: "Not available here." };
  if (!("serviceWorker" in navigator)) {
    return { supported: false, reason: "This browser does not support background notifications." };
  }
  if (!("PushManager" in window) || !("Notification" in window)) {
    // iOS is the common case: Safari only exposes push once the site has been
    // added to the Home Screen, so say that rather than "unsupported".
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return {
      supported: false,
      reason: isIos
        ? "On iPhone and iPad, add this site to your Home Screen first — then notifications can be switched on from there."
        : "This browser does not support notifications.",
    };
  }
  return { supported: true };
}

export function currentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * The push service wants the VAPID key as raw bytes, not base64url text.
 * Backed by an explicit ArrayBuffer so the result is a plain BufferSource —
 * a bare Uint8Array can be typed over SharedArrayBuffer, which the subscribe
 * call does not accept.
 */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(`${base()}/sw.js`);
  if (existing) return existing;
  return navigator.serviceWorker.register(`${base()}/sw.js`, { scope: `${base()}/` });
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: string; permissionDenied?: boolean };

/**
 * Ask for permission and register this browser. Must be called from a click:
 * browsers ignore a permission request that is not tied to a real gesture.
 */
export async function enableNotifications(): Promise<EnableResult> {
  const support = describePushSupport();
  if (!support.supported) return { ok: false, reason: support.reason };

  let publicKey: string;
  try {
    const res = await fetch(`${base()}/api/push/public-key`, { credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, reason: data.error || "Notifications are not configured on the server yet." };
    }
    publicKey = (await res.json()).publicKey;
  } catch {
    return { ok: false, reason: "Could not reach the server. Try again in a moment." };
  }
  if (!publicKey) return { ok: false, reason: "Notifications are not configured on the server yet." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      permissionDenied: permission === "denied",
      reason: permission === "denied"
        ? "Your browser is blocking notifications for this site. You can re-allow them in the padlock menu beside the address bar."
        : "Notifications were not enabled.",
    };
  }

  try {
    const registration = await getRegistration();
    await navigator.serviceWorker.ready;

    // Reuse an existing subscription when there is one; creating a second for
    // the same device would leave a stale row behind.
    const subscription =
      (await registration.pushManager.getSubscription())
      || (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const res = await fetch(`${base()}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, reason: data.error || "Could not save your notification settings." };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: err?.message || "Could not enable notifications on this browser." };
  }
}

/** Stop notifications on this browser. */
export async function disableNotifications(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration(`${base()}/sw.js`);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await fetch(`${base()}/api/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {});

    await subscription.unsubscribe().catch(() => {});
  } catch {
    // Turning notifications off should never surface an error.
  }
}

/** Is this browser currently registered? */
export async function isSubscribedOnThisDevice(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration(`${base()}/sw.js`);
    return Boolean(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Re-register a browser that already granted permission.
 *
 * Someone who enabled notifications, signed out and signed back in should not
 * be asked again — the permission is still granted, so this quietly restores
 * the server-side row. It never prompts: if permission is not already granted
 * it does nothing at all.
 */
export async function resumeNotificationsIfAlreadyGranted(): Promise<void> {
  try {
    if (currentPermission() !== "granted") return;
    const support = describePushSupport();
    if (!support.supported) return;
    await enableNotifications();
  } catch {
    // Silent by design — this is a background repair, not a user action.
  }
}
