import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { DOMAIN_ORDER, DOMAIN_META, type DomainKey } from "@/lib/domainMeta";

const FEATURED: DomainKey[] = ["philosophy", "history", "civilizational-thought", "sanskrit-studies"];

export default function DomainsPage() {
  const featured = FEATURED.map((k) => ({ key: k, ...DOMAIN_META[k] }));
  const rest = DOMAIN_ORDER.filter((k) => !FEATURED.includes(k)).map((k) => ({ key: k, ...DOMAIN_META[k] }));

  return (
    <div className="bg-[var(--bg)]">
      {/* Header */}
      <section className="container-anv py-12 md:py-16">
        <div className="max-w-2xl">
          <p className="type-section-label mb-3">Domains of Inquiry</p>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.1] text-[var(--ink)]">
            Explore the Fields
          </h1>
          <p className="mt-4 font-body text-base leading-7 text-[var(--ink-soft)] max-w-lg">
            Each domain is a living field of sustained inquiry — drawing from tradition,
            evidence, and imagination to map the terrain of thought.
          </p>
        </div>
      </section>

      <OrnamentDivider />

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
