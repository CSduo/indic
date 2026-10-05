/**
 * One rule for author URLs, shared by the sitemap, the listing pages, article
 * pages and the /authors/:slug route, so every link, sitemap entry, canonical
 * and JSON-LD @id names the same URL for the same person.
 *
 * The canonical segment of /authors/<segment> is the account handle when the
 * work belongs to an account with one; otherwise a slug of the display name.
 */
import { slugify } from "./slug";

export interface AuthorUser {
  id: string;
  handle?: string | null;
  name?: string | null;
}

export interface AuthorWork {
  kind: "article" | "paper";
  /** The display name on the work; papers may list several, comma-separated. */
  authorName?: string | null;
  /** The account that submitted the work, when it came through a submission. */
  authorId?: string | null;
}

export type AuthorResolver = (name: string, ownerId: string | null | undefined, singleAuthor: boolean) => string | null;

/**
 * Resolve the /authors/<segment> for a name on a work, preferring the account's
 * handle over a slug of the display name. Two accounts with the same name slug
 * are ambiguous, so neither handle is used for a name-only match.
 */
export function makeAuthorResolver(users: AuthorUser[]): AuthorResolver {
  const byId = new Map<string, AuthorUser>();
  const byNameSlug = new Map<string, AuthorUser | null>();

  for (const user of users) {
    byId.set(user.id, user);
    const nameSlug = slugify(user.name || "");
    if (!nameSlug) continue;
    byNameSlug.set(nameSlug, byNameSlug.has(nameSlug) ? null : user);
  }

  return (name, ownerId, singleAuthor) => {
    const nameSlug = slugify(name);
    const owner = ownerId ? byId.get(ownerId) : undefined;
    if (owner?.handle && (singleAuthor || slugify(owner.name || "") === nameSlug)) {
      return owner.handle;
    }
    const byName = nameSlug ? byNameSlug.get(nameSlug) : undefined;
    if (byName?.handle) return byName.handle;
    return nameSlug || null;
  };
}

/** The names on a work: one for an article, the comma-separated list for a paper. */
export function workAuthorNames(work: AuthorWork): string[] {
  const raw = (work.authorName || "").trim();
  if (!raw) return [];
  if (work.kind === "paper") return raw.split(/,\s*/).map(n => n.trim()).filter(Boolean);
  return [raw];
}

/** Every author segment a work is listed under. */
export function workAuthorSegments(work: AuthorWork, resolve: AuthorResolver): string[] {
  const names = workAuthorNames(work);
  if (names.length === 0) {
    const owner = work.authorId ? resolve("", work.authorId, true) : null;
    return owner ? [owner] : [];
  }
  const segments = names
    .map(name => resolve(name, work.authorId, names.length === 1))
    .filter((segment): segment is string => Boolean(segment));
  return [...new Set(segments)];
}

/**
 * The single author link for a work in a listing, or null when it names
 * several authors (or none).
 */
export function singleAuthorPath(work: AuthorWork, resolve: AuthorResolver): string | null {
  const raw = (work.authorName || "").trim();
  if (raw && /,|\s+and\s+/i.test(raw)) return null;
  const [segment] = workAuthorSegments({ ...work, kind: "article" }, resolve);
  return segment ? `/authors/${encodeURIComponent(segment)}` : null;
}

export type AuthorRequestResolution<W> =
  | { kind: "redirect"; segment: string }
  | { kind: "not-found" }
  | {
      kind: "render";
      /** The canonical segment; equal to the requested one. */
      segment: string;
      user: AuthorUser | null;
      displayName: string;
      works: W[];
    };

/**
 * Decide what /authors/<requested> serves. Only exact matches count; there is
 * no substring or partial-name matching.
 *
 * - An account handle (case-insensitive) renders that account; a different
 *   spelling of it, "@handle" or the account id redirects to the handle.
 * - An account without a handle is reached by its id.
 * - A name slug that works are listed under (an author without an account)
 *   renders those works; other spellings of the same name redirect to it.
 * - A name that belongs to exactly one handle redirects to that handle.
 * - Anything else is not found.
 */
export function resolveAuthorRequest<W extends AuthorWork>(
  requested: string,
  users: AuthorUser[],
  works: W[],
): AuthorRequestResolution<W> {
  const resolve = makeAuthorResolver(users);
  const trimmed = requested.trim();
  const bare = trimmed.replace(/^@/, "");
  if (!bare) return { kind: "not-found" };

  const segmentsOf = new Map<W, string[]>(works.map(work => [work, workAuthorSegments(work, resolve)]));
  const worksUnder = (segment: string) => works.filter(work => segmentsOf.get(work)!.includes(segment));

  // 1. An account handle.
  const lower = bare.toLowerCase();
  const byHandle = users.find(user => user.handle && user.handle.toLowerCase() === lower);
  if (byHandle?.handle) {
    if (trimmed !== byHandle.handle) return { kind: "redirect", segment: byHandle.handle };
    return {
      kind: "render",
      segment: byHandle.handle,
      user: byHandle,
      displayName: byHandle.name || byHandle.handle,
      works: worksUnder(byHandle.handle),
    };
  }

  // 2. An account id.
  const byId = users.find(user => user.id === bare);
  if (byId) {
    if (byId.handle) return { kind: "redirect", segment: byId.handle };
    const nameSegment = slugify(byId.name || "");
    if (nameSegment && worksUnder(nameSegment).length > 0) return { kind: "redirect", segment: nameSegment };
    if (trimmed !== byId.id) return { kind: "redirect", segment: byId.id };
    return { kind: "render", segment: byId.id, user: byId, displayName: byId.name || "Author", works: [] };
  }

  // 3. A name slug that works are listed under.
  const nameSlug = slugify(bare);
  if (!nameSlug) return { kind: "not-found" };
  const listed = worksUnder(nameSlug);
  if (listed.length > 0) {
    if (trimmed !== nameSlug) return { kind: "redirect", segment: nameSlug };
    const displayName = listed
      .flatMap(work => workAuthorNames(work))
      .find(name => slugify(name) === nameSlug) || nameSlug;
    const owner = users.filter(user => slugify(user.name || "") === nameSlug);
    return {
      kind: "render",
      segment: nameSlug,
      user: owner.length === 1 ? owner[0] : null,
      displayName,
      works: listed,
    };
  }

  // 4. Another spelling of a name that belongs to exactly one handle.
  const handles = new Set<string>();
  const named = users.filter(user => user.handle && slugify(user.name || "") === nameSlug);
  if (named.length === 1) handles.add(named[0].handle!);
  for (const work of works) {
    const names = workAuthorNames(work);
    for (const name of names) {
      if (slugify(name) !== nameSlug) continue;
      const segment = resolve(name, work.authorId, names.length === 1);
      if (segment && segment !== nameSlug) handles.add(segment);
    }
  }
  if (handles.size === 1) return { kind: "redirect", segment: [...handles][0] };

  return { kind: "not-found" };
}
