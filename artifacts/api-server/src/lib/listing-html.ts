/**
 * Server-rendered lists of published work, shared by the home page, the
 * archive, domain hubs, author pages, /about and the related works under each
 * work. Every entry links the work by its title and describes it with its own
 * meta description (lib/effective-seo.ts), so a listing never says something
 * the work's page does not.
 */
import { escapeHtml, formatDate, formatIsoDate } from "./ssr-html";
import type { WorkSummary } from "./public-content";
import { groupByYear } from "./hub-content";

export function workPath(work: Pick<WorkSummary, "kind" | "slug">): string {
  return `/${work.kind === "paper" ? "papers" : "articles"}/${encodeURIComponent(work.slug)}`;
}

export interface ListedWorkOptions {
  /** Link the author (left out on the author's own page). Default true. */
  author?: boolean;
  /** Link the domain (left out on the domain's own hub). Default true. */
  domain?: boolean;
  /** Show the topic terms. Default false. */
  topics?: boolean;
}

/** One work: linked title, "By author · date · domain", its description and, optionally, its topics. */
export function renderListedWork(
  work: WorkSummary,
  categoryNames: Map<string, string>,
  options: ListedWorkOptions = {},
): string {
  const { author = true, domain = true, topics = false } = options;
  const iso = formatIsoDate(work.publishedAt);
  const byline = author && work.authorName
    ? work.authorPath
      ? `By <a href="${escapeHtml(work.authorPath)}">${escapeHtml(work.authorName)}</a>`
      : `By ${escapeHtml(work.authorName)}`
    : "";
  const categoryName = work.categorySlug ? categoryNames.get(work.categorySlug) : undefined;
  const domainLink = domain && work.categorySlug && categoryName
    ? `<a href="/domains/${escapeHtml(encodeURIComponent(work.categorySlug))}">${escapeHtml(categoryName)}</a>`
    : "";
  const meta = [
    byline,
    iso ? `<time datetime="${iso}">${escapeHtml(formatDate(work.publishedAt))}</time>` : "",
    domainLink,
  ].filter(Boolean).join(" · ");
  const description = work.description || work.excerpt || "";
  const topicList = topics && work.topics.length > 0
    ? `<p class="ssr-work-topics"><span class="ssr-topics-label">Topics</span> ${work.topics.map(escapeHtml).join(" · ")}</p>`
    : "";
  return `<li class="ssr-work-item">
      <article>
        <h3><a href="${workPath(work)}">${escapeHtml(work.title)}</a></h3>
        ${meta ? `<p class="ssr-byline">${meta}</p>` : ""}
        ${description ? `<p class="ssr-work-excerpt">${escapeHtml(description)}</p>` : ""}
        ${topicList}
      </article>
    </li>`;
}

export function renderListedWorks(
  works: WorkSummary[],
  categoryNames: Map<string, string>,
  options: ListedWorkOptions = {},
): string {
  return `<ul class="ssr-work-list">
    ${works.map((work) => renderListedWork(work, categoryNames, options)).join("\n    ")}
  </ul>`;
}

/** Works under one H2 per year of publication, newest year first. */
export function renderWorksByYear(
  works: WorkSummary[],
  categoryNames: Map<string, string>,
  options: ListedWorkOptions = {},
): string {
  return groupByYear(works).map(({ year, works: list }) => {
    const id = year === null ? "undated" : `year-${year}`;
    return `<section class="ssr-section ssr-year" aria-labelledby="${id}">
    <h2 id="${id}">${year === null ? "Undated" : year}</h2>
    ${renderListedWorks(list, categoryNames, options)}
  </section>`;
  }).join("\n  ");
}

/**
 * The links that close a work's page: related works to read next, the
 * domain's hub when it is substantial enough to be indexed, and the archive.
 */
export function renderContinueReading(
  related: WorkSummary[],
  categoryNames: Map<string, string>,
  hub: { slug: string; name: string } | null,
): string {
  const links = [
    hub ? `<a href="/domains/${escapeHtml(encodeURIComponent(hub.slug))}">More in ${escapeHtml(hub.name)}</a>` : "",
    `<a href="/archive">Every essay in the archive</a>`,
  ].filter(Boolean).join(" · ");
  return `<nav class="ssr-section ssr-related" aria-labelledby="related-heading">
    <h2 id="related-heading">Related essays</h2>
    ${related.length > 0 ? renderListedWorks(related, categoryNames) : ""}
    <p class="ssr-related-links">${links}</p>
  </nav>`;
}
