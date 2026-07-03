import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EssayCard } from "@/components/content/EssayCard";
import { PaperCard } from "@/components/content/PaperCard";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { GridSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { contentApi } from "@/lib/api";
import { DOMAINS } from "@/lib/constants";
import { cn, getDomainAccent } from "@/lib/utils";

type Tab = "essays" | "papers";

export function DomainDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<Tab>("essays");

  const staticDomain = DOMAINS.find((d) => d.slug === slug);
  const accent = slug ? getDomainAccent(slug) : "#B99A42";

  const { data: domain, isLoading, isError } = useQuery({
    queryKey: ["domain", slug],
    queryFn: () => contentApi.domain(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="container py-10 max-w-5xl">
          <Skeleton className="w-32 h-4 mb-8" />
          <Skeleton className="w-48 h-10 mb-3" />
          <Skeleton className="w-full max-w-md h-5 mb-10" />
          <GridSkeleton count={3} />
        </div>
      </AppShell>
    );
  }

  if ((isError || !domain) && !staticDomain) {
    return (
      <AppShell>
        <div className="container py-20">
          <EmptyState
            glyph="🗺"
            title="Domain not found"
            description="This field of inquiry doesn't exist or may have been renamed."
            action={{ label: "Browse all domains", href: "/domains" }}
          />
        </div>
      </AppShell>
    );
  }

  const name = domain?.name ?? staticDomain?.name ?? slug ?? "";
  const description = domain?.description ?? staticDomain?.description ?? "";
  const glyph = staticDomain?.glyph ?? "lotus";
  const articles = domain?.articles ?? [];
  const papers = domain?.papers ?? [];

  return (
    <AppShell>
      <div className="container py-10 max-w-5xl">
        <Breadcrumb
          backHref="/domains"
          backLabel="Domains"
          crumbs={[{ label: "Domains", href: "/domains" }, { label: name }]}
          className="mb-8"
        />

        {/* Domain header */}
        <div className="flex items-start gap-5 mb-10">
          <div
            className="w-16 h-16 shrink-0 flex items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <AnimalGlyph glyph={glyph} size={32} />
          </div>
          <div>
            <p className="eyebrow mb-1.5">Field of inquiry</p>
            <h1 className="font-[var(--font-display)] text-3xl font-bold text-[var(--color-ink)] mb-2">
              {name}
            </h1>
            <p className="text-[var(--color-muted)] leading-relaxed max-w-xl">{description}</p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex items-center gap-2 mb-8 border-b border-[var(--color-border)]">
          {([
            { id: "essays" as Tab, label: "Essays", count: articles.length },
            { id: "papers" as Tab, label: "Papers", count: papers.length },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm border-b-2 transition-colors -mb-px",
                tab === t.id
                  ? "border-[var(--color-gold)] text-[var(--color-ink)] font-medium"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              )}
            >
              {t.label} <span className="text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "essays" ? (
          articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((a) => <EssayCard key={a.id} article={a} />)}
            </div>
          ) : (
            <EmptyState
              glyph="📖"
              title="No essays in this domain yet"
              description="Be among the first to contribute an essay on this field of inquiry."
              action={{ label: "Submit an essay", href: "/write" }}
            />
          )
        ) : (
          papers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {papers.map((p) => <PaperCard key={p.id} paper={p} />)}
            </div>
          ) : (
            <EmptyState
              glyph="🗂"
              title="No papers in this domain yet"
              description="Research papers will appear here once published."
              action={{ label: "Submit a paper", href: "/write" }}
            />
          )
        )}
      </div>
    </AppShell>
  );
}
