/**
 * What the listing pages say about the work they list: the archive grouped by
 * year, a domain hub's and an author's meta description, and the related works
 * linked from each work's page.
 *
 * Everything here is built from published records only (titles, dates,
 * domains, the effective descriptions and topic terms of lib/effective-seo.ts).
 * Nothing is invented: a hub with less to say gets a shorter description.
 */
import { DESCRIPTION_MAX, DESCRIPTION_MIN, cleanTitle, sentenceDescription } from "./seo-text";
import type { WorkSummary } from "./public-content";

/** How many related works a work's page links to. */
export const RELATED_WORKS_COUNT = 3;

/** How many of the newest works /about lists before pointing to the archive. */
export const ABOUT_LATEST_COUNT = 10;

/**
 * The journal's own statement of why it was started. Linked from /about and
 * /about/anvikshiki while it is published.
 */
export const MISSION_ESSAY_SLUG = "why-this-website-exists-0fc91e71";

/** Domains whose essays take up the subjects of /about/anvikshiki (logic, Nyāya, the Sanskrit tradition). */
export const MEANING_RELATED_DOMAINS = ["philosophy", "sanskrit-studies"];

/**
 * The published works /about/anvikshiki points readers to, from works listed
 * newest first: the journal's statement of purpose, then essays in the
 * domains its subject belongs to.
 */
export function meaningPageReading<T extends { kind: WorkSummary["kind"]; slug: string; categorySlug?: string | null }>(works: T[]): T[] {
  const mission = works.filter((w) => w.kind === "article" && w.slug === MISSION_ESSAY_SLUG);
  const inDomains = works.filter((w) => w.slug !== MISSION_ESSAY_SLUG && MEANING_RELATED_DOMAINS.includes(w.categorySlug || ""));
  return [...mission, ...inDomains].slice(0, 6);
}

const FREE_TO_READ = "All of it is free to read.";

/**
 * A meta description from factual sentences, best first: whole sentences are
 * kept while they fit within DESCRIPTION_MAX, skipping any that would not.
 * When the result stays under DESCRIPTION_MIN the sentences are joined and
 * cut to length instead.
 */
export function composeDescription(sentences: string[]): string {
  const parts = sentences.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  let out = "";
  for (const sentence of parts) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length <= DESCRIPTION_MAX) out = next;
  }
  if (out.length >= DESCRIPTION_MIN) return out;
  return sentenceDescription(parts.join(" "));
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "A", "A and B", "A, B and C" */
function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The text with a closing full stop. */
function sentence(text: string): string {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return "";
  return /[.!?…]["'”’)\]]*$/u.test(value) ? value : `${value}.`;
}

/** “Title”, as a work is named inside a description. */
function quoted(work: Pick<WorkSummary, "title">): string {
  return `“${cleanTitle(work.title)}”`;
}

/** "3 essays", "2 essays and 1 research paper" */
function workCount(works: WorkSummary[]): string {
  const essays = works.filter((w) => w.kind === "article").length;
  const papers = works.length - essays;
  if (papers === 0) return plural(essays, "essay");
  if (essays === 0) return plural(papers, "research paper");
  return `${plural(essays, "essay")} and ${plural(papers, "research paper")}`;
}

/**
 * As many of the titles, in order, as fit in `budget` characters: "It is “A”."
 * or "They are “A” and “B”." when that is all of them, "Among them is “A”." or
 * "Among them are “A” and “B”." when it is some; "" when not even the first
 * one fits.
 */
function titlesSentence(works: WorkSummary[], budget: number): string {
  let best = "";
  for (let n = 1; n <= Math.min(works.length, 3); n++) {
    const titles = listJoin(works.slice(0, n).map(quoted));
    const candidate = n === works.length
      ? `${n === 1 ? "It is" : "They are"} ${titles}.`
      : `Among them ${n === 1 ? "is" : "are"} ${titles}.`;
    if (candidate.length > budget) break;
    best = candidate;
  }
  return best;
}

function newestFirst(works: WorkSummary[]): WorkSummary[] {
  return [...works].sort((a, b) => (Date.parse(b.publishedAt || "") || 0) - (Date.parse(a.publishedAt || "") || 0));
}

/**
 * A lead sentence followed by as many of the works' titles as still fit, and
 * the fact (stated on the home page too) that published work is free to read.
 */
function leadWithTitles(lead: string, works: WorkSummary[]): string {
  const budget = DESCRIPTION_MAX - lead.length - 1;
  return composeDescription([lead, titlesSentence(newestFirst(works), budget), FREE_TO_READ]);
}

/**
 * The meta description of a domain hub: what the domain covers (its own
 * description, as the editors wrote it), how much is published in it and the
 * works, newest first. It never starts with the domain name the title already
 * gives.
 */
export function domainHubDescription(
  category: { name: string; description?: string | null },
  works: WorkSummary[],
): string {
  // Kept as written, so a name in it stays capitalised ("Vedic traditions").
  const covers = category.description?.replace(/\s+/g, " ").trim().replace(/[.!?…:;,]+$/u, "") || "";
  if (works.length === 0) {
    return composeDescription([
      covers
        ? `${covers}: Ānvīkṣikī files essays and papers on these under ${category.name}, but none has been published in it yet.`
        : `Ānvīkṣikī files essays and papers under ${category.name}, but none has been published in it yet.`,
      "Submissions in this area are welcome.",
    ]);
  }
  const lead = `${covers ? `${covers}: ` : ""}${workCount(works)} in ${category.name} published on Ānvīkṣikī.`;
  return leadWithTitles(covers ? lead : capitalize(lead), works);
}

/**
 * The meta description of an author page: how many works, in which domains
 * and which ones, newest first. The author's own bio is used instead when it
 * is long enough to stand as a description.
 */
export function authorDescription(
  name: string,
  works: WorkSummary[],
  categoryNames: Map<string, string>,
  bio?: string | null,
): string {
  const ownBio = bio?.replace(/\s+/g, " ").trim() || "";
  if (ownBio.length >= DESCRIPTION_MIN) return sentenceDescription(ownBio);
  if (works.length === 0) {
    return composeDescription([sentence(ownBio), `Author profile for ${name} on Ānvīkṣikī.`]);
  }
  const domains = [...new Set(newestFirst(works).map((w) => (w.categorySlug && categoryNames.get(w.categorySlug)) || "").filter(Boolean))];
  const lead = `${capitalize(workCount(works))} by ${name} published on Ānvīkṣikī${domains.length ? `, in ${listJoin(domains.slice(0, 3))}` : ""}.`;
  return leadWithTitles(lead, works);
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** The year a work was published, or null when it has no date. */
export function publicationYear(work: Pick<WorkSummary, "publishedAt">): number | null {
  const time = work.publishedAt ? Date.parse(work.publishedAt) : NaN;
  return Number.isNaN(time) ? null : new Date(time).getUTCFullYear();
}

/** Works grouped by year of publication, newest year first; undated works last. */
export function groupByYear<T extends Pick<WorkSummary, "publishedAt">>(works: T[]): Array<{ year: number | null; works: T[] }> {
  const groups = new Map<number | null, T[]>();
  for (const work of works) {
    const year = publicationYear(work);
    const list = groups.get(year);
    if (list) list.push(work);
    else groups.set(year, [work]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, list]) => ({ year, works: list }));
}

/** For comparing topic terms: diacritics folded, case and spacing ignored. */
function foldTerm(term: string): string {
  return term.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s-]+/g, " ").trim();
}

/**
 * Up to `count` other works to read next: those sharing the work's domain or
 * its topic terms first (a shared domain counts 3, each shared topic 2), then,
 * so every page links on, the newest of the rest. Ties go to the newer work.
 */
export function relatedWorks(
  current: { kind: WorkSummary["kind"]; id: string; categorySlug?: string | null; topics?: string[] },
  works: WorkSummary[],
  count = RELATED_WORKS_COUNT,
): WorkSummary[] {
  const topics = new Set((current.topics || []).map(foldTerm));
  return works
    .filter((work) => !(work.kind === current.kind && work.id === current.id))
    .map((work) => {
      const sameDomain = Boolean(current.categorySlug) && work.categorySlug === current.categorySlug;
      const shared = new Set(work.topics.map(foldTerm).filter((t) => topics.has(t))).size;
      return { work, score: (sameDomain ? 3 : 0) + 2 * shared, time: Date.parse(work.publishedAt || "") || 0 };
    })
    .sort((a, b) => b.score - a.score || b.time - a.time || a.work.id.localeCompare(b.work.id))
    .slice(0, Math.max(0, count))
    .map(({ work }) => work);
}
