import { db, usersTable } from "@workspace/db";
import { eq, ne, and, sql } from "drizzle-orm";

/**
 * Handles — the short, unique name a person is reachable by.
 *
 * A display name cannot do this job: two people may share one, anyone may
 * change theirs, and they contain spaces and diacritics that a URL has to
 * escape into something unreadable. A handle is chosen once, unique, and made
 * of characters that survive being put in a link.
 */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/**
 * Words a handle may not take.
 *
 * Two reasons. Some would collide with a real page — someone holding `new`
 * would break `/messages/new`. Others would let an account pass itself off as
 * part of the journal itself, which is worse: `admin` and `support` are how
 * people get talked into trusting a stranger.
 */
const RESERVED = new Set([
  "new", "edit", "delete", "search", "settings", "account", "profile", "admin",
  "administrator", "moderator", "support", "help", "official", "staff", "team",
  "anvikshiki", "root", "system", "api", "login", "logout", "signup", "register",
  "messages", "message", "conversation", "conversations", "group", "groups",
  "me", "you", "user", "users", "member", "members", "community", "assembly",
  "about", "contact", "browse", "archive", "papers", "articles", "domains",
  "submit", "saved", "notifications", "null", "undefined", "anonymous",
]);

export type HandleCheck =
  | { ok: true; handle: string }
  | { ok: false; reason: string };

/**
 * Validate a handle someone typed.
 *
 * Lowercased rather than rejected for case, because nobody thinks of `Arya`
 * and `arya` as different names and being told off for a capital letter is a
 * pointless obstacle.
 */
export function validateHandle(input: string): HandleCheck {
  const handle = String(input || "").trim().toLowerCase();

  if (handle.length < HANDLE_MIN) return { ok: false, reason: `At least ${HANDLE_MIN} characters.` };
  if (handle.length > HANDLE_MAX) return { ok: false, reason: `At most ${HANDLE_MAX} characters.` };
  if (!/^[a-z]/.test(handle)) return { ok: false, reason: "Must start with a letter." };
  if (!/^[a-z0-9._-]+$/.test(handle)) {
    return { ok: false, reason: "Letters, numbers, full stops, hyphens and underscores only." };
  }
  if (/[._-]{2,}/.test(handle)) return { ok: false, reason: "No two punctuation marks in a row." };
  if (/[._-]$/.test(handle)) return { ok: false, reason: "Cannot end with punctuation." };
  if (RESERVED.has(handle)) return { ok: false, reason: "That one is reserved." };

  return { ok: true, handle };
}

/** Is this handle free? `exceptUserId` lets someone keep their own. */
export async function handleIsAvailable(handle: string, exceptUserId?: string): Promise<boolean> {
  const conditions = [sql`lower(${usersTable.handle}) = ${handle.toLowerCase()}`];
  if (exceptUserId) conditions.push(ne(usersTable.id, exceptUserId));

  const [row] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(...conditions))
    .limit(1);

  return !row;
}

/** Strip a display name down to something that can live in a URL. */
function baseFrom(name: string | null, email: string | null): string {
  const source = (name || "").trim() || (email || "").split("@")[0] || "member";
  const slug = source
    .toLowerCase()
    // Diacritics are separated and dropped, so "Ārya Ambādi" becomes
    // "arya-ambadi" rather than a string of percent escapes.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HANDLE_MAX - 4);

  // Must begin with a letter, and must be long enough to be a handle at all.
  const withLetter = /^[a-z]/.test(slug) ? slug : `m-${slug}`;
  return withLetter.length >= HANDLE_MIN ? withLetter : `member-${withLetter}`.slice(0, HANDLE_MAX);
}

/**
 * Pick a free handle for someone who has none.
 *
 * Derived from their name so it is recognisable, with a number appended only
 * when it has to be. Returns null if it somehow cannot find one, which the
 * caller should treat as "leave them without a handle for now" rather than as
 * a failure worth showing anybody.
 */
export async function generateHandle(name: string | null, email: string | null): Promise<string | null> {
  const base = baseFrom(name, email);

  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const check = validateHandle(candidate);
    if (!check.ok) continue;
    if (await handleIsAvailable(check.handle)) return check.handle;
  }

  // Every readable form was taken; fall back to something certainly free.
  const random = `member-${Math.random().toString(36).slice(2, 8)}`;
  return (await handleIsAvailable(random)) ? random : null;
}

/**
 * Make sure a user has a handle, generating one if not.
 *
 * Called when someone signs in, so accounts that existed before handles get
 * one without anybody having to run a migration. Silent on failure: a missing
 * handle is a cosmetic problem, and it must never stop somebody signing in.
 */
export async function ensureHandle(userId: string, name: string | null, email: string | null): Promise<string | null> {
  try {
    const [existing] = await db
      .select({ handle: usersTable.handle })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing?.handle) return existing.handle;

    const handle = await generateHandle(name, email);
    if (!handle) return null;

    await db.update(usersTable).set({ handle }).where(eq(usersTable.id, userId));
    return handle;
  } catch (err: any) {
    console.warn("Could not assign a handle:", err?.message || err);
    return null;
  }
}
