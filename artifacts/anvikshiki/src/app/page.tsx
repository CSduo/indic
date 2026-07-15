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
  { label: "Psychology",             domain: "psychology",             href: "/domains/psychology",             color: DOMAIN_SILVER, emoji: "🧠", desc: "Mind, behavior, consciousness, and inner landscapes." },
  { label: "Sociology",              domain: "sociology",              href: "/domains/sociology",              color: DOMAIN_SILVER, emoji: "🌿", desc: "Communities, institutions, cultures, and shared patterns." },
  { label: "Science",                domain: "science",                href: "/domains/science",                color: DOMAIN_SILVER, emoji: "🔭", desc: "Observation, logic, nature, systems, and discovery." },
  { label: "Geopolitics",            domain: "geopolitics",            href: "/domains/geopolitics",            color: DOMAIN_SILVER, emoji: "🌐", desc: "Power, geography, statecraft, strategy, and place." },
  { label: "Papers",                 domain: "papers",                 href: "/papers",                         color: DOMAIN_SILVER, emoji: "📋", desc: "Research manuscripts, working papers, and scholarship." },
  { label: "Archive",                domain: "archive",                href: "/archive",                        color: DOMAIN_SILVER, emoji: "🗂️", desc: "Texts, records, timelines, sources, and living memory." },
  { label: "Civilizational Thought", domain: "civilizational-thought", href: "/domains/civilizational-thought", color: DOMAIN_SILVER, emoji: "🏛️", desc: "Long-arc inquiry into culture, tradition, and society." },
  { label: "Aesthetics",             domain: "aesthetics",             href: "/domains/aesthetics",             color: DOMAIN_SILVER, emoji: "🎨", desc: "Art, beauty, literature, music, symbol, and form." },
  { label: "Sanskrit Studies",       domain: "sanskrit-studies",       href: "/domains/sanskrit-studies",       color: DOMAIN_SILVER, emoji: "🪔", desc: "Language, shastra, grammar, and textual traditions." },
  { label: "Political Theory",       domain: "political-theory",       href: "/domains/political-theory",       color: DOMAIN_SILVER, emoji: "⚖️", desc: "State, order, sovereignty, justice, and power." },
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
  { label: "Submit Your Work", sub: "Share your original essays and research with a global audience.", href: "/submit",    Icon: Send,     bg: "var(--terracotta)", text: "var(--surface)" },
  { label: "Explore Journal",  sub: "Dive into essays, papers, and ideas from thinkers worldwide.",   href: "/browse",    Icon: BookOpen, bg: "var(--ink-soft)",   text: "var(--bg-deep)" },
  { label: "Join Community",   sub: "Connect with scholars, readers, and creators of knowledge.",     href: "/community", Icon: Users,    bg: "var(--gold-pale)",  text: "var(--ink)" },
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
    <section className="home-wisdom-strip" aria-label="Sanskrit aphorism of the day">
      {/* Decorative yantra bg */}
      <div className="home-wisdom-yantra" aria-hidden="true">
        <YantraPattern size={260} style={{ opacity: 0.07 }} />
      </div>

      <div className="container-anv home-wisdom-body" style={{ opacity: fade ? 1 : 0, transition: "opacity 0.42s ease" }}>
        <div className="home-wisdom-left" aria-hidden="true">
          <PrismaticBurst size={72} style={{ opacity: 0.65 }} />
        </div>
        <div className="home-wisdom-center">
          <p className="home-wisdom-label">✦ Aphorism from the Archive ✦</p>
          <p className="home-wisdom-deva" lang="sa">{w.devanagari}</p>
          <p className="home-wisdom-roman">{w.transliteration}</p>
          <p className="home-wisdom-trans">"{w.translation}"</p>
          <p className="home-wisdom-source">— {w.source} &nbsp;·&nbsp; {w.domain}</p>
        </div>
        <div className="home-wisdom-right" aria-hidden="true">
          <PrismaticBurst size={72} style={{ opacity: 0.65, transform: "scaleX(-1)" }} />
        </div>
      </div>

      {/* Progress dots */}
      <div className="home-wisdom-dots" aria-hidden="true">
        {WISDOMS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Aphorism ${i + 1}`}
            className="home-wisdom-dot"
            style={{ background: i === idx ? "var(--gold)" : "var(--border-gold)", opacity: i === idx ? 1 : 0.4 }}
            onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 250); }}
          />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [featuredEssays, setFeaturedEssays] = useState<any[]>([]);
  const [recentPublications, setRecentPublications] = useState<RecentPublication[]>([]);
  const recentTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        <div className="home-v3-video-wrap" aria-hidden="true">
          <img
            src={asset("/images/provided/home-falcon-city-panorama-hero.jpg")}
            alt="Illustrated scholar with falcon overlooking mountains and a luminous city"
            className="home-v3-video"
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </div>

        <div className="container-anv home-v3-hero-inner">
          <div className="home-v3-text">
            <p className="home-v3-eyebrow">
              <span className="home-v3-eyebrow-diamond">✦</span>
              Journal &amp; Research Platform
              <span className="home-v3-eyebrow-diamond">✦</span>
            </p>

            <h1 className="home-v3-headline">
              Where Inquiry<br />Becomes Insight.
            </h1>

            <p className="home-v3-subhead">
              A home for essays, research papers, and long-form ideas at the
              intersection of history, philosophy, civilization, and the arts.
            </p>

            <div className="home-v3-cta-row">
              <Link href="/browse" className="home-v3-btn-primary">
                <BookOpen size={15} /> Explore Journal
              </Link>
              <Link href="/submit" className="home-v3-btn-outline">
                <Send size={15} /> Submit Work
              </Link>
            </div>

            {/* Domain chips — silver, monochrome */}
            <div className="home-v3-chips">
              {HOME_DOMAINS.map(d => (
                <Link key={d.label} href={d.href} className="home-v3-chip"
                  style={{
                    color: d.color,
                    borderColor: `${d.color}66`,
                    background: `${d.color}12`,
                  }}>
                  {d.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="home-v3-frieze" aria-hidden="true">
          <span className="home-v3-frieze-ornament">
            <span className="home-v3-frieze-diamond">✦</span>
            <span className="home-v3-frieze-line" />
            <span className="home-v3-frieze-diamond">❋</span>
            <span className="home-v3-frieze-line" />
            <span className="home-v3-frieze-diamond">✦</span>
          </span>
        </div>
      </section>

      {/* ─── WISDOM STRIP ─── */}
      <WisdomStrip />

      {/* ─── RECENTLY UPLOADED ─── */}
      {recentPublications.length > 0 && (
        <section className="home-v3-section">
          <div className="container-anv">
            <div className="home-v3-section-head">
              <span className="home-v3-lotus-mark">✦</span>
              <h2 className="home-v3-section-title">Recently Submitted</h2>
              <div className="home-recent-actions">
                {recentPublications.length > 4 && (
                  <div className="home-recent-nav" aria-label="Recently submitted navigation">
                    <button type="button" onClick={() => moveRecentPublications(-1)} aria-label="Previous submissions" title="Previous submissions">
                      <ChevronLeft size={17} />
                    </button>
                    <button type="button" onClick={() => moveRecentPublications(1)} aria-label="Next submissions" title="Next submissions">
                      <ChevronRight size={17} />
                    </button>
                  </div>
                )}
                <Link href="/browse" className="home-v3-view-all">View All <ArrowRight size={14} /></Link>
              </div>
            </div>
            <div
              ref={recentTrackRef}
              className="home-recent-track"
            >
              {recentPublications.map((publication) => {
                const readingTimeText = publication.readingMinutes
                  ? `${publication.readingMinutes} min read`
                  : null;
                return (
                  <Link
                    key={`${publication.kind}-${publication.id}`}
                    href={`/${publication.kind === "paper" ? "papers" : "articles"}/${publication.slug}`}
                    className="home-recent-card"
                  >
                    {publication.imageUrl && (
                      <div className="home-recent-image">
                        <img
                          src={publication.imageUrl}
                          alt={publication.imageAlt || publication.title}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div className="home-recent-content">
                      <div className="home-v3-essay-meta-mini">
                        <AnimalGlyph domain={publication.categorySlug || (publication.kind === "paper" ? "papers" : "archive")} size={15} />
                        <span>
                          {publication.categoryName || publication.categorySlug || (publication.kind === "paper" ? "Paper" : "Essay")}
                        </span>
                      </div>
                      <h3 className="home-recent-title">{publication.title}</h3>
                      <div className="home-v3-essay-foot-mini">
                        <span className="home-v3-essay-author-mini">{publication.authorName || "Editorial"}</span>
                        {readingTimeText && <span>{readingTimeText}</span>}
                      </div>
                      <div className="font-ui text-[8px] opacity-80 mt-1 flex items-center justify-between" style={{ color: "rgba(255,255,255,0.4)" }}>
                        <span>Published</span>
                        {publication.publishedAt && (
                          <span>
                            {new Date(publication.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── FEATURED ESSAYS (API data only) ─── */}
      {realEssays && (
        <section className="home-v3-section">
          <div className="container-anv">
            <div className="home-v3-section-head">
              <span className="home-v3-lotus-mark">✦</span>
              <h2 className="home-v3-section-title">Featured Essays</h2>
              <Link href="/browse" className="home-v3-view-all">View All <ArrowRight size={14} /></Link>
            </div>
            <div className="home-v3-essay-grid">
              {realEssays.map(essay => (
                <Link key={essay.title} href={essay.href} className="home-v3-essay-card">
                  <div className="home-v3-essay-meta">
                    <AnimalGlyph domain={essay.domain} size={34} />
                    <span className="home-v3-essay-cat" style={{ color: essay.color }}>{essay.category}</span>
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

      {/* ─── BROWSE BY DOMAIN ─── */}
      <section className="home-v3-section home-v3-domains-section" style={{ position: "relative", overflow: "hidden" }}>
        {/* Background Yantra watermark */}
        <div className="home-domains-yantra" aria-hidden="true">
          <YantraPattern size={400} style={{ opacity: 0.04 }} />
        </div>

        <div className="container-anv" style={{ position: "relative", zIndex: 1 }}>
          <div className="home-v3-section-head centered">
            <SectionMandala size={48} />
            <h2 className="home-v3-section-title">Browse by Domain</h2>
          </div>

          <p className="home-v3-section-sub">
            Fourteen fields of inquiry — from the sweep of civilizations to the intimacy of the aesthetic moment,
            the precision of science to the depth of Sanskrit wisdom.
          </p>

          <div className="home-v3-domains home-v3-domains-expanded">
            {HOME_DOMAINS.map(d => (
              <Link key={d.label} href={d.href} className="home-v3-domain-card"
                style={{ "--card-color": d.color } as React.CSSProperties}>

                {/* Icon with vivid ring */}
                <div className="home-v3-domain-icon-wrap">
                  <div className="home-v3-domain-icon home-v3-domain-icon-vivid"
                    style={{ "--icon-color": d.color } as React.CSSProperties}>
                    <AnimalGlyph domain={d.domain} size={50} />
                  </div>
                </div>

                <div className="home-v3-domain-name">{d.label}</div>
                <p className="home-v3-domain-desc">{d.desc}</p>

                <div className="home-v3-domain-ornament">
                  <span style={{ color: d.color }}>✦</span>
                  <span style={{ color: d.color, opacity: 0.5 }}>✦</span>
                  <span style={{ color: d.color }}>✦</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED QUOTE ─── */}
      <section className="home-quote-section">
        <div className="container-anv home-quote-inner">
          <div className="home-quote-prism" aria-hidden="true">
            <PrismaticBurst size={100} style={{ opacity: 0.5 }} />
          </div>
          <blockquote className="home-quote-block">
            <p className="home-quote-text">
              "Inquiry is not a method — it is a disposition of the soul toward truth."
            </p>
            <footer className="home-quote-attr">
              <span className="home-quote-dash">—</span> Editorial, Anvikshiki
            </footer>
          </blockquote>
          <div className="home-quote-prism home-quote-prism-right" aria-hidden="true">
            <PrismaticBurst size={100} style={{ opacity: 0.5, transform: "scaleX(-1)" }} />
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

          <div className="home-v3-ornament">
            <span /><i>✦</i><b>❧</b><i>✦</i><span />
          </div>
        </div>
      </section>

    </div>
  );
}
