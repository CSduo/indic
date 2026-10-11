import type { Request } from "express";
import { db, adminsTable, submissionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getUserAuth } from "./auth";

/**
 * Attribution key for a person. Names and email local parts are reduced to
 * letters and digits so "Xiyato Saanvi", "xiyato saanvi" and the local part of
 * "xiyatosaanvi@gmail.com" all resolve to the same author.
 */
export function identityKey(value?: string | null): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export type Viewer = {
  userId: string;
  email: string;
  isAdmin: boolean;
  /** Attribution keys that identify this person as the author of a work. */
  identities: Set<string>;
  name: string;
};

/**
 * Resolve who is asking. `identities` (name keys) are kept for display and
 * matching hints only; they never grant access to anything.
 */
export async function resolveViewer(req: Request): Promise<Viewer | null> {
  const auth = await getUserAuth(req);
  if (!auth || !auth.userId) return null;

  let dbUser: any = null;
  let dbAdmin: any = null;

  try {
    const userRows = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    dbUser = userRows[0] || null;
  } catch (err) {
    (req as any).log?.warn?.({ err }, "Failed to lookup user in resolveViewer");
  }

  try {
    // An admin session carries the admin's own id. A member account counts as
    // the admin with the same email only when that address is verified: the
    // account was created through Google sign-in (no password). Email/password
    // signup never verifies the address, so matching on it would let anyone
    // register an admin's address and act as that admin. Exact, lower-cased
    // comparison: ILIKE would treat "_" and "%" in an address as wildcards.
    let adminRows = await db.select().from(adminsTable)
      .where(eq(adminsTable.id, auth.userId))
      .limit(1);
    const verifiedEmail = dbUser && !dbUser.password && typeof dbUser.email === "string"
      ? dbUser.email.trim().toLowerCase()
      : "";
    if (!adminRows[0] && verifiedEmail) {
      adminRows = await db.select().from(adminsTable)
        .where(eq(sql`lower(${adminsTable.email})`, verifiedEmail))
        .limit(1);
    }
    dbAdmin = adminRows[0] || null;
  } catch (err) {
    (req as any).log?.warn?.({ err }, "Failed to lookup admin in resolveViewer");
  }

  const email = (auth.email || dbUser?.email || dbAdmin?.email || "").toLowerCase().trim();
  const name = (dbUser?.name || dbAdmin?.name || "").trim();

  // Keys shorter than four characters are too weak to attribute a work by.
  const identities = new Set(
    [name, email.split("@")[0]].map(identityKey).filter(key => key.length >= 4),
  );

  return {
    userId: auth.userId,
    email,
    name,
    isAdmin: (auth as any).role === "ADMIN" || dbUser?.role === "ADMIN" || Boolean(dbAdmin),
    identities,
  };
}

/**
 * True when this viewer owns a published article or paper: an administrator,
 * or the account whose submission produced it (the work's
 * `source_submission_id`). Ownership is decided by account id only. A byline
 * is free text and display names are not unique, so matching on the name (or
 * an email local part) let any account that took an author's name edit, trash
 * or delete that author's work.
 */
export async function ownsPublishedWork(viewer: Viewer, sourceSubmissionId?: string | null): Promise<boolean> {
  if (viewer.isAdmin) return true;
  if (!sourceSubmissionId) return false;
  const [row] = await db
    .select({ userId: submissionsTable.userId })
    .from(submissionsTable)
    .where(eq(submissionsTable.id, sourceSubmissionId))
    .limit(1);
  return Boolean(row?.userId) && row!.userId === viewer.userId;
}

/**
 * True when this viewer may act on a submission row: the account that made it,
 * an administrator, or, for a guest submission made without an account, the
 * account that holds the submitter's email address. An account-linked
 * submission is never reachable through an email match.
 */
export function ownsSubmissionRow(viewer: Viewer, row: { userId?: string | null; submitterEmail?: string | null }): boolean {
  if (viewer.isAdmin) return true;
  if (row.userId) return row.userId === viewer.userId;
  const email = (row.submitterEmail || "").trim().toLowerCase();
  return email.length > 0 && email === viewer.email;
}
