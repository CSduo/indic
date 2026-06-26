import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, FileText, BookOpen, Search } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ArchivePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const b = base();
    Promise.all([
      fetch(`${b}/api/articles?limit=50`).then(r => r.json()).catch(() => ({ articles: [] })),
      fetch(`${b}/api/papers?limit=50`).then(r => r.json()).catch(() => ({ papers: [] })),
    ]).then(([arts, papers]) => {
      const all = [
        ...(arts.articles || []).map((a: any) => ({ ...a, kind: "essay" })),
        ...(papers.papers || []).map((p: any) => ({ ...p, kind: "paper" })),
      ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setItems(all);
      setLoading(false);
    });
  }, []);

  const filtered = query ? items.filter(i => i.title?.toLowerCase().includes(query.toLowerCase()) || i.authorName?.toLowerCase().includes(query.toLowerCase())) : items;

  // Group by year
  const byYear: Record<string, any[]> = {};
  for (const item of filtered) {
    const y = item.createdAt ? new Date(item.createdAt).getFullYear().toString() : "Unknown";
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(item);
  }
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 300 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0810 0%, #0f0a18 50%, #0a0810 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(139,26,74,0.18) 0%, transparent 50%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
          {/* Manuscript texture dots */}
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: `${(i * 43) % 100}%`, top: `${(i * 67) % 100}%`, width: 1, height: 1, background: "var(--gold)", opacity: 0.12, borderRadius: "50%" }} aria-hidden="true" />
          ))}
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-16">
          <div className="section-label mb-3">Living Library</div>
          <h1 className="font-display mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "var(--gold-bright)", letterSpacing: "0.12em" }}>Archive</h1>
          <LotusIcon size={20} className="mb-4 animate-float" style={{ color: "var(--gold)", opacity: 0.6 }} />
          <p className="font-body text-sm max-w-md" style={{ color: "var(--ink-faint)" }}>All published essays and research papers, arranged chronologically.</p>
        </div>
      </div>

      {/* Search / Filter bar */}
      <div className="container-anv py-6" style={{ maxWidth: 680, marginLeft: "auto", marginRight: "auto" }}>
        <div className="relative">
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} aria-hidden="true" />
          <input
            type="search"
            className="input-sacred"
            style={{ paddingLeft: "2.5rem" }}
            placeholder="Search titles, authors…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search archive"
          />
        </div>
      </div>

      {/* Content */}
      <div className="container-anv pb-20">
        <LotusDivider className="mb-8" />

        {loading ? (
          <div className="flex justify-center py-16">
            <div style={{ width: 40, height: 40, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading archive" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "No results found" : "Archive is empty"}
            description={query ? `No works match "${query}". Try a different search.` : "Published essays and papers will appear here once the editorial team approves and publishes them."}
            action={
              <div className="flex gap-3 flex-wrap justify-center">
                {query && <button className="btn-sacred btn-ghost" onClick={() => setQuery("")} type="button">Clear Search</button>}
                <Link href="/submit" className="btn-sacred btn-gold">Submit Work <ArrowRight size={14} /></Link>
              </div>
            }
          />
        ) : (
          <div>
            {years.map(year => (
              <div key={year} className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="font-display text-2xl" style={{ color: "var(--gold)" }}>{year}</div>
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border-gold), transparent)" }} aria-hidden="true" />
                  <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>{byYear[year].length} {byYear[year].length === 1 ? "work" : "works"}</div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byYear[year].map(item => (
                    <Link key={item.id} href={item.kind === "paper" ? `/papers/${item.slug || item.id}` : `/articles/${item.slug || item.id}`}>
                      <article className="card-sacred p-5 h-full flex flex-col cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          {item.kind === "paper" ? (
                            <span className="badge badge-published">Paper</span>
                          ) : (
                            <span className="badge badge-approved">Essay</span>
                          )}
                          {item.createdAt && (
                            <span className="font-ui text-[10px]" style={{ color: "var(--muted)" }}>
                              {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-lg mb-1 leading-tight flex-1" style={{ color: "var(--parchment)" }}>{item.title}</h3>
                        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <span className="font-ui text-xs" style={{ color: "var(--muted)" }}>{item.authorName || "Editorial"}</span>
                          <ArrowRight size={13} style={{ color: "var(--gold)" }} />
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
