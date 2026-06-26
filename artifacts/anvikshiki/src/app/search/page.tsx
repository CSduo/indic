import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Search, ArrowRight, X } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SearchPage() {
  const [loc] = useLocation();
  const initQ = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [query, setQuery] = useState(initQ);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const r = await fetch(`${base()}/api/search?q=${encodeURIComponent(q)}&limit=20`);
      const d = await r.json();
      setResults([...(d.articles || []).map((a: any) => ({ ...a, kind: "essay" })), ...(d.papers || []).map((p: any) => ({ ...p, kind: "paper" }))]);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (initQ) doSearch(initQ); }, [initQ, doSearch]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); doSearch(query); };

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0810 0%, #10081a 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-14">
          <LotusIcon size={24} className="mb-4" style={{ color: "var(--gold)", opacity: 0.6 }} />
          <h1 className="font-display mb-6" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--gold-bright)", letterSpacing: "0.1em" }}>Search</h1>
          <form onSubmit={onSubmit} className="w-full max-w-lg" role="search">
            <div className="relative">
              <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} aria-hidden="true" />
              <input
                type="search"
                className="input-sacred"
                style={{ paddingLeft: "2.75rem", paddingRight: "3rem", fontSize: "1rem", height: 52 }}
                placeholder="Search essays, papers, authors…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                aria-label="Search the journal"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setResults([]); setSearched(false); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-sacred btn-gold mt-3 w-full justify-center">Search</button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="container-anv pb-16 max-w-3xl mx-auto">
        <LotusDivider className="mb-6" />
        {loading ? (
          <div className="flex justify-center py-12">
            <div style={{ width: 36, height: 36, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Searching" />
          </div>
        ) : searched && results.length === 0 ? (
          <EmptyState
            title={`No results for "${query}"`}
            description="Try different keywords or browse all domains."
            action={<Link href="/browse" className="btn-sacred btn-ghost">Browse Domains</Link>}
          />
        ) : results.length > 0 ? (
          <div>
            <div className="font-ui text-xs mb-4" style={{ color: "var(--muted)" }}>{results.length} result{results.length !== 1 ? "s" : ""} for "{query}"</div>
            <div className="space-y-3">
              {results.map(r => (
                <Link key={`${r.kind}-${r.id}`} href={r.kind === "paper" ? `/papers/${r.slug || r.id}` : `/articles/${r.slug || r.id}`}>
                  <div className="card-sacred p-5 cursor-pointer flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`badge ${r.kind === "paper" ? "badge-published" : "badge-approved"}`}>{r.kind}</span>
                        {r.categoryId && <span className="font-ui text-[10px]" style={{ color: "var(--muted)" }}>{r.categoryId}</span>}
                      </div>
                      <h3 className="font-display text-xl leading-tight" style={{ color: "var(--parchment)" }}>{r.title}</h3>
                      {r.excerpt && <p className="font-body text-sm mt-1 line-clamp-2" style={{ color: "var(--ink-faint)" }}>{r.excerpt}</p>}
                      {r.authorName && <p className="font-ui text-xs mt-2" style={{ color: "var(--muted)" }}>{r.authorName}</p>}
                    </div>
                    <ArrowRight size={16} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 4 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : !searched ? (
          <div className="text-center py-10">
            <div className="section-label mb-6">Browse by Domain</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Philosophy","History","Psychology","Sociology","Science","Geopolitics","Civilizational Thought","Aesthetics","Sanskrit Studies"].map(d => (
                <Link key={d} href={`/domains/${d.toLowerCase().replace(/\s+/g, "-")}`} className="btn-sacred btn-ghost text-xs py-1.5 px-4">{d}</Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
