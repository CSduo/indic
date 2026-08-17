import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { deleteStoredFiles } from "./storage";

/**
 * Deleting an account, on a delay.
 *
 * Someone asking to be deleted is not asking to be hidden, so when the time
 * comes this removes rows rather than flagging them. But it does not happen
 * the instant the button is pressed: the request is recorded, the account
 * stops working, and the data survives for a grace period.
 *
 * The delay is the whole point. People change their minds, and accounts get
 * into the wrong hands — an intruder who can delete everything irrecoverably
 * in one click is a much worse problem than one who can schedule it and be
 * undone. Thirty days is long enough to notice.
 */

export const DELETION_GRACE_DAYS = 30;

/** When a request made now would actually be carried out. */
export function deletionDueDate(requestedAt: Date): Date {
  const due = new Date(requestedAt);
  due.setDate(due.getDate() + DELETION_GRACE_DAYS);
  return due;
}

/**
 * Erase one account and everything it produced. There is no undo past here.
 *
 * Order is dictated by the foreign keys. Articles and papers point at the
 * submission that produced them with ON DELETE RESTRICT, so a publication has
 * to go before its submission, and every submission before the account itself.
 * The other way round fails halfway and leaves a half-deleted person.
 *
 * It runs in one transaction, because a deletion that half-succeeds is worse
 * than one that fails outright: the account would be gone while its work
 * stayed up with nobody able to remove it.
 */
export async function purgeAccount(userId: string): Promise<{
  filesRemoved: number;
  filesLeftBehind: number;
}> {
  // Gathered first, while the rows that name the files still exist.
  const files: Array<{ storageKey: string; resourceType?: string | null }> = [];
  try {
    const attachments: any = await db.execute(sql`
      SELECT media_storage_key AS "key", media_resource_type AS "type"
      FROM messages WHERE sender_id = ${userId} AND media_storage_key IS NOT NULL
    `);
    for (const row of (attachments?.rows ?? attachments ?? [])) {
      if (row.key) files.push({ storageKey: row.key, resourceType: row.type });
    }

    const uploads: any = await db.execute(sql`
      SELECT manuscript_public_id AS "manuscript", manuscript_resource_type AS "manuscriptType",
             cover_image_public_id AS "cover", cover_image_resource_type AS "coverType",
             audio_public_id AS "audio"
      FROM submissions WHERE user_id = ${userId}
    `);
    for (const row of (uploads?.rows ?? uploads ?? [])) {
      if (row.manuscript) files.push({ storageKey: row.manuscript, resourceType: row.manuscriptType });
      if (row.cover) files.push({ storageKey: row.cover, resourceType: row.coverType });
      if (row.audio) files.push({ storageKey: row.audio, resourceType: "video" });
    }
  } catch (err: any) {
    console.warn("Could not list stored files before purging an account:", err?.message || err);
  }

  await db.transaction(async (tx: any) => {
    await tx.execute(sql`
      DELETE FROM articles WHERE source_submission_id IN
        (SELECT id FROM submissions WHERE user_id = ${userId})`);
    await tx.execute(sql`
      DELETE FROM papers WHERE source_submission_id IN
        (SELECT id FROM submissions WHERE user_id = ${userId})`);
    await tx.execute(sql`DELETE FROM submissions WHERE user_id = ${userId}`);

    /*
      Messages carry ON DELETE SET NULL, which would leave every one of them in
      place with no sender — visible to the other person forever. Deleted means
      deleted, so they go explicitly, and any direct thread they were part of
      goes with them: a private conversation with an account that no longer
      exists is not something to keep.
    */
    await tx.execute(sql`DELETE FROM messages WHERE sender_id = ${userId}`);
    await tx.execute(sql`
      DELETE FROM conversations WHERE kind = 'DIRECT' AND id IN
        (SELECT conversation_id FROM conversation_members WHERE user_id = ${userId})`);

    await tx.execute(sql`DELETE FROM newsletter_subscribers WHERE user_id = ${userId}`);

    // Follows, memberships, saved items, notifications, registered devices and
    // readership records all cascade from the account row.
    await tx.execute(sql`DELETE FROM users WHERE id = ${userId}`);
  });

  // Files go last and are best effort. Refusing to delete somebody because a
  // CDN call timed out is the wrong way round; anything left is unreachable
  // once the rows are gone.
  const purge = await deleteStoredFiles(files);
  return { filesRemoved: purge.deleted, filesLeftBehind: purge.failed.length };
}

/**
 * Carry out every deletion whose grace period has run out.
 *
 * Called on a schedule. Each account is purged on its own, so one that fails
 * does not hold up the rest — it stays due and is retried on the next run.
 */
export async function purgeDueAccounts(): Promise<{
  purged: number;
  failed: number;
}> {
  const due = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`
      ${usersTable.deletionRequestedAt} IS NOT NULL
      AND ${usersTable.deletionRequestedAt} < now() - interval '${sql.raw(String(DELETION_GRACE_DAYS))} days'
    `)
    .limit(100);

  let purged = 0;
  let failed = 0;

  for (const account of due) {
    try {
      await purgeAccount(account.id);
      purged += 1;
    } catch (err: any) {
      failed += 1;
      console.error(`Could not purge account ${account.id}:`, err?.message || err);
    }
  }

  return { purged, failed };
}
