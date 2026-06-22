"use client";

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { BookOpen, FileText, Calendar, Bookmark, ChevronDown, SlidersHorizontal } from "lucide-react";

const CATEGORY_PILLS = ["All", "Philosophy", "History", "Psychology", "Sociology", "Science", "Geopolitics"];
const PAPER_TYPES = ["All Types", "Research Paper", "Working Paper", "Review Essay", "Monograph"];
const STATUS_OPTIONS = ["All Status", "Peer-Reviewed", "Working Paper", "Awaiting Publication"];
const SORT_OPTIONS = ["Newest", "Oldest", "Most Cited"];

export default function PapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("Newest");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/papers`)
      .then((r) => r.json())
      .then((data) => setPapers(data.papers || []))
      .catch(() => setPapers([]))
      .finally(() => setLoading(false));
  }, []);

  // Skeleton placeholder papers for the empty state
  const placeholderItems = [
    { label: "WORKING PAPER", color: "var(--gold)", bg: "rgba(168,124,43,0.12)", img: "/homepage_hero.jpg", title: "Working paper will appear here." },
    { label: "PEER-REVIEWED",  color: "#7c5c9e",    bg: "rgba(124,92,158,0.12)", img: "/about_hero.jpg",    title: "Working paper will appear here." },
    { label: "AWAITING PUBLICATION", color: "var(--muted)", bg: "rgba(150,150,150,0.1)", img: "/admin_sidebar_bg.jpg", title: "Awaiting first publication." },
  ];

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>

      {/* Hero header with background image */}
      <div className="container-anv pt-3 pb-5">
        <div className="card-anv overflow-hidden">
          <div
            className="relative flex flex-col justify-end p-6 md:p-10 bg-cover bg-right-top"
            style={{ minHeight: "260px", backgroundImage: "url('/papers_hero.jpg')" }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to right, color-mix(in srgb, var(--bg) 90%, transparent) 0%, color-mix(in srgb, var(--bg) 50%, transparent) 55%, transparent 100%)",
              }}
            />
            <div className="relative z-10 max-w-xs">
              <span className="font-ui text-[10px] font-semibold tracking-[0.22em] uppercase mb-1 block" style={{ color: "var(--gold)" }}>
                Research Archive
              </span>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-[1px] w-8" style={{ background: "var(--gold)" }} />
                <span style={{ color: "var(--gold)", fontSize: "12px" }}>✦</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl" style={{ color: "var(--ink)" }}>Papers</h1>
              <p className="font-body text-sm mt-2 leading-relaxed" style={{ color: "var(--muted)" }}>
                Curated, peer-reviewed research across disciplines. Explore knowledge preserved for time, and conversations that shape tomorrow.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-anv py-2">
        {/* Domain pill tabs */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-ui text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--gold)" }}>
              Browse by Discipline
            </span>
            <button className="font-ui text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--muted)" }}>
              All Disciplines <ChevronDown size={12} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_PILLS.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full font-ui text-xs font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  background: categoryFilter === c ? "var(--gold)" : "var(--surface)",
                  color: categoryFilter === c ? "#1a1108" : "var(--ink)",
                  border: "1px solid var(--border)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-ui text-xs cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--ink)" }}>
            Type <span style={{ color: "var(--muted)" }}>{typeFilter}</span> <ChevronDown size={12} style={{ color: "var(--muted)" }} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-ui text-xs cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--ink)" }}>
            Status <span style={{ color: "var(--muted)" }}>{statusFilter}</span> <ChevronDown size={12} style={{ color: "var(--muted)" }} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-ui text-xs cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--ink)" }}>
            Sort by <span style={{ color: "var(--muted)" }}>{sortBy}</span> <ChevronDown size={12} style={{ color: "var(--muted)" }} />
          </div>
          <div className="ml-auto">
            <SlidersHorizontal size={16} style={{ color: "var(--muted)" }} />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Placeholder state */}
        {!loading && papers.length === 0 && (
          <div className="space-y-3">
            {placeholderItems.map((item, i) => (
              <div
                key={i}
                className="flex gap-3 items-start rounded-2xl p-4 opacity-80"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-20 h-16 rounded-xl shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${item.img}')` }}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className="status-badge text-[9px] mb-1.5 inline-block"
                    style={{ background: item.bg, color: item.color }}
                  >
                    {item.label}
                  </span>
                  <h4 className="font-display text-base" style={{ color: "var(--ink)" }}>
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-ui text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <BookOpen size={10} /> Archive
                    </span>
                    <span className="font-ui text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <FileText size={10} /> PDF
                    </span>
                    <span className="font-ui text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <Calendar size={10} /> Year
                    </span>
                  </div>
                </div>
                <Bookmark size={16} style={{ color: "var(--border)" }} />
              </div>
            ))}

            {/* Empty state footer */}
            <div className="text-center py-10">
              <div className="flex items-center justify-center gap-3 mb-3 opacity-30">
                <span style={{ color: "var(--gold)", fontSize: "20px" }}>✦</span>
                <BookOpen size={28} style={{ color: "var(--muted)" }} />
                <span style={{ color: "var(--gold)", fontSize: "20px" }}>✦</span>
              </div>
              <p className="font-display text-lg" style={{ color: "var(--ink)" }}>No published papers yet.</p>
              <p className="font-body text-sm mt-1" style={{ color: "var(--muted)" }}>
                New research will be added to the archive soon.
              </p>
            </div>
          </div>
        )}

        {/* Real papers */}
        {!loading && papers.length > 0 && (
          <div className="space-y-3">
            {papers.map((paper: any) => (
              <Link
                key={paper.id}
                href={`/papers/${paper.slug}`}
                className="flex gap-3 items-start rounded-2xl p-4 hover:translate-y-[-2px] transition-all block"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-20 h-16 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: "var(--surface-soft)", backgroundImage: paper.coverImageUrl ? `url(${paper.coverImageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
                >
                  {!paper.coverImageUrl && <FileText size={22} style={{ color: "var(--gold)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className="status-badge text-[9px] mb-1.5 inline-block"
                    style={{
                      background: paper.peerReviewed ? "rgba(124,92,158,0.12)" : "rgba(168,124,43,0.12)",
                      color: paper.peerReviewed ? "#7c5c9e" : "var(--gold)",
                    }}
                  >
                    {paper.peerReviewed ? "PEER-REVIEWED" : "WORKING PAPER"}
                  </span>
                  <h4 className="font-display text-base leading-snug" style={{ color: "var(--ink)" }}>
                    {paper.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-ui text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <BookOpen size={10} /> {paper.category?.name || "Archive"}
                    </span>
                    {paper.pdfUrl && (
                      <span className="font-ui text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                        <FileText size={10} /> PDF
                      </span>
                    )}
                    {paper.year && (
                      <span className="font-ui text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                        <Calendar size={10} /> {paper.year}
                      </span>
                    )}
                  </div>
                </div>
                <Bookmark size={16} className="shrink-0 mt-1" style={{ color: "var(--border)" }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
