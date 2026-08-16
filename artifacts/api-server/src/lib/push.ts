import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Browser push delivery, over the Web Push standard with VAPID.
 *
 * There is no third-party service here on purpose. VAPID is a keypair the site
 * owns: the server signs each message and posts it straight to whichever push
 * endpoint the browser nominated (Google's for Chrome, Mozilla's for Firefox).
 * Nothing to sign up for, nothing to renew, no per-message cost, and no other
 * party sees the content.
 *
 * Delivery is best-effort by design. A notification that fails to reach a
 * device must never fail the action that produced it — someone posting a
 * comment should not see an error because the author's old phone is gone.
 */

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const CONTACT = process.env.VAPID_SUBJECT || "mailto:hello@anvikshikijournal.in";

let configured = false;

/** True when the server holds a VAPID keypair and can actually send. */
export function pushIsConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export function getPushPublicKey(): string {
  return PUBLIC_KEY;
}

function ensureConfigured(): boolean {
  if (!pushIsConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(CONTACT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Where clicking the notification should land. */
  url?: string;
  /** Collapses same-tag notifications so a burst does not stack up. */
  tag?: string;
};

/**
 * Send a notification to every device a user has approved.
 *
 * Endpoints the push service reports as gone (404/410) are deleted: a browser
 * that has been cleared or uninstalled will never accept again, and keeping
 * the row would mean retrying it forever.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{
  sent: number;
  removed: number;
  skipped?: string;
}> {
  if (!ensureConfigured()) return { sent: 0, removed: 0, skipped: "vapid-not-configured" };

  let subscriptions;
  try {
    subscriptions = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
  } catch (err: any) {
    console.warn("Could not load push subscriptions:", err?.message || err);
    return { sent: 0, removed: 0, skipped: "lookup-failed" };
  }

  if (subscriptions.length === 0) return { sent: 0, removed: 0, skipped: "no-subscriptions" };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/account/notifications",
    tag: payload.tag,
  });

  const dead: string[] = [];
  let sent = 0;

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
        { TTL: 24 * 60 * 60 },
      );
      sent += 1;
    } catch (err: any) {
      const status = err?.statusCode;
      if (status === 404 || status === 410) {
        dead.push(subscription.id);
      } else {
        console.warn(`Push delivery failed (${status ?? "no status"}):`, err?.message || err);
      }
    }
  }));

  if (dead.length > 0) {
    try {
      await db.delete(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.id, dead));
    } catch (err: any) {
      console.warn("Could not prune expired push subscriptions:", err?.message || err);
    }
  }

  return { sent, removed: dead.length };
}
