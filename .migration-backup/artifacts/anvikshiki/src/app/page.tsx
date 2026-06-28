import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock3, Send, Users } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

const HOME_DOMAINS = [
  { label: "History",        domain: "history",              href: "/domains/history",              color: "#8b5b39" },
  { label: "Philosophy",     domain: "philosophy",           href: "/domains/philosophy",           color: "#a66735" },
  { label: "Civilizations",  domain: "civilizational-thought", href: "/domains/civilizational-thought", color: "#536849" },
  { label: "Religion",       domain: "aesthetics",           href: "/archive",                      color: "#62526f" },
  { label: "Society",        domain: "sociology",            href: "/domains/sociology",            color: "#9a7a42" },
  { label: "Arts & Lit",     domain: "multimedia",           href: "/domains/aesthetics",           color: "#667252" },
] as const;

const FALLBACK_ESSAYS = [
  { category: "History",          title: "The Caravan of Ideas: Trade Routes and Knowledge", author: "Meera Vaidyanathan", minutes: 8,  domain: "geopolitics",          href: "/browse",                     color: "#76546d" },
  { category: "Philosophy",       title: "Inquiry in Ancient Traditions: Then and Now",      author: "Arjun Dev",           minutes: 6,  domain: "philosophy",           href: "/domains/philosophy",         color: "#aa7135" },
  { category: "Civilizations",    title: "Writing, Memory, and the Making of Civilizations", author: "K. R. Iyer",          minutes: 9,  domain: "civilizational-thought", href: "/domains/civilizational-thought", color: "#6f7547" },
  { category: "Arts & Literature",title: "Caravans, Omens, and the Premodern Imagination",  author: "Moon Sen",            minutes: 9,  domain: "aesthetics",           href: "/domains/aesthetics",         color: "#a35e3d" },
];

export default function HomePage() {
  const [featuredEssays, setFeaturedEssays] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${base}/api/articles?featured=true&limit=4`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.articles?.length) setFeaturedEssays(d.articles); })
      .catch(() => {});
  }, []);

  const essays = featuredEssays.length > 0
    ? featuredEssays.map((a: any) => ({
        category: a.category?.name || a.categorySlug || "Essay",
        title: a.title,
        author: a.authorName || "Editorial",
        minutes: a.readingMinutes || 6,
        domain: a.categorySlug || "philosophy",
        href: `/articles/${a.slug}`,
        color: "#aa7135",
      }))
    : FALLBACK_ESSAYS;

  return (
    <div className="home-v2">

      {/* ─── HERO ─── */}
      <section className="home-v2-hero">
        <div className="container-anv">
          <div className="home-v2-hero-inner">

            {/* Left: editorial text */}
            <div className="home-v2-hero-text">
              <p className="home-v2-platform-label">Journal &amp; Research Platform</p>

              <h1 className="home-v2-headline">
                Where Inquiry<br />Becomes Insight
              </h1>

              <p className="home-v2-tagline">
                A home for essays, research papers, and long-form ideas at the intersection of history, philosophy, civilizational thought, and the arts.
              </p>

              <div className="home-v2-cta-row">
                <Link href="/browse" className="home-v2-btn-primary">
                  <BookOpen size={16} /> Explore Journal
                </Link>
                <Link href="/submit" className="home-v2-btn-outline">
                  <Send size={16} /> Submit Work
                </Link>
              </div>

              <div className="home-v2-domain-pills">
                {HOME_DOMAINS.map(d => (
                  <Link
                    key={d.label}
                    href={d.href}
                    className="home-v2-pill"
                    style={{ color: d.color, borderColor: `${d.color}55`, background: `${d.color}11` }}
                  >
                    <AnimalGlyph domain={d.domain} size={14} />
                    {d.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: scholar illustration */}
            <div className="home-v2-hero-image-col">
              <img
                src={asset("/homepage_hero_scholar.png")}
                alt="Scholar carrying ancient texts through a fantastical library"
                className="home-v2-hero-image"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ─── FEATURED ESSAYS ─── */}
      <section className="home-v2-section home-v2-section-border">
        <div className="container-anv">
          <div className="home-v2-section-head">
            <h2 className="home-v2-section-title">Featured Essays</h2>
            <Link href="/browse" className="home-v2-view-all">
              View All <ArrowRight size={15} />
            </Link>
          </div>
          <div className="home-v2-essay-grid">
            {essays.map(essay => (
              <Link key={essay.title} href={essay.href} className="home-v2-essay-card">
                <div className="home-v2-essay-meta">
                  <AnimalGlyph domain={essay.domain} size={36} />
                  <span className="home-v2-essay-cat" style={{ color: essay.color }}>{essay.category}</span>
                </div>
                <h3 className="home-v2-essay-title">{essay.title}</h3>
                <div className="home-v2-essay-footer">
                  <p className="home-v2-essay-author">{essay.author}</p>
                  <span className="home-v2-read-time">
                    <Clock3 size={13} /> {essay.minutes} min
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BROWSE BY DOMAIN ─── */}
      <section className="home-v2-section home-v2-section-border">
        <div className="container-anv">
          <h2 className="home-v2-section-title" style={{ marginBottom: "1.25rem" }}>Browse by Domain</h2>
          <div className="home-v2-domain-grid">
            {HOME_DOMAINS.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="home-v2-domain-card"
                style={{ borderColor: `${item.color}44`, background: `${item.color}0b`, color: item.color }}
              >
                <AnimalGlyph domain={item.domain} size={48} />
                <span className="home-v2-domain-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ACTION ROWS ─── */}
      <section className="home-v2-section">
        <div className="container-anv">
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {[
              { label: "Submit Your Work", href: "/submit",    icon: Send,     bg: "var(--terracotta)", text: "var(--surface)" },
              { label: "Explore Journal",  href: "/browse",    icon: BookOpen, bg: "var(--ink-soft)",   text: "var(--bg-deep)" },
              { label: "Join Community",   href: "/community", icon: Users,    bg: "var(--gold-pale)",  text: "var(--ink)" },
            ].map(({ label, href, icon: Icon, bg, text }) => (
              <Link
                key={href}
                href={href}
                className="home-v2-action"
                style={{ background: bg, color: text }}
              >
                <Icon size={26} strokeWidth={1.4} />
                <span className="home-v2-action-label">{label}</span>
                <ArrowRight size={22} strokeWidth={1.5} style={{ justifySelf: "end" }} />
              </Link>
            ))}
          </div>

          <div className="home-v2-ornament">
            <span /><i>✧</i><b>♧</b><i>✧</i><span />
          </div>
        </div>
      </section>

    </div>
  );
}
