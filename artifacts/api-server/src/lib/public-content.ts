/**
 * Read-only queries behind the server-rendered listing pages (/, /archive,
 * /domains, /domains/:slug, /papers, /submit, /browse). Kept apart from the
 * page templates so the handlers can be tested with this module mocked.
 */
import { db, articlesTable, papersTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { makeAuthorResolver, singleAuthorPath, type AuthorUser } from "./author-identity";
import { effectiveSeoDescription, effectiveTopics, type SeoWork, type WorkKind } from "./effective-seo";

export interface WorkSummary {
  kind: "article" | "paper";
  id: string;
  slug: string;
  title: string;
  /** The article excerpt or paper abstract, as plain text. */
  excerpt: string | null;
  authorName: string | null;
  /** The canonical author hub path, or null when there is no single author. */
  authorPath: string | null;
  categorySlug: string | null;
  publishedAt: string | null;
  /** When the work last changed: its updatedAt, else its publication date. */
  updatedAt: string | null;
  readingMinutes: number | null;
  heroImageUrl: string | null;
  /**
   * The work's own meta description (lib/effective-seo.ts), so every listing
   * describes a work exactly as its page and search results do.
   */
  description: string;
  /** The work's topic terms, the same ones its page shows. */
  topics: string[];
}

export interface CategorySummary {
  slug: string;
  name: string;
  description: string | null;
  articleCount: number;
  paperCount: number;
}

export interface PublishedWorks {
  articles: WorkSummary[];
  papers: WorkSummary[];
}

function plainText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function isoOrNull(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/*
  Deriving a description and topic terms from a long body takes tens of
  milliseconds, and every listing page needs them for every work. They are
  remembered per version of a work: the key holds its id, updatedAt (which
  every edit sets) and the fields they are derived from, so an edit is a new
  key and nothing stale is ever served. Bounded, oldest entry first out.
*/
const LISTING_SEO_CACHE_MAX = 2000;
const listingSeoCache = new Map<string, { description: string; topics: string[] }>();

function listingSeoKey(work: SeoWork & { id?: unknown; updatedAt?: unknown }, kind: WorkKind): string | null {
  const updated = isoOrNull(work.updatedAt);
  if (typeof work.id !== "string" || !updated) return null;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return [
    kind,
    work.id,
    updated,
    text(work.slug),
    text(work.title),
    text(work.subtitle),
    text(work.seoTitle),
    text(work.seoDescription),
    Array.isArray(work.tags) ? work.tags.join("\u0001") : "",
    text(work.excerpt ?? work.abstract),
    text(work.body).length,
  ].join("\u0000");
}

/**
 * The description and topic terms a listing shows for a work: the effective
 * values its own page uses (stored, else editorial, else derived from its text).
 */
export function listingSeo(work: SeoWork & { id?: unknown; updatedAt?: unknown }, kind: WorkKind): { description: string; topics: string[] } {
  const key = listingSeoKey(work, kind);
  let value = key ? listingSeoCache.get(key) : undefined;
  if (!value) {
    value = { description: effectiveSeoDescription(work, kind), topics: effectiveTopics(work) };
    if (key) {
      listingSeoCache.set(key, value);
      if (listingSeoCache.size > LISTING_SEO_CACHE_MAX) listingSeoCache.delete(listingSeoCache.keys().next().value as string);
    }
  }
  return { description: value.description, topics: [...value.topics] };
}

/**
 * Every account that can be named as an author (accounts awaiting deletion are
 * left out), for lib/author-identity.ts.
 */
export async function loadAuthorUsers(): Promise<AuthorUser[]> {
  return db
    .select({ id: usersTable.id, handle: usersTable.handle, name: usersTable.name })
    .from(usersTable)
    .where(isNull(usersTable.deletionRequestedAt));
}

/** Newest first; works without a publication date go last. */
export function sortNewestFirst<T extends { publishedAt: string | null; id: string }>(works: T[]): T[] {
  return [...works].sort((a, b) => {
    const timeA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const timeB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    if (timeB !== timeA) return timeB - timeA;
    return a.id.localeCompare(b.id);
  });
}

/** Every published, non-deleted article and paper, newest first. */
export async function listPublishedWorks(): Promise<PublishedWorks> {
  const [articleRows, paperRows, users] = await Promise.all([
    db.select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      excerpt: articlesTable.excerpt,
      subtitle: articlesTable.subtitle,
      // Only read to derive the description and topics; never sent on.
      body: articlesTable.body,
      tags: articlesTable.tags,
      seoTitle: articlesTable.seoTitle,
      seoDescription: articlesTable.seoDescription,
      authorName: articlesTable.authorName,
      categorySlug: articlesTable.categorySlug,
      publishedAt: articlesTable.publishedAt,
      updatedAt: articlesTable.updatedAt,
      readingMinutes: articlesTable.readingMinutes,
      heroImageUrl: articlesTable.heroImageUrl,
      authorId: submissionsTable.userId,
    })
      .from(articlesTable)
      .leftJoin(submissionsTable, eq(articlesTable.sourceSubmissionId, submissionsTable.id))
      .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)))
      .orderBy(sql`${articlesTable.publishedAt} desc nulls last`),
    db.select({
      id: papersTable.id,
      slug: papersTable.slug,
      title: papersTable.title,
      abstract: papersTable.abstract,
      body: papersTable.body,
      tags: papersTable.tags,
      seoTitle: papersTable.seoTitle,
      seoDescription: papersTable.seoDescription,
      authorName: papersTable.authorName,
      categorySlug: papersTable.categorySlug,
      publishedAt: papersTable.publishedAt,
      updatedAt: papersTable.updatedAt,
      readingMinutes: papersTable.readingMinutes,
      coverImageUrl: papersTable.coverImageUrl,
      authorId: submissionsTable.userId,
    })
      .from(papersTable)
      .leftJoin(submissionsTable, eq(papersTable.sourceSubmissionId, submissionsTable.id))
      .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)))
      .orderBy(sql`${papersTable.publishedAt} desc nulls last`),
    loadAuthorUsers(),
  ]);

  // Author links use the same canonical segment as the sitemap and the
  // /authors/:slug route.
  const resolve = makeAuthorResolver(users);
  const articles = articleRows.map((row) => toWorkSummary({ ...row, kind: "article" }, resolve));
  const papers = paperRows.map((row) => toWorkSummary({ ...row, kind: "paper" }, resolve));
  return { articles: sortNewestFirst(articles), papers: sortNewestFirst(papers) };
}

/** The columns of a published article or paper a listing is built from. */
export type ListingRow = SeoWork & {
  kind: "article" | "paper";
  id: string;
  slug: string;
  title: string;
  authorName?: string | null;
  categorySlug?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  readingMinutes?: number | null;
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  /** The account that submitted the work, when it came through a submission. */
  authorId?: string | null;
};

/** One published work as every listing shows it. */
export function toWorkSummary(row: ListingRow, resolve: ReturnType<typeof makeAuthorResolver>): WorkSummary {
  const isPaper = row.kind === "paper";
  return {
    kind: row.kind,
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: isPaper ? plainText(row.abstract) : plainText(row.excerpt) ?? plainText(row.subtitle),
    authorName: row.authorName ?? null,
    authorPath: singleAuthorPath({ kind: row.kind, authorName: row.authorName, authorId: row.authorId }, resolve),
    categorySlug: row.categorySlug ?? null,
    publishedAt: isoOrNull(row.publishedAt),
    updatedAt: isoOrNull(row.updatedAt) ?? isoOrNull(row.publishedAt),
    readingMinutes: row.readingMinutes ?? null,
    heroImageUrl: (isPaper ? row.coverImageUrl : row.heroImageUrl) ?? null,
    ...listingSeo(row, row.kind),
  };
}

/** The category with this slug, visible or not; null when there is none. */
export async function findCategory(slug: string): Promise<{ slug: string; name: string; description: string | null } | null> {
  const [row] = await db
    .select({ slug: categoriesTable.slug, name: categoriesTable.name, description: categoriesTable.description })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);
  return row ? { slug: row.slug, name: row.name, description: row.description ?? null } : null;
}

/**
 * Whether at least one paper is published. It only decides whether the site
 * nav links to /papers, so a failed query counts as "no papers".
 */
export async function hasPublishedPapers(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(papersTable)
      .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)));
    return Number(row?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Visible categories in display order, without counts. */
export async function listVisibleCategories(): Promise<Array<{ slug: string; name: string; description: string | null }>> {
  const rows = await db
    .select({ slug: categoriesTable.slug, name: categoriesTable.name, description: categoriesTable.description })
    .from(categoriesTable)
    .where(eq(categoriesTable.visible, true))
    .orderBy(asc(categoriesTable.sortOrder));
  return rows.map((row) => ({ slug: row.slug, name: row.name, description: row.description ?? null }));
}

/**
 * Work counts per category. A work counts toward the hub whose slug equals its
 * category slug, which is exactly what /domains/:slug lists.
 */
export function withWorkCounts(
  categories: Array<{ slug: string; name: string; description: string | null }>,
  works: PublishedWorks,
): CategorySummary[] {
  const count = (list: WorkSummary[], slug: string) => list.filter((w) => w.categorySlug === slug).length;
  return categories.map((category) => ({
    ...category,
    articleCount: count(works.articles, category.slug),
    paperCount: count(works.papers, category.slug),
  }));
}
