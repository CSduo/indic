import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { DOMAIN_ORDER } from "@/lib/domainMeta";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function ArchivePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${base()}/api/articles?limit=50`).then((response) => response.json()).catch(() => ({ articles: [] })),
      fetch(`${base()}/api/papers?limit=50`).then((response) => response.json()).catch(() => ({ papers: [] })),
    ]).then(([articles, papers]) => {
      const all = [
        ...(articles.articles || []).map((article: any) => ({ ...article, kind: "essay" })),
        ...(papers.papers || []).map((paper: any) => ({ ...paper, kind: "paper" })),
      ].sort((a, b) => new Date(b.createdAt || b.publishedAt || 0).getTime() - new Date(a.createdAt || a.publishedAt || 0).getTime());
      setItems(all);
      setLoading(false);
    });
  }, []);

  const filtered = query
    ? items.filter((item) => item.title?.toLowerCase().includes(query.toLowerCase()) || item.authorName?.toLowerCase().includes(query.toLowerCase()))
    : items;

  const byYear: Record<string, any[]> = {};
  for (const item of filtered) {
    const year = item.createdAt || item.publishedAt ? new Date(item.createdAt || item.publishedAt).getFullYear().toString() : "Undated";
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(item);
  }
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--terracotta)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Archive</span>
        </nav>

        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
          <ParchmentCard className="hidden p-5 lg:block">
            <p className="type-section-label mb-4">Timeline</p>
            <ol className="space-y-4 font-ui text-xs text-[var(--ink-faint)]">
              {["Before 3000 BCE", "3000-1000 BCE", "1000-500 BCE", "500 BCE-500 CE", "500-1500 CE", "1500-Present"].map((period, index) => (
                <li key={period} className="flex gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full border border-[var(--gold)] bg-[var(--surface)]" />
                  <span><strong className="block text-[var(--ink)]">{period}</strong>{index === 0 ? "Origins & Cosmos" : index === 5 ? "Modern inquiry" : "Archive layer"}</span>
                </li>
              ))}
            </ol>
          </ParchmentCard>

          <ParchmentCard className="overflow-hidden" corners={false}>
            <div className="relative min-h-[420px]">
              <img src={asset("/images/heroes/archive-scribe.jpg")} alt="Illustrated scribe working in an archive" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/15 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-center">
                <h1 className="font-display text-[clamp(2.5rem,6vw,4.8rem)] leading-none text-[var(--ink)]">Archive / Knowledge Map</h1>
                <p className="mx-auto mt-3 max-w-xl font-body text-lg leading-8 text-[var(--ink-soft)]">
                  Navigate time, place, and idea through the living archive of inquiry.
                </p>
              </div>
            </div>
          </ParchmentCard>

          <ParchmentCard className="hidden p-5 lg:block">
            <p className="type-section-label mb-4">Symbolic Taxonomy</p>
            <div className="grid grid-cols-3 gap-2">
              {DOMAIN_ORDER.slice(0, 12).map((domain) => (
                <Link key={domain} href={`/domains/${domain}`}>
                  <span className="grid aspect-square place-items-center rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--gold)] hover:border-[var(--terracotta)]">
                    <AnimalGlyph domain={domain} size={28} />
                  </span>
                </Link>
              ))}
            </div>
            <Link href="/browse" className="btn-ink mt-4 w-full">View Glyphs <ArrowRight size={14} /></Link>
          </ParchmentCard>
        </div>
      </section>

      <section className="container-anv pb-14">
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
          <aside className="hidden space-y-4 lg:block">
            <ParchmentCard className="p-5">
              <p className="type-section-label mb-4">Regions</p>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--ink-wash)] p-4 text-center font-ui text-xs text-[var(--ink-faint)]">
                Cultural and geographic filters
              </div>
            </ParchmentCard>
            <ParchmentCard className="p-5">
              <p className="type-section-label mb-4">Civilizations</p>
              <div className="space-y-2">
                {["Indus Valley", "Ancient Egypt", "Vedic Bharat", "Classical Greece", "Han China"].map((item, index) => (
                  <div key={item} className="flex items-center gap-2 font-ui text-xs text-[var(--ink-faint)]">
                    <AnimalGlyph domain={DOMAIN_ORDER[index]} size={18} /> {item}
                  </div>
                ))}
              </div>
            </ParchmentCard>
          </aside>

          <main>
            <ParchmentCard className="mb-6 grid gap-3 p-4 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                <input
                  type="search"
                  className="input-sacred pl-10"
                  placeholder="Search archive titles and authors..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search archive"
                />
              </div>
              <button type="button" className="btn-ink"><SlidersHorizontal size={14} /> Filters</button>
            </ParchmentCard>

            <OrnamentDivider className="mb-8" />

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[0, 1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-[8px] bg-[var(--ink-wash-strong)]" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title={query ? "No results found" : "Archive is empty"}
                description={query ? `No works match "${query}". Try a different search.` : "Published essays and papers will appear here once the editorial team approves and publishes them."}
                action={<Link href="/submit" className="btn-terracotta">Submit Work <ArrowRight size={14} /></Link>}
              />
            ) : (
              <div>
                {years.map((year) => (
                  <section key={year} className="mb-10">
                    <div className="mb-5 flex items-center gap-3">
                      <h2 className="font-display text-3xl text-[var(--gold)]">{year}</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border-gold)] to-transparent" aria-hidden="true" />
                      <span className="font-ui text-xs text-[var(--muted)]">{byYear[year].length} works</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {byYear[year].map((item) => {
                        const href = item.kind === "paper" ? `/papers/${item.slug || item.id}` : `/articles/${item.slug || item.id}`;
                        return (
                          <Link key={`${item.kind}-${item.id}`} href={href}>
                            <ParchmentCard className="flex h-full min-h-44 flex-col p-5">
                              <div className="mb-3 flex flex-wrap gap-2">
                                <span className={item.kind === "paper" ? "badge badge-published" : "badge badge-received"}>{item.kind}</span>
                                <GlyphTag domain={item.categorySlug || item.categoryId || item.discipline || item.kind} />
                              </div>
                              <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">{item.title}</h3>
                              <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
                                <span className="font-ui text-xs text-[var(--ink-faint)]">{item.authorName || "Editorial"}</span>
                                <ArrowRight size={14} className="text-[var(--gold)]" />
                              </div>
                            </ParchmentCard>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>

          <aside className="hidden lg:block">
            <ParchmentCard className="sticky top-28 p-5">
              <p className="type-section-label mb-4">Knowledge Map</p>
              <svg viewBox="0 0 220 220" className="h-56 w-full" aria-hidden="true">
                {[
                  [110, 36, 50, 92],
                  [110, 36, 170, 88],
                  [50, 92, 92, 158],
                  [170, 88, 92, 158],
                  [92, 158, 166, 174],
                ].map(([x1, y1, x2, y2], index) => <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-gold)" />)}
                {[[110, 36], [50, 92], [170, 88], [92, 158], [166, 174]].map(([x, y], index) => <circle key={index} cx={x} cy={y} r="20" fill="var(--surface)" stroke="var(--border-gold)" />)}
              </svg>
              <div className="-mt-56 grid h-56 place-items-center text-[var(--gold)]">
                <div className="grid grid-cols-2 gap-7">
                  {["philosophy", "history", "science", "sociology"].map((domain) => <AnimalGlyph key={domain} domain={domain} size={28} />)}
                </div>
              </div>
            </ParchmentCard>
          </aside>
        </div>
      </section>
    </div>
  );
}
