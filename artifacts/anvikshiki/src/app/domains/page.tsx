import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { DOMAIN_ORDER, DOMAIN_META, getDomainMeta, type DomainKey } from "@/lib/domainMeta";
import { useDocumentMetadata } from "@/hooks/useDocumentMetadata";
import { readInitialData } from "@/lib/initialData";
import { PAGE_META } from "@/lib/pageMeta";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const FEATURED: DomainKey[] = ["philosophy", "history", "civilizational-thought", "sanskrit-studies"];

/** A domain hub with its number of published works (server data or /api/categories). */
type DomainSummary = {
  slug: string;
  name: string;
  description: string | null;
  articleCount: number;
  paperCount: number;
};

const plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`;

export default function DomainsPage() {
  // Same title and description as the server-rendered page.
  useDocumentMetadata({ ...PAGE_META.domains, canonicalPath: "/domains" });

  // The hubs and their work counts: first from the server-rendered page, then
  // refreshed from the API. A failed or blocked request keeps what is shown.
  const [domains, setDomains] = useState<DomainSummary[] | undefined>(() =>
    typeof window === "undefined" ? undefined : readInitialData<{ domains: DomainSummary[] }>("domains")?.domains,
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`${base()}/api/categories`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data?.categories)) return;
        setDomains(data.categories.map((category: any) => ({
          slug: String(category.slug),
          name: String(category.name),
          description: category.description ?? null,
          articleCount: Number(category.articleCount) || 0,
          paperCount: Number(category.paperCount) || 0,
        })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const withWork = (domains || [])
    .filter((d) => d.articleCount + d.paperCount > 0)
    .sort((a, b) => b.articleCount + b.paperCount - (a.articleCount + a.paperCount));
  const withoutWork = (domains || []).filter((d) => d.articleCount + d.paperCount === 0);

  const featured = FEATURED.map((k) => ({ key: k, ...DOMAIN_META[k] }));
  const rest = DOMAIN_ORDER.filter((k) => !FEATURED.includes(k)).map((k) => ({ key: k, ...DOMAIN_META[k] }));

  return (
    <div className="bg-[var(--bg)]">
      {/* Hero Banner */}
      <section className="container-anv pt-6 md:pt-10">
        <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden mb-8">
          <img src="/images/provided/domains-tiger-civilization-panel.jpg" alt="Illustrated tiger walking across ancient terraces above a grand city" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)]/80 to-transparent flex items-end p-6">
            <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--ink)' }}>Domains of Knowledge</h1>
          </div>
        </div>
      </section>

      {/* Header */}
      <section className="container-anv py-12 md:py-16">
        <div className="max-w-2xl">
          <p className="type-section-label mb-3">Domains of Inquiry</p>
          <h2 className="font-display text-5xl md:text-6xl leading-[1.1] text-[var(--ink)]">
            Explore the Fields
          </h2>
          <p className="mt-4 font-body text-base leading-7 text-[var(--ink-soft)] max-w-lg">
            Each domain is a living field of sustained inquiry — drawing from tradition,
            evidence, and imagination to map the terrain of thought.
          </p>
        </div>
      </section>

      <OrnamentDivider />

      {domains ? (
        <>
          {/* Hubs with published work, with their counts */}
          <section className="container-anv py-10">
            <p className="type-section-label mb-6">Domains with published work</p>
            {withWork.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {withWork.map((d) => {
                  const meta = getDomainMeta(d.slug);
                  return (
                    <Link key={d.slug} href={`/domains/${encodeURIComponent(d.slug)}`}>
                      <ParchmentCard className="p-6 h-full group cursor-pointer hover:border-[var(--border-gold)] transition-all duration-200">
                        <div className="mb-5 flex items-start justify-between">
                          <AnimalGlyph domain={meta.key} size={40} style={{ color: meta.color }} />
                        </div>
                        <h2 className="font-display text-2xl text-[var(--ink)] leading-tight mb-2">{d.name}</h2>
                        <p className="font-ui text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] mb-2">
                          {plural(d.articleCount, "essay")}
                          {d.paperCount > 0 ? ` · ${plural(d.paperCount, "paper")}` : ""}
                        </p>
                        {d.description && (
                          <p className="font-body text-sm leading-6 text-[var(--ink-soft)] mb-4">{d.description}</p>
                        )}
                        <span className="inline-flex items-center gap-1 font-ui text-xs text-[var(--gold)] group-hover:gap-2 transition-all">
                          Explore <ArrowRight size={12} />
                        </span>
                      </ParchmentCard>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="font-body text-base text-[var(--ink-soft)]">Nothing has been published yet.</p>
            )}
          </section>

          {withoutWork.length > 0 && (
            <section className="container-anv py-6">
              <p className="type-section-label mb-3">Domains with no published work yet</p>
              <p className="font-body text-sm leading-6 text-[var(--ink-soft)]">
                {withoutWork.map((d) => d.name).join(", ")}.{" "}
                <Link href="/submit" className="text-[var(--terracotta)] hover:underline">Submissions in these areas are welcome</Link>.
              </p>
            </section>
          )}
        </>
      ) : (
      <>
      {/* Featured domains */}
      <section className="container-anv py-10">
        <p className="type-section-label mb-6">Core Fields</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((d) => (
            <Link key={d.key} href={d.route}>
              <ParchmentCard className="p-6 h-full group cursor-pointer hover:border-[var(--border-gold)] transition-all duration-200">
                <div className="mb-5 flex items-start justify-between">
                  <AnimalGlyph domain={d.key} size={40} style={{ color: d.color }} />
                </div>
                <h2 className="font-display text-2xl text-[var(--ink)] leading-tight mb-2">
                  {d.label}
                </h2>
                <p className="font-body text-sm leading-6 text-[var(--ink-soft)] mb-4">
                  {d.description}
                </p>
                <span className="inline-flex items-center gap-1 font-ui text-xs text-[var(--gold)] group-hover:gap-2 transition-all">
                  Explore <ArrowRight size={12} />
                </span>
              </ParchmentCard>
            </Link>
          ))}
        </div>
      </section>

      <OrnamentDivider className="my-2" />

      {/* All other domains */}
      <section className="container-anv py-10">
        <p className="type-section-label mb-6">Further Fields</p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {rest.map((d) => (
            <Link key={d.key} href={d.route}>
              <div className="group flex items-center gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-gold)] transition-all duration-200 cursor-pointer">
                <AnimalGlyph domain={d.key} size={32} style={{ color: d.color }} className="shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-display text-xl text-[var(--ink)] leading-tight">{d.label}</h3>
                  <p className="mt-0.5 font-body text-xs leading-5 text-[var(--ink-soft)] line-clamp-2">{d.description}</p>
                </div>
                <ArrowRight size={14} className="shrink-0 text-[var(--muted)] group-hover:text-[var(--gold)] transition-colors ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      </>
      )}

      {/* CTA */}
      <section className="container-anv py-10 pb-16">
        <OrnamentDivider className="mb-10" />
        <div className="rounded-[12px] border border-[var(--border-gold)] bg-[var(--surface)] p-8 md:p-12 text-center">
          <AnimalGlyph domain="papers" size={48} className="mx-auto mb-4 text-[var(--gold)]" />
          <h2 className="font-display text-3xl md:text-4xl text-[var(--ink)] mb-3">
            Don't see your field?
          </h2>
          <p className="font-body text-base leading-7 text-[var(--ink-soft)] max-w-md mx-auto mb-6">
            Submit an essay or paper — the archive grows with the voices that enter it.
          </p>
          <Link href="/submit" className="btn-terracotta">Submit Your Work</Link>
        </div>
      </section>
    </div>
  );
}
