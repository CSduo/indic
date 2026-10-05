/**
 * Read-only queries behind the server-rendered listing pages (/, /archive,
 * /domains, /domains/:slug, /papers, /submit, /browse). Kept apart from the
 * page templates so the handlers can be tested with this module mocked.
 */
import { db, articlesTable, papersTable, categoriesTable, submissionsTable, usersTable } from "@workspace/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { makeAuthorResolver, singleAuthorPath, type AuthorUser } from "./author-identity";

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
      authorName: articlesTable.authorName,
      categorySlug: articlesTable.categorySlug,
      publishedAt: articlesTable.publishedAt,
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
      authorName: papersTable.authorName,
      categorySlug: papersTable.categorySlug,
      publishedAt: papersTable.publishedAt,
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

  const articles: WorkSummary[] = articleRows.map((row) => ({
    kind: "article",
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: plainText(row.excerpt) ?? plainText(row.subtitle),
    authorName: row.authorName ?? null,
    authorPath: singleAuthorPath({ kind: "article", authorName: row.authorName, authorId: row.authorId }, resolve),
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
    authorPath: singleAuthorPath({ kind: "paper", authorName: row.authorName, authorId: row.authorId }, resolve),
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
