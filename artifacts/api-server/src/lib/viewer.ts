import type { Request } from "express";
import { db, adminsTable, usersTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
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
 * Resolve who is asking, together with the author identities their account
 * owns. Published articles and papers carry only an author name, so ownership
 * is matched by identity rather than by a hardcoded email allowlist.
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
    const cleanEmail = auth.email ? auth.email.trim().toLowerCase() : "";
    const adminRows = cleanEmail
      ? await db.select().from(adminsTable)
          .where(or(eq(adminsTable.id, auth.userId), ilike(adminsTable.email, cleanEmail)))
          .limit(1)
      : await db.select().from(adminsTable)
          .where(eq(adminsTable.id, auth.userId))
          .limit(1);
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

/** True when this viewer is the named author of a work, or an administrator. */
export function ownsAuthoredWork(viewer: Viewer, authorName?: string | null): boolean {
  if (viewer.isAdmin) return true;
  const key = identityKey(authorName);
  return key.length > 0 && viewer.identities.has(key);
}
