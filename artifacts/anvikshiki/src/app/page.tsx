import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Compass, Feather, Globe, Layers, Send, Users } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { PrismaticBurst, YantraPattern } from "@/components/sacred/ColorfulDecor";

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

/* ── Silver, monochrome domain styling — no per-domain color ── */
const DOMAIN_SILVER = "#B8B8C2";

const HOME_DOMAINS = [
  { label: "Philosophy",             domain: "philosophy",             href: "/domains/philosophy",             color: DOMAIN_SILVER, emoji: "🔮", desc: "Reality, reasoning, self, knowledge, and truth." },
  { label: "History",                domain: "history",                href: "/domains/history",                color: DOMAIN_SILVER, emoji: "📜", desc: "Civilizations, memory, events, eras, and inheritance." },
  { label: "Political Theory",       domain: "political-theory",       href: "/domains/political-theory",       color: DOMAIN_SILVER, emoji: "⚖️", desc: "State, order, sovereignty, justice, and power." },
  { label: "Psychology",             domain: "psychology",             href: "/domains/psychology",             color: DOMAIN_SILVER, emoji: "🧠", desc: "Mind, behavior, consciousness, and inner landscapes." },
  { label: "Sociology",              domain: "sociology",              href: "/domains/sociology",              color: DOMAIN_SILVER, emoji: "🌿", desc: "Communities, institutions, cultures, and shared patterns." },
  { label: "Science",                domain: "science",                href: "/domains/science",                color: DOMAIN_SILVER, emoji: "🔭", desc: "Observation, logic, nature, systems, and discovery." },
  { label: "Geopolitics",            domain: "geopolitics",            href: "/domains/geopolitics",            color: DOMAIN_SILVER, emoji: "🌐", desc: "Power, geography, statecraft, strategy, and place." },
  { label: "Papers",                 domain: "papers",                 href: "/papers",                         color: DOMAIN_SILVER, emoji: "📋", desc: "Research manuscripts, working papers, and scholarship." },
  { label: "Archive",                domain: "archive",                href: "/archive",                        color: DOMAIN_SILVER, emoji: "🗂️", desc: "Texts, records, timelines, sources, and living memory." },
  { label: "Civilizational Thought", domain: "civilizational-thought", href: "/domains/civilizational-thought", color: DOMAIN_SILVER, emoji: "🏛️", desc: "Long-arc inquiry into culture, tradition, and society." },
  { label: "Aesthetics",             domain: "aesthetics",             href: "/domains/aesthetics",             color: DOMAIN_SILVER, emoji: "🎨", desc: "Art, beauty, literature, music, symbol, and form." },
  { label: "Sanskrit Studies",       domain: "sanskrit-studies",       href: "/domains/sanskrit-studies",       color: DOMAIN_SILVER, emoji: "🪔", desc: "Language, shastra, grammar, and textual traditions." },
  { label: "Translations",           domain: "translations",           href: "/domains/translations",           color: DOMAIN_SILVER, emoji: "📖", desc: "Texts moving between languages, worlds, and eras." },
  { label: "Multimedia",             domain: "multimedia",             href: "/domains/aesthetics",             color: DOMAIN_SILVER, emoji: "🎬", desc: "Visual stories, lectures, audio, and interactive work." },
];

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

const INITIAL_RECENT_PUBLICATIONS: RecentPublication[] = [
  {
    id: "init-1",
    kind: "article",
    slug: "beyond-angkor-why-is-vietnam-frequently-excluded",
    title: "Beyond Angkor: Why Is Vietnam Frequently Excluded from the History of Hindu Influence in Southeast Asia?",
    summary: "Exploring Champa architecture, Sanskrit inscriptions, and the deep civilizational heritage of coastal Vietnam.",
    imageUrl: "/images/provided/champa-temple.jpg",
    categorySlug: "history",
    categoryName: "History",
    authorName: "Chaitanya",
    publishedAt: "2026-08-04T00:00:00.000Z",
    readingMinutes: 20,
  },
  {
    id: "init-2",
    kind: "article",
    slug: "why-this-website-exists",
    title: "Why This Website Exists",
    summary: "An introduction to Anvikshiki and the vision of open civilizational scholarship.",
    imageUrl: "/images/provided/about-hero.jpg",
    categorySlug: "psychology",
    categoryName: "Psychology",
    authorName: "Xiyato Saanvi",
    publishedAt: "2026-07-07T00:00:00.000Z",
    readingMinutes: 1,
  },
];

export default function HomePage() {
  const [featuredEssays, setFeaturedEssays] = useState<any[]>([]);
  const [recentPublications, setRecentPublications] = useState<RecentPublication[]>(INITIAL_RECENT_PUBLICATIONS);
  const [recentPage, setRecentPage] = useState(1);
  const recentTrackRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(() => {
    fetch(`${base}/api/articles?featured=true&limit=4`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.articles?.length) setFeaturedEssays(d.articles); })
      .catch(() => {});

    Promise.all([
      fetch(`${base}/api/articles?limit=24`, { credentials: "include" }).then(r => r.json()),
      fetch(`${base}/api/papers?limit=24`, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([articleData, paperData]) => {
        const articles: RecentPublication[] = (articleData.articles || []).map((article: any) => ({
          id: article.id,
          kind: "article",
          slug: article.slug,
          title: article.title,
          summary: article.excerpt,
          imageUrl: article.heroImageUrl,
          imageAlt: article.heroImageAlt,
          categorySlug: article.categorySlug,
          categoryName: article.category?.name,
          authorName: article.authorName,
          publishedAt: article.publishedAt || article.createdAt,
          readingMinutes: article.readingMinutes || undefined,
        }));
        const papers: RecentPublication[] = (paperData.papers || []).map((paper: any) => ({
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
        }));

        setRecentPublications(
          [...articles, ...papers]
            .sort((a, b) => {
              const timeA = new Date(a.publishedAt || 0).getTime();
              const timeB = new Date(b.publishedAt || 0).getTime();
              if (timeB !== timeA) return timeB - timeA;
              return b.id.localeCompare(a.id);
            })
            .slice(0, 24),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
    // Re-fetch whenever the account page signals that content has changed
    // (e.g. after a delete, publish, or restore).
    window.addEventListener("anv:content-changed", loadData);
    return () => window.removeEventListener("anv:content-changed", loadData);
  }, [loadData]);

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
      <section className="home-v3-hero">
        <picture className="home-v3-video-wrap">
          <source media="(min-width: 769px)" srcSet={asset("/images/provided/home-falcon-banner-desktop.jpg")} />
          <img
            src={asset("/images/provided/home-falcon-city-panorama-hero.jpg")}
            alt="Illustrated scholar with falcon overlooking mountains and a luminous city"
            className="home-v3-video"
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </picture>
      </section>

      {/* ─── RECENTLY UPLOADED ─── */}
      {recentPublications.length > 0 && (() => {
        const RECENT_PER_PAGE = 6;
        const totalRecentPages = Math.max(1, Math.ceil(recentPublications.length / RECENT_PER_PAGE));
        const paginatedRecent = recentPublications.slice((recentPage - 1) * RECENT_PER_PAGE, recentPage * RECENT_PER_PAGE);

        return (
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

              <div className="flex flex-col gap-10">
                {paginatedRecent.map((publication) => {
                  const readingTimeText = publication.readingMinutes
                    ? `${publication.readingMinutes} min read`
                    : null;
                  return (
                    <Link
                      key={`${publication.kind}-${publication.id}`}
                      href={`/${publication.kind === "paper" ? "papers" : "articles"}/${publication.slug}`}
                      className="group relative w-full rounded-3xl overflow-hidden border-2 border-[#333336] bg-[#1c1c1e] shadow-2xl block transition-all duration-500 hover:scale-[1.01] hover:border-[var(--gold)]"
                    >
                      {publication.imageUrl && (
                        <div className="w-full h-[320px] md:h-[420px] overflow-hidden relative bg-black">
                          <img
                            src={publication.imageUrl}
                            alt={publication.imageAlt || publication.title}
                            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      )}
                      <div className="p-6 md:p-8 flex flex-col justify-between text-white bg-[#1c1c1e]">
                        <h3 className="text-xl md:text-3xl font-extrabold text-white mb-2 leading-snug tracking-tight group-hover:text-[var(--gold-bright)] transition-colors" style={{ color: "#FFFFFF" }}>
                          {publication.title}
                        </h3>
                        {publication.summary && (
                          <p className="text-xs md:text-base text-white opacity-95 line-clamp-2 font-body leading-relaxed mb-2" style={{ color: "#FFFFFF" }}>
                            {publication.summary}
                          </p>
                        )}
                        
                        {/* Sectional Divider Line */}
                        <div className="h-px w-full bg-[#333336] my-4" />

                        <div className="flex items-center justify-between gap-3 font-ui text-xs md:text-sm font-bold uppercase tracking-wider text-white w-full" style={{ color: "#FFFFFF" }}>
                          <div className="flex items-center gap-2 overflow-hidden flex-wrap flex-1">
                            <span className="font-extrabold text-white tracking-widest shrink-0" style={{ color: "#FFFFFF" }}>{publication.authorName || "Editorial"}</span>
                            <span className="px-3 py-1 rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest bg-[#C84A10] text-white border border-white/20 shadow-sm shrink-0" style={{ color: "#FFFFFF" }}>
                              {publication.categoryName || publication.categorySlug || (publication.kind === "paper" ? "Paper" : "Essay")}
                            </span>
                            {readingTimeText && (
                              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shrink-0" style={{ color: "#FFFFFF" }}>
                                {readingTimeText}
                              </span>
                            )}
                          </div>
                          {publication.publishedAt && (
                            <span className="text-white opacity-90 font-extrabold shrink-0 text-right ml-auto" style={{ color: "#FFFFFF" }}>
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
            </div>
          </section>
        );
      })()}

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
            {HOME_DOMAINS.map(d => (
              <Link key={d.label} href={d.href} className="home-v3-domain-card">
                <div className="home-v3-domain-icon-wrap">
                  <div className="home-v3-domain-icon home-v3-domain-icon-vivid">
                    <AnimalGlyph domain={d.domain} size={50} />
                  </div>
                </div>

                <div className="home-v3-domain-name">{d.label}</div>
                <p className="home-v3-domain-desc">{d.desc}</p>
              </Link>
            ))}
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
