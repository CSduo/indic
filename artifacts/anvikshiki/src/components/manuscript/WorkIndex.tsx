import { Link } from "wouter";
import {
  formatListedDate,
  listedAuthorHref,
  listedSummary,
  workHref,
  type ListedWork,
} from "@/lib/listedWorks";
import { cn } from "@/lib/utils";

export interface WorkIndexOptions {
  /** Link the author (left out on the author's own page). */
  author?: boolean;
  /** Link the domain (left out on the domain's own hub). */
  domain?: boolean;
  /** Show the work's description. */
  description?: boolean;
  /** Show the work's topic terms. */
  topics?: boolean;
}

/**
 * One listed work: its linked title, "By author · date · domain", its
 * description and, optionally, its topics. The client counterpart of
 * renderListedWork (api-server lib/listing-html.ts).
 */
export function WorkIndexEntry({
  work,
  domainNames,
  author = true,
  domain = true,
  description = true,
  topics = false,
}: { work: ListedWork; domainNames?: Map<string, string> } & WorkIndexOptions) {
  const authorLink = author && work.authorName ? listedAuthorHref(work) : null;
  const domainName = work.categorySlug ? domainNames?.get(work.categorySlug) : undefined;
  const date = formatListedDate(work.publishedAt);
  const summary = description ? listedSummary(work) : "";
  const terms = topics ? work.topics || [] : [];
  const meta = [
    author && work.authorName ? (
      <span key="author">
        By{" "}
        {authorLink ? (
          <Link href={authorLink} className="text-[var(--ink-soft)] hover:text-[var(--accent)]">{work.authorName}</Link>
        ) : (
          work.authorName
        )}
      </span>
    ) : null,
    date ? <time key="date" dateTime={work.publishedAt || undefined}>{date}</time> : null,
    domain && work.categorySlug && domainName ? (
      <Link key="domain" href={`/domains/${encodeURIComponent(work.categorySlug)}`} className="text-[var(--ink-soft)] hover:text-[var(--accent)]">
        {domainName}
      </Link>
    ) : null,
  ].filter(Boolean);

  return (
    <article>
      <h3 className="font-display text-xl leading-snug text-[var(--ink)] md:text-2xl">
        <Link href={workHref(work)} className="transition-colors hover:text-[var(--accent)]">{work.title}</Link>
      </h3>
      {meta.length > 0 && (
        <p className="mt-1.5 font-ui text-xs text-[var(--ink-faint)]">
          {meta.map((part, i) => (
            <span key={i}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              {part}
            </span>
          ))}
        </p>
      )}
      {summary && <p className="mt-2 font-body text-[0.95rem] leading-7 text-[var(--ink-soft)]">{summary}</p>}
      {terms.length > 0 && (
        <p className="mt-2 font-ui text-xs leading-5 text-[var(--ink-faint)]">
          <span className="mr-1.5 font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Topics</span>
          {terms.join(" · ")}
        </p>
      )}
    </article>
  );
}

/** A divided list of works, as on the archive, the domains and /about. */
export function WorkIndexList({
  works,
  domainNames,
  className,
  ...options
}: { works: ListedWork[]; domainNames?: Map<string, string>; className?: string } & WorkIndexOptions) {
  if (works.length === 0) return null;
  return (
    <ul className={cn("divide-y divide-[var(--border)]", className)}>
      {works.map((work) => (
        <li key={`${work.kind}-${work.id}`} className="py-5 first:pt-0 last:pb-0">
          <WorkIndexEntry work={work} domainNames={domainNames} {...options} />
        </li>
      ))}
    </ul>
  );
}
