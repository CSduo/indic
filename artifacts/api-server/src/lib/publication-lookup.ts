/**
 * Read-only lookups behind /articles/:slug, /papers/:slug and /authors/:slug.
 * Kept apart from the route handlers so the routing rules can be tested with
 * this module mocked.
 */
import { db, articlesTable, papersTable, submissionsTable, usersTable } from "@workspace/db";
import { and, eq, isNull, like, or } from "drizzle-orm";

export type PublicationKind = "article" | "paper";

const tableFor = (kind: PublicationKind) => (kind === "paper" ? papersTable : articlesTable);

/** The row whose slug is exactly `slug`, whatever its status. */
export async function findPublicationBySlug(kind: PublicationKind, slug: string): Promise<any | null> {
  const table = tableFor(kind);
  const [row] = await db.select().from(table).where(eq(table.slug, slug)).limit(1);
  return row ?? null;
}

/** The account that submitted a work, from its source submission. */
export async function findSubmissionOwner(sourceSubmissionId: string | null | undefined): Promise<string | null> {
  if (!sourceSubmissionId) return null;
  const [row] = await db
    .select({ userId: submissionsTable.userId })
    .from(submissionsTable)
    .where(eq(submissionsTable.id, sourceSubmissionId))
    .limit(1);
  return row?.userId ?? null;
}

/** A trailing "-" plus 4–8 hex characters, as appended to de-duplicated slugs. */
export const HASH_SUFFIX = /-[a-f0-9]{4,8}$/;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Pure choice behind findPublishedSlugRedirect, given the published slugs that
 * equal or extend the request's base (the request without a hash suffix).
 * Only an unambiguous match counts:
 *
 * - the one slug that starts with "<requested>-" (an older, shorter slug, or
 *   the slug before a hash suffix was added), or
 * - when the request carries a hash suffix, the slug without it, or the one
 *   slug that starts with "<requested without suffix>-" (a different suffix).
 */
export function pickSlugRedirect(requested: string, candidates: string[]): string | null {
  const slug = requested.trim();
  if (!slug) return null;
  const others = [...new Set(candidates)].filter((candidate) => candidate && candidate !== slug);

  const extended = others.filter((candidate) => candidate.startsWith(`${slug}-`));
  if (extended.length === 1) return extended[0];
  if (extended.length > 1) return null;

  if (HASH_SUFFIX.test(slug)) {
    const base = slug.replace(HASH_SUFFIX, "");
    if (!base) return null;
    if (others.includes(base)) return base;
    const variants = others.filter((candidate) => candidate.startsWith(`${base}-`));
    if (variants.length === 1) return variants[0];
  }
  return null;
}

/** Enough rows to tell "one match" from "several"; slugs are unique. */
const REDIRECT_CANDIDATE_LIMIT = 50;

/**
 * The slug a missing /articles/<requested> (or /papers/<requested>) URL should
 * permanently redirect to, or null for a real 404 (see pickSlugRedirect).
 * Only published, non-deleted works are candidates.
 */
export async function findPublishedSlugRedirect(kind: PublicationKind, requested: string): Promise<string | null> {
  const slug = requested.trim();
  if (!slug) return null;
  const base = HASH_SUFFIX.test(slug) ? slug.replace(HASH_SUFFIX, "") : slug;
  if (!base) return null;

  const table = tableFor(kind);
  const rows = await db
    .select({ slug: table.slug })
    .from(table)
    .where(and(
      or(eq(table.slug, base), like(table.slug, `${escapeLike(base)}-%`)),
      eq(table.status, "PUBLISHED"),
      isNull(table.deletedAt),
    ))
    .limit(REDIRECT_CANDIDATE_LIMIT);
  return pickSlugRedirect(slug, rows.map((row: { slug: string }) => row.slug));
}

export interface AuthorHubArticle {
  kind: "article";
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  categorySlug: string | null;
  authorName: string | null;
  readingMinutes: number | null;
  heroImageUrl: string | null;
  publishedAt: Date | string | null;
  authorId: string | null;
}

export interface AuthorHubPaper {
  kind: "paper";
  id: string;
  slug: string;
  title: string;
  abstract: string | null;
  categorySlug: string | null;
  authorName: string | null;
  readingMinutes: number | null;
  coverImageUrl: string | null;
  publishedAt: Date | string | null;
  year: number | null;
  doi: string | null;
  authorId: string | null;
}

/** Every published, non-deleted work with the account that submitted it. */
export async function listAuthorHubWorks(): Promise<{ articles: AuthorHubArticle[]; papers: AuthorHubPaper[] }> {
  const [articles, papers] = await Promise.all([
    db.select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      subtitle: articlesTable.subtitle,
      excerpt: articlesTable.excerpt,
      categorySlug: articlesTable.categorySlug,
      authorName: articlesTable.authorName,
      readingMinutes: articlesTable.readingMinutes,
      heroImageUrl: articlesTable.heroImageUrl,
      publishedAt: articlesTable.publishedAt,
      authorId: submissionsTable.userId,
    }).from(articlesTable)
      .leftJoin(submissionsTable, eq(articlesTable.sourceSubmissionId, submissionsTable.id))
      .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt))),
    db.select({
      id: papersTable.id,
      slug: papersTable.slug,
      title: papersTable.title,
      abstract: papersTable.abstract,
      categorySlug: papersTable.categorySlug,
      authorName: papersTable.authorName,
      readingMinutes: papersTable.readingMinutes,
      coverImageUrl: papersTable.coverImageUrl,
      publishedAt: papersTable.publishedAt,
      year: papersTable.year,
      doi: papersTable.doi,
      authorId: submissionsTable.userId,
    }).from(papersTable)
      .leftJoin(submissionsTable, eq(papersTable.sourceSubmissionId, submissionsTable.id))
      .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt))),
  ]);
  return {
    articles: articles.map((row: any) => ({ kind: "article" as const, ...row })),
    papers: papers.map((row: any) => ({ kind: "paper" as const, ...row })),
  };
}

export interface AuthorProfileFields {
  bio: string | null;
  institution: string | null;
  avatarUrl: string | null;
}

/** The public profile fields shown on an author page (no contact details). */
export async function findAuthorProfile(userId: string): Promise<AuthorProfileFields | null> {
  const [row] = await db
    .select({ bio: usersTable.bio, institution: usersTable.institution, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return row ?? null;
}
