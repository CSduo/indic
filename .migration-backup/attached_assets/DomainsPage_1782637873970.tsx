import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { DomainCard } from "@/components/content/DomainCard";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { contentApi } from "@/lib/api";
import { DOMAINS } from "@/lib/constants";

export function DomainsPage() {
  const { data: domains, isLoading } = useQuery({
    queryKey: ["domains"],
    queryFn: contentApi.domains,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <AppShell>
      <div className="container py-10">
        <Breadcrumb crumbs={[{ label: "Domains" }]} className="mb-6" />

        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-2">Fields of inquiry</p>
          <h1 className="font-[var(--font-display)] text-4xl font-bold text-[var(--color-ink)] mb-3">
            Domains
          </h1>
          <p className="text-[var(--color-muted)] leading-relaxed">
            Ānvīkṣikī organises its archive across twelve fields of inquiry — each
            represented by an animal glyph drawn from traditional motif. Browse by
            domain to follow a single thread of thought across essays and papers.
          </p>
        </div>

        {isLoading ? (
          <GridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DOMAINS.map((domain) => {
              const apiDomain = domains?.find((d) => d.slug === domain.slug);
              return (
                <DomainCard
                  key={domain.slug}
                  domain={domain}
                  contentCount={apiDomain?.contentCount ?? 0}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
