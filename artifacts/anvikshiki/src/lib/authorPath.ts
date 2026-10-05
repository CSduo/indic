/**
 * The canonical author page for a work, matching the server's rule
 * (api-server lib/author-identity.ts): the account handle when the API or the
 * server-rendered page supplied one, otherwise a slug of a single author's
 * name, which the server redirects to the handle when there is one. A work
 * with several named authors gets no single author link.
 */
export function authorSlug(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^(dr|prof|vidwan|acharya|pandit|shri|smt)\.?\s+/i, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function authorHref(work: { authorHandle?: string | null; authorName?: string | null } | null | undefined): string | null {
  if (!work) return null;
  if (work.authorHandle) return `/authors/${encodeURIComponent(work.authorHandle)}`;
  const name = (work.authorName || "").trim();
  if (!name || /,|\s+and\s+/i.test(name)) return null;
  const slug = authorSlug(name);
  return slug ? `/authors/${encodeURIComponent(slug)}` : null;
}
