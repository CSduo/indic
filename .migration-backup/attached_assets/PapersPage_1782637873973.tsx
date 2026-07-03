import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PaperCard } from "@/components/content/PaperCard";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { contentApi } from "@/lib/api";
import { DOMAINS } from "@/lib/constants";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

type FilterType = "all" | "peer-reviewed" | "working-paper";

export function PapersPage() {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [domain, setDomain] = useState("");
  const [type, setType] = useState<FilterType>("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["papers", { domain, type, sort, q: debouncedSearch }],
    queryFn: () =>
      contentApi.papers({
        ...(domain ? { domain } : {}),
        ...(type !== "all" ? { type } : {}),
        sort,
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
      }),
    staleTime: 2 * 60 * 1000,
  });

  const papers = data?.data ?? [];

  return (
    <AppShell>
      <div className="container py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="eyebrow mb-2">Research archive</p>
          <h1 className="font-[var(--font-display)] text-4xl font-bold text-[var(--color-ink)] mb-3">
            Papers
          </h1>
          <p className="text-[var(--color-muted)] max-w-xl">
            Peer-reviewed research, working papers, and academic submissions across philosophy,
            history, science, and civilizational inquiry.
          </p>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {(
            [
              { id: "all", label: "All papers" },
              { id: "peer-reviewed", label: "Peer reviewed" },
              { id: "working-paper", label: "Working papers" },
            ] as { id: FilterType; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setType(f.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                type === f.id
                  ? "bg-[var(--color-ink)] text-[var(--color-parchment)] border-[var(--color-ink)]"
                  : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Domain chips */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={() => setDomain("")}
            className={cn(
              "px-3 py-1 rounded-full text-xs border transition-all",
              !domain
                ? "bg-[var(--color-teal)] text-white border-[var(--color-teal)]"
                : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-teal)]"
            )}
          >
            All domains
          </button>
          {DOMAINS.map((d) => (
            <button
              key={d.slug}
              onClick={() => setDomain(d.slug === domain ? "" : d.slug)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all",
                domain === d.slug
                  ? "bg-[var(--color-teal)] text-white border-[var(--color-teal)]"
                  : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-teal)]"
              )}
            >
              <AnimalGlyph glyph={d.glyph} size={11} />
              {d.name}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Input
            placeholder="Search papers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth={false}
            className="w-64"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2.5 bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="downloads">Most downloaded</option>
          </select>

          <div className="flex items-center border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden ml-auto">
            <button
              onClick={() => setLayout("grid")}
              className={cn("px-3 py-2 transition-colors", layout === "grid" ? "bg-[var(--color-ink)] text-white" : "bg-white text-[var(--color-muted)] hover:bg-[var(--color-parchment-dark)]")}
              aria-label="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setLayout("list")}
              className={cn("px-3 py-2 transition-colors", layout === "list" ? "bg-[var(--color-ink)] text-white" : "bg-white text-[var(--color-muted)] hover:bg-[var(--color-parchment-dark)]")}
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <GridSkeleton count={6} />
        ) : papers.length === 0 ? (
          <EmptyState
            glyph="🗂"
            title={debouncedSearch ? "No papers found" : "No papers yet"}
            description={
              debouncedSearch
                ? `No papers match "${debouncedSearch}". Try a different query.`
                : "Research papers will appear here once submitted and published."
            }
            action={
              debouncedSearch
                ? { label: "Clear search", onClick: () => setSearch("") }
                : { label: "Submit a paper", href: "/write" }
            }
          />
        ) : layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {papers.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {papers.map((p) => (
              <PaperCard key={p.id} paper={p} layout="list" />
            ))}
          </div>
        )}

        {data?.hasMore && (
          <div className="flex justify-center mt-10">
            <Button variant="outline">Load more papers</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
