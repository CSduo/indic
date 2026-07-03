import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search } from "lucide-react";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const DISCIPLINES = ["All", "Philosophy", "History", "Psychology", "Sociology", "Science", "Geopolitics", "Sanskrit Studies", "Political Theory"];

export default function PapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [discipline, setDiscipline] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${base()}/api/papers?limit=50`)
      .then((response) => response.json())
      .then((data) => {
        setPapers(data.papers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = papers.filter((paper) => {
    const matchDiscipline = discipline === "All" || paper.discipline === discipline || paper.categoryId === discipline;
    const matchQuery = !query || paper.title?.toLowerCase().includes(query.toLowerCase()) || paper.authorName?.toLowerCase().includes(query.toLowerCase());
    return matchDiscipline && matchQuery;
  });

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--terracotta)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Papers</span>
        </nav>
        <HeroPanel
          image={asset("/images/provided/papers-ornate-library-hall-hero.jpg")}
          imageAlt="Illustrated ornate library hall with books, owl, globe, and scholarly symbols"
          eyebrow="Research Repository"
          title="Papers"
          subtitle="Working papers, peer-reviewed manuscripts, and research notes."
          description="Browse scholarly work by discipline, author, topic, and status while preserving the serious reading flow of a journal archive."
          glyph="papers"
          focal="center"
          ctaPrimary={{ label: "Submit Research", href: "/submit" }}
          ctaSecondary={{ label: "Archive", href: "/archive" }}
        />
      </section>

      <section className="container-anv pb-14">
        <ParchmentCard className="mb-8 grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
            <input
              type="search"
              className="input-sacred pl-10"
              placeholder="Search papers and authors..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search papers"
            />
          </div>
          <select className="select-sacred" value={discipline} onChange={(event) => setDiscipline(event.target.value)} aria-label="Filter by discipline">
            {DISCIPLINES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </ParchmentCard>

        <OrnamentDivider className="mb-8" />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-[8px] bg-[var(--ink-wash-strong)]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query || discipline !== "All" ? "No papers match your filter" : "No papers published yet"}
            description={query || discipline !== "All" ? "Try clearing filters or searching differently." : "Research papers will appear here once approved and published by the editorial team."}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                {(query || discipline !== "All") ? <button className="btn-ink" onClick={() => { setQuery(""); setDiscipline("All"); }} type="button">Clear Filters</button> : null}
                <Link href="/submit" className="btn-terracotta">Submit Research <ArrowRight size={14} /></Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((paper) => (
              <Link key={paper.id} href={`/papers/${paper.slug || paper.id}`}>
                <ParchmentCard className="flex h-full min-h-64 flex-col p-5">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="badge badge-received">{paper.status || "Working Paper"}</span>
                    {paper.peerReviewed ? <span className="badge badge-approved">Peer Reviewed</span> : null}
                  </div>
                  <h2 className="font-display text-2xl leading-tight text-[var(--ink)]">{paper.title}</h2>
                  {paper.abstract ? <p className="mt-3 line-clamp-4 font-body text-sm leading-6 text-[var(--ink-soft)]">{paper.abstract}</p> : null}
                  <div className="mt-auto pt-5">
                    <GlyphTag domain={paper.categorySlug || paper.categoryId || paper.discipline || "papers"} className="mb-3" />
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                      <span className="font-ui text-xs text-[var(--ink-faint)]">{paper.authorName || "Editorial"}</span>
                      <ArrowRight size={14} className="text-[var(--gold)]" />
                    </div>
                  </div>
                </ParchmentCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
