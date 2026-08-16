import { db, notificationsTable } from "@workspace/db";
import { sendPushToUser } from "./push";

/**
 * Raise a notification for one person.
 *
 * Two deliveries, one call: a row in `notifications` so it is waiting on the
 * site whenever they next look, and a browser push so they hear about it now.
 * The row is the durable record — push only reaches devices that have approved
 * and are still reachable, so it can never be the only copy.
 *
 * Nothing here throws. A notification is a side effect of something the reader
 * actually did; failing to deliver it must not fail that action.
 */
export async function notifyUser(options: {
  userId: string | null | undefined;
  type: string;
  message: string;
  href?: string;
  /** Title shown on the device. Falls back to the site name. */
  pushTitle?: string;
  /** Collapses repeats — a second reply to the same thread replaces the first. */
  tag?: string;
}): Promise<void> {
  const { userId, type, message, href, pushTitle, tag } = options;
  if (!userId) return;

  try {
    await db.insert(notificationsTable).values({
      userId,
      type,
      message,
      href: href || null,
    });
  } catch (err: any) {
    console.warn("Could not record notification:", err?.message || err);
  }

  try {
    await sendPushToUser(userId, {
      title: pushTitle || "Ānvīkṣikī",
      body: message,
      url: href || "/account/notifications",
      tag,
    });
  } catch (err: any) {
    console.warn("Could not send push notification:", err?.message || err);
  }
}
