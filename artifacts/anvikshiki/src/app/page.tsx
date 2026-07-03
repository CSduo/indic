import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock3, Send, Users } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

/* ── Decorative mandala ring for section headers ── */
function SectionMandala({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className="home-v3-section-mandala" aria-hidden="true">
      <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
      <circle cx="26" cy="26" r="17" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
      <circle cx="26" cy="26" r="9" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return <line key={i} x1={26 + 9*Math.cos(r)} y1={26 + 9*Math.sin(r)} x2={26 + 24*Math.cos(r)} y2={26 + 24*Math.sin(r)} stroke="currentColor" strokeWidth="0.35" opacity="0.25" />;
      })}
      {[0,45,90,135,180,225,270,315].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return <circle key={i} cx={26 + 17*Math.cos(r)} cy={26 + 17*Math.sin(r)} r="1.2" fill="currentColor" opacity="0.35" />;
      })}
      <circle cx="26" cy="26" r="3" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/* ── Ambient floating orange sakura petals ── */
const AMBIENT_PETALS = Array.from({ length: 18 }, (_, i) => ({
  left: `${5 + (i * 31 + 7) % 90}%`,
  size: 7 + (i % 4) * 2.5,
  color: ["#ffaa52","#ff9f43","#ffd599","#ff8c42","#f97316","#ffbf70"][i % 6],
  opacity: 0.28 + (i % 3) * 0.07,
  delay: `${(i * 0.6) % 7}s`,
  dur: `${8 + (i % 5) * 1.4}s`,
  drift: `${((i % 7) - 3) * 32}px`,
  spin: `${((i % 2) === 0 ? -1 : 1) * (180 + (i % 4) * 55)}deg`,
}));

function AmbientSakura() {
  return (
    <div className="home-v3-ambient-sakura" aria-hidden="true">
      {AMBIENT_PETALS.map((p, i) => (
        <svg
          key={i}
          width={p.size} height={p.size * 1.6}
          viewBox="0 0 14 22"
          className="home-v3-ambient-petal"
          style={{
            left: p.left,
            top: "-5%",
            opacity: p.opacity,
            "--dur": p.dur,
            "--delay": p.delay,
            "--petal-drift": p.drift,
            "--petal-spin": p.spin,
          } as React.CSSProperties}
        >
          <path d="M 7,22 C 1,18 0,12 0,8 C 0,2 3,0 7,0 C 11,0 14,2 14,8 C 14,12 13,18 7,22 Z" fill={p.color} />
          <line x1="7" y1="2" x2="7" y2="19" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
        </svg>
      ))}
    </div>
  );
}

const HOME_DOMAINS = [
  { label: "Philosophy",             domain: "philosophy",            href: "/domains/philosophy",            color: "#b84c2a", desc: "Reality, reasoning, self, knowledge, and truth." },
  { label: "History",                domain: "history",               href: "/domains/history",               color: "#8b6020", desc: "Civilizations, memory, events, eras, and inheritance." },
  { label: "Psychology",             domain: "psychology",            href: "/domains/psychology",            color: "#9a5060", desc: "Mind, behavior, consciousness, and inner landscapes." },
  { label: "Sociology",              domain: "sociology",             href: "/domains/sociology",             color: "#5f7a69", desc: "Communities, institutions, cultures, and shared patterns." },
  { label: "Science",                domain: "science",               href: "/domains/science",               color: "#385268", desc: "Observation, logic, nature, systems, and discovery." },
  { label: "Geopolitics",            domain: "geopolitics",           href: "/domains/geopolitics",           color: "#6a7840", desc: "Power, geography, statecraft, strategy, and place." },
  { label: "Papers",                 domain: "papers",                href: "/papers",                        color: "#c9883d", desc: "Research manuscripts, working papers, and scholarship." },
  { label: "Archive",                domain: "archive",               href: "/archive",                       color: "#8b6020", desc: "Texts, records, timelines, sources, and living memory." },
  { label: "Civilizational Thought", domain: "civilizational-thought",href: "/domains/civilizational-thought",color: "#5f7a69", desc: "Long-arc inquiry into culture, tradition, and society." },
  { label: "Aesthetics",             domain: "aesthetics",            href: "/domains/aesthetics",            color: "#9a5060", desc: "Art, beauty, literature, music, symbol, and form." },
  { label: "Sanskrit Studies",       domain: "sanskrit-studies",      href: "/domains/sanskrit-studies",      color: "#8b6020", desc: "Language, shastra, grammar, and textual traditions." },
  { label: "Political Theory",       domain: "political-theory",      href: "/domains/political-theory",      color: "#b84c2a", desc: "State, order, sovereignty, justice, and power." },
  { label: "Translations",           domain: "translations",          href: "/domains/translations",          color: "#385268", desc: "Texts moving between languages, worlds, and eras." },
  { label: "Multimedia",             domain: "multimedia",            href: "/domains/aesthetics",            color: "#c9883d", desc: "Visual stories, lectures, audio, and interactive work." },
];

const ACTION_ROWS = [
  { label: "Submit Your Work", sub: "Share your original essays and research with a global audience.", href: "/submit",    Icon: Send,     bg: "var(--terracotta)", text: "var(--surface)" },
  { label: "Explore Journal",  sub: "Dive into essays, papers, and ideas from thinkers worldwide.",   href: "/browse",    Icon: BookOpen, bg: "var(--ink-soft)",   text: "var(--bg-deep)" },
  { label: "Join Community",   sub: "Connect with scholars, readers, and creators of knowledge.",     href: "/community", Icon: Users,    bg: "var(--gold-pale)",  text: "var(--ink)" },
] as const;

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
        color: "#aa7135",
      }))
    : null;

  return (
    <div className="home-v3">

      {/* ─── HERO — Image hero replacing broken video ─── */}
      <section className="home-v3-hero">

        {/* Full-bleed hero image */}
        <div className="home-v3-video-wrap" aria-hidden="true">
          <img
            src={asset("/images/provided/home-falcon-city-panorama-hero.jpg")}
            alt="Illustrated scholar with falcon overlooking mountains and a luminous city"
            className="home-v3-video"
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </div>

        {/* Editorial content — left text zone */}
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

            <div className="home-v3-chips">
              {HOME_DOMAINS.map(d => (
                <Link
                  key={d.label}
                  href={d.href}
                  className="home-v3-chip"
                  style={{
                    color: d.color,
                    borderColor: `${d.color}88`,
                    background: `rgba(245,237,216,0.82)`,
                  }}
                >
                  {d.label}
                </Link>
              ))}
            </div>

          </div>
        </div>

        {/* Ornamental divider — replaces old emoji FRIEZE_SYMBOLS */}
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

      {/* ─── FEATURED ESSAYS (only when real API data present) ─── */}
      {realEssays && (
        <section className="home-v3-section">
          <div className="container-anv">
            <div className="home-v3-section-head">
              <span className="home-v3-lotus-mark">✦</span>
              <h2 className="home-v3-section-title">Featured Essays</h2>
              <Link href="/browse" className="home-v3-view-all">
                View All <ArrowRight size={14} />
              </Link>
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
              <Link
                key={d.label}
                href={d.href}
                className="home-v3-domain-card"
                style={{ "--card-color": d.color } as React.CSSProperties}
              >
                {/* Sacred geometry ring (CSS ::before) */}
                <div className="home-v3-domain-icon-wrap">
                  <div className="home-v3-domain-icon">
                    <AnimalGlyph domain={d.domain as string} size={52} />
                  </div>
                </div>
                <div className="home-v3-domain-name">{d.label}</div>
                <p className="home-v3-domain-desc">{d.desc}</p>
                <div className="home-v3-domain-ornament">
                  <span>✦</span><span style={{ opacity: 0.5 }}>✦</span><span>✦</span>
                </div>
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
              <Link
                key={href}
                href={href}
                className="home-v3-action"
                style={{ "--action-bg": bg, "--action-text": text } as React.CSSProperties}
              >
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
