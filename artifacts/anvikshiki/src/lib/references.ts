/**
 * References & sources, client side. The lenient half of the server's
 * artifacts/api-server/src/lib/references.ts: it turns whatever a stored
 * `references` value holds into the one display shape
 *
 *   { title, url?, authors?, publisher?, year?, doi?, note? }
 *
 * and drops anything unsafe (a javascript: URL, markup). The server test
 * references-parity.test.ts runs both copies on the same inputs.
 *
 * Normally the server already sends the cleaned list as `seo.references`
 * (lib/effective-seo.ts); this is the fallback for a response without it.
 */

export interface WorkReference {
  title: string;
  url?: string;
  authors?: string;
  publisher?: string;
  year?: string;
  doi?: string;
  note?: string;
}

/** What the server sends with a work as `seo` (lib/effective-seo.ts). */
export interface WorkSeo {
  title: string;
  description: string;
  topics: string[];
  references: WorkReference[];
  sourcesNote: string | null;
}

const LIMITS = {
  title: 500,
  authors: 500,
  publisher: 300,
  year: 20,
  note: 1_000,
} as const;

type Field = "title" | "url" | "authors" | "publisher" | "year" | "doi" | "note";

/** Plain text: tags removed, the common entities decoded, whitespace collapsed. */
export function referenceText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The URL when it is an absolute http(s) URL without embedded credentials, otherwise "". */
export function safeReferenceUrl(value: unknown): string {
  const raw = referenceText(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.username || url.password) return "";
    return url.toString();
  } catch {
    return "";
  }
}

/** A bare DOI from "10.x/y", "doi:10.x/y" or "https://doi.org/10.x/y"; "" when it is not one. */
export function normalizeDoi(value: unknown): string {
  const raw = referenceText(value)
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
  return /^10\.\d{4,9}\/\S+$/.test(raw) ? raw : "";
}

/** The doi.org resolver URL for a bare DOI. */
export function doiUrl(doi: string): string {
  return `https://doi.org/${encodeURI(doi).replace(/#/g, "%23").replace(/\?/g, "%3F")}`;
}

function coerce(raw: unknown): Record<Field, string> | null {
  if (typeof raw === "string" || typeof raw === "number") {
    return { title: referenceText(raw), url: "", authors: "", publisher: "", year: "", doi: "", note: "" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = referenceText(r[key]);
      if (value) return value;
    }
    return "";
  };
  return {
    title: pick("title", "name", "text"),
    url: pick("url", "href", "link"),
    authors: pick("authors", "author"),
    publisher: pick("publisher", "journal", "publication", "source"),
    year: pick("year", "date"),
    doi: pick("doi"),
    note: pick("note", "citation"),
  };
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Every renderable reference in a stored value, in order (same rules as the server). */
export function normalizeStoredReferences(raw: unknown, max = 100): WorkReference[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkReference[] = [];
  for (const item of raw) {
    const fields = coerce(item);
    if (!fields) continue;
    const url = safeReferenceUrl(fields.url);
    const doi = normalizeDoi(fields.doi);
    let title = fields.title;
    if (!title && url) title = new URL(url).hostname.replace(/^www\./, "");
    if (!title) continue;
    const ref: WorkReference = { title: truncate(title, LIMITS.title) };
    if (url) ref.url = url;
    if (fields.authors) ref.authors = truncate(fields.authors, LIMITS.authors);
    if (fields.publisher) ref.publisher = truncate(fields.publisher, LIMITS.publisher);
    if (fields.year) ref.year = truncate(fields.year, LIMITS.year);
    if (doi) ref.doi = doi;
    if (fields.note) ref.note = truncate(fields.note, LIMITS.note);
    out.push(ref);
    if (out.length >= max) break;
  }
  return out;
}

/** A work's own tags, trimmed and de-duplicated (the fallback when `seo` is missing). */
function ownTags(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(/,\s*/) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const tag = raw.replace(/\s+/g, " ").trim();
    if (!tag || tag.length > 80 || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
    if (out.length >= 15) break;
  }
  return out;
}

/** The topics, references and note to show for a work: the server's `seo` when present. */
export function workSources(work: any): Pick<WorkSeo, "topics" | "references" | "sourcesNote"> {
  const seo = work?.seo;
  if (seo && typeof seo === "object") {
    return {
      topics: Array.isArray(seo.topics) ? seo.topics.filter((t: unknown): t is string => typeof t === "string" && t.trim() !== "") : [],
      references: normalizeStoredReferences(seo.references),
      sourcesNote: referenceText(seo.sourcesNote) || null,
    };
  }
  return { topics: ownTags(work?.tags), references: normalizeStoredReferences(work?.references), sourcesNote: null };
}
