import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock3, Send, Users } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

const HOME_DOMAINS = [
  { label: "History",       domain: "history",              href: "/domains/history",              color: "#8b5b39", desc: "Uncover civilizations, events, and the threads of time." },
  { label: "Philosophy",    domain: "philosophy",           href: "/domains/philosophy",           color: "#a66735", desc: "Explore ideas, ethics, and the nature of existence." },
  { label: "Civilizations", domain: "civilizational-thought", href: "/domains/civilizational-thought", color: "#536849", desc: "Journey through cultures and the rise of human achievement." },
  { label: "Religion",      domain: "aesthetics",           href: "/archive",                      color: "#62526f", desc: "Discover beliefs, texts, and spiritual traditions." },
  { label: "Society",       domain: "sociology",            href: "/domains/sociology",            color: "#9a7a42", desc: "Understand communities, structures, and human connections." },
  { label: "Arts & Lit",    domain: "multimedia",           href: "/domains/aesthetics",           color: "#667252", desc: "Celebrate creativity through literature, art, and expression." },
] as const;

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
      <section className="home-v3-section">
        <div className="container-anv">
          <div className="home-v3-section-head centered">
            <span className="home-v3-lotus-mark">✦</span>
            <h2 className="home-v3-section-title">Browse by Domain</h2>
            <span className="home-v3-lotus-mark">✦</span>
          </div>
          <div className="home-v3-domains">
            {HOME_DOMAINS.map(d => (
              <Link
                key={d.label}
                href={d.href}
                className="home-v3-domain-card"
                style={{ "--card-color": d.color } as React.CSSProperties}
              >
                <div className="home-v3-domain-icon">
                  <AnimalGlyph domain={d.domain} size={56} />
                </div>
                <div className="home-v3-domain-name">{d.label}</div>
                <p className="home-v3-domain-desc">{d.desc}</p>
                <div className="home-v3-domain-ornament">✦</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ACTION ROWS ─── */}
      <section className="home-v3-section home-v3-actions-section">
        <div className="container-anv">
          <div className="home-v3-actions">
            {ACTION_ROWS.map(({ label, sub, href, Icon, bg, text }) => (
              <Link
                key={href}
                href={href}
                className="home-v3-action"
                style={{ "--action-bg": bg, "--action-text": text } as React.CSSProperties}
              >
                <Icon size={28} strokeWidth={1.35} className="home-v3-action-icon" />
                <div className="home-v3-action-text">
                  <span className="home-v3-action-label">{label}</span>
                  <span className="home-v3-action-sub">{sub}</span>
                </div>
                <ArrowRight size={20} strokeWidth={1.5} className="home-v3-action-arrow" />
              </Link>
            ))}
          </div>

          <div className="home-v3-ornament">
            <span /><i>✧</i><b>♧</b><i>✧</i><span />
          </div>
        </div>
      </section>

    </div>
  );
}
