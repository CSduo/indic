import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Map, FolderOpen, Search, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HeroPanel } from "@/components/hero/HeroPanel";
import { EssayCard } from "@/components/content/EssayCard";
import { PaperCard } from "@/components/content/PaperCard";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { contentApi, type Article, type Paper } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

type ArchiveView = "all" | "timelines" | "maps" | "collections";

const TIMELINE_ENTRIES = [
  { era: "1500 BCE", label: "Vedic Period", desc: "Composition of the Rigveda and foundational texts." },
  { era: "600 BCE",  label: "Mahajanapadas", desc: "Rise of the sixteen great kingdoms across the subcontinent." },
  { era: "322 BCE",  label: "Mauryan Empire", desc: "Chandragupta Maurya unifies much of South Asia." },
  { era: "320 CE",   label: "Gupta Era", desc: "The golden age of art, science, and philosophy." },
  { era: "1206 CE",  label: "Delhi Sultanate", desc: "Establishment of the first Muslim sultanate in Delhi." },
];

export function ArchivePage() {
  const [view, setView] = useState<ArchiveView>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["archive", { q: debouncedSearch }],
    queryFn: () => contentApi.archive(debouncedSearch ? { q: debouncedSearch } : {}),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.data ?? [];

  function isArticle(item: Article | Paper): item is Article {
    return "authorName" in item;
  }

  const views = [
    { id: "all" as ArchiveView,         label: "All",         icon: <BookOpen size={14} /> },
    { id: "timelines" as ArchiveView,   label: "Timelines",   icon: <Clock size={14} /> },
    { id: "maps" as ArchiveView,        label: "Maps",        icon: <Map size={14} /> },
    { id: "collections" as ArchiveView, label: "Collections", icon: <FolderOpen size={14} /> },
  ];

  return (
    <AppShell fullBleed>
      <HeroPanel
        variant="archive-scribe"
        eyebrow="Knowledge repository"
        headline="The Archive"
        subline="Manuscripts, timelines, thematic collections, and research paths across time and civilizations."
        minHeight="min-h-[44vh]"
        actions={[
          { label: "Explore archive", href: "/archive", variant: "primary" },
          { label: "Submit to archive", href: "/write", variant: "ghost" },
        ]}
      />

      <div className="container py-10">
        {/* View tabs + search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-full p-1 bg-white">
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                  view === v.id
                    ? "bg-[var(--color-ink)] text-[var(--color-parchment)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                )}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search archive…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
            fullWidth={false}
            className="w-64"
          />
        </div>

        {/* Timelines view */}
        {view === "timelines" && (
          <div className="max-w-2xl">
            <p className="eyebrow mb-6">Historical timeline</p>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" aria-hidden="true" />
              <div className="flex flex-col gap-0">
                {TIMELINE_ENTRIES.map((entry, i) => (
                  <div key={i} className="flex gap-6 pb-8">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-gold)]/15 border-2 border-[var(--color-gold)] text-[var(--color-gold)] relative z-10">
                        <AnimalGlyph glyph="lotus" size={14} />
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="eyebrow mb-0.5">{entry.era}</p>
                      <h3 className="font-[var(--font-display)] font-semibold text-[var(--color-ink)] mb-1">
                        {entry.label}
                      </h3>
                      <p className="text-sm text-[var(--color-muted)]">{entry.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-6">
                  <div className="w-8 flex items-center justify-center text-[var(--color-muted)] opacity-40">
                    <Clock size={16} />
                  </div>
                  <p className="text-sm text-[var(--color-muted)] italic pt-1">
                    Timeline grows as the archive is populated with essays and papers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Maps view */}
        {view === "maps" && (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[var(--color-parchment-dark)] text-[var(--color-muted)]">
              <Map size={28} />
            </div>
            <div>
              <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)] mb-2">
                Interactive maps — coming soon
              </h3>
              <p className="text-sm text-[var(--color-muted)] max-w-sm">
                Geographic explorations of trade routes, civilizational spread, and cultural exchange.
                These will populate as the archive grows.
              </p>
            </div>
          </div>
        )}

        {/* Collections view */}
        {view === "collections" && (
          <EmptyState
            glyph="🗂"
            title="No collections yet"
            description="Curated collections of essays, papers, and manuscripts will appear here."
            action={{ label: "Explore essays", href: "/essays" }}
          />
        )}

        {/* All view */}
        {view === "all" && (
          <>
            {isLoading ? (
              <GridSkeleton count={6} />
            ) : items.length === 0 ? (
              <EmptyState
                glyph="📜"
                title={debouncedSearch ? "Nothing found" : "Archive awaiting content"}
                description={
                  debouncedSearch
                    ? `No results for "${debouncedSearch}".`
                    : "Essays and papers will appear here as they are published."
                }
                action={
                  debouncedSearch
                    ? { label: "Clear search", onClick: () => setSearch("") }
                    : { label: "Submit work", href: "/write" }
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) =>
                  isArticle(item) ? (
                    <EssayCard key={`essay-${item.id}`} article={item} />
                  ) : (
                    <PaperCard key={`paper-${item.id}`} paper={item} />
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
