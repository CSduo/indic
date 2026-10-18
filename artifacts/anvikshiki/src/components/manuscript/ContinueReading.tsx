import { Link } from "wouter";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { formatListedDate, listedSummary, workHref, type ListedWork } from "@/lib/listedWorks";

/** Sent with a work by the server (api-server lib/continue-reading.ts). */
export interface ContinueReadingData {
  related: ListedWork[];
  /** The work's domain hub, only once it holds enough work to be indexed. */
  hub: { slug: string; name: string } | null;
}

/**
 * The links that close a work's page: related works (sharing its domain or
 * topics), the domain hub when it is indexed, and the archive. The client
 * counterpart of renderContinueReading (api-server lib/listing-html.ts).
 */
export function ContinueReading({ data, heading = "Related Essays" }: { data: ContinueReadingData | null | undefined; heading?: string }) {
  const related = data?.related ?? [];
  return (
    <nav aria-label={heading} className="mt-16 border-t border-[var(--border)] pt-12">
      {related.length > 0 && (
        <>
          <h2 className="font-display text-2xl text-[var(--ink)] mb-6 text-center">{heading}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((rel) => (
              <ParchmentCard key={`${rel.kind}-${rel.id}`} className="p-5 flex flex-col h-full hover:-translate-y-1 transition-transform">
                <Link href={workHref(rel)} className="block">
                  {rel.heroImageUrl ? (
                    <div className="h-32 mb-4 rounded overflow-hidden">
                      <img src={rel.heroImageUrl} alt={rel.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : null}
                  <h3 className="font-display text-lg leading-snug mb-2 text-[var(--ink)]">{rel.title}</h3>
                  {listedSummary(rel) && <p className="font-body text-sm leading-6 text-[var(--ink-soft)] mb-3">{listedSummary(rel)}</p>}
                  {rel.authorName && (
                    <p className="font-ui text-[10px] uppercase text-[var(--ink-faint)]">
                      By {rel.authorName}
                      {rel.publishedAt ? <> · <time dateTime={rel.publishedAt}>{formatListedDate(rel.publishedAt)}</time></> : null}
                    </p>
                  )}
                </Link>
              </ParchmentCard>
            ))}
          </div>
        </>
      )}
      <p className={`font-ui text-sm text-center ${related.length > 0 ? "mt-8" : ""}`}>
        {data?.hub && (
          <>
            <Link href={`/domains/${encodeURIComponent(data.hub.slug)}`} className="text-[var(--accent)] hover:underline">
              More in {data.hub.name}
            </Link>
            <span aria-hidden="true" className="text-[var(--ink-faint)]"> · </span>
          </>
        )}
        <Link href="/archive" className="text-[var(--accent)] hover:underline">Every essay in the archive</Link>
      </p>
    </nav>
  );
}
