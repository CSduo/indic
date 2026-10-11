import { Link } from "wouter";
import { doiUrl, type WorkReference } from "@/lib/references";

/** "Title." — a closing period unless the text already ends in punctuation. */
function endsSentence(text: string): boolean {
  return /[.!?…]["'”’)\]]*$/u.test(text);
}

function ReferenceItem({ reference, index }: { reference: WorkReference; index: number }) {
  const title = reference.url ? (
    <a
      href={reference.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--ink)] underline decoration-[var(--gold)] decoration-1 underline-offset-[3px] hover:decoration-2"
    >
      {reference.title}
    </a>
  ) : (
    reference.title
  );

  return (
    <li id={`ref-${index + 1}`} className="relative border-t border-[var(--border)] py-3.5 pl-10 first:border-t-0 first:pt-1">
      <span
        aria-hidden="true"
        className="absolute left-0 top-3.5 grid h-7 w-7 place-items-center rounded-full border border-[var(--gold)] font-ui text-[11px] font-bold text-[var(--ink-soft)] [li:first-child>&]:top-1"
      >
        {index + 1}
      </span>
      <p className="font-body text-[0.95rem] leading-relaxed text-[var(--ink-soft)] [overflow-wrap:anywhere]">
        {reference.authors ? (
          <>
            <span className="font-semibold text-[var(--ink)]">{reference.authors}</span>
            {reference.year ? <> ({reference.year}).</> : endsSentence(reference.authors) ? null : "."}{" "}
            <cite className="not-italic text-[var(--ink)]">{title}</cite>
            {endsSentence(reference.title) ? null : "."}
          </>
        ) : (
          <>
            <cite className="not-italic text-[var(--ink)]">{title}</cite>
            {reference.year ? <> ({reference.year}).</> : endsSentence(reference.title) ? null : "."}
          </>
        )}
        {reference.publisher ? (
          <>
            {" "}
            <em>{reference.publisher}</em>
            {endsSentence(reference.publisher) ? null : "."}
          </>
        ) : null}
        {reference.doi ? (
          <>
            {" "}
            <a
              href={doiUrl(reference.doi)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--ink)] underline decoration-[var(--gold)] decoration-1 underline-offset-[3px] hover:decoration-2"
            >
              doi:{reference.doi}
            </a>
          </>
        ) : null}
      </p>
      {reference.note ? <p className="mt-1 font-body text-sm leading-relaxed text-[var(--ink-faint)]">{reference.note}</p> : null}
    </li>
  );
}

/**
 * "References & Sources" at the end of an article or paper: an optional
 * editor's note, then the numbered sources. Renders nothing when there are
 * neither. Mirrors the server-rendered section (renderReferences in
 * api-server/src/lib/ssr-html.ts) so the page reads the same before and after
 * the app takes over.
 */
export function ReferencesSection({ references, note }: { references: WorkReference[]; note?: string | null }) {
  if (references.length === 0 && !note) return null;
  return (
    <section id="references" aria-labelledby="references-heading" className="mt-12">
      <div
        className="card-sacred rounded-lg p-5 sm:p-6"
        style={{ background: "var(--surface-2)", borderTop: "3px solid var(--gold)" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--gold)]" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <h2 id="references-heading" className="font-display text-2xl text-[var(--ink)]">References &amp; Sources</h2>
        </div>
        {note ? (
          <p className="mb-4 border-l-2 border-[var(--gold)] pl-3.5 font-body text-[0.92rem] italic leading-relaxed text-[var(--ink-soft)]">
            {note}
          </p>
        ) : null}
        {references.length > 0 ? (
          <ol className="m-0 list-none p-0">
            {references.map((reference, index) => (
              <ReferenceItem key={`${index}-${reference.title}`} reference={reference} index={index} />
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

/** The Topics row: the same terms the page declares in its metadata, each a search link. */
export function TopicsRow({ topics, label = "Topics" }: { topics: string[]; label?: string }) {
  if (topics.length === 0) return null;
  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--ink-faint)]">{label}</span>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {topics.map(topic => (
          <li key={topic}>
            <Link
              href={`/search?q=${encodeURIComponent(topic)}`}
              rel="nofollow"
              className="inline-block rounded-full border border-[var(--border-gold)] px-3 py-1 font-ui text-xs text-[var(--ink-soft)] transition-colors hover:border-[var(--gold)] hover:text-[var(--ink)]"
            >
              {topic}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
