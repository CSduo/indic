import { useEffect, useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { 
  ArrowLeft, 
  BookOpen, 
  Building2, 
  MapPin, 
  ExternalLink, 
  Share2, 
  FileText, 
  Sparkles, 
  Clock, 
  Feather,
  CheckCircle2,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useDocumentMetadata } from "@/hooks/useDocumentMetadata";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

interface AuthorPublication {
  id: string;
  kind: "article" | "paper";
  slug: string;
  title: string;
  excerpt?: string;
  abstract?: string;
  authorName: string;
  categorySlug?: string;
  publishedAt?: string;
  readingMinutes?: number;
  year?: number;
  doi?: string;
}

interface AuthorData {
  id?: string;
  name: string;
  handle: string;
  bio?: string;
  institution?: string;
  location?: string;
  avatarUrl?: string;
  website?: string;
  orcid?: string;
  articleCount?: number;
  paperCount?: number;
}

export default function AuthorHubPage() {
  const [, params] = useRoute("/authors/:slug");
  const slug = (params?.slug || "").trim();

  // Try reading pre-hydrated SSR data if available
  const [author, setAuthor] = useState<AuthorData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const el = document.getElementById("__ANVIKSHIKI_DATA__");
        if (el && el.textContent) {
          const parsed = JSON.parse(el.textContent);
          if (parsed && (parsed.handle === slug || parsed.id === slug || !slug)) {
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  });

  const [articles, setArticles] = useState<AuthorPublication[]>([]);
  const [papers, setPapers] = useState<AuthorPublication[]>([]);
  const [loading, setLoading] = useState(!author);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "articles" | "papers">("all");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    async function loadAuthorHub() {
      try {
        setLoading(true);
        setError(false);

        // 1. Fetch user/author metadata
        const userRes = await fetch(`${base()}/api/users/profile/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
          credentials: "include",
        }).catch(() => null);

        let resolvedUser: AuthorData | null = null;
        if (userRes && userRes.ok) {
          const u = await userRes.json();
          resolvedUser = u.user || u;
        }

        // 2. Fetch publications associated with this scholar
        const [artsRes, papersRes] = await Promise.all([
          fetch(`${base()}/api/articles?limit=50`, { signal: controller.signal }).then(r => r.ok ? r.json() : { articles: [] }),
          fetch(`${base()}/api/papers?limit=50`, { signal: controller.signal }).then(r => r.ok ? r.json() : { papers: [] }),
        ]);

        const rawArticles = artsRes.articles || [];
        const rawPapers = papersRes.papers || [];

        // Filter publications matching this author by handle, id, or name
        const authorArticles: AuthorPublication[] = rawArticles
          .filter((a: any) => {
            if (resolvedUser?.id && a.authorId === resolvedUser.id) return true;
            const cleanAuthor = String(a.authorName || "").toLowerCase().replace(/^(dr|prof|vidwan|acharya)\.?\s+/i, "").replace(/[^a-z0-9]/g, "-");
            return cleanAuthor.includes(slug.toLowerCase()) || slug.toLowerCase().includes(cleanAuthor);
          })
          .map((a: any) => ({
            id: a.id,
            kind: "article",
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt || a.subtitle,
            authorName: a.authorName,
            categorySlug: a.categorySlug,
            publishedAt: a.publishedAt || a.createdAt,
            readingMinutes: a.readingMinutes,
          }));

        const authorPapers: AuthorPublication[] = rawPapers
          .filter((p: any) => {
            if (resolvedUser?.id && p.authorId === resolvedUser.id) return true;
            const cleanAuthor = String(p.authorName || "").toLowerCase().replace(/^(dr|prof|vidwan|acharya)\.?\s+/i, "").replace(/[^a-z0-9]/g, "-");
            return cleanAuthor.includes(slug.toLowerCase()) || slug.toLowerCase().includes(cleanAuthor);
          })
          .map((p: any) => ({
            id: p.id,
            kind: "paper",
            slug: p.slug,
            title: p.title,
            abstract: p.abstract,
            authorName: p.authorName,
            categorySlug: p.categorySlug,
            publishedAt: p.publishedAt || p.createdAt,
            year: p.year,
            doi: p.doi,
          }));

        if (!resolvedUser && authorArticles.length === 0 && authorPapers.length === 0) {
          setError(true);
          setLoading(false);
          return;
        }

        const fallbackName = authorArticles[0]?.authorName || authorPapers[0]?.authorName || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const finalAuthor: AuthorData = resolvedUser || {
          name: fallbackName,
          handle: slug,
          bio: `${fallbackName} is a contributing scholar and researcher on Ānvīkṣikī Journal.`,
          articleCount: authorArticles.length,
          paperCount: authorPapers.length,
        };

        setAuthor(finalAuthor);
        setArticles(authorArticles);
        setPapers(authorPapers);
        setLoading(false);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(true);
        setLoading(false);
      }
    }

    loadAuthorHub();
    return () => controller.abort();
  }, [slug]);

  const authorName = author?.name || slug;
  const authorBio = author?.bio || `Scholar profile for ${authorName} on Ānvīkṣikī.`;

  useDocumentMetadata({
    title: authorName ? `${authorName} — Author Profile — Ānvīkṣikī` : undefined,
    description: authorBio.slice(0, 200),
    canonicalPath: `/authors/${encodeURIComponent(slug)}`,
    image: author?.avatarUrl || null,
    type: "profile",
    structuredData: author ? {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": authorName,
      "description": authorBio,
      "worksFor": author.institution ? { "@type": "Organization", "name": author.institution } : undefined,
    } : null,
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${authorName} — Author Profile on Ānvīkṣikī`,
          text: authorBio,
          url,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Author profile link copied to clipboard");
    }
  };

  const allWorks = useMemo(() => {
    const list = [...articles, ...papers].sort(
      (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
    );
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter(w => w.title.toLowerCase().includes(q) || (w.excerpt || w.abstract || "").toLowerCase().includes(q));
  }, [articles, papers, searchFilter]);

  const filteredArticles = useMemo(() => {
    return allWorks.filter(w => w.kind === "article");
  }, [allWorks]);

  const filteredPapers = useMemo(() => {
    return allWorks.filter(w => w.kind === "paper");
  }, [allWorks]);

  const displayedWorks = activeTab === "all" ? allWorks : activeTab === "articles" ? filteredArticles : filteredPapers;

  if (loading && !author) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--terracotta)] animate-spin" />
          <p className="font-ui text-xs uppercase tracking-widest text-[var(--ink-faint)]">Loading Scholar Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--bg)] px-4">
        <EmptyState
          title="Author Not Found"
          description={`We couldn't locate a contributing author profile for "${slug}".`}
          action={<Link href="/browse" className="btn-terracotta">Explore Publications</Link>}
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] min-h-screen pb-20">
      {/* Breadcrumb Bar */}
      <section className="border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]">
        <div className="container-anv py-4">
          <nav className="flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
            <Link href="/browse" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)] transition-colors">
              <ArrowLeft size={13} /> Explore
            </Link>
            <span>/</span>
            <span className="text-[var(--ink-faint)]">Scholars</span>
            <span>/</span>
            <span className="text-[var(--ink)] font-semibold truncate">{authorName}</span>
          </nav>
        </div>
      </section>

      {/* Author Hero / Authority Card */}
      <section className="container-anv pt-10 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-6 md:p-10 shadow-sm">
            {/* Background subtle decorative ornament */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] pointer-events-none">
              <Feather size={256} className="text-[var(--ink)]" />
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-2 border-[var(--border-gold)] p-1 bg-[var(--bg)] shadow-md">
                  {author.avatarUrl ? (
                    <img src={author.avatarUrl} alt={authorName} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-[#FAF5EE] to-[#EFE7D8] dark:from-[#1F1D1A] dark:to-[#141311] flex items-center justify-center">
                      <span className="font-display text-3xl md:text-4xl font-bold text-[var(--terracotta)]">
                        {authorName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#10B981] text-white p-1 rounded-full shadow" title="Verified Contributor">
                  <CheckCircle2 size={16} />
                </div>
              </div>

              {/* Scholar Details */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="font-ui text-[11px] font-bold uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full bg-[var(--terracotta-pale)] text-[var(--terracotta)] border border-[var(--border-gold)]/40">
                    Contributing Scholar
                  </span>
                  {author.handle && (
                    <span className="font-mono text-xs text-[var(--ink-faint)]">
                      @{author.handle}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--ink)] leading-tight">
                  {authorName}
                </h1>

                {/* Affiliation and Location */}
                {(author.institution || author.location) && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 font-ui text-xs text-[var(--ink-faint)] pt-0.5">
                    {author.institution && (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 size={13} className="text-[var(--gold)]" /> {author.institution}
                      </span>
                    )}
                    {author.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={13} className="text-[var(--gold)]" /> {author.location}
                      </span>
                    )}
                  </div>
                )}

                {/* Biography */}
                <p className="font-body text-sm md:text-base leading-relaxed text-[var(--ink-soft)] max-w-2xl pt-1">
                  {authorBio}
                </p>

                {/* Actions & Metrics */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-4 border-t border-[var(--border-subtle)] mt-5">
                  <button 
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[var(--border)] font-ui text-xs font-semibold hover:bg-[var(--surface-soft)] transition-colors"
                  >
                    <Share2 size={13} /> Share Profile
                  </button>

                  {author.website && (
                    <a 
                      href={author.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[var(--border)] font-ui text-xs font-semibold hover:bg-[var(--surface-soft)] transition-colors"
                    >
                      <ExternalLink size={13} /> Website
                    </a>
                  )}

                  {author.id && (
                    <Link
                      href={`/messages/@${author.handle || author.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--terracotta)] text-white font-ui text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <Send size={13} /> Message Scholar
                    </Link>
                  )}

                  <div className="ml-auto font-ui text-xs text-[var(--ink-faint)] hidden sm:flex items-center gap-3">
                    <span><strong>{articles.length}</strong> Essays</span>
                    <span>·</span>
                    <span><strong>{papers.length}</strong> Papers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bibliography Section */}
      <section className="container-anv py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header and Tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-[var(--gold)]" />
              <h2 className="font-display text-2xl font-bold text-[var(--ink)]">
                Published Research &amp; Commentary
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-[var(--surface-soft)] p-1 rounded-full border border-[var(--border-subtle)] text-xs font-ui font-semibold">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full transition-all ${activeTab === "all" ? "bg-[var(--surface-card)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-faint)] hover:text-[var(--ink)]"}`}
              >
                All ({allWorks.length})
              </button>
              <button
                onClick={() => setActiveTab("articles")}
                className={`px-3 py-1 rounded-full transition-all ${activeTab === "articles" ? "bg-[var(--surface-card)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-faint)] hover:text-[var(--ink)]"}`}
              >
                Essays ({articles.length})
              </button>
              <button
                onClick={() => setActiveTab("papers")}
                className={`px-3 py-1 rounded-full transition-all ${activeTab === "papers" ? "bg-[var(--surface-card)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-faint)] hover:text-[var(--ink)]"}`}
              >
                Papers ({papers.length})
              </button>
            </div>
          </div>

          {/* Publications List */}
          {displayedWorks.length === 0 ? (
            <div className="py-12 text-center">
              <ParchmentCard className="p-8 text-center max-w-lg mx-auto">
                <Feather size={32} className="mx-auto text-[var(--gold-soft)] opacity-50 mb-3" />
                <h3 className="font-display text-xl text-[var(--ink)]">No publications found</h3>
                <p className="font-body text-xs text-[var(--ink-faint)] mt-1">
                  {searchFilter ? "No works match the current search query." : "This scholar has not yet published works under this category."}
                </p>
              </ParchmentCard>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedWorks.map((work) => {
                const targetUrl = work.kind === "paper" ? `/papers/${work.slug}` : `/articles/${work.slug}`;
                return (
                  <Link key={work.id} href={targetUrl} className="block group">
                    <ParchmentCard className="p-5 md:p-6 transition-all duration-200 group-hover:border-[var(--border-gold)] group-hover:shadow-md">
                      <div className="flex flex-col space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-ui text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${work.kind === "paper" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                              {work.kind === "paper" ? "Research Paper" : "Essay"}
                            </span>
                            {work.categorySlug && (
                              <span className="font-ui text-[10px] text-[var(--ink-faint)] uppercase tracking-wider">
                                · {work.categorySlug}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 font-ui text-xs text-[var(--ink-faint)]">
                            {work.readingMinutes && (
                              <span className="inline-flex items-center gap-1">
                                <Clock size={11} /> {work.readingMinutes} min read
                              </span>
                            )}
                            {work.publishedAt && (
                              <span>
                                {new Date(work.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-display text-xl md:text-2xl font-bold text-[var(--ink)] group-hover:text-[var(--terracotta)] transition-colors leading-snug">
                          {work.title}
                        </h3>

                        {(work.excerpt || work.abstract) && (
                          <p className="font-body text-xs md:text-sm text-[var(--ink-soft)] line-clamp-2 leading-relaxed">
                            {work.excerpt || work.abstract}
                          </p>
                        )}
                      </div>
                    </ParchmentCard>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Contributor Acquisition Banner */}
          <div className="mt-12 rounded-2xl border border-[#FDE68A] bg-gradient-to-br from-[#FFFDF8] to-[#FFF7ED] dark:from-[#1C1814] dark:to-[#17120D] p-8 text-center space-y-3 shadow-sm">
            <Sparkles size={24} className="mx-auto text-[#D97706]" />
            <h3 className="font-display text-2xl font-bold text-[var(--ink)]">
              Publish Your Research on Ānvīkṣikī
            </h3>
            <p className="font-body text-sm text-[var(--ink-soft)] max-w-xl mx-auto leading-relaxed">
              Join contributing scholars like {authorName}. Publish your research papers, essays, and translations with permanent canonical archiving, Google Scholar discovery, and global reach.
            </p>
            <div className="pt-2">
              <Link href="/submit" className="btn-terracotta inline-flex items-center gap-2">
                <Feather size={14} /> Submit a Manuscript
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
