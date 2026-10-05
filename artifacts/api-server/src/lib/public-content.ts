/**
 * Read-only queries behind the server-rendered listing pages (/, /archive,
 * /domains, /domains/:slug, /papers, /submit, /browse). Kept apart from the
 * page templates so the handlers can be tested with this module mocked.
 */
import { db, articlesTable, papersTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { slugify } from "./slug";

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
  readingMinutes: number | null;
  heroImageUrl: string | null;
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

/**
 * The author hub for a work: the submitting account's handle when it has one
 * (the canonical author URL, as in the sitemap), otherwise a slug of a single
 * author name. Works with several named authors get no single link.
 */
export function authorPathFor(authorName: string | null, handle: string | null): string | null {
  if (handle) return `/authors/${encodeURIComponent(handle)}`;
  const name = (authorName || "").trim();
  if (!name || /,|\s+and\s+/i.test(name)) return null;
  const segment = slugify(name);
  return segment ? `/authors/${encodeURIComponent(segment)}` : null;
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
  const [articleRows, paperRows] = await Promise.all([
    db.select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      excerpt: articlesTable.excerpt,
      subtitle: articlesTable.subtitle,
      authorName: articlesTable.authorName,
      categorySlug: articlesTable.categorySlug,
      publishedAt: articlesTable.publishedAt,
      readingMinutes: articlesTable.readingMinutes,
      heroImageUrl: articlesTable.heroImageUrl,
      handle: usersTable.handle,
      deletionRequestedAt: usersTable.deletionRequestedAt,
    })
      .from(articlesTable)
      .leftJoin(submissionsTable, eq(articlesTable.sourceSubmissionId, submissionsTable.id))
      .leftJoin(usersTable, eq(submissionsTable.userId, usersTable.id))
      .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)))
      .orderBy(sql`${articlesTable.publishedAt} desc nulls last`),
    db.select({
      id: papersTable.id,
      slug: papersTable.slug,
      title: papersTable.title,
      abstract: papersTable.abstract,
      authorName: papersTable.authorName,
      categorySlug: papersTable.categorySlug,
      publishedAt: papersTable.publishedAt,
      readingMinutes: papersTable.readingMinutes,
      coverImageUrl: papersTable.coverImageUrl,
      handle: usersTable.handle,
      deletionRequestedAt: usersTable.deletionRequestedAt,
    })
      .from(papersTable)
      .leftJoin(submissionsTable, eq(papersTable.sourceSubmissionId, submissionsTable.id))
      .leftJoin(usersTable, eq(submissionsTable.userId, usersTable.id))
      .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)))
      .orderBy(sql`${papersTable.publishedAt} desc nulls last`),
  ]);

  const liveHandle = (row: { handle: string | null; deletionRequestedAt: Date | null }) =>
    row.handle && !row.deletionRequestedAt ? row.handle : null;

  const articles: WorkSummary[] = articleRows.map((row) => ({
    kind: "article",
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: plainText(row.excerpt) ?? plainText(row.subtitle),
    authorName: row.authorName ?? null,
    authorPath: authorPathFor(row.authorName ?? null, liveHandle(row)),
    categorySlug: row.categorySlug ?? null,
    publishedAt: isoOrNull(row.publishedAt),
    readingMinutes: row.readingMinutes ?? null,
    heroImageUrl: row.heroImageUrl ?? null,
  }));
  const papers: WorkSummary[] = paperRows.map((row) => ({
    kind: "paper",
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: plainText(row.abstract),
    authorName: row.authorName ?? null,
    authorPath: authorPathFor(row.authorName ?? null, liveHandle(row)),
    categorySlug: row.categorySlug ?? null,
    publishedAt: isoOrNull(row.publishedAt),
    readingMinutes: row.readingMinutes ?? null,
    heroImageUrl: row.coverImageUrl ?? null,
  }));

  return { articles: sortNewestFirst(articles), papers: sortNewestFirst(papers) };
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
