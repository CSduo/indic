import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, ChevronLeft, ChevronRight, Filter, X, LayoutGrid, List as ListIcon, ChevronDown, ChevronUp } from "lucide-react";
import { AmbientPetals, FloralCorner } from "@/components/sacred/FloralDecor";
import { DOMAIN_ORDER, DOMAIN_META, DomainKey } from "@/lib/domainMeta";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ArchivePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedKind, setSelectedKind] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title-asc" | "title-desc">("newest");
  const [readingTime, setReadingTime] = useState("any");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [domainExpanded, setDomainExpanded] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  const ITEMS_PER_PAGE = 8;

  // Initialise filters from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("q")) setQuery(params.get("q") || "");
    if (params.has("domain")) setSelectedDomain(params.get("domain") || "all");
    if (params.has("type")) setSelectedKind(params.get("type") || "all");
    if (params.has("sort")) setSortOrder(params.get("sort") as any || "newest");
    if (params.has("time")) setReadingTime(params.get("time") || "any");
  }, []);

  // Fetch Data
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
        imageUrl: a.heroImageUrl,
        categorySlug: a.categorySlug || "history",
        categoryName: a.category?.name || "Essay",
        authorName: a.authorName || "Editorial",
        publishedAt: a.publishedAt || a.createdAt,
        readingMinutes: a.readingMinutes,
      }));

      const allPapers = (papers.papers || []).map((p: any) => ({
        id: p.id,
        kind: "paper",
        slug: p.slug,
        title: p.title,
        summary: p.abstract,
        imageUrl: p.coverImageUrl,
        categorySlug: p.categorySlug || "philosophy",
        categoryName: p.category?.name || "Research Paper",
        authorName: p.authorName || "Editorial",
        publishedAt: p.publishedAt || p.createdAt,
        readingMinutes: p.readingMinutes,
      }));

      setItems([...allArticles, ...allPapers]);
      setLoading(false);
    });
  }, []);

  // Update URL on filter changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedDomain !== "all") params.set("domain", selectedDomain);
    if (selectedKind !== "all") params.set("type", selectedKind);
    if (sortOrder !== "newest") params.set("sort", sortOrder);
    if (readingTime !== "any") params.set("time", readingTime);
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [query, selectedDomain, selectedKind, sortOrder, readingTime]);

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
    
    if (readingTime !== "any") {
      result = result.filter((item) => {
        const mins = item.readingMinutes || 0;
        if (readingTime === "short") return mins < 5;
        if (readingTime === "medium") return mins >= 5 && mins < 15;
        if (readingTime === "long") return mins >= 15;
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortOrder === "newest" || sortOrder === "oldest") {
        const timeA = new Date(a.publishedAt || 0).getTime();
        const timeB = new Date(b.publishedAt || 0).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      } else {
        const titleA = a.title || "";
        const titleB = b.title || "";
        return sortOrder === "title-asc" ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      }
    });

    return result;
  }, [items, query, selectedDomain, selectedKind, sortOrder, readingTime]);

  const activeFilterCount = (query ? 1 : 0) + (selectedDomain !== "all" ? 1 : 0) + (selectedKind !== "all" ? 1 : 0) + (sortOrder !== "newest" ? 1 : 0) + (readingTime !== "any" ? 1 : 0);

  const clearFilters = () => {
    setQuery("");
    setSelectedDomain("all");
    setSelectedKind("all");
    setSortOrder("newest");
    setReadingTime("any");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredAndSorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderFilters = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2 text-[var(--ink)] font-extrabold uppercase tracking-widest text-sm">
          <Filter size={16} className="text-[var(--gold)]" /> 
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[var(--gold)] text-[var(--bg)] w-5 h-5 flex items-center justify-center rounded-full text-[10px] ml-1">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-[10px] text-[var(--ink-soft)] hover:text-[var(--ink)] uppercase font-bold tracking-wider">
            Clear All
          </button>
        )}
      </div>

      {/* Content Type */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">Content Type</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "article", label: "Articles" },
            { id: "paper", label: "Papers" }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => { setSelectedKind(type.id); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                selectedKind === type.id 
                  ? "bg-[var(--gold)] border-[var(--gold)] text-[var(--bg)]" 
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)] hover:border-[var(--gold)]"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reading Time */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">Reading Time</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "any", label: "Any" },
            { id: "short", label: "< 5 min" },
            { id: "medium", label: "5-15 min" },
            { id: "long", label: "15+ min" }
          ].map(time => (
            <button
              key={time.id}
              onClick={() => { setReadingTime(time.id); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                readingTime === time.id 
                  ? "bg-[var(--gold)] border-[var(--gold)] text-[var(--bg)]" 
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)] hover:border-[var(--gold)]"
              }`}
            >
              {time.label}
            </button>
          ))}
        </div>
      </div>

      {/* Domain Accordion */}
      <div>
        <button 
          onClick={() => setDomainExpanded(!domainExpanded)}
          className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2 group"
        >
          <span>Domains of Inquiry</span>
          {domainExpanded ? <ChevronUp size={14} className="group-hover:text-[var(--ink)]" /> : <ChevronDown size={14} className="group-hover:text-[var(--ink)]" />}
        </button>
        
        <div className={`filter-accordion-content ${domainExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            <button
              onClick={() => { setSelectedDomain("all"); setCurrentPage(1); }}
              className={`text-left px-3.5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 border ${
                selectedDomain === "all"
                  ? "bg-[var(--surface)] text-[var(--ink)] border-[var(--gold)] shadow-sm"
                  : "bg-transparent text-[var(--ink-soft)] border-transparent hover:border-[var(--border)]"
              }`}
            >
              <div className="w-5 h-5 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--surface)]">
                {selectedDomain === "all" && <div className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />}
              </div>
              All Domains
            </button>
            {DOMAIN_ORDER.map((domainKey) => {
              const meta = DOMAIN_META[domainKey];
              const isActive = selectedDomain === domainKey;
              return (
                <button
                  key={domainKey}
                  onClick={() => { setSelectedDomain(domainKey); setCurrentPage(1); }}
                  className={`text-left px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 border ${
                    isActive
                      ? "bg-[var(--surface)] text-[var(--ink)] border-[var(--gold)] shadow-sm"
                      : "bg-transparent text-[var(--ink-soft)] border-transparent hover:border-[var(--border)]"
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center text-[var(--ink)] shrink-0">
                    <AnimalGlyph domain={domainKey} size={20} />
                  </div>
                  <span className="flex-1 truncate">{meta.label}</span>
                  {isActive && <div className="w-2 h-2 rounded-full bg-[var(--gold)] shrink-0 mr-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative bg-[var(--bg)] min-h-screen text-[var(--ink)] py-8 font-body">
      <AmbientPetals />
      <FloralCorner position="tl" size={80} className="absolute top-0 left-0 text-[var(--gold)] opacity-30" />
      <FloralCorner position="tr" size={80} className="absolute top-0 right-0 text-[var(--gold)] opacity-30" />

      <div className="container-anv relative z-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)]">
          <Link href="/" className="hover:text-[var(--gold)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--gold)]">Archive</span>
        </nav>

        {/* Page Title */}
        <div className="mb-8 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-[0.16em] text-[var(--ink)] font-display">
              The Archive
            </h1>
            <p className="mt-2 text-sm md:text-base text-[var(--ink-soft)] max-w-2xl">
              Explore the complete repository of published essays, research papers, and civilizational scholarship.
            </p>
          </div>
          <button 
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center justify-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-bold uppercase tracking-wider text-[var(--ink)]"
          >
            <Filter size={14} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* Mobile Filter Drawer */}
        <div className={`fixed inset-0 z-50 lg:hidden pointer-events-none`}>
          <div 
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto ${mobileFiltersOpen ? 'opacity-100' : 'opacity-0 hidden'}`}
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className={`absolute bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-3xl border-t border-[var(--border)] p-6 mobile-filter-drawer pointer-events-auto max-h-[85vh] overflow-y-auto ${mobileFiltersOpen ? 'open' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold uppercase tracking-widest text-[var(--ink)]">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-2 bg-[var(--surface)] rounded-full text-[var(--ink)]">
                <X size={20} />
              </button>
            </div>
            {renderFilters()}
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 h-fit sticky top-24">
            {renderFilters()}
          </aside>

          {/* Right Main Content */}
          <main className="space-y-6">
            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                <input
                  type="text"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-full pl-12 pr-10 py-3 text-sm text-[var(--ink)] placeholder-text-[var(--ink-soft)] font-medium focus:border-[var(--gold)] outline-none transition-colors"
                  placeholder="Search archive..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                />
                {query && (
                  <button 
                    onClick={() => { setQuery(''); setCurrentPage(1); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <div className="relative shrink-0 h-12">
                  <select
                    value={sortOrder}
                    onChange={(e) => { setSortOrder(e.target.value as any); setCurrentPage(1); }}
                    className="appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] rounded-full pl-4 pr-10 py-3 text-xs font-bold uppercase tracking-wider focus:border-[var(--gold)] outline-none cursor-pointer h-full"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title-asc">Title A-Z</option>
                    <option value="title-desc">Title Z-A</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] pointer-events-none" />
                </div>
                
                <div className="hidden sm:flex bg-[var(--surface)] border border-[var(--border)] rounded-full p-1 h-12 shrink-0">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-full transition-colors ${viewMode === "grid" ? "bg-[var(--gold)] text-[var(--bg)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-full transition-colors ${viewMode === "list" ? "bg-[var(--gold)] text-[var(--bg)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
                    aria-label="List view"
                  >
                    <ListIcon size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] px-1">
              Showing {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'result' : 'results'}
            </div>

            {/* Results */}
            {loading ? (
              <div className={viewMode === "grid" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-2" : "flex flex-col gap-4"}>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className={`rounded-3xl bg-[var(--surface)] animate-pulse border border-[var(--border)] ${viewMode === "grid" ? "h-80" : "h-32"}`} />
                ))}
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-12 text-center text-[var(--ink)]">
                <p className="text-xl font-bold mb-2">No matching items found</p>
                <p className="text-sm text-[var(--ink-soft)] mb-6">Try adjusting your filters or search terms.</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-bold text-xs uppercase tracking-wider hover:border-[var(--gold)] transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-2" : "flex flex-col gap-4"}>
                {paginatedItems.map((publication) => (
                  <Link
                    key={`${publication.kind}-${publication.id}`}
                    href={`/${publication.kind === "paper" ? "papers" : "articles"}/${publication.slug}`}
                    className={`group relative rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] block transition-all hover:border-[var(--gold)] ${viewMode === "grid" ? "flex flex-col h-full" : "flex flex-row items-stretch"}`}
                  >
                    {publication.imageUrl && (
                      <div className={`${viewMode === "grid" ? "w-full h-48" : "w-1/3 hidden sm:block"} overflow-hidden relative shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border)]`}>
                        <img
                          src={publication.imageUrl}
                          alt={publication.title}
                          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div className={`p-5 flex flex-col flex-1 bg-[var(--surface)]`}>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded-sm text-[9px] font-extrabold uppercase tracking-widest bg-[var(--gold)] text-[var(--bg)]">
                          {publication.categoryName || publication.categorySlug || (publication.kind === "paper" ? "Paper" : "Essay")}
                        </span>
                        {publication.readingMinutes && (
                          <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-[var(--border)] text-[var(--ink-soft)]">
                            {publication.readingMinutes} min read
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg md:text-xl font-extrabold text-[var(--ink)] mb-2 leading-snug font-display group-hover:text-[var(--gold)] transition-colors line-clamp-3">
                        {publication.title}
                      </h3>
                      
                      {publication.summary && (
                        <p className={`text-sm text-[var(--ink-soft)] font-body leading-relaxed mb-4 ${viewMode === "grid" ? "line-clamp-2" : "line-clamp-3"} flex-1`}>
                          {publication.summary}
                        </p>
                      )}
                      
                      {!publication.summary && <div className="flex-1" />}
                      
                      <div className="flex items-center justify-between gap-3 font-ui text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)] mt-auto pt-4 border-t border-[var(--border)]">
                        <span className="truncate">{publication.authorName || "Editorial"}</span>
                        {publication.publishedAt && (
                          <span className="shrink-0 text-[var(--ink-faint)]">
                            {new Date(publication.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-8">
                <button
                  onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-full bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] disabled:opacity-30 hover:border-[var(--gold)] flex items-center justify-center transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (totalPages > 5 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                    if (Math.abs(pageNum - currentPage) === 3) return <span key={pageNum} className="text-[var(--ink-soft)] px-1">...</span>;
                    return null;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => { setCurrentPage(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`w-10 h-10 rounded-full text-xs font-extrabold flex items-center justify-center transition-all ${
                        currentPage === pageNum
                          ? "bg-[var(--gold)] text-[var(--bg)] border border-[var(--gold)]"
                          : "bg-[var(--surface)] text-[var(--ink-soft)] border border-[var(--border)] hover:border-[var(--gold)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-full bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] disabled:opacity-30 hover:border-[var(--gold)] flex items-center justify-center transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
