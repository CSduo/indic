import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { DOMAIN_ORDER } from "@/lib/domainMeta";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function AboutPage() {
  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <HeroPanel
          image={asset("/images/heroes/explore-domain.jpg")}
          imageAlt="Illustrated archive and civilizational landscape"
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

      <section className="container-anv pb-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <ParchmentCard className="p-6 md:p-8">
              <p className="type-section-label mb-4">Mission</p>
              <div className="prose-anv">
                <p>
                  Anvikshiki is a journal dedicated to the rigorous and beautiful study of ideas.
                </p>
                <p>
                  We publish essays, research papers, translations, and commentary across philosophy, history, psychology, sociology, science, geopolitics, civilizational thought, and the Sanskrit tradition.
                </p>
                <blockquote>
                  The ancient word Anvikshiki means the philosophical examination of truth: the disciplined habit of questioning, comparing, and seeing clearly.
                </blockquote>
                <p>
                  Our aim is to bridge timeless wisdom with contemporary inquiry while preserving the calm, serious reading experience that scholarship deserves.
                </p>
              </div>
            </ParchmentCard>
          </div>

          <aside className="space-y-4">
            <ParchmentCard className="p-5 text-center">
              <AnimalGlyph domain="philosophy" size={72} className="mx-auto mb-3 text-[var(--gold)]" />
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
              <AnimalGlyph domain={value.domain} size={58} className="mx-auto mb-4 text-[var(--gold)]" />
              <h3 className="font-display text-3xl text-[var(--ink)]">{value.title}</h3>
              <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">{value.desc}</p>
            </ParchmentCard>
          ))}
        </div>

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
