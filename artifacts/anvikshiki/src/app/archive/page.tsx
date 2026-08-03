import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { AmbientPetals, FloralCorner } from "@/components/sacred/FloralDecor";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const ALL_DOMAINS = [
  { slug: "all", label: "All Domains" },
  { slug: "philosophy", label: "Philosophy" },
  { slug: "history", label: "History" },
  { slug: "political-theory", label: "Political Theory" },
  { slug: "psychology", label: "Psychology" },
  { slug: "sociology", label: "Sociology" },
  { slug: "science", label: "Science" },
  { slug: "geopolitics", label: "Geopolitics" },
  { slug: "archive", label: "Archive" },
  { slug: "civilizational-thought", label: "Civilizational Thought" },
  { slug: "aesthetics", label: "Aesthetics" },
  { slug: "sanskrit-studies", label: "Sanskrit Studies" },
  { slug: "translations", label: "Translations" },
  { slug: "multimedia", label: "Multimedia" },
];

export default function ArchivePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedKind, setSelectedKind] = useState("all"); // "all", "article", "paper"
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    Promise.all([
      fetch(`${base()}/api/articles?limit=100`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ articles: [] })),
      fetch(`${base()}/api/papers?limit=100`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ papers: [] })),
    ]).then(([articles, papers]) => {
      const allArticles = (articles.articles || []).map((a: any) => ({
        id: a.id,
        kind: "article",
        slug: a.slug,
        title: a.title,
        summary: a.excerpt,
        imageUrl: a.heroImageUrl || "/images/provided/champa-temple.jpg",
        categorySlug: a.categorySlug || "history",
        categoryName: a.category?.name || "Essay",
        authorName: a.authorName || "Editorial",
        publishedAt: a.publishedAt || a.createdAt || "2026-08-04T00:00:00.000Z",
        readingMinutes: a.readingMinutes || 15,
      }));

      const allPapers = (papers.papers || []).map((p: any) => ({
        id: p.id,
        kind: "paper",
        slug: p.slug,
        title: p.title,
        summary: p.abstract,
        imageUrl: p.coverImageUrl || "/images/provided/about-hero.jpg",
        categorySlug: p.categorySlug || "philosophy",
        categoryName: p.category?.name || "Research Paper",
        authorName: p.authorName || "Editorial",
        publishedAt: p.publishedAt || p.createdAt || "2026-08-04T00:00:00.000Z",
        readingMinutes: p.readingMinutes || 25,
      }));

      setItems([...allArticles, ...allPapers]);
      setLoading(false);
    });
  }, []);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (item) => item.title?.toLowerCase().includes(q) || item.summary?.toLowerCase().includes(q) || item.authorName?.toLowerCase().includes(q)
      );
    }

    if (selectedDomain !== "all") {
      result = result.filter(
        (item) => item.categorySlug?.toLowerCase() === selectedDomain.toLowerCase() || item.categoryName?.toLowerCase() === selectedDomain.toLowerCase()
      );
    }

    if (selectedKind !== "all") {
      result = result.filter((item) => item.kind === selectedKind);
    }

    result.sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [items, query, selectedDomain, selectedKind, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredAndSorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="relative bg-[var(--bg)] min-h-screen text-white py-8">
      <AmbientPetals />
      <FloralCorner position="tl" size={80} className="absolute top-0 left-0 text-[var(--gold)] opacity-30" />
      <FloralCorner position="tr" size={80} className="absolute top-0 right-0 text-[var(--gold)] opacity-30" />

      <div className="container-anv relative z-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
          <Link href="/" className="hover:text-[var(--gold)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--gold)]">All Archives</span>
        </nav>

        {/* Page Title */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">
            All Archives &amp; Manuscripts
          </h1>
          <p className="mt-2 text-sm md:text-base text-[var(--ink-soft)] max-w-2xl">
            Explore the complete repository of published essays, research papers, and civilizational scholarship sorted from latest to oldest.
          </p>
        </div>

        {/* Main 2-Column Grid: Left Filter Sidebar + Right Archives List */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          
          {/* Left Sidebar Filter Mechanism */}
          <aside className="bg-[#1c1c1e] border-2 border-[#333336] rounded-2xl p-6 h-fit space-y-6">
            <div className="flex items-center gap-2 text-white font-extrabold uppercase tracking-widest text-sm border-b border-[#333336] pb-3">
              <Filter size={16} className="text-[var(--gold)]" /> Filter Archives
            </div>

            {/* Content Type Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white mb-2" style={{ color: "#FFFFFF" }}>Content Type</label>
              <select
                value={selectedKind}
                onChange={(e) => { setSelectedKind(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#252528] border border-[#3c3c40] text-white rounded-xl p-3 text-xs font-bold uppercase tracking-wider focus:border-[var(--gold)] outline-none"
                style={{ color: "#FFFFFF", backgroundColor: "#252528" }}
              >
                <option value="all">All Types</option>
                <option value="article">Essays</option>
                <option value="paper">Research Papers</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white mb-2" style={{ color: "#FFFFFF" }}>Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as "newest" | "oldest"); setCurrentPage(1); }}
                className="w-full bg-[#252528] border border-[#3c3c40] text-white rounded-xl p-3 text-xs font-bold uppercase tracking-wider focus:border-[var(--gold)] outline-none"
                style={{ color: "#FFFFFF", backgroundColor: "#252528" }}
              >
                <option value="newest">Latest to Oldest</option>
                <option value="oldest">Oldest to Latest</option>
              </select>
            </div>

            {/* Domains List Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white mb-3" style={{ color: "#FFFFFF" }}>Domains of Inquiry</label>
              <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                {ALL_DOMAINS.map((domain) => {
                  const isActive = selectedDomain === domain.slug;
                  return (
                    <button
                      key={domain.slug}
                      onClick={() => { setSelectedDomain(domain.slug); setCurrentPage(1); }}
                      className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between ${
                        isActive
                          ? "bg-[#38383c] text-white font-extrabold border-2 border-[var(--gold)] shadow-md"
                          : "bg-[#252528] text-white border border-[#38383c] hover:bg-[#323236]"
                      }`}
                      style={{ color: "#FFFFFF" }}
                    >
                      <span style={{ color: "#FFFFFF" }}>{domain.label}</span>
                      {isActive && <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right Main Content */}
          <main className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="search"
                className="w-full bg-[#1c1c1e] border-2 border-[#333336] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-white/50 font-medium focus:border-[var(--gold)] outline-none"
                placeholder="Search archive by title, excerpt, or author..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Results Count Bar */}
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/70 px-1">
              <span>Showing {filteredAndSorted.length} Archives</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>

            {/* Archives Cards List */}
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-64 rounded-3xl bg-[#1c1c1e] animate-pulse border-2 border-[#333336]" />
                ))}
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="bg-[#1c1c1e] border-2 border-[#333336] rounded-3xl p-12 text-center text-white">
                <p className="text-xl font-bold mb-2">No matching archives found</p>
                <p className="text-sm text-white/70 mb-6">Try adjusting your filters or search terms.</p>
                <button
                  onClick={() => { setSelectedDomain("all"); setSelectedKind("all"); setQuery(""); setCurrentPage(1); }}
                  className="px-6 py-2.5 rounded-xl bg-[var(--terracotta)] text-white font-bold text-xs uppercase tracking-wider"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {paginatedItems.map((publication) => (
                  <Link
                    key={`${publication.kind}-${publication.id}`}
                    href={`/${publication.kind === "paper" ? "papers" : "articles"}/${publication.slug}`}
                    className="group relative w-full rounded-3xl overflow-hidden border-2 border-[#333336] bg-[#1c1c1e] shadow-2xl block transition-all duration-500 hover:scale-[1.01] hover:border-[var(--gold)]"
                  >
                    {publication.imageUrl && (
                      <div className="w-full h-[280px] md:h-[360px] overflow-hidden relative bg-black">
                        <img
                          src={publication.imageUrl}
                          alt={publication.title}
                          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div className="p-6 md:p-8 flex flex-col justify-between text-white bg-[#1c1c1e]">
                      <h3 className="text-xl md:text-3xl font-extrabold text-white mb-2 leading-snug tracking-tight group-hover:text-[var(--gold-bright)] transition-colors" style={{ color: "#FFFFFF" }}>
                        {publication.title}
                      </h3>
                      {publication.summary && (
                        <p className="text-xs md:text-base text-white opacity-95 line-clamp-2 font-body leading-relaxed mb-2" style={{ color: "#FFFFFF" }}>
                          {publication.summary}
                        </p>
                      )}
                      
                      {/* Sectional Divider Line */}
                      <div className="h-px w-full bg-[#333336] my-4" />

                      <div className="flex items-center justify-between gap-3 font-ui text-xs md:text-sm font-bold uppercase tracking-wider text-white w-full" style={{ color: "#FFFFFF" }}>
                        <div className="flex items-center gap-2 overflow-hidden flex-wrap flex-1">
                          <span className="font-extrabold text-white tracking-widest shrink-0" style={{ color: "#FFFFFF" }}>{publication.authorName || "Editorial"}</span>
                          <span className="px-3 py-1 rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest bg-[#C84A10] text-white border border-white/20 shadow-sm shrink-0" style={{ color: "#FFFFFF" }}>
                            {publication.categoryName || publication.categorySlug || (publication.kind === "paper" ? "Paper" : "Essay")}
                          </span>
                          {publication.readingMinutes && (
                            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shrink-0" style={{ color: "#FFFFFF" }}>
                              {publication.readingMinutes} min read
                            </span>
                          )}
                        </div>
                        {publication.publishedAt && (
                          <span className="text-white opacity-90 font-extrabold shrink-0 text-right ml-auto" style={{ color: "#FFFFFF" }}>
                            {new Date(publication.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Numerical Pagination Controls (1, 2, 3...) */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2.5 rounded-xl bg-[#1c1c1e] text-white font-bold disabled:opacity-30 border border-[#333336] hover:border-[var(--gold)] flex items-center gap-1.5 text-xs uppercase tracking-wider"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all ${
                      currentPage === pageNum
                        ? "bg-[var(--terracotta)] text-white shadow-lg scale-105 border border-white/20"
                        : "bg-[#1c1c1e] text-white/80 border border-[#333336] hover:border-[var(--gold)] hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2.5 rounded-xl bg-[#1c1c1e] text-white font-bold disabled:opacity-30 border border-[#333336] hover:border-[var(--gold)] flex items-center gap-1.5 text-xs uppercase tracking-wider"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
