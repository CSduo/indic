/**
 * The SEO fields and sources a published work actually uses.
 *
 * Each field is resolved in the same order:
 *
 *   1. the value stored on the article or paper (what an editor set),
 *   2. the editorial layer in lib/editorial-overrides.ts, keyed by slug,
 *   3. an automatic value derived from the work's own text.
 *
 * The page head, JSON-LD, the visible Topics row, the References & Sources
 * section, RSS and the API all read from here, so they always agree. The
 * stored record is never modified.
 */
import { editorialOverride, type EditorialOverride } from "./editorial-overrides";
import { normalizeStoredReferences, referenceText, type WorkReference } from "./references";
import { articleTopicTags, deriveWorkTerms } from "./seo-terms";
import { cleanTitle, deriveDescription } from "./seo-text";

export type WorkKind = "article" | "paper";

/** The fields of an article or paper row this module reads. */
export interface SeoWork {
  slug?: unknown;
  title?: unknown;
  subtitle?: unknown;
  excerpt?: unknown;
  abstract?: unknown;
  body?: unknown;
  tags?: unknown;
  references?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
}

/** What the page and the client use. Sent to the SPA as `seo` on the work. */
export interface WorkSeo {
  /** Text for <title>, og:title and twitter:title, without the site suffix. */
  title: string;
  /** The meta description (never starts with a copy of the title). */
  description: string;
  /** Topic terms: keywords, article:tag, JSON-LD about, RSS categories, Topics row. */
  topics: string[];
  /** The References & Sources list, cleaned for display. */
  references: WorkReference[];
  /** An editor's note shown above the references, if any. */
  sourcesNote: string | null;
}

function plain(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function overrideFor(work: SeoWork): EditorialOverride | undefined {
  return typeof work.slug === "string" ? editorialOverride(work.slug) : undefined;
}

/** The SEO title: stored, else editorial, else the work's title. */
export function effectiveSeoTitle(work: SeoWork): string {
  const own = plain(work.seoTitle) || plain(overrideFor(work)?.seoTitle);
  return cleanTitle(own || work.title);
}

/** The meta description: stored, else editorial, else derived from the summary and body. */
export function effectiveSeoDescription(work: SeoWork, kind: WorkKind): string {
  const override = overrideFor(work);
  return deriveDescription({
    seoDescription: plain(work.seoDescription) || plain(override?.seoDescription),
    summaries: kind === "paper" ? [work.abstract] : [work.excerpt, work.subtitle],
    body: work.body,
    title: [work.title, plain(work.seoTitle) || plain(override?.seoTitle)],
  });
}

/** Topic terms: stored tags, else editorial tags, else terms derived from the text. */
export function effectiveTopics(work: SeoWork): string[] {
  const own = articleTopicTags(work.tags);
  if (own.length) return own;
  const editorial = articleTopicTags(overrideFor(work)?.tags);
  if (editorial.length) return editorial;
  return deriveWorkTerms(work);
}

/**
 * The work's references when it has any, else the editorial references. The
 * editorial note (a credit statement) is shown with whichever list is used.
 */
export function effectiveReferences(work: SeoWork): { references: WorkReference[]; sourcesNote: string | null } {
  const override = overrideFor(work);
  const own = normalizeStoredReferences(work.references);
  const references = own.length ? own : normalizeStoredReferences(override?.references);
  const sourcesNote = referenceText(override?.sourcesNote) || null;
  return { references, sourcesNote };
}

/** Every effective field at once. */
export function workSeo(work: SeoWork, kind: WorkKind): WorkSeo {
  const { references, sourcesNote } = effectiveReferences(work);
  return {
    title: effectiveSeoTitle(work),
    description: effectiveSeoDescription(work, kind),
    topics: effectiveTopics(work),
    references,
    sourcesNote,
  };
}
