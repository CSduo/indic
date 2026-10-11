/**
 * References & sources for articles, papers and submissions.
 *
 * One shape is used everywhere (database jsonb, API input, server-rendered
 * HTML, the client and JSON-LD):
 *
 *   { title, url?, authors?, publisher?, year?, doi?, note? }
 *
 * `title` is required; every other field is optional. `url` is always an
 * http(s) URL and `doi` is a bare DOI ("10.1002/bewi.202400027").
 *
 * Two entry points:
 *   - parseReferencesInput(): strict, for API writes. Rejects bad input with a
 *     message an author can act on ("Reference 3: the link must start with
 *     http:// or https://"). Wrapped as `referencesInputSchema` for zod.
 *   - normalizeStoredReferences(): lenient, for rendering. Older rows held
 *     plain strings or { title, url, citation }; those still render, and
 *     anything unsafe (a javascript: URL, markup) is dropped, never shown.
 *
 * The client keeps an identical copy of the lenient half in
 * artifacts/anvikshiki/src/lib/references.ts; a test runs both on the same
 * inputs.
 */
import { z } from "zod";

export interface WorkReference {
  title: string;
  url?: string;
  authors?: string;
  publisher?: string;
  year?: string;
  doi?: string;
  note?: string;
}

/** The most references one work may carry through the API. */
export const MAX_REFERENCES = 60;

/** Per-field length limits, in characters, after markup is stripped. */
export const REFERENCE_LIMITS = {
  title: 500,
  url: 2_000,
  authors: 500,
  publisher: 300,
  year: 20,
  doi: 200,
  note: 1_000,
} as const;

type ReferenceField = keyof typeof REFERENCE_LIMITS;
const FIELDS: ReferenceField[] = ["title", "url", "authors", "publisher", "year", "doi", "note"];

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

/**
 * Maps the shapes older rows and other tools used onto the one shape:
 * a plain string is a title; name/text → title, href/link → url,
 * author → authors, journal/publication/source → publisher, date → year,
 * citation → note.
 */
function coerceReference(raw: unknown): Record<ReferenceField, string> | null {
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

/**
 * Every renderable reference in a stored value, in order. Entries without a
 * title fall back to the link's host; entries with neither are dropped. Unsafe
 * URLs and malformed DOIs are dropped from the entry, not shown.
 */
export function normalizeStoredReferences(raw: unknown, max = 100): WorkReference[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkReference[] = [];
  for (const item of raw) {
    const fields = coerceReference(item);
    if (!fields) continue;
    const url = safeReferenceUrl(fields.url);
    const doi = normalizeDoi(fields.doi);
    let title = fields.title;
    if (!title && url) title = new URL(url).hostname.replace(/^www\./, "");
    if (!title) continue;
    const ref: WorkReference = { title: truncate(title, REFERENCE_LIMITS.title) };
    if (url) ref.url = url;
    if (fields.authors) ref.authors = truncate(fields.authors, REFERENCE_LIMITS.authors);
    if (fields.publisher) ref.publisher = truncate(fields.publisher, REFERENCE_LIMITS.publisher);
    if (fields.year) ref.year = truncate(fields.year, REFERENCE_LIMITS.year);
    if (doi) ref.doi = doi;
    if (fields.note) ref.note = truncate(fields.note, REFERENCE_LIMITS.note);
    out.push(ref);
    if (out.length >= max) break;
  }
  return out;
}

export type ReferencesParseResult =
  | { ok: true; value: WorkReference[] | undefined }
  | { ok: false; error: string };

/**
 * Strict validation for API writes. `undefined` means "not supplied" and is
 * returned as is; null or "" clear the list. A JSON string is accepted so a
 * multipart form can carry the list in one field. Rows that are entirely
 * blank (an empty row left in the form) are skipped.
 */
export function parseReferencesInput(raw: unknown): ReferencesParseResult {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null || raw === "") return { ok: true, value: [] };

  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return { ok: false, error: "References could not be read. Please re-enter them." };
    }
  }
  if (!Array.isArray(list)) return { ok: false, error: "References must be a list." };
  // Blank rows are skipped below, so allow some slack before counting, but
  // never walk an arbitrarily long list.
  if (list.length > MAX_REFERENCES * 2) {
    return { ok: false, error: `At most ${MAX_REFERENCES} references can be added.` };
  }

  const out: WorkReference[] = [];
  for (let index = 0; index < list.length; index++) {
    const label = `Reference ${index + 1}`;
    const fields = coerceReference(list[index]);
    if (!fields) return { ok: false, error: `${label} is not a valid entry.` };
    if (FIELDS.every(field => !fields[field])) continue;

    for (const field of FIELDS) {
      if (fields[field].length > REFERENCE_LIMITS[field]) {
        return { ok: false, error: `${label}: the ${field} is too long (at most ${REFERENCE_LIMITS[field]} characters).` };
      }
    }
    if (!fields.title) return { ok: false, error: `${label}: a title is required.` };

    const ref: WorkReference = { title: fields.title };
    if (fields.url) {
      const url = safeReferenceUrl(fields.url);
      if (!url) return { ok: false, error: `${label}: the link must be a full address starting with http:// or https://.` };
      ref.url = url;
    }
    if (fields.doi) {
      const doi = normalizeDoi(fields.doi);
      if (!doi) return { ok: false, error: `${label}: the DOI should look like 10.1234/abcd.` };
      ref.doi = doi;
    }
    if (fields.authors) ref.authors = fields.authors;
    if (fields.publisher) ref.publisher = fields.publisher;
    if (fields.year) ref.year = fields.year;
    if (fields.note) ref.note = fields.note;
    out.push(ref);
  }
  if (out.length > MAX_REFERENCES) {
    return { ok: false, error: `At most ${MAX_REFERENCES} references can be added.` };
  }
  return { ok: true, value: out };
}

/** zod field for API schemas: `WorkReference[] | undefined`, with author-facing errors. */
export const referencesInputSchema = z.unknown().transform((raw, ctx): WorkReference[] | undefined => {
  const result = parseReferencesInput(raw);
  if (!result.ok) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
    return z.NEVER;
  }
  return result.value;
});

/** The first validation message in a failed zod parse, for a 400 response. */
export function firstIssueMessage(error: z.ZodError, fallback = "Invalid input"): string {
  const issue = error.issues.find(i => i.code === z.ZodIssueCode.custom) || error.issues[0];
  if (!issue) return fallback;
  if (issue.code === z.ZodIssueCode.custom) return issue.message;
  const field = issue.path.join(".");
  return field ? `${fallback}: ${field} — ${issue.message}` : fallback;
}

function splitAuthors(authors: string): string[] {
  return authors
    .split(/\s*;\s*|\s+and\s+|\s*&\s*/i)
    .map(name => name.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * schema.org `citation` entries for a work's JSON-LD: one CreativeWork per
 * reference with its name, URL (the DOI resolver when there is no URL),
 * authors and a four-digit year as datePublished.
 */
export function referencesToCitations(refs: WorkReference[]): Record<string, unknown>[] {
  return refs.map(ref => {
    const node: Record<string, unknown> = { "@type": "CreativeWork", name: ref.title };
    const url = ref.url || (ref.doi ? `https://doi.org/${ref.doi}` : "");
    if (url) node.url = url;
    if (ref.authors) {
      const people = splitAuthors(ref.authors).map(name => ({ "@type": "Person", name }));
      if (people.length) node.author = people.length === 1 ? people[0] : people;
    }
    const year = ref.year?.match(/\b(\d{4})\b/)?.[1];
    if (year) node.datePublished = year;
    if (ref.doi) node.identifier = { "@type": "PropertyValue", propertyID: "DOI", value: ref.doi };
    return node;
  });
}
