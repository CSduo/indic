import { db, notificationsTable, followsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

/**
 * Tell an author's followers that they have published something.
 *
 * This is what following is *for*. Without it, following someone is a number
 * on a profile — you still have to remember to go and look, which nobody does,
 * and the work of the people you care about goes past unseen.
 *
 * Three things keep it from being a nuisance or a hazard:
 *
 * - The author is never told about their own work. They know.
 * - Everyone is notified concurrently but the whole thing is bounded, so an
 *   author with a large following does not hold the publish open. It runs in
 *   batches rather than one query per person or one enormous burst.
 * - Nothing here throws. Publishing must succeed even if not one notification
 *   can be delivered — the article being live is the thing that matters, and a
 *   failed notification is not worth undoing it for.
 */
export async function notifyFollowersOfNewWork(options: {
  authorId: string | null | undefined;
  title: string;
  href: string;
  /** "essay" or "paper" — used in the sentence people actually read. */
  kind?: string;
}): Promise<{ notified: number }> {
  const { authorId, title, href } = options;
  if (!authorId) return { notified: 0 };

  let followers: Array<{ followerId: string }> = [];
  let authorName = "Someone you follow";

  try {
    const [followerRows, authorRows] = await Promise.all([
      db.select({ followerId: followsTable.followerId })
        .from(followsTable)
        .where(eq(followsTable.followingId, authorId)),
      db.select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, authorId)).limit(1),
    ]);
    followers = followerRows;
    const author = authorRows[0];
    // Never the email — a display name or nothing.
    authorName = author?.name || "Someone you follow";
  } catch (err: any) {
    console.warn("Could not load followers to notify:", err?.message || err);
    return { notified: 0 };
  }

  if (followers.length === 0) return { notified: 0 };

  const kind = options.kind || "work";
  const message = `${authorName} published a new ${kind}: "${title}"`;
  const BATCH = 20;
  let notified = 0;

  for (let i = 0; i < followers.length; i += BATCH) {
    const batch = followers.slice(i, i + BATCH);
    await Promise.all(batch.map(async ({ followerId }) => {
      if (followerId === authorId) return;
      await notifyUser({
        userId: followerId,
        type: "NEW_WORK",
        message,
        href,
        pushTitle: `New from ${authorName}`,
        // One notification per piece of work per person, so a republish or a
        // repair pass replaces the earlier one instead of stacking up.
        tag: `work-${href}`,
      });
      notified += 1;
    }));
  }

  return { notified };
}
