import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Search, X } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { AmbientPetals, FloralCorner, LotusRing } from "@/components/sacred/FloralDecor";
import { DOMAIN_ORDER } from "@/lib/domainMeta";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SearchPage() {
  const [loc] = useLocation();
  const initQ = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [query, setQuery] = useState(initQ);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const response = await fetch(`${base()}/api/search?q=${encodeURIComponent(value)}&limit=20`);
      const data = await response.json();
      setResults([
        ...(data.articles || []).map((article: any) => ({ ...article, kind: "essay" })),
        ...(data.papers || []).map((paper: any) => ({ ...paper, kind: "paper" })),
      ]);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initQ) doSearch(initQ);
  }, [initQ, doSearch, loc]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    doSearch(query);
  };

  return (
    <div className="min-h-[80vh] bg-[var(--bg)]">
      <section className="relative border-b border-[var(--border-gold)] bg-[var(--bg-alt)] py-14 overflow-hidden">
        {/* Ambient floating petals */}
        <AmbientPetals />

        {/* Corner ornaments */}
        <FloralCorner position="tl" size={80} className="absolute top-0 left-0 opacity-60" />
        <FloralCorner position="tr" size={80} className="absolute top-0 right-0 opacity-60" />

        <div className="container-anv text-center relative z-10">
          {/* Lotus ring icon */}
          <div className="mx-auto mb-5 relative w-20 h-20 flex items-center justify-center">
            <LotusRing size={80} spin className="absolute inset-0 opacity-70" />
            <Search size={26} className="relative text-[var(--gold)]" />
          </div>

          <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none text-[var(--ink)]">Search</h1>
          <p className="mx-auto mt-3 max-w-xl font-display text-2xl text-[var(--terracotta)] italic">
            Discover ideas across the archive.
          </p>

          <OrnamentDivider variant="floral" className="my-7" />

          <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl" role="search">
            <div className="relative">
              {/* Search icon only visible when input is empty */}
              {!query && (
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gold)] pointer-events-none"
                  aria-hidden="true"
                />
              )}
              <input
                type="search"
                className={`input-sacred h-14 pr-12 text-lg transition-all ${query ? "pl-4" : "pl-12"}`}
                placeholder="Search essays, papers, authors…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                aria-label="Search the journal"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--terracotta)] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
            <button type="submit" className="btn-terracotta mt-3 w-full justify-center">Search</button>
          </form>
        </div>
      </section>

      <section className="container-anv max-w-4xl pb-16 pt-10">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-9 w-9 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Searching" />
          </div>
        ) : searched && results.length === 0 ? (
          <EmptyState
            title={`No results for "${query}"`}
            description="Try different keywords or browse all domains."
            action={<Link href="/browse" className="btn-ink">Browse Domains</Link>}
          />
        ) : results.length > 0 ? (
          <div>
            <div className="mb-5 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
            </div>
            <div className="space-y-3">
              {results.map((result) => {
                const href = result.kind === "paper" ? `/papers/${result.slug || result.id}` : `/articles/${result.slug || result.id}`;
                return (
                  <Link key={`${result.kind}-${result.id}`} href={href}>
                    <ParchmentCard className="flex items-start gap-4 p-5">
                      <div className="hidden text-[var(--gold)] sm:block">
                        <AnimalGlyph domain={result.kind === "paper" ? "papers" : result.categorySlug || result.categoryId || "philosophy"} size={42} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className={result.kind === "paper" ? "badge badge-published" : "badge badge-received"}>{result.kind}</span>
                          <GlyphTag domain={result.categorySlug || result.categoryId || result.discipline || result.kind} />
                        </div>
                        <h2 className="font-display text-2xl leading-tight text-[var(--ink)]">{result.title}</h2>
                        {result.excerpt || result.abstract ? <p className="mt-2 line-clamp-2 font-body text-sm leading-6 text-[var(--ink-soft)]">{result.excerpt || result.abstract}</p> : null}
                        {result.authorName ? <p className="mt-2 font-ui text-xs text-[var(--muted)]">{result.authorName}</p> : null}
                      </div>
                      <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--gold)]" />
                    </ParchmentCard>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="type-section-label mb-5">Popular Discoveries</p>
            <div className="flex flex-wrap justify-center gap-2">
              {DOMAIN_ORDER.slice(0, 9).map((domain) => (
                <Link key={domain} href={`/domains/${domain}`} className="glyph-tag">
                  <AnimalGlyph domain={domain} size={16} />
                  <span>{domain.replace(/-/g, " ")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
