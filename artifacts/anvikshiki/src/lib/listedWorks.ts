/*
  A published work as the listing pages show it: the archive, the domains
  page and each domain hub, author pages, /about and the related works under
  an essay. The server renders the same fields (api-server lib/public-content.ts
  WorkSummary) into the HTML and the __INITIAL_DATA__ block, and the list
  endpoints (/api/articles, /api/papers, /api/categories/:slug) send
  `description` and `topics` too, so a listing reads the same however it was
  reached.
*/
import { authorHref } from "@/lib/authorPath";

export interface ListedWork {
  kind: "article" | "paper";
  id: string;
  slug: string;
  title: string;
  /** The work's own meta description: what its page and search results show. */
  description?: string | null;
  excerpt?: string | null;
  topics?: string[];
  authorName?: string | null;
  /** The canonical author page, when the server resolved one. */
  authorPath?: string | null;
  authorHandle?: string | null;
  categorySlug?: string | null;
  publishedAt?: string | null;
  readingMinutes?: number | null;
  heroImageUrl?: string | null;
}

export function workHref(work: Pick<ListedWork, "kind" | "slug">): string {
  return `/${work.kind === "paper" ? "papers" : "articles"}/${encodeURIComponent(work.slug)}`;
}

/** The author page a listed work links to, by the server's rule. */
export function listedAuthorHref(work: ListedWork): string | null {
  return work.authorPath || authorHref(work);
}

/** What a listing says about a work: its description, else its own summary. */
export function listedSummary(work: ListedWork): string {
  return (work.description || work.excerpt || "").trim();
}

/** The same date the server prints: "15 August 2026". */
export function formatListedDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

/** Works grouped by year of publication, newest year first; undated works last. */
export function groupByYear<T extends Pick<ListedWork, "publishedAt">>(works: T[]): Array<{ year: number | null; works: T[] }> {
  const groups = new Map<number | null, T[]>();
  for (const work of works) {
    const time = work.publishedAt ? Date.parse(work.publishedAt) : NaN;
    const year = Number.isNaN(time) ? null : new Date(time).getUTCFullYear();
    const list = groups.get(year);
    if (list) list.push(work);
    else groups.set(year, [work]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, list]) => ({ year, works: list }));
}

/** Newest first; works without a publication date go last. */
export function newestFirst<T extends Pick<ListedWork, "publishedAt">>(works: T[]): T[] {
  return [...works].sort((a, b) => (Date.parse(b.publishedAt || "") || 0) - (Date.parse(a.publishedAt || "") || 0));
}

/** A work from /api/articles or /api/papers in the listing shape. */
export function listedFromApi(row: any, kind: "article" | "paper"): ListedWork {
  return {
    kind,
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title || ""),
    description: typeof row.description === "string" ? row.description : null,
    excerpt: (kind === "paper" ? row.abstract : row.excerpt || row.subtitle) || null,
    topics: Array.isArray(row.topics) ? row.topics : [],
    authorName: row.authorName || null,
    authorHandle: row.authorHandle || null,
    categorySlug: row.categorySlug || null,
    publishedAt: row.publishedAt || row.createdAt || null,
    readingMinutes: typeof row.readingMinutes === "number" ? row.readingMinutes : null,
    heroImageUrl: (kind === "paper" ? row.coverImageUrl : row.heroImageUrl) || null,
  };
}

/** The most rows /api/articles and /api/papers return a request (parsePagination's maxLimit). */
const LIST_PAGE_SIZE = 50;

/**
 * Every row of a paged list endpoint ("/api/articles", key "articles"), read
 * a page at a time: one request returns at most LIST_PAGE_SIZE rows.
 */
export async function fetchAllRows(path: string, key: string, init?: RequestInit): Promise<any[]> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const rows: any[] = [];
  for (;;) {
    const response = await fetch(`${base}${path}${path.includes("?") ? "&" : "?"}limit=${LIST_PAGE_SIZE}&offset=${rows.length}`, init);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const page = await response.json();
    const batch: any[] = Array.isArray(page?.[key]) ? page[key] : [];
    rows.push(...batch);
    if (batch.length < LIST_PAGE_SIZE || rows.length >= Number(page?.total ?? 0)) return rows;
  }
}

/**
 * Every published article and paper from the list endpoints, newest first;
 * null when either request fails, so a caller can keep what it shows.
 */
export async function fetchListedWorks(signal?: AbortSignal): Promise<ListedWork[] | null> {
  try {
    const [articles, papers] = await Promise.all([
      fetchAllRows("/api/articles", "articles", { signal }),
      fetchAllRows("/api/papers", "papers", { signal }),
    ]);
    return newestFirst([
      ...articles.map((row) => listedFromApi(row, "article")),
      ...papers.map((row) => listedFromApi(row, "paper")),
    ]);
  } catch {
    return null;
  }
}
