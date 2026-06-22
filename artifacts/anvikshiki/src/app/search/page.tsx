"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Search, Mic, FileText, BookOpen, Tag, ArrowRight } from "lucide-react";
import { DomainGrid } from "@/components/shared/DomainGrid";

const FILTERS = ["All", "Essays", "Papers", "Domains", "Archive"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults({ articles: [], papers: [], categories: [], query: q });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const filteredArticles = activeFilter === "All" || activeFilter === "Essays" ? results?.articles || [] : [];
  const filteredPapers = activeFilter === "All" || activeFilter === "Papers" ? results?.papers || [] : [];
  const filteredCategories = activeFilter === "All" || activeFilter === "Domains" ? results?.categories || [] : [];

  const hasResults = filteredArticles.length > 0 || filteredPapers.length > 0 || filteredCategories.length > 0;

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>

      {/* Hero banner with background image */}
      <div className="container-anv pt-3 pb-5">
        <div className="card-anv overflow-hidden">
          <div
            className="relative flex flex-col justify-end p-6 md:p-8 bg-cover bg-center"
            style={{
              minHeight: "180px",
              backgroundImage: "url('/homepage_hero.jpg')",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to right, color-mix(in srgb, var(--bg) 88%, transparent) 0%, color-mix(in srgb, var(--bg) 40%, transparent) 55%, transparent 100%)",
              }}
            />
            <div className="relative z-10">
              <h1 className="font-display text-4xl md:text-5xl" style={{ color: "var(--ink)" }}>
                Search
              </h1>
              <p className="font-body text-sm italic mt-1" style={{ color: "var(--muted)" }}>
                Discover ideas across time and disciplines.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-anv">
        {/* Search input */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--muted)" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search essays, papers, domains, authors..."
            className="input-anv pl-11 pr-11 py-3.5 text-base w-full"
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2"
            aria-label="Voice search"
          >
            <Mic size={18} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-2 rounded-full font-ui text-sm font-medium whitespace-nowrap transition-all shrink-0"
              style={{
                background: activeFilter === f ? "var(--gold)" : "var(--surface)",
                color: activeFilter === f ? "#1a1108" : "var(--ink)",
                border: "1px solid var(--border)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Empty state — show domain grid + popular discoveries */}
        {!loading && !results && (
          <div className="mt-6 space-y-6">
            {/* Browse by domain */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-ui text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--gold)" }}>
                  Explore by Domain
                </h2>
                <Link href="/" className="font-ui text-[11px] font-medium flex items-center gap-1 transition-colors hover:opacity-70" style={{ color: "var(--gold)" }}>
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <DomainGrid />
            </div>

            {/* Popular discoveries banner */}
            <div
              className="rounded-[20px] overflow-hidden flex min-h-[160px]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex-1 p-5 md:p-6">
                <span className="font-ui text-[10px] font-semibold tracking-[0.18em] uppercase flex items-center gap-1.5" style={{ color: "var(--gold)" }}>
                  <span>✦</span> Popular Discoveries
                </span>
                <h3 className="font-display text-2xl md:text-3xl mt-2 leading-tight" style={{ color: "var(--ink)" }}>
                  Timeless ideas.<br />Endless perspectives.
                </h3>
                <p className="font-body text-sm mt-2" style={{ color: "var(--muted)" }}>
                  Explore what&apos;s resonating across our community.
                </p>
                <button
                  onClick={() => setQuery("philosophy")}
                  className="btn-primary mt-4 text-sm py-2.5 px-5"
                >
                  Explore Now <ArrowRight size={14} />
                </button>
              </div>
              {/* Right archway image */}
              <div
                className="hidden md:block w-52 shrink-0 bg-cover bg-center rounded-r-[20px]"
                style={{ backgroundImage: "url('/papers_hero.jpg')" }}
              />
            </div>
          </div>
        )}

        {/* Search results */}
        {!loading && results && (
          <div className="py-6 space-y-6">
            {!hasResults && (
              <div className="text-center py-12">
                <p className="font-body" style={{ color: "var(--muted)" }}>
                  No results found for &ldquo;{results.query}&rdquo;
                </p>
              </div>
            )}

            {filteredArticles.length > 0 && (
              <div>
                <h3 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--gold)" }}>Essays</h3>
                <div className="space-y-3">
                  {filteredArticles.map((a: any) => (
                    <Link
                      key={a.id}
                      href={`/articles/${a.slug}`}
                      className="card-anv p-4 flex gap-4 items-start hover:translate-y-[-2px] transition-all block"
                    >
                      <BookOpen size={20} className="mt-1 shrink-0" style={{ color: "var(--gold)" }} />
                      <div>
                        <h4 className="font-display text-lg" style={{ color: "var(--ink)" }}>{a.title}</h4>
                        {a.excerpt && (
                          <p className="font-body text-sm mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>{a.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filteredPapers.length > 0 && (
              <div>
                <h3 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--gold)" }}>Papers</h3>
                <div className="space-y-3">
                  {filteredPapers.map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/papers/${p.slug}`}
                      className="card-anv p-4 flex gap-4 items-start hover:translate-y-[-2px] transition-all block"
                    >
                      <FileText size={20} className="mt-1 shrink-0" style={{ color: "var(--sage)" }} />
                      <div>
                        <h4 className="font-display text-lg" style={{ color: "var(--ink)" }}>{p.title}</h4>
                        {p.abstract && (
                          <p className="font-body text-sm mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>{p.abstract}</p>
                        )}
                        {p.peerReviewed && (
                          <span className="status-badge status-published text-[10px] mt-2 inline-block">Peer-Reviewed</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filteredCategories.length > 0 && (
              <div>
                <h3 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--gold)" }}>Domains</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {filteredCategories.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/categories/${c.slug}`}
                      className="card-anv p-4 text-center hover:translate-y-[-2px] transition-all block"
                    >
                      <Tag size={18} className="mx-auto mb-2" style={{ color: "var(--gold)" }} />
                      <span className="font-ui text-sm font-medium" style={{ color: "var(--ink)" }}>{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
