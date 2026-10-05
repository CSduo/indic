import {
  db,
  articlesTable,
  papersTable,
  categoriesTable,
  usersTable,
  submissionsTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { slugify } from "./slug";

/**
 * The one sitemap generator.
 *
 * /sitemap.xml and the IndexNow reindex job both read from here, so the set of
 * URLs we tell search engines about is defined in exactly one place.
 *
 * What goes in: only URLs that return 200, are self-canonical and are worth
 * indexing today. What stays out: legal boilerplate (/privacy, /terms), the
 * noindexed community area (/community), listing pages that are empty
 * (/papers with no papers, domain hubs with no published work) and author pages
 * for members who have not published anything.
 *
 * lastmod must be true, because Google stops trusting lastmod for the whole site
 * once it sees false values. So it is never the request time:
 *   - a work: its updatedAt (or publishedAt)
 *   - a domain hub or author page: the newest lastmod among its works
 *   - a listing page (/, /browse, /archive): the newest work, or the static date
 *   - a static page: STATIC_PAGES_LASTMOD below
 */

export const SITE_URL = "https://anvikshikijournal.in";

/**
 * When the copy of the static pages (/about, /about/anvikshiki, /contact, /submit) last
 * changed. Update this by hand in the same commit that edits that copy.
 */
export const STATIC_PAGES_LASTMOD = "2026-10-05T00:00:00.000Z";

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

/**
 * Resolve the /authors/<segment> used for a name on a work, preferring the
 * account's handle (the canonical author URL) over a slug of the display name.
 */
function makeAuthorResolver(users: SitemapUserRow[]) {
  const byId = new Map<string, SitemapUserRow>();
  const byNameSlug = new Map<string, SitemapUserRow | null>();

  for (const user of users) {
    byId.set(user.id, user);
    const nameSlug = slugify(user.name || "");
    if (!nameSlug) continue;
    // Two accounts with the same name are ambiguous: use neither handle.
    byNameSlug.set(nameSlug, byNameSlug.has(nameSlug) ? null : user);
  }

  return (name: string, ownerId: string | null | undefined, singleAuthor: boolean): string | null => {
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

/** Pure builder, kept free of I/O so it can be unit-tested directly. */
export function buildSitemapEntries(source: SitemapSource): SitemapEntry[] {
  const staticTime = toTime(STATIC_PAGES_LASTMOD);
  const allWorks = [...source.articles, ...source.papers];
  const latestWork = newest(...allWorks.map(workTime));
  const latestPaper = newest(...source.papers.map(workTime));

  const entries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, lastmod: iso(newest(staticTime, latestWork)) },
    { loc: `${SITE_URL}/about`, lastmod: iso(staticTime) },
    { loc: `${SITE_URL}/about/anvikshiki`, lastmod: iso(staticTime) },
    { loc: `${SITE_URL}/browse`, lastmod: iso(newest(staticTime, latestWork)) },
    { loc: `${SITE_URL}/archive`, lastmod: iso(newest(staticTime, latestWork)) },
    { loc: `${SITE_URL}/domains`, lastmod: iso(newest(staticTime, latestWork)) },
    { loc: `${SITE_URL}/contact`, lastmod: iso(staticTime) },
    { loc: `${SITE_URL}/submit`, lastmod: iso(staticTime) },
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

  // Domain hubs: only those with at least one published work.
  const visibleCategories = new Set(source.categories.map(c => c.slug));
  const hubTimes = new Map<string, number | null>();
  for (const work of allWorks) {
    const slug = work.categorySlug;
    if (!slug || !visibleCategories.has(slug)) continue;
    hubTimes.set(slug, newest(hubTimes.get(slug), workTime(work)));
  }
  for (const category of source.categories) {
    if (!hubTimes.has(category.slug)) continue;
    entries.push({
      loc: `${SITE_URL}/domains/${encodeURIComponent(category.slug)}`,
      lastmod: iso(hubTimes.get(category.slug)),
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
  for (const article of source.articles) {
    const name = (article.authorName || "").trim();
    if (!name && !article.authorId) continue;
    addAuthor(resolveAuthor(name, article.authorId, true), article);
  }
  for (const paper of source.papers) {
    const names = (paper.authorName || "").split(/,\s*/).map(n => n.trim()).filter(Boolean);
    for (const name of names) {
      addAuthor(resolveAuthor(name, paper.authorId, names.length === 1), paper);
    }
  }
  for (const [segment, time] of authorTimes) {
    entries.push({
      loc: `${SITE_URL}/authors/${encodeURIComponent(segment)}`,
      lastmod: iso(time),
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
