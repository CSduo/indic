const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const READER_KEY = "anv_reader_key";

/**
 * The same random, meaningless identifier the reading bar uses, so one person
 * is counted once whether they read an essay or open a profile. It says
 * nothing about who they are and is never derived from an address.
 */
export function readerKey(): string {
  try {
    let key = localStorage.getItem(READER_KEY);
    if (!key) {
      key = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(READER_KEY, key);
    }
    return key;
  } catch {
    return `ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Count a visit to somebody's public profile.
 *
 * Fire and forget: a failure here must never be visible to the person
 * browsing, and there is nothing for them to retry.
 */
export function recordProfileView(profileUserId: string): void {
  if (!profileUserId) return;
  fetch(`${base()}/api/views`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind: "PROFILE",
      targetId: profileUserId,
      sessionKey: readerKey(),
      referrer: document.referrer || undefined,
    }),
    keepalive: true,
  }).catch(() => {});
}
