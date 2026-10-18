import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { AmbientPetals, FloralBorder, FloralCorner } from "@/components/sacred/FloralDecor";
import { DOMAIN_ORDER } from "@/lib/domainMeta";
import { useDocumentMetadata } from "@/hooks/useDocumentMetadata";
import { CONTACT_EMAIL, PAGE_META } from "@/lib/pageMeta";
import { readInitialData } from "@/lib/initialData";
import { WorkIndexList } from "@/components/manuscript/WorkIndex";
import { fetchListedWorks, formatListedDate, workHref, type ListedWork } from "@/lib/listedWorks";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

/** How many of the newest works /about lists (the server's ABOUT_LATEST_COUNT). */
const LATEST_COUNT = 10;

type DomainCount = { slug: string; name: string; description: string | null; articleCount: number; paperCount: number };

/** What the server-rendered /about lists, embedded as __INITIAL_DATA__. */
type AboutListing = {
  latest: ListedWork[];
  total: number;
  /** How many of `total` are essays (the rest are papers). */
  essays: number;
  domains: DomainCount[];
  /** The journal's own essay on why it was started, while it is published. */
  mission: ListedWork | null;
};

const plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`;

export default function AboutPage() {
  // Same title and description as the server-rendered page.
  useDocumentMetadata({ ...PAGE_META.about, canonicalPath: "/about" });

  // The published work the page describes: from the server-rendered page, or
  // from the list APIs after client-side navigation.
  const [listing, setListing] = useState<AboutListing | null>(() =>
    (typeof window === "undefined" ? null : readInitialData<AboutListing>("about")) ?? null,
  );
  useEffect(() => {
    if (listing) return;
    const controller = new AbortController();
    Promise.all([
      fetchListedWorks(controller.signal),
      fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/categories`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ]).then(([works, categories]) => {
      if (!works) return;
      setListing({
        latest: works.slice(0, LATEST_COUNT),
        total: works.length,
        essays: works.filter((w) => w.kind === "article").length,
        domains: Array.isArray(categories?.categories) ? categories.categories : [],
        mission: null,
      });
    });
    return () => controller.abort();
  }, [listing]);

  const essays = listing?.essays ?? 0;
  const papers = (listing?.total ?? 0) - essays;
  const domainNames = new Map((listing?.domains || []).map((d) => [d.slug, d.name]));
  const hubs = (listing?.domains || [])
    .filter((d) => d.articleCount + d.paperCount > 0)
    .sort((a, b) => b.articleCount + b.paperCount - (a.articleCount + a.paperCount));
  const newest = listing?.latest[0]?.publishedAt;
  return (
    <div className="relative bg-[var(--bg)] overflow-hidden">
      <AmbientPetals />
      <FloralCorner position="tl" size={90} className="absolute top-0 left-0 text-[var(--flower-gold)] opacity-45" />
      <FloralCorner position="tr" size={90} className="absolute top-0 right-0 text-[var(--flower-gold)] opacity-45" />
      <section className="container-anv relative z-10 py-6 md:py-10">
        <HeroPanel
          image={asset("/images/provided/about-temple-guardian-cat-hero.jpg")}
          imageAlt="Illustrated scholar walking past carved temple panels with a black cat companion"
          eyebrow="Our Mission"
          title="About Anvikshiki"
          subtitle="The philosophical examination of truth."
          description="A journal and research platform for rigorous inquiry, civilizational memory, and beautiful long-form scholarship."
          glyph="civilizational-thought"
          focal="center"
          ctaPrimary={{ label: "Submit Work", href: "/submit" }}
          ctaSecondary={{ label: "Explore", href: "/browse" }}
        />
      </section>

      <FloralBorder petals={5} className="my-2 px-8 opacity-50 relative z-10" />
      <section className="container-anv relative z-10 pb-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <ParchmentCard className="p-6 md:p-8">
              <p className="type-section-label mb-4">Mission</p>
              <div className="prose-anv">
                <p>
                  Anvikshiki is a journal dedicated to the rigorous and beautiful study of ideas.
                </p>
                <p>
                  We accept essays, research papers, translations and commentary across philosophy, history, psychology, sociology, science, geopolitics, civilizational thought and the Sanskrit tradition. The work published so far is essays, mostly on history, philosophy and politics.
                </p>
                <blockquote>
                  The ancient word Ānvīkṣikī (आन्वीक्षिकी) means the philosophical examination of truth: the disciplined habit of questioning, comparing, and seeing clearly.
                </blockquote>
                <p>
                  Our aim is to bridge timeless wisdom with contemporary inquiry while preserving the calm, serious reading experience that scholarship deserves.
                </p>
                {listing && listing.total > 0 && (
                  <p>
                    {plural(essays, "essay")}{papers > 0 ? ` and ${plural(papers, "research paper")}` : ""} published so far
                    {newest ? <>, the most recent on <time dateTime={newest}>{formatListedDate(newest)}</time></> : null}. Every essay is free to read.
                  </p>
                )}
                {hubs.length > 0 && (
                  <ul>
                    {hubs.map((d) => (
                      <li key={d.slug}>
                        <Link href={`/domains/${encodeURIComponent(d.slug)}`} className="text-[var(--accent)] hover:underline">{d.name}</Link>{" "}
                        ({plural(d.articleCount + d.paperCount, "work")}){d.description ? `: ${d.description}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {listing?.mission && (
                  <p>
                    The essay{" "}
                    <Link href={workHref(listing.mission)} className="text-[var(--accent)] hover:underline">{listing.mission.title}</Link>{" "}
                    explains why the journal was started.
                  </p>
                )}
                <div className="mt-6 pt-4 border-t border-[var(--border-ink)]">
                  <Link href="/about/anvikshiki" className="inline-flex items-center gap-2 text-[var(--terracotta)] font-ui font-semibold text-sm hover:underline">
                    <span>Read the complete scholarly treatise on the Meaning & Etymology of Ānvīkṣikī</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </ParchmentCard>
          </div>

          <aside className="space-y-4">
            <ParchmentCard className="p-5 text-center">
              <AnimalGlyph domain="philosophy" size={72} className="mx-auto mb-3" />
              <h2 className="font-display text-3xl text-[var(--ink)]">Inquiry, Wisdom, Truth</h2>
              <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">The platform is built as a living archive, not a disposable feed.</p>
            </ParchmentCard>
          </aside>
        </div>

        <OrnamentDivider className="my-10" />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { domain: "philosophy", title: "Inquiry", desc: "Systematic questioning as the foundation of wisdom." },
            { domain: "history", title: "Tradition", desc: "Memory and inheritance examined with intellectual care." },
            { domain: "science", title: "Illumination", desc: "Clarity, evidence, and discovery presented beautifully." },
          ].map((value) => (
            <ParchmentCard key={value.title} className="p-6 text-center">
              <AnimalGlyph domain={value.domain} size={58} className="mx-auto mb-4" />
              <h3 className="font-display text-3xl text-[var(--ink)]">{value.title}</h3>
              <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">{value.desc}</p>
            </ParchmentCard>
          ))}
        </div>

        {/* Published work, how submissions work and how to reach the editor, as on the server-rendered page. */}
        <section
          className="mt-12 grid gap-6 lg:grid-cols-[1fr_340px]"
          aria-labelledby={listing && listing.latest.length > 0 ? "about-latest-heading" : undefined}
        >
          {listing && listing.latest.length > 0 && (
            <ParchmentCard className="p-6 md:p-8" hover={false}>
              <h2 id="about-latest-heading" className="type-section-label mb-6">
                {listing.total > listing.latest.length ? "Recently published" : "Published essays"}
              </h2>
              <WorkIndexList works={listing.latest} domainNames={domainNames} />
              <p className="mt-6 border-t border-[var(--border)] pt-4 font-ui text-sm">
                <Link href="/archive" className="text-[var(--accent)] hover:underline">
                  {listing.total > listing.latest.length ? `All ${listing.total} published works in the archive` : "The archive"}
                </Link>
                <span aria-hidden="true" className="text-[var(--ink-faint)]"> · </span>
                <Link href="/domains" className="text-[var(--accent)] hover:underline">Domains</Link>
              </p>
            </ParchmentCard>
          )}
          <div className={listing && listing.latest.length > 0 ? "space-y-6" : "space-y-6 lg:col-span-2"}>
            <ParchmentCard className="p-6" hover={false}>
              <h2 className="font-display text-2xl text-[var(--ink)]">How submissions work</h2>
              <div className="mt-3 space-y-3 font-body text-sm leading-6 text-[var(--ink-soft)]">
                <p>Submitting needs an account. Authors write the piece in the browser editor or upload a PDF, Word (.doc or .docx) or plain-text file together with its details.</p>
                <p>Each submission is read by the editor, who may accept it, ask for revisions or decline it. Nothing is published without the editor's decision. Authors keep ownership of their work (see the <Link href="/terms" className="text-[var(--accent)] hover:underline">terms</Link>).</p>
                <p><Link href="/submit" className="text-[var(--accent)] hover:underline">Read the submission guidelines</Link></p>
              </div>
            </ParchmentCard>
            <ParchmentCard className="p-6" hover={false}>
              <h2 className="font-display text-2xl text-[var(--ink)]">Contact</h2>
              <p className="mt-3 font-body text-sm leading-6 text-[var(--ink-soft)]">
                Write to the editor at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] hover:underline">{CONTACT_EMAIL}</a>, or use the{" "}
                <Link href="/contact" className="text-[var(--accent)] hover:underline">contact page</Link>.
              </p>
            </ParchmentCard>
          </div>
        </section>

        <section className="mt-12">
          <p className="type-section-label mb-4 text-center">Disciplines We Explore</p>
          <div className="flex flex-wrap justify-center gap-2">
            {DOMAIN_ORDER.slice(0, 12).map((domain) => (
              <Link key={domain} href={`/domains/${domain}`} className="glyph-tag">
                <AnimalGlyph domain={domain} size={16} />
                <span>{domain.replace(/-/g, " ")}</span>
              </Link>
            ))}
          </div>
        </section>

        <ParchmentCard className="mt-12 p-7 text-center">
          <h2 className="font-display text-4xl text-[var(--ink)]">Join the archive.</h2>
          <p className="mx-auto mt-3 max-w-xl font-body text-base leading-7 text-[var(--ink-soft)]">Share your research and reflections with a community of seekers and scholars.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/submit" className="btn-terracotta">Submit Your Work <ArrowRight size={14} /></Link>
            <Link href="/community" className="btn-ink">Join Community</Link>
          </div>
        </ParchmentCard>
      </section>
    </div>
  );
}
