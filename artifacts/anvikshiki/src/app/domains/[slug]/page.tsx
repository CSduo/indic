import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { DOMAIN_META, getDomainMeta, normalizeDomainKey } from "@/lib/domainMeta";
import { useDocumentMetadata } from "@/hooks/useDocumentMetadata";
import { readInitialData } from "@/lib/initialData";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

type PublicWork = {
  id: string;
  kind: "article" | "paper";
  slug: string;
  title: string;
  summary?: string;
  authorName?: string;
  publishedAt?: string;
};

type ServerWork = {
  kind: "article" | "paper";
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  publishedAt: string | null;
};

type ServerDomain = {
  category: { slug: string; name: string; description: string | null };
  articles: ServerWork[];
  papers: ServerWork[];
};

function fromServerWorks(data: ServerDomain): PublicWork[] {
  return [...data.articles, ...data.papers]
    .map((work) => ({
      id: work.id,
      kind: work.kind,
      slug: work.slug,
      title: work.title,
      summary: work.excerpt || undefined,
      authorName: work.authorName || undefined,
      publishedAt: work.publishedAt || undefined,
    }))
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

export default function DomainPage() {
  const [, params] = useRoute("/domains/:slug");
  const [, legacyParams] = useRoute("/categories/:slug");
  const slug = (params?.slug || legacyParams?.slug || "").toLowerCase();
  // The hub the server rendered (any category in the database, including ones
  // the client's built-in list does not know). It wins over the built-in list.
  // Re-read per slug: after client-side navigation to another hub the payload
  // no longer applies and readInitialData returns undefined.
  const serverDomain = useMemo(() => readInitialData<ServerDomain>("domain"), [slug]);
  const [apiCategory, setApiCategory] = useState<{ name: string; description: string | null } | null>(null);
  const category = serverDomain?.category ?? apiCategory;
  const key = normalizeDomainKey(slug);
  const builtIn = slug in DOMAIN_META;
  const baseMeta = getDomainMeta(key);
  const meta = category
    ? { ...baseMeta, label: category.name, description: category.description || baseMeta.description }
    : baseMeta;
  const initialPublications = (): PublicWork[] => {
    if (serverDomain) return fromServerWorks(serverDomain);
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(`anv_domain_${slug}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  };
  const [publications, setPublications] = useState<PublicWork[]>(initialPublications);
  const [loading, setLoading] = useState(() => !serverDomain && publications.length === 0);
  const [error, setError] = useState(false);
  // Only a definite 404 from the API makes a hub "not found"; a failed or
  // blocked request never does.
  const [notFound, setNotFound] = useState(false);

  // Same title and description as the server-rendered hub.
  const metaDescription = (category?.description || (category ? `Work published on Ānvīkṣikī in ${category.name}.` : meta.description) || "").slice(0, 300);
  useDocumentMetadata({
    title: `${meta.label} — Domain Archive — Ānvīkṣikī`,
    description: metaDescription,
    canonicalPath: `/domains/${encodeURIComponent(slug)}`,
    type: "website",
  });

  useEffect(() => {
    if (!slug) return;
    // Start each hub from its own data (the page component is reused when
    // navigating from one hub to another).
    const startingPublications = initialPublications();
    setPublications(startingPublications);
    setApiCategory(null);
    setNotFound(false);
    setLoading(startingPublications.length === 0 && !serverDomain);
    setError(false);
    fetch(`${base()}/api/categories/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (response.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!response.ok) throw new Error("Could not load domain");
        return response.json();
      })
      .then((data) => {
        if (!data) {
          setLoading(false);
          return;
        }
        if (data.category?.name) {
          setApiCategory({ name: data.category.name, description: data.category.description ?? null });
        }
        const articles: PublicWork[] = (data.articles || []).map((article: any) => ({
          id: article.id,
          kind: "article",
          slug: article.slug,
          title: article.title,
          summary: article.excerpt,
          authorName: article.authorName,
          publishedAt: article.publishedAt || article.createdAt,
        }));
        const papers: PublicWork[] = (data.papers || []).map((paper: any) => ({
          id: paper.id,
          kind: "paper",
          slug: paper.slug,
          title: paper.title,
          summary: paper.abstract,
          authorName: paper.authorName,
          publishedAt: paper.publishedAt || paper.createdAt,
        }));
        const sorted = [...articles, ...papers].sort(
          (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
        );
        setPublications(sorted);
        try {
          sessionStorage.setItem(`anv_domain_${slug}`, JSON.stringify(sorted));
        } catch {}
        setLoading(false);
      })
      .catch(() => {
        // Keep whatever is already on screen; only say so when there is nothing.
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  if (!serverDomain && !apiCategory && !builtIn && notFound && !loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--bg)] px-4">
        <EmptyState
          title="Domain not found"
          description={`"${slug}" is not a known domain. Return to the atlas to continue browsing.`}
          action={<Link href="/domains" className="btn-terracotta">All Domains</Link>}
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
          <Link href="/domains" className="btn-ink w-fit">
            All Domains
          </Link>
        </div>

        <OrnamentDivider className="mb-8" />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-[8px] bg-[var(--ink-wash-strong)]" />)}
          </div>
        ) : error && publications.length === 0 ? (
          <EmptyState
            title="Could not load content"
            description="There was an error loading articles for this domain. Please try again."
            action={<button className="btn-ink" onClick={() => window.location.reload()} type="button">Retry</button>}
          />
        ) : publications.length === 0 ? (
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
            {publications.map((publication) => (
              <Link
                key={`${publication.kind}-${publication.id}`}
                href={`/${publication.kind === "paper" ? "papers" : "articles"}/${publication.slug || publication.id}`}
              >
                <ParchmentCard className="flex h-full min-h-56 flex-col p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <GlyphTag domain={key} className="w-fit" />
                    <span className="badge badge-received">{publication.kind === "paper" ? "Paper" : "Essay"}</span>
                  </div>
                  <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">{publication.title}</h3>
                  {publication.summary ? <p className="mt-3 line-clamp-3 font-body text-sm leading-6 text-[var(--ink-soft)]">{publication.summary}</p> : null}
                  <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <span className="font-ui text-xs text-[var(--ink-faint)]">{publication.authorName || "Editorial"}</span>
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
