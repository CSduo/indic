import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Search, X, Clock, Filter, History } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { AmbientPetals, FloralCorner, LotusRing } from "@/components/sacred/FloralDecor";
import { DOMAIN_ORDER } from "@/lib/domainMeta";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

// Highlight helper
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <strong key={i} className="font-bold text-[var(--gold)]">{part}</strong> : part
      )}
    </>
  );
}

export default function SearchPage() {
  const [loc] = useLocation();
  const initQ = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [query, setQuery] = useState(initQ);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Filters & Sorting
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevance");

  // Autocomplete & Recent
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("anv-recent-searches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const newRecent = [term, ...prev.filter(t => t !== term)].slice(0, 5);
      try { localStorage.setItem("anv-recent-searches", JSON.stringify(newRecent)); } catch {}
      return newRecent;
    });
  };

  const doSearch = useCallback(async (value: string, skipHistory = false) => {
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (!skipHistory) saveRecentSearch(value);
    
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    
    try {
      const response = await fetch(`${base()}/api/search?q=${encodeURIComponent(value)}&limit=50`);
      const data = await response.json();
      let combined = [
        ...(data.articles || []).map((article: any) => ({ ...article, kind: "article" })),
        ...(data.papers || []).map((paper: any) => ({ ...paper, kind: "paper" })),
      ];
      setResults(combined);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${base()}/api/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        const combined = [
          ...(data.articles || []).map((article: any) => ({ ...article, kind: "article" })),
          ...(data.papers || []).map((paper: any) => ({ ...paper, kind: "paper" })),
        ].slice(0, 5);
        setSuggestions(combined);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (initQ) doSearch(initQ, true);
  }, [initQ, doSearch]);

  // Click outside suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    doSearch(query);
  };

  // Filter and sort results
  const processedResults = results
    .filter(r => filterKind === "all" || r.kind === filterKind)
    .filter(r => {
      if (filterDomain === "all") return true;
      const d = r.categorySlug || r.categoryId || r.discipline;
      return d === filterDomain;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.date || b.publishedAt || 0).getTime() - new Date(a.date || a.publishedAt || 0).getTime();
      if (sortBy === "oldest") return new Date(a.date || a.publishedAt || 0).getTime() - new Date(b.date || b.publishedAt || 0).getTime();
      return 0; // relevance keeps original order
    });

  return (
    <div className="min-h-[80vh] bg-[var(--bg)]">
      <section className="relative border-b border-[var(--border-gold)] bg-[var(--bg-alt)] py-14 overflow-visible">
        <AmbientPetals />

        <div className="container-anv text-center relative z-20">
          <div className="mx-auto mb-5 relative w-20 h-20 flex items-center justify-center">
            <LotusRing size={80} spin className="absolute inset-0 opacity-70" />
            <Search size={26} className="relative text-[var(--gold)]" />
          </div>

          <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none text-[var(--ink)]">Search</h1>
          
          <OrnamentDivider variant="floral" className="my-7" />

          <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl relative" role="search" ref={searchContainerRef}>
            <div className="relative">

              <input
                id="search-input"
                type="search"
                className="input-sacred h-14 pr-12 text-lg transition-all pl-4"
                placeholder="Search essays, papers, authors…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoFocus
                autoComplete="off"
                aria-label="Search the journal"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setResults([]); setSearched(false); setShowSuggestions(false); setSuggestions([]); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--terracotta)] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (query.trim() || recentSearches.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-1)] border border-[var(--border-gold)] rounded shadow-xl text-left z-50 overflow-hidden">
                {!query.trim() && recentSearches.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-xs font-ui uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                      <Clock size={14} /> Recent Searches
                    </div>
                    {recentSearches.map(term => (
                      <button
                        key={term}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] text-[var(--ink)] transition-colors flex items-center gap-2"
                        onClick={() => {
                          setQuery(term);
                          doSearch(term);
                        }}
                      >
                        <History size={14} className="text-[var(--gold)] opacity-60" />
                        {term}
                      </button>
                    ))}
                  </div>
                )}
                {query.trim() && suggestions.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-xs font-ui uppercase tracking-wider text-[var(--muted)]">
                      Suggestions
                    </div>
                    {suggestions.map(s => {
                      const href = s.kind === "paper" ? `/papers/${s.slug || s.id}` : `/articles/${s.slug || s.id}`;
                      return (
                        <Link key={`${s.kind}-${s.id}`} href={href} onClick={() => setShowSuggestions(false)}>
                          <div className="block w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] text-[var(--ink)] transition-colors cursor-pointer">
                            <div className="font-medium line-clamp-1">
                              <HighlightText text={s.title} highlight={query} />
                            </div>
                            {s.authorName && <div className="text-xs text-[var(--muted)]">{s.authorName}</div>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
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
            description="Try different keywords, check your spelling, or browse all domains."
            action={<Link href="/browse"><div className="btn-ink cursor-pointer inline-flex">Browse Domains</div></Link>}
          />
        ) : results.length > 0 ? (
          <div>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="font-ui text-sm font-bold uppercase tracking-[0.14em] text-[var(--ink)]">
                Showing {processedResults.length} result{processedResults.length !== 1 ? "s" : ""} for "<span className="text-[var(--gold)]">{query}</span>"
              </div>
              
              <div className="flex flex-wrap items-center gap-3 font-ui text-sm">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-[var(--muted)]" />
                  <select 
                    className="bg-[var(--surface-1)] border border-[var(--border-gold)] rounded px-2 py-1 text-[var(--ink)] outline-none"
                    value={filterKind}
                    onChange={e => setFilterKind(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="article">Articles/Essays</option>
                    <option value="paper">Papers</option>
                  </select>
                </div>
                
                <select 
                  className="bg-[var(--surface-1)] border border-[var(--border-gold)] rounded px-2 py-1 text-[var(--ink)] outline-none"
                  value={filterDomain}
                  onChange={e => setFilterDomain(e.target.value)}
                >
                  <option value="all">All Domains</option>
                  {DOMAIN_ORDER.map(d => (
                    <option key={d} value={d}>{d.replace(/-/g, " ")}</option>
                  ))}
                </select>

                <select 
                  className="bg-[var(--surface-1)] border border-[var(--border-gold)] rounded px-2 py-1 text-[var(--ink)] outline-none"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>

            {processedResults.length === 0 ? (
              <div className="py-12 text-center text-[var(--muted)]">
                No results match the selected filters.
              </div>
            ) : (
              <div className="space-y-4">
                {processedResults.map((result) => {
                  const href = result.kind === "paper" ? `/papers/${result.slug || result.id}` : `/articles/${result.slug || result.id}`;
                  return (
                    <Link key={`${result.kind}-${result.id}`} href={href}>
                      <div className="block group cursor-pointer">
                        <ParchmentCard className="flex items-start gap-4 p-5 transition-colors group-hover:border-[var(--gold)]">
                          <div className="hidden text-[var(--gold)] sm:block opacity-70 group-hover:opacity-100 transition-opacity">
                            <AnimalGlyph domain={result.kind === "paper" ? "papers" : result.categorySlug || result.categoryId || "philosophy"} size={42} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className={result.kind === "paper" ? "badge badge-published" : "badge badge-received"}>{result.kind}</span>
                              <GlyphTag domain={result.categorySlug || result.categoryId || result.discipline || result.kind} />
                            </div>
                            <h2 className="font-display text-2xl leading-tight text-[var(--ink)] group-hover:text-[var(--terracotta)] transition-colors">
                              <HighlightText text={result.title} highlight={query} />
                            </h2>
                            {result.excerpt || result.abstract ? (
                              <p className="mt-2 line-clamp-2 font-body text-sm leading-6 text-[var(--ink-soft)]">
                                <HighlightText text={result.excerpt || result.abstract} highlight={query} />
                              </p>
                            ) : null}
                            {result.authorName ? <p className="mt-2 font-ui text-xs text-[var(--muted)]">{result.authorName}</p> : null}
                          </div>
                          <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0" />
                        </ParchmentCard>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="type-section-label mb-5">Popular Discoveries</p>
            <div className="flex flex-wrap justify-center gap-2">
              {DOMAIN_ORDER.slice(0, 9).map((domain) => (
                <Link key={domain} href={`/domains/${domain}`}>
                  <div className="glyph-tag hover:border-[var(--gold)] transition-colors cursor-pointer">
                    <AnimalGlyph domain={domain} size={16} />
                    <span className="capitalize">{domain.replace(/-/g, " ")}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
