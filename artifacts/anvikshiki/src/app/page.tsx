import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock3, Compass, Feather, Globe, Layers, Send, Users } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { FloralBorder } from "@/components/sacred/FloralDecor";
import { ColorMandala, GemstoneRow, PrismaticBurst, RainbowDivider, YantraPattern } from "@/components/sacred/ColorfulDecor";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

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

/* ── VIVID ambient sakura — full spectrum petals ── */
const AMBIENT_PETALS = Array.from({ length: 22 }, (_, i) => ({
  left: `${4 + (i * 29 + 11) % 92}%`,
  size: 7 + (i % 5) * 2.2,
  color: [
    "#E11D48","#F97316","#EAB308","#22C55E","#06B6D4","#3B82F6",
    "#7C3AED","#EC4899","#F43F5E","#D97706","#059669","#0EA5E9",
  ][i % 12],
  opacity: 0.26 + (i % 4) * 0.06,
  delay: `${(i * 0.55) % 9}s`,
  dur: `${8 + (i % 6) * 1.3}s`,
  drift: `${((i % 7) - 3) * 34}px`,
  spin: `${((i % 2) === 0 ? -1 : 1) * (170 + (i % 5) * 45)}deg`,
}));

function AmbientSakura() {
  return (
    <div className="home-v3-ambient-sakura" aria-hidden="true">
      {AMBIENT_PETALS.map((p, i) => (
        <svg key={i} width={p.size} height={p.size * 1.65} viewBox="0 0 14 23"
          className="home-v3-ambient-petal"
          style={{ left: p.left, top: "-5%", opacity: p.opacity,
            "--dur": p.dur, "--delay": p.delay,
            "--petal-drift": p.drift, "--petal-spin": p.spin,
          } as React.CSSProperties}>
          <path d="M7,23 C1,19 0,13 0,8.5 C0,2.5 3,0 7,0 C11,0 14,2.5 14,8.5 C14,13 13,19 7,23Z" fill={p.color} />
          <line x1="7" y1="2" x2="7" y2="20" stroke="rgba(255,255,255,0.38)" strokeWidth="0.65" />
        </svg>
      ))}
    </div>
  );
}

/* ── VIVID domain colors ── */
const HOME_DOMAINS = [
  { label: "Philosophy",             domain: "philosophy",             href: "/domains/philosophy",             color: "#7C3AED", emoji: "🔮", desc: "Reality, reasoning, self, knowledge, and truth." },
  { label: "History",                domain: "history",                href: "/domains/history",                color: "#D97706", emoji: "📜", desc: "Civilizations, memory, events, eras, and inheritance." },
  { label: "Psychology",             domain: "psychology",             href: "/domains/psychology",             color: "#E11D48", emoji: "🧠", desc: "Mind, behavior, consciousness, and inner landscapes." },
  { label: "Sociology",              domain: "sociology",              href: "/domains/sociology",              color: "#059669", emoji: "🌿", desc: "Communities, institutions, cultures, and shared patterns." },
  { label: "Science",                domain: "science",                href: "/domains/science",                color: "#0EA5E9", emoji: "🔭", desc: "Observation, logic, nature, systems, and discovery." },
  { label: "Geopolitics",            domain: "geopolitics",            href: "/domains/geopolitics",            color: "#B91C1C", emoji: "🌐", desc: "Power, geography, statecraft, strategy, and place." },
  { label: "Papers",                 domain: "papers",                 href: "/papers",                         color: "#B45309", emoji: "📋", desc: "Research manuscripts, working papers, and scholarship." },
  { label: "Archive",                domain: "archive",                href: "/archive",                        color: "#71717A", emoji: "🗂️", desc: "Texts, records, timelines, sources, and living memory." },
  { label: "Civilizational Thought", domain: "civilizational-thought", href: "/domains/civilizational-thought", color: "#16A34A", emoji: "🏛️", desc: "Long-arc inquiry into culture, tradition, and society." },
  { label: "Aesthetics",             domain: "aesthetics",             href: "/domains/aesthetics",             color: "#9D174D", emoji: "🎨", desc: "Art, beauty, literature, music, symbol, and form." },
  { label: "Sanskrit Studies",       domain: "sanskrit-studies",       href: "/domains/sanskrit-studies",       color: "#CA8A04", emoji: "🪔", desc: "Language, shastra, grammar, and textual traditions." },
  { label: "Political Theory",       domain: "political-theory",       href: "/domains/political-theory",       color: "#DC2626", emoji: "⚖️", desc: "State, order, sovereignty, justice, and power." },
  { label: "Translations",           domain: "translations",           href: "/domains/translations",           color: "#4338CA", emoji: "📖", desc: "Texts moving between languages, worlds, and eras." },
  { label: "Multimedia",             domain: "multimedia",             href: "/domains/aesthetics",             color: "#1D4ED8", emoji: "🎬", desc: "Visual stories, lectures, audio, and interactive work." },
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

  useEffect(() => {
    fetch(`${base}/api/articles?featured=true&limit=4`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.articles?.length) setFeaturedEssays(d.articles); })
      .catch(() => {});
  }, []);

  const realEssays = featuredEssays.length > 0
    ? featuredEssays.map((a: any) => ({
        category: a.category?.name || a.categorySlug || "Essay",
        title: a.title,
        author: a.authorName || "Editorial",
        minutes: a.readingMinutes || 6,
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

            {/* Vivid colored domain chips */}
            <div className="home-v3-chips">
              {HOME_DOMAINS.map(d => (
                <Link key={d.label} href={d.href} className="home-v3-chip"
                  style={{
                    color: d.color,
                    borderColor: `${d.color}66`,
                    background: `${d.color}12`,
                  }}>
                  <span aria-hidden="true">{d.emoji}</span>
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
        <AmbientSakura />

        {/* Background Yantra watermark */}
        <div className="home-domains-yantra" aria-hidden="true">
          <YantraPattern size={400} style={{ opacity: 0.04 }} />
        </div>

        <div className="container-anv" style={{ position: "relative", zIndex: 1 }}>
          <div className="home-v3-section-head centered">
            <SectionMandala size={48} />
            <h2 className="home-v3-section-title">Browse by Domain</h2>
          </div>

          <GemstoneRow count={7} className="mb-2 mt-1 opacity-70" />

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

                {/* Domain emoji accent */}
                <div className="home-domain-emoji" aria-hidden="true">{d.emoji}</div>

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
        <FloralBorder petals={7} className="mt-4 opacity-55" />
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
