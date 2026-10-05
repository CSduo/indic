/**
 * URL slug for an author's display name, as used in /authors/<slug> links.
 *
 * Honorifics are dropped so "Dr. Arya Ambadi" and "Arya Ambadi" share a slug.
 * Letters from any script are kept (Unicode property escapes), so Devanagari
 * names do not collapse to an empty string.
 */
export function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^(dr|prof|vidwan|acharya|pandit|shri|smt)\.?\s+/i, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
