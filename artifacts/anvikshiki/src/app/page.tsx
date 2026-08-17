import { useCallback, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Compass, Feather, Globe, Layers, Send, Users, FileText, Grid3X3 } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { PrismaticBurst, YantraPattern } from "@/components/sacred/ColorfulDecor";
import { DOMAIN_META, DOMAIN_ORDER } from "@/lib/domainMeta";
import { withContentVersion } from "@/lib/contentVersion";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

type RecentPublication = {
  id: string;
  kind: "article" | "paper";
  slug: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  imageAlt?: string;
  categorySlug?: string;
  categoryName?: string;
  authorName?: string;
  publishedAt?: string;
  readingMinutes?: number;
  wordCount?: number;
  lineCount?: number;
};


/* ── Decorative mandala ring for section headers ── */
function SectionMandala({ size = 52, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className="home-v3-section-mandala" aria-hidden="true">
      <circle cx="26" cy="26" r="24" stroke={color} strokeWidth="0.7" opacity="0.55" />
      <circle cx="26" cy="26" r="17" stroke={color} strokeWidth="0.4" opacity="0.38" />
      <circle cx="26" cy="26" r="9"  stroke={color} strokeWidth="0.3" opacity="0.28" />
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return <line key={i} x1={26 + 9*Math.cos(r)} y1={26 + 9*Math.sin(r)} x2={26 + 24*Math.cos(r)} y2={26 + 24*Math.sin(r)} stroke={color} strokeWidth="0.35" opacity="0.22" />;
      })}
      {[0,45,90,135,180,225,270,315].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return <circle key={i} cx={26 + 17*Math.cos(r)} cy={26 + 17*Math.sin(r)} r="1.2" fill={color} opacity="0.32" />;
      })}
      <circle cx="26" cy="26" r="3" fill={color} opacity="0.40" />
    </svg>
  );
}

/* Removed HOME_DOMAINS in favor of DOMAIN_META */

/* ── Stats ── */
const STATS = [
  { num: "847+", label: "Essays Published",    color: "#7C3AED", bg: "rgba(124,58,237,0.09)",  glyph: "📜" },
  { num: "234+", label: "Research Papers",     color: "#D97706", bg: "rgba(217,119,6,0.09)",   glyph: "🔬" },
  { num: "163+", label: "Thinkers & Authors",  color: "#E11D48", bg: "rgba(225,29,72,0.09)",   glyph: "✒️" },
  { num: "12",   label: "Domains of Inquiry",  color: "#059669", bg: "rgba(5,150,105,0.09)",   glyph: "🌐" },
];

/* ── Sanskrit wisdom aphorisms ── */
const WISDOMS = [
  { devanagari: "आत्मानं विद्धि",          transliteration: "Ātmānaṃ Viddhi",           translation: "Know Thyself",                          source: "Upaniṣad",                   domain: "Philosophy"   },
  { devanagari: "सत्यमेव जयते",            transliteration: "Satyam Eva Jayate",          translation: "Truth alone triumphs",                  source: "Muṇḍaka Upaniṣad",           domain: "Ethics"       },
  { devanagari: "अहं ब्रह्मास्मि",         transliteration: "Ahaṃ Brahmāsmi",            translation: "I am the Absolute",                     source: "Bṛhadāraṇyaka Upaniṣad",     domain: "Metaphysics"  },
  { devanagari: "चरैवेति चरैवेति",         transliteration: "Charaivetī Charaivetī",      translation: "Keep moving forward, always",           source: "Aitareya Brāhmaṇa",          domain: "Philosophy"   },
  { devanagari: "यतो धर्मस्ततो जयः",      transliteration: "Yato Dharmaḥ Tato Jayaḥ",   translation: "Where there is Dharma, there is victory", source: "Mahābhārata",              domain: "Ethics"       },
  { devanagari: "तमसो मा ज्योतिर्गमय",    transliteration: "Tamaso Mā Jyotirgamaya",     translation: "Lead me from darkness into light",      source: "Bṛhadāraṇyaka Upaniṣad",     domain: "Vedic"        },
  { devanagari: "वसुधैव कुटुम्बकम्",      transliteration: "Vasudhaiva Kuṭumbakam",       translation: "The world is one family",               source: "Mahopaniṣad",                domain: "Civilizational"},
] as const;

/* ── Four pillars of Anvikshiki ── */
const PILLARS = [
  { Icon: Feather, label: "Rigour",  sub: "Every essay held to the highest standard of evidence and argument.",      color: "#7C3AED", bg: "rgba(124,58,237,0.07)" },
  { Icon: Globe,   label: "Beauty",  sub: "Scholarship that reads like literature — clear, elegant, and alive.",      color: "#D97706", bg: "rgba(217,119,6,0.07)"  },
  { Icon: Layers,  label: "Depth",   sub: "Long-form work that goes where quick reads cannot reach.",                 color: "#E11D48", bg: "rgba(225,29,72,0.07)"  },
  { Icon: Compass, label: "Breadth", sub: "Fourteen domains, one purpose: a more examined world.",                    color: "#059669", bg: "rgba(5,150,105,0.07)"  },
];

const ACTION_ROWS = [
  { label: "Submit Your Work", sub: "Share your original essays and research with a global audience.", href: "/submit", Icon: Send, bg: "var(--surface-card)", text: "var(--ink)" },
  { label: "Explore Journal", sub: "Dive into essays, papers, and ideas from thinkers worldwide.", href: "/browse", Icon: BookOpen, bg: "var(--surface-card)", text: "var(--ink)" },
  { label: "Join Community", sub: "Connect with scholars, readers, and creators of knowledge.", href: "/community", Icon: Users, bg: "var(--surface-card)", text: "var(--ink)" },
] as const;

/* ── Wisdom Carousel — auto-cycles through aphorisms ── */
function WisdomStrip() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % WISDOMS.length);
        setFade(true);
      }, 420);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const w = WISDOMS[idx];
  return (
    <section className="home-wisdom-strip border-y border-[var(--border)] py-8" aria-label="Sanskrit aphorism of the day">
      <div className="container-anv home-wisdom-body text-center max-w-2xl mx-auto" style={{ opacity: fade ? 1 : 0, transition: "opacity 0.42s ease" }}>
        <div className="home-wisdom-center">
          <p className="home-wisdom-label text-[10px] uppercase font-bold tracking-[0.24em] text-[var(--ink-faint)] mb-2">Aphorism from the Archive</p>
          <p className="home-wisdom-deva font-display text-2xl mb-1 text-[var(--ink)]" lang="sa">{w.devanagari}</p>
          <p className="home-wisdom-roman font-body text-sm text-[var(--ink-soft)] italic mb-1">{w.transliteration}</p>
          <p className="home-wisdom-trans font-body text-sm font-medium text-[var(--ink)] mb-2">"{w.translation}"</p>
          <p className="home-wisdom-source font-ui text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">— {w.source} &nbsp;·&nbsp; {w.domain}</p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="home-wisdom-dots flex items-center justify-center gap-2 mt-4" aria-hidden="true">
        {WISDOMS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Aphorism ${i + 1}`}
            className="home-wisdom-dot w-2 h-2 rounded-full transition-all"
            style={{ background: i === idx ? "var(--ink)" : "var(--border)", opacity: i === idx ? 1 : 0.4 }}
            onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 250); }}
          />
        ))}
      </div>
    </section>
  );
}


/** How long the front page may reuse a cached listing before refetching. */
const HOME_STALE_TIME = 1000 * 60;

/** Public listing URL, bypassing the edge cache only after this browser publishes. */
const publicContentUrl = (url: string) => withContentVersion(url);

export default function HomePage() {
  const [recentPage, setRecentPage] = useState(1);
  const recentTrackRef = useRef<HTMLDivElement>(null);

  // ── Cached data fetching via React Query ─────────────────────────────────
  // Data is served from cache on repeat visits within HOME_STALE_TIME, so
  // navigating back here does not re-fetch.

  // The home page is where a newly published work is expected to show up, so
  // its listings are held for a minute rather than ten. Navigating away and
  // back is still instant; a piece published a moment ago is no longer missing
  // from the front page for the rest of the editor's session.
  // Published articles and papers are public. Sending the session cookie with
  // them gained nothing and only made these responses look per-user to caches.
  const { data: featuredData } = useQuery({
    queryKey: ["home-featured"],
    queryFn: () => fetch(publicContentUrl(`${base}/api/articles?featured=true&limit=4`)).then(r => r.json()),
    staleTime: HOME_STALE_TIME,
    placeholderData: { articles: [] },
  });

  const {
    data: articlesData,
    isLoading: isLoadingArticles,
    isPlaceholderData: articlesArePlaceholder,
  } = useQuery({
    queryKey: ["home-articles"],
    queryFn: () => fetch(publicContentUrl(`${base}/api/articles?limit=24`)).then(r => r.json()),
    staleTime: HOME_STALE_TIME,
    placeholderData: { articles: [], total: 0 },
  });

  const {
    data: papersData,
    isLoading: isLoadingPapers,
    isPlaceholderData: papersArePlaceholder,
  } = useQuery({
    queryKey: ["home-papers"],
    queryFn: () => fetch(publicContentUrl(`${base}/api/papers?limit=24`)).then(r => r.json()),
    staleTime: HOME_STALE_TIME,
    placeholderData: { papers: [], total: 0 },
  });

  // `placeholderData` counts as data, so react-query reports isLoading === false
  // from the very first render. Gating the skeleton on isLoading therefore never
  // showed it: the section fell straight through to its "nothing to show" branch
  // and rendered an empty space until the request landed. The placeholder flag is
  // the signal that the empty arrays are a stand-in rather than a real result.
  const recentStillLoading =
    isLoadingArticles || isLoadingPapers || articlesArePlaceholder || papersArePlaceholder;

  const featuredEssays: any[] = featuredData?.articles || [];

  const articleList: any[] = articlesData?.articles || [];
  const paperList: any[] = papersData?.papers || [];

  const stats = {
    articles: articlesData?.total || articleList.length,
    papers: papersData?.total || paperList.length,
    domains: DOMAIN_ORDER.length,
  };

  const domainCounts = (() => {
    const counts: Record<string, number> = {};
    articleList.forEach((a: any) => {
      const cat = a.categorySlug || "philosophy";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    paperList.forEach((p: any) => {
      const cat = p.categorySlug || "papers";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  })();

  const mergedPublications: RecentPublication[] = (() => {
    const articles: RecentPublication[] = articleList.map((article: any) => ({
      id: article.id,
      kind: "article",
      slug: article.slug,
      title: article.title,
      summary: article.excerpt,
      imageUrl: article.heroImageUrl || article.featuredImage || article.coverImage,
      imageAlt: article.heroImageAlt || article.title,
      categorySlug: article.categorySlug,
      categoryName: article.category?.name,
      authorName: article.authorName,
      publishedAt: article.publishedAt || article.createdAt,
      readingMinutes: article.readingMinutes || undefined,
      wordCount: article.wordCount || undefined,
      lineCount: article.lineCount || undefined,
    }));
    const papers: RecentPublication[] = paperList.map((paper: any) => ({
      id: paper.id,
      kind: "paper",
      slug: paper.slug,
      title: paper.title,
      summary: paper.abstract,
      imageUrl: paper.coverImageUrl,
      imageAlt: paper.title,
      categorySlug: paper.categorySlug,
      categoryName: paper.category?.name,
      authorName: paper.authorName,
      publishedAt: paper.publishedAt || paper.createdAt,
      readingMinutes: paper.readingMinutes || undefined,
      wordCount: paper.wordCount || undefined,
      lineCount: paper.lineCount || undefined,
    }));
    const merged = [...articles, ...papers]
      .sort((a, b) => {
        const timeA = new Date(a.publishedAt || 0).getTime();
        const timeB = new Date(b.publishedAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
      })
      .slice(0, 24);
    return merged;
  })();

  const recentPublications = mergedPublications;

  // Re-fetch when content changes (e.g. after publish/delete from admin)
  const { refetch: refetchArticles } = useQuery({ queryKey: ["home-articles"], queryFn: () => fetch(publicContentUrl(`${base}/api/articles?limit=24`)).then(r => r.json()), enabled: false });
  const { refetch: refetchPapers }   = useQuery({ queryKey: ["home-papers"],   queryFn: () => fetch(publicContentUrl(`${base}/api/papers?limit=24`)).then(r => r.json()), enabled: false });
  const { refetch: refetchFeatured } = useQuery({ queryKey: ["home-featured"], queryFn: () => fetch(publicContentUrl(`${base}/api/articles?featured=true&limit=4`)).then(r => r.json()), enabled: false });

  useEffect(() => {
    const onContentChanged = () => { void refetchArticles(); void refetchPapers(); void refetchFeatured(); };
    window.addEventListener("anv:content-changed", onContentChanged);
    return () => window.removeEventListener("anv:content-changed", onContentChanged);
  }, [refetchArticles, refetchPapers, refetchFeatured]);

  const moveRecentPublications = useCallback((direction: -1 | 1) => {
    const track = recentTrackRef.current;
    if (!track) return;
    const distance = track.clientWidth * 0.85;
    const atStart = track.scrollLeft <= 8;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;

    if (direction === 1 && atEnd) {
      track.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction === -1 && atStart) {
      track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
    } else {
      track.scrollBy({ left: direction * distance, behavior: "smooth" });
    }
  }, []);


  const realEssays = featuredEssays.length > 0
    ? featuredEssays.map((a: any) => ({
        category: a.category?.name || a.categorySlug || "Essay",
        title: a.title,
        author: a.authorName || "Editorial",
        minutes: a.readingMinutes || null,
        domain: a.categorySlug || "philosophy",
        href: `/articles/${a.slug}`,
        color: "#7C3AED",
      }))
    : null;

  return (
    <div className="home-v3">

      {/* ─── HERO ─── */}
      <section className="home-v3-hero relative">
        <div className="home-v3-video-wrap">
          <img
            src={asset("/images/provided/home-falcon-city-panorama-hero.jpg")}
            alt="Illustrated scholar with falcon overlooking mountains and a luminous city"
            className="home-v3-video"
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 md:pb-16 z-10" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)' }}>
          <h1 className="font-display text-white text-3xl md:text-5xl lg:text-6xl tracking-[0.18em] font-bold drop-shadow-lg" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>ĀNVĪKṢIKĪ</h1>
          <Link
            href="/browse"
            className="mt-5 inline-flex items-center justify-center px-8 py-3 rounded-full font-ui text-xs md:text-sm font-extrabold uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-2xl"
            style={{
              backgroundColor: "#FFFFFF",
              color: "#111111",
              boxShadow: "0 6px 24px rgba(0, 0, 0, 0.45)",
            }}
          >
            Explore the Archive
          </Link>
        </div>
      </section>

      {/* ─── RECENTLY UPLOADED ─── */}
      <section className="home-v3-section py-12">
        <div className="container-anv">
          <div className="flex flex-col items-center justify-center text-center mb-10">
            <h2 className="text-center text-3xl md:text-5xl font-extrabold uppercase tracking-[0.18em] text-[var(--ink)]">
              Recently Submitted
            </h2>
            <div className="w-24 h-1 bg-[var(--gold)] my-4 rounded-full" />
            <Link href="/archive" className="home-v3-view-all text-sm uppercase tracking-widest font-bold mt-1 text-[var(--ink)] hover:text-[var(--gold)]">
              View All Archives <ArrowRight size={14} />
            </Link>
          </div>

          {recentStillLoading && recentPublications.length === 0 ? (
            <div className="flex flex-col gap-10">
              {[1, 2].map((k) => (
                <div key={k} className="article-card-enhanced relative w-full rounded-3xl overflow-hidden border border-[var(--border)]" style={{ backgroundColor: 'var(--surface-card)' }}>
                  <div className="w-full h-[300px] md:h-[400px] bg-white/[0.03] animate-pulse" />
                  <div className="p-6 md:p-8 space-y-4">
                    <div className="h-8 bg-white/10 rounded-lg w-2/3 animate-pulse" />
                    <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                    <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPublications.length > 0 ? (() => {
            const RECENT_PER_PAGE = 6;
            const totalRecentPages = Math.max(1, Math.ceil(recentPublications.length / RECENT_PER_PAGE));
            const paginatedRecent = recentPublications.slice((recentPage - 1) * RECENT_PER_PAGE, recentPage * RECENT_PER_PAGE);

            return (
              <>

              <div className="flex flex-col gap-10">
                {paginatedRecent.map((publication) => {
                  const readingTimeText = publication.readingMinutes
                    ? `${publication.readingMinutes} min read${publication.wordCount ? ` · ${publication.wordCount.toLocaleString()} words` : ""}`
                    : null;
                  return (
                    <Link
                      key={`${publication.kind}-${publication.id}`}
                      href={`/${publication.kind === "paper" ? "papers" : "articles"}/${publication.slug}`}
                      className="article-card-enhanced group relative w-full rounded-3xl block"
                    >
                      {publication.imageUrl && (
                        <div className="article-card-img-wrap w-full h-[320px] md:h-[420px]">
                          <img
                            src={publication.imageUrl}
                            alt={publication.imageAlt || publication.title}
                            className="w-full h-full object-cover object-center"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                      <div className="p-6 md:p-8 flex flex-col justify-between" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--ink)' }}>
                        <h3 className="article-card-title text-xl md:text-3xl font-extrabold mb-2 leading-snug tracking-tight">
                          {publication.title}
                        </h3>
                        {publication.summary && (
                          <p className="text-xs md:text-base opacity-90 line-clamp-2 font-body leading-relaxed mb-2" style={{ color: 'var(--ink-soft)' }}>
                            {publication.summary}
                          </p>
                        )}
                        
                        {/* Sectional Divider Line */}
                        <div className="h-px w-full my-4" style={{ backgroundColor: 'var(--border)' }} />

                        <div className="flex items-center justify-between gap-3 font-ui text-xs md:text-sm font-bold uppercase tracking-wider w-full">
                          <div className="flex items-center gap-2 overflow-hidden flex-wrap flex-1">
                            <span className="font-extrabold tracking-widest shrink-0">{publication.authorName || "Editorial"}</span>
                            <span className="px-3 py-1 rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest bg-[var(--surface-alt)] border border-[var(--border)] shadow-sm shrink-0">
                              {publication.categoryName || publication.categorySlug || (publication.kind === "paper" ? "Paper" : "Essay")}
                            </span>
                            {readingTimeText && (
                              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider bg-[var(--surface-alt)] px-3 py-1 rounded-full border border-[var(--border)] shrink-0">
                                {readingTimeText}
                              </span>
                            )}
                          </div>
                          {publication.publishedAt && (
                            <span className="opacity-80 font-extrabold shrink-0 text-right ml-auto">
                              {new Date(publication.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalRecentPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-10">
                  <button
                    onClick={() => setRecentPage(p => Math.max(1, p - 1))}
                    disabled={recentPage === 1}
                    className="px-5 py-2.5 rounded-xl bg-[#1c1c1e] text-white font-bold disabled:opacity-30 border border-[#333336] hover:border-[var(--gold)] flex items-center gap-2 text-xs uppercase tracking-wider"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="font-ui text-sm font-extrabold text-white uppercase tracking-widest px-3">
                    Page {recentPage} of {totalRecentPages}
                  </span>
                  <button
                    onClick={() => setRecentPage(p => Math.min(totalRecentPages, p + 1))}
                    disabled={recentPage === totalRecentPages}
                    className="px-5 py-2.5 rounded-xl bg-[#1c1c1e] text-white font-bold disabled:opacity-30 border border-[#333336] hover:border-[var(--gold)] flex items-center gap-2 text-xs uppercase tracking-wider"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          );
        })() : (
          <p className="text-center font-ui text-sm text-[var(--muted)] py-8">
            No publications yet. Newly published work appears here.
          </p>
        )}
      </div>
    </section>

      {/* ─── FEATURED ESSAYS (API data only) ─── */}
      {realEssays && (
        <section className="home-v3-section">
          <div className="container-anv">
            <div className="home-v3-section-head">
              <h2 className="home-v3-section-title">Featured Essays</h2>
              <Link href="/browse" className="home-v3-view-all">View All <ArrowRight size={14} /></Link>
            </div>
            <div className="home-v3-essay-grid">
              {realEssays.map(essay => (
                <Link key={essay.title} href={essay.href} className="home-v3-essay-card">
                  <div className="home-v3-essay-meta">
                    <AnimalGlyph domain={essay.domain} size={34} />
                    <span className="home-v3-essay-cat">{essay.category}</span>
                  </div>
                  <h3 className="home-v3-essay-title">{essay.title}</h3>
                  <div className="home-v3-essay-foot">
                    <p className="home-v3-essay-author">{essay.author}</p>
                    <span className="home-v3-read-time"><Clock3 size={12} /> {essay.minutes} min</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── WISDOM STRIP (Aphorisms from Archive) ─── */}
      <WisdomStrip />

      {/* ─── BROWSE BY DOMAIN ─── */}
      <section className="home-v3-section home-v3-domains-section" style={{ position: "relative", overflow: "hidden" }}>
        <div className="container-anv" style={{ position: "relative", zIndex: 1 }}>
          <div className="home-v3-section-head centered">
            <h2 className="home-v3-section-title">Browse by Domain</h2>
          </div>

          <p className="home-v3-section-sub">
            Fourteen fields of inquiry — from the sweep of civilizations to the intimacy of the aesthetic moment,
            the precision of science to the depth of Sanskrit wisdom.
          </p>

          <div className="home-v3-domains home-v3-domains-expanded">
            {DOMAIN_ORDER.map(key => {
              const d = DOMAIN_META[key];
              if (!d) return null;
              return (
                <Link key={key} href={d.route} className="home-v3-domain-card">
                  <div className="home-v3-domain-icon-wrap">
                    <AnimalGlyph domain={key} size={32} />
                  </div>
                  <div className="home-v3-domain-name">{d.label}</div>
                  <div className="home-v3-domain-badge">
                    {domainCounts[key] || 0} {d.countLabel || "Items"}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── ACTION ROWS ─── */}
      <section className="home-v3-section home-v3-actions-section">
        <div className="container-anv">
          <div className="home-v3-section-head centered" style={{ marginBottom: "2rem" }}>
            <h2 className="home-v3-section-title">Join the Conversation</h2>
          </div>
          <div className="home-v3-actions">
            {ACTION_ROWS.map(({ label, sub, href, Icon, bg, text }) => (
              <Link key={href} href={href} className="home-v3-action"
                style={{ "--action-bg": bg, "--action-text": text } as React.CSSProperties}>
                <Icon size={30} strokeWidth={1.3} className="home-v3-action-icon" />
                <div className="home-v3-action-text">
                  <span className="home-v3-action-label">{label}</span>
                  <span className="home-v3-action-sub">{sub}</span>
                </div>
                <ArrowRight size={20} strokeWidth={1.5} className="home-v3-action-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
