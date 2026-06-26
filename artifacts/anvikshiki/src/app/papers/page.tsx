import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Search } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const DISCIPLINES = ["All","Philosophy","History","Psychology","Sociology","Science","Geopolitics","Sanskrit Studies","Political Theory"];

export default function PapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [discipline, setDiscipline] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${base()}/api/papers?limit=50`)
      .then(r => r.json())
      .then(d => { setPapers(d.papers || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = papers.filter(p => {
    const matchD = discipline === "All" || p.discipline === discipline || p.categoryId === discipline;
    const matchQ = !query || p.title?.toLowerCase().includes(query.toLowerCase()) || p.authorName?.toLowerCase().includes(query.toLowerCase());
    return matchD && matchQ;
  });

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 300 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #100818 0%, #0a0518 50%, #0f0a18 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 25% 50%, rgba(74,40,120,0.25) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-16">
          <div className="section-label mb-3">Research Repository</div>
          <h1 className="font-display mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "var(--gold-bright)", letterSpacing: "0.12em" }}>Papers</h1>
          <LotusIcon size={20} className="mb-4 animate-float" style={{ color: "var(--moon)", opacity: 0.7 }} />
          <p className="font-body text-sm max-w-md" style={{ color: "var(--ink-faint)" }}>Peer-reviewed research manuscripts across philosophy, history, science, and civilizational thought.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="container-anv py-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} aria-hidden="true" />
            <input type="search" className="input-sacred" style={{ paddingLeft: "2rem" }} placeholder="Search papers, authors…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search papers" />
          </div>
          <select className="select-sacred sm:w-48" value={discipline} onChange={e => setDiscipline(e.target.value)} aria-label="Filter by discipline">
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="container-anv pb-20">
        <LotusDivider className="mb-8" />
        {loading ? (
          <div className="flex justify-center py-16">
            <div style={{ width: 40, height: 40, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading papers" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query || discipline !== "All" ? "No papers match your filter" : "No papers published yet"}
            description={query || discipline !== "All" ? "Try clearing filters or searching differently." : "Research papers will appear here once approved and published by the editorial team."}
            action={
              <div className="flex gap-3 flex-wrap justify-center">
                {(query || discipline !== "All") && <button className="btn-sacred btn-ghost" onClick={() => { setQuery(""); setDiscipline("All"); }} type="button">Clear Filters</button>}
                <Link href="/submit" className="btn-sacred btn-gold">Submit Research <ArrowRight size={14} /></Link>
              </div>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(p => (
              <Link key={p.id} href={`/papers/${p.slug || p.id}`}>
                <article className="card-sacred p-5 h-full flex flex-col cursor-pointer">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge badge-published">Paper</span>
                    {p.peerReviewed && <span className="badge badge-approved">Peer Reviewed</span>}
                  </div>
                  <h3 className="font-display text-xl mb-2 leading-tight flex-1" style={{ color: "var(--parchment)" }}>{p.title}</h3>
                  {p.abstract && <p className="font-body text-sm leading-relaxed line-clamp-3 mb-3" style={{ color: "var(--ink-faint)" }}>{p.abstract}</p>}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="font-ui text-xs" style={{ color: "var(--muted)" }}>{p.authorName || "Editorial"}</span>
                    <ArrowRight size={14} style={{ color: "var(--gold)" }} />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
