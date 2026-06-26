import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock, Send, Users } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { DOMAIN_META, DOMAIN_ORDER, getDomainMeta } from "@/lib/domainMeta";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function HomePage() {
  const { user } = useAuthContext();
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${base()}/api/articles?limit=3`)
      .then((response) => response.json())
      .catch(() => ({}))
      .then((data) => {
        setRecent(data.articles || []);
        setLoading(false);
      });
  }, []);

  const domainKeys = DOMAIN_ORDER.slice(0, 8);

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <HeroPanel
          layout="overlay"
          focal="center"
          image={asset("/images/heroes/home-journey.jpg")}
          imageAlt="Illustrated scholar-traveler moving through an archive landscape"
          eyebrow="Journal & Research Platform"
          title="A Journey Through Archives and Ideas"
          subtitle="Where inquiry becomes insight."
          description="Anvikshiki gathers essays, papers, manuscripts, and conversations across philosophy, history, science, and civilizational inquiry."
          glyph="philosophy"
          ctaPrimary={{ label: "Submit Your Work", href: "/submit" }}
          ctaSecondary={{ label: "Explore Journal", href: "/browse" }}
        >
          <div className="mt-8 hidden items-center gap-3 text-[var(--muted)] md:flex">
            <span className="h-px w-12 bg-[var(--border-gold)]" />
            <span className="font-ui text-[10px] font-bold uppercase tracking-[.22em]">Begin the journey</span>
            <span className="h-px w-12 bg-[var(--border-gold)]" />
          </div>
        </HeroPanel>

        <div className="glyph-procession my-8 overflow-hidden">
          <div className="glyph-procession-track flex w-max gap-10 text-[var(--gold)] opacity-55">
            {[...domainKeys, ...domainKeys].map((domain, index) => (
              <AnimalGlyph key={`${domain}-${index}`} domain={domain} size={28} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-anv py-10">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="type-section-label mb-2">Featured Essays</p>
            <h2 className="font-display text-4xl leading-none text-[var(--ink)]">Latest from the Journal</h2>
          </div>
          <Link href="/browse" className="hidden items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--terracotta)] sm:flex">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-[8px] bg-[var(--ink-wash-strong)]" />)}
          </div>
        ) : recent.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {recent.map((article) => (
              <Link key={article.id} href={`/articles/${article.slug || article.id}`}>
                <ParchmentCard className="flex h-full min-h-56 flex-col p-5">
                  <GlyphTag domain={article.categorySlug || article.categoryId || "philosophy"} className="mb-4 w-fit" />
                  <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">{article.title}</h3>
                  {article.excerpt ? <p className="mt-3 line-clamp-3 font-body text-sm leading-6 text-[var(--ink-soft)]">{article.excerpt}</p> : null}
                  <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <span className="font-ui text-xs text-[var(--ink-faint)]">{article.authorName || "Editorial"}</span>
                    <span className="flex items-center gap-1 font-ui text-xs text-[var(--gold)]">
                      <Clock size={13} /> {article.readingTime || 8} min
                    </span>
                  </div>
                </ParchmentCard>
              </Link>
            ))}
          </div>
        ) : (
          <ParchmentCard className="mx-auto max-w-2xl p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-[var(--border-gold)] text-[var(--gold)]">
              <AnimalGlyph domain="archive" size={42} />
            </div>
            <h3 className="font-display text-3xl text-[var(--ink)]">The first folio awaits.</h3>
            <p className="mx-auto mt-3 max-w-md font-body text-base leading-7 text-[var(--ink-soft)]">
              Published essays will appear here once the editorial archive opens its next page.
            </p>
            <Link href="/submit" className="btn-terracotta mt-6">
              Submit Work <ArrowRight size={14} />
            </Link>
          </ParchmentCard>
        )}
      </section>

      <section className="border-y border-[var(--border-gold)] bg-[var(--bg-alt)] py-12">
        <div className="container-anv">
          <div className="mb-8 text-center">
            <p className="type-section-label mb-2">Browse by Domain</p>
            <h2 className="font-display text-4xl text-[var(--ink)]">Paths of Inquiry</h2>
            <OrnamentDivider variant="minimal" className="mt-5" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {domainKeys.map((key) => {
              const domain = DOMAIN_META[key];
              return (
                <Link key={key} href={domain.route}>
                  <ParchmentCard className="domain-card min-h-52 p-5">
                    <div className="mb-4 text-[var(--gold)]" style={{ color: domain.color }}>
                      <AnimalGlyph domain={key} size={48} />
                    </div>
                    <h3 className="font-display text-2xl leading-none text-[var(--ink)]">{domain.label}</h3>
                    <p className="mt-3 line-clamp-3 font-body text-sm leading-6 text-[var(--ink-soft)]">{domain.description}</p>
                    <div className="mt-5 flex items-center justify-between font-ui text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      <span>{domain.countLabel || "Works"}</span>
                      <ArrowRight size={14} />
                    </div>
                  </ParchmentCard>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-anv grid gap-4 py-12 md:grid-cols-3">
        {[
          { title: "Submit Your Work", desc: "Send essays, papers, translations, and commentary to the editorial archive.", href: "/submit", icon: Send, domain: "submit" },
          { title: "Explore Papers", desc: "Read and discover research manuscripts across disciplines.", href: "/papers", icon: BookOpen, domain: "papers" },
          { title: user ? "Visit Community" : "Join Community", desc: "Stay in conversation with scholars, writers, and seekers.", href: "/community", icon: Users, domain: "community" },
        ].map((item) => {
          const meta = getDomainMeta(item.domain);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <ParchmentCard className="flex min-h-40 items-center gap-5 p-5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)]" style={{ color: meta.color }}>
                  <Icon size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-2xl text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-1 font-body text-sm leading-6 text-[var(--ink-soft)]">{item.desc}</p>
                </div>
                <ArrowRight className="ml-auto shrink-0 text-[var(--gold)]" size={18} />
              </ParchmentCard>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
