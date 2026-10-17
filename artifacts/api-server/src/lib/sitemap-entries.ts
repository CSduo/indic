import {
  db,
  articlesTable,
  papersTable,
  categoriesTable,
  usersTable,
  submissionsTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { makeAuthorResolver, workAuthorSegments } from "./author-identity";

/**
 * A domain hub is indexed (and listed in the sitemap) only once it holds this
 * many published works; a hub with one or two pieces is a thin listing page.
 */
export const MIN_WORKS_FOR_INDEXED_HUB = 3;

/**
 * The one sitemap generator.
 *
 * /sitemap.xml and the IndexNow reindex job both read from here, so the set of
 * URLs we tell search engines about is defined in exactly one place.
 *
 * What goes in: only URLs that return 200, are self-canonical and are worth
 * indexing today. What stays out: legal boilerplate (/privacy, /terms), the
 * noindexed community area (/community), utility pages that will never rank
 * on their own (/contact, /submit: still indexable and linked from every page,
 * but listing them only inflated the "not indexed" count), listing pages that
 * are empty (/papers with no papers, domain hubs with fewer than
 * MIN_WORKS_FOR_INDEXED_HUB works) and author pages for members who have not
 * published anything.
 *
 * lastmod must be true, because Google stops trusting lastmod for the whole site
 * once it sees false values. So it is never the request time:
 *   - a work: its updatedAt (or publishedAt)
 *   - a page that lists works (/, /about, /about/anvikshiki, /browse,
 *     /archive, /domains, a domain hub, an author page): its newest work, or
 *     STATIC_PAGES_LASTMOD when its own copy or layout changed more recently
 */

export const SITE_URL = "https://anvikshikijournal.in";

/**
 * When the copy of the static pages (/about, /about/anvikshiki) or the layout
 * of the listing pages (what the archive, domains, domain hubs and author pages
 * show for each work) last changed. Update this by hand in the same commit that
 * makes such a change.
 */
export const STATIC_PAGES_LASTMOD = "2026-10-17T00:00:00.000Z";

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export interface SitemapWorkRow {
  slug: string;
  updatedAt?: Date | string | null;
  publishedAt?: Date | string | null;
  authorName?: string | null;
  categorySlug?: string | null;
  /** The account that submitted the work, when it came through a submission. */
  authorId?: string | null;
}

export interface SitemapUserRow {
  id: string;
  handle?: string | null;
  name?: string | null;
}

export interface SitemapCategoryRow {
  slug: string;
}

export interface SitemapSource {
  articles: SitemapWorkRow[];
  papers: SitemapWorkRow[];
  categories: SitemapCategoryRow[];
  users: SitemapUserRow[];
}

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function workTime(work: SitemapWorkRow): number | null {
  return toTime(work.updatedAt) ?? toTime(work.publishedAt);
}

function iso(time: number | null | undefined): string | undefined {
  return time === null || time === undefined ? undefined : new Date(time).toISOString();
}

function newest(...times: Array<number | null | undefined>): number | null {
  const valid = times.filter((t): t is number => typeof t === "number");
  return valid.length > 0 ? Math.max(...valid) : null;
}

/** Pure builder, kept free of I/O so it can be unit-tested directly. */
export function buildSitemapEntries(source: SitemapSource): SitemapEntry[] {
  const staticTime = toTime(STATIC_PAGES_LASTMOD);
  const allWorks = [...source.articles, ...source.papers];
  const latestWork = newest(...allWorks.map(workTime));
  const latestPaper = newest(...source.papers.map(workTime));

  // Every one of these pages lists published work (/about its newest works,
  // /about/anvikshiki further reading), so each changes when a work does.
  const listingTime = iso(newest(staticTime, latestWork));
  const entries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, lastmod: listingTime },
    { loc: `${SITE_URL}/about`, lastmod: listingTime },
    { loc: `${SITE_URL}/about/anvikshiki`, lastmod: listingTime },
    { loc: `${SITE_URL}/browse`, lastmod: listingTime },
    { loc: `${SITE_URL}/archive`, lastmod: listingTime },
    { loc: `${SITE_URL}/domains`, lastmod: listingTime },
  ];

  if (source.papers.length > 0) {
    entries.push({ loc: `${SITE_URL}/papers`, lastmod: iso(newest(staticTime, latestPaper)) });
  }

  for (const article of source.articles) {
    entries.push({
      loc: `${SITE_URL}/articles/${encodeURIComponent(article.slug)}`,
      lastmod: iso(workTime(article)),
    });
  }

  for (const paper of source.papers) {
    entries.push({
      loc: `${SITE_URL}/papers/${encodeURIComponent(paper.slug)}`,
      lastmod: iso(workTime(paper)),
    });
  }

  // Domain hubs: only those with enough published work to stand as a page
  // (MIN_WORKS_FOR_INDEXED_HUB); thinner hubs are noindex until they grow.
  const visibleCategories = new Set(source.categories.map(c => c.slug));
  const hubTimes = new Map<string, number | null>();
  const hubCounts = new Map<string, number>();
  for (const work of allWorks) {
    const slug = work.categorySlug;
    if (!slug || !visibleCategories.has(slug)) continue;
    hubTimes.set(slug, newest(hubTimes.get(slug), workTime(work)));
    hubCounts.set(slug, (hubCounts.get(slug) ?? 0) + 1);
  }
  for (const category of source.categories) {
    if ((hubCounts.get(category.slug) ?? 0) < MIN_WORKS_FOR_INDEXED_HUB) continue;
    entries.push({
      loc: `${SITE_URL}/domains/${encodeURIComponent(category.slug)}`,
      lastmod: iso(newest(staticTime, hubTimes.get(category.slug))),
    });
  }

  // Author pages: only people with at least one published work, at the
  // canonical handle URL when the work is linked to an account.
  const resolveAuthor = makeAuthorResolver(source.users);
  const authorTimes = new Map<string, number | null>();
  const addAuthor = (segment: string | null, work: SitemapWorkRow) => {
    if (!segment) return;
    authorTimes.set(segment, newest(authorTimes.get(segment), workTime(work)));
  };
  // The same segments the /authors/:slug route serves (lib/author-identity.ts).
  for (const article of source.articles) {
    for (const segment of workAuthorSegments({ kind: "article", ...article }, resolveAuthor)) addAuthor(segment, article);
  }
  for (const paper of source.papers) {
    for (const segment of workAuthorSegments({ kind: "paper", ...paper }, resolveAuthor)) addAuthor(segment, paper);
  }
  for (const [segment, time] of authorTimes) {
    entries.push({
      loc: `${SITE_URL}/authors/${encodeURIComponent(segment)}`,
      lastmod: iso(newest(staticTime, time)),
    });
  }

  // De-duplicate while keeping the first occurrence.
  const seen = new Set<string>();
  return entries.filter(entry => {
    if (seen.has(entry.loc)) return false;
    seen.add(entry.loc);
    return true;
  });
}

export async function loadSitemapSource(): Promise<SitemapSource> {
  const [articles, papers, categories, users] = await Promise.all([
    db.select({
      slug: articlesTable.slug,
      updatedAt: articlesTable.updatedAt,
      publishedAt: articlesTable.publishedAt,
      authorName: articlesTable.authorName,
      categorySlug: articlesTable.categorySlug,
      authorId: submissionsTable.userId,
    })
      .from(articlesTable)
      .leftJoin(submissionsTable, eq(articlesTable.sourceSubmissionId, submissionsTable.id))
      .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt))),
    db.select({
      slug: papersTable.slug,
      updatedAt: papersTable.updatedAt,
      publishedAt: papersTable.publishedAt,
      authorName: papersTable.authorName,
      categorySlug: papersTable.categorySlug,
      authorId: submissionsTable.userId,
    })
      .from(papersTable)
      .leftJoin(submissionsTable, eq(papersTable.sourceSubmissionId, submissionsTable.id))
      .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt))),
    db.select({ slug: categoriesTable.slug })
      .from(categoriesTable)
      .where(eq(categoriesTable.visible, true)),
    db.select({ id: usersTable.id, handle: usersTable.handle, name: usersTable.name })
      .from(usersTable)
      .where(isNull(usersTable.deletionRequestedAt)),
  ]);

  return { articles, papers, categories, users };
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  return buildSitemapEntries(await loadSitemapSource());
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map(entry => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
