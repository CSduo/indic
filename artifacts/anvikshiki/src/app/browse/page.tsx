import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, Grid2X2, List, SlidersHorizontal } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { DOMAIN_META, DOMAIN_ORDER } from "@/lib/domainMeta";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function BrowsePage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const domains = DOMAIN_ORDER;

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--terracotta)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Explore</span>
        </nav>

        <HeroPanel
          image={asset("/images/provided/browse-atlas-map-hero.jpg")}
          imageAlt="Illustrated civilizational atlas map with routes, ships, animals, and cities"
          eyebrow="Domain Atlas"
          title="Explore by Domain"
          subtitle="Discover knowledge across timeless fields of inquiry."
          description="Move through essays, papers, archives, and civilizational questions using a symbolic taxonomy of domains."
          glyph="archive"
          focal="center"
          ctaPrimary={{ label: "View Archive", href: "/archive" }}
          ctaSecondary={{ label: "Search", href: "/search" }}
        />
      </section>

      <section className="container-anv pb-12">
        <ParchmentCard className="mb-6 grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div>
            <p className="type-section-label mb-2">View</p>
            <div className="flex rounded-[8px] border border-[var(--border-ink)] bg-[var(--surface)] p-1">
              <button
                type="button"
                className="grid h-9 w-10 place-items-center rounded"
                style={{ background: view === "grid" ? "var(--terracotta-pale)" : "transparent", color: view === "grid" ? "var(--terracotta)" : "var(--ink-faint)" }}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <Grid2X2 size={18} />
              </button>
              <button
                type="button"
                className="grid h-9 w-10 place-items-center rounded"
                style={{ background: view === "list" ? "var(--terracotta-pale)" : "transparent", color: view === "list" ? "var(--terracotta)" : "var(--ink-faint)" }}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          <div>
            <p className="type-section-label mb-2">Filter by</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {["All Domains", "All Periods", "All Regions"].map((label) => (
                <button key={label} type="button" className="input-sacred flex items-center justify-between text-left text-sm">
                  {label} <ChevronDown size={15} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="type-section-label mb-2">Sort by</p>
            <button type="button" className="input-sacred flex min-w-36 items-center justify-between text-left text-sm">
              Featured <ChevronDown size={15} />
            </button>
          </div>
        </ParchmentCard>

        <ParchmentCard className="mb-7 grid overflow-hidden md:grid-cols-[220px_1fr]">
          <div className="grid min-h-52 place-items-center bg-[var(--aged-jade)]/16 p-6 text-[var(--aged-jade)]">
            <AnimalGlyph domain="philosophy" size={116} />
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_.95fr] md:items-center">
            <div>
              <p className="type-section-label mb-2">Featured Domain</p>
              <h2 className="font-display text-4xl text-[var(--ink)]">Philosophy</h2>
              <p className="mt-3 max-w-md font-body text-lg leading-8 text-[var(--ink-soft)]">
                Explore reality, self, truth, ethics, logic, and the examined life.
              </p>
              <Link href="/domains/philosophy" className="btn-terracotta mt-5">
                Explore Philosophy <ArrowRight size={14} />
              </Link>
            </div>
            <blockquote className="border-l border-[var(--border-gold)] pl-5 font-display text-xl italic leading-8 text-[var(--ink-soft)]">
              Inquiry is the bridge between the seen and the unseen; it is built not of stone, but attention.
            </blockquote>
          </div>
        </ParchmentCard>

        <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-3"}>
          {domains.map((key) => {
            const domain = DOMAIN_META[key];
            return (
              <Link key={key} href={domain.route}>
                <ParchmentCard className={view === "grid" ? "domain-card min-h-64 p-5" : "domain-card flex items-center gap-5 p-5"}>
                  <div className="text-[var(--gold)]" style={{ color: domain.color }}>
                    <AnimalGlyph domain={key} size={view === "grid" ? 64 : 42} />
                  </div>
                  <div className={view === "grid" ? "mt-5" : "min-w-0 flex-1"}>
                    <h3 className="font-display text-3xl leading-none text-[var(--ink)]">{domain.label}</h3>
                    <p className="mt-3 line-clamp-3 font-body text-sm leading-6 text-[var(--ink-soft)]">{domain.description}</p>
                    <div className="mt-5 flex items-center justify-between font-ui text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      <span>{domain.countLabel || "Works"}</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </ParchmentCard>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-anv pb-14">
        <ParchmentCard className="grid gap-6 bg-[var(--aged-jade)] p-6 text-[var(--surface)] md:grid-cols-[1fr_1.2fr] md:items-center" corners={false}>
          <div>
            <p className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-pale)]">Knowledge is connected</p>
            <h2 className="mt-2 font-display text-3xl text-[var(--surface)]">Discover relationships between ideas.</h2>
            <Link href="/archive" className="btn-ink mt-5 border-[var(--gold-pale)] text-[var(--surface)]">
              Explore Knowledge Map <ArrowRight size={14} />
            </Link>
          </div>
          <div className="relative min-h-32 overflow-hidden rounded-[8px] border border-[rgba(255,248,232,.25)]">
            <svg viewBox="0 0 560 160" className="h-full w-full" aria-hidden="true">
              {[
                [90, 60, 210, 90],
                [210, 90, 320, 50],
                [320, 50, 430, 92],
                [210, 90, 430, 92],
                [140, 120, 320, 50],
              ].map(([x1, y1, x2, y2], index) => (
                <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,248,232,.32)" strokeWidth="1" />
              ))}
              {["history", "philosophy", "science", "sociology", "archive"].map((domain, index) => {
                const points = [[90, 60], [210, 90], [320, 50], [430, 92], [140, 120]][index];
                return <circle key={domain} cx={points[0]} cy={points[1]} r="24" fill="rgba(255,248,232,.16)" stroke="rgba(255,248,232,.42)" />;
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-around px-8 text-[var(--gold-pale)]">
              {["history", "philosophy", "science", "sociology", "archive"].map((domain) => <AnimalGlyph key={domain} domain={domain} size={30} />)}
            </div>
          </div>
        </ParchmentCard>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["philosophy", "history", "science", "papers", "archive"].map((domain) => <GlyphTag key={domain} domain={domain} />)}
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-gold)] bg-[var(--surface)] px-3 py-1 font-ui text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            <SlidersHorizontal size={14} /> More filters soon
          </span>
        </div>
      </section>
    </div>
  );
}
