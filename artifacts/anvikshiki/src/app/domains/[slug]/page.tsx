import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { DOMAIN_META, getDomainMeta, normalizeDomainKey } from "@/lib/domainMeta";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function DomainPage() {
  const [, params] = useRoute("/domains/:slug");
  const [, legacyParams] = useRoute("/categories/:slug");
  const slug = (params?.slug || legacyParams?.slug || "").toLowerCase();
  const key = normalizeDomainKey(slug);
  const meta = getDomainMeta(key);
  const known = Boolean(slug && (slug in DOMAIN_META || slug === "civilizations" || slug === "civilisation"));
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    fetch(`${base()}/api/articles?category=${encodeURIComponent(slug)}&limit=24`)
      .then((response) => response.json())
      .then((data) => {
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  if (!known && !loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--bg)] px-4">
        <EmptyState
          title="Domain not found"
          description={`"${slug}" is not a known domain. Return to the atlas to continue browsing.`}
          action={<Link href="/browse" className="btn-terracotta">Back to Explore</Link>}
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/browse" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)]"><ArrowLeft size={13} /> Explore</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">{meta.label}</span>
        </nav>

        <HeroPanel
          image={asset("/images/heroes/explore-domain.jpg")}
          imageAlt={`${meta.label} domain illustration`}
          eyebrow="Domain"
          title={meta.label}
          subtitle={meta.animal}
          description={meta.description}
          glyph={key}
          focal="center"
          ctaPrimary={{ label: "Submit in this Domain", href: "/submit" }}
          ctaSecondary={{ label: "Search Archive", href: `/search?q=${encodeURIComponent(meta.label)}` }}
        />
      </section>

      <section className="container-anv pb-14">
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <GlyphTag domain={key} className="mb-3" />
            <h2 className="font-display text-4xl text-[var(--ink)]">Published Work</h2>
            <p className="mt-2 max-w-xl font-body text-base leading-7 text-[var(--ink-soft)]">
              Essays and papers in this field will collect here as the archive grows.
            </p>
          </div>
          <Link href="/browse" className="btn-ink w-fit">
            All Domains
          </Link>
        </div>

        <OrnamentDivider className="mb-8" />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-[8px] bg-[var(--ink-wash-strong)]" />)}
          </div>
        ) : error ? (
          <EmptyState
            title="Could not load content"
            description="There was an error loading articles for this domain. Please try again."
            action={<button className="btn-ink" onClick={() => window.location.reload()} type="button">Retry</button>}
          />
        ) : articles.length === 0 ? (
          <ParchmentCard className="mx-auto max-w-2xl p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-[var(--border-gold)]" style={{ color: meta.color }}>
              <AnimalGlyph domain={key} size={42} />
            </div>
            <h3 className="font-display text-3xl text-[var(--ink)]">No published work in {meta.label} yet.</h3>
            <p className="mx-auto mt-3 max-w-md font-body text-base leading-7 text-[var(--ink-soft)]">
              The first folio for this domain has not been opened. Submit a work or explore another path.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/submit" className="btn-terracotta">Submit Your Work <ArrowRight size={14} /></Link>
              <Link href="/browse" className="btn-ink">Browse Domains</Link>
            </div>
          </ParchmentCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.slug || article.id}`}>
                <ParchmentCard className="flex h-full min-h-56 flex-col p-5">
                  <GlyphTag domain={key} className="mb-4 w-fit" />
                  <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">{article.title}</h3>
                  {article.excerpt ? <p className="mt-3 line-clamp-3 font-body text-sm leading-6 text-[var(--ink-soft)]">{article.excerpt}</p> : null}
                  <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <span className="font-ui text-xs text-[var(--ink-faint)]">{article.authorName || "Editorial"}</span>
                    <ArrowRight size={14} className="text-[var(--gold)]" />
                  </div>
                </ParchmentCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
