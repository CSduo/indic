import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Send,
  Users,
  X,
} from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";

const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const REFERENCE_ART = asset("/hero_redesign_reference.png");

const FEATURED_ESSAYS = [
  {
    category: "History",
    title: "The Caravan of Ideas: Trade Routes and Knowledge",
    author: "Meera Vaidyanathan",
    minutes: 8,
    domain: "geopolitics",
    href: "/browse",
    color: "#76546d",
  },
  {
    category: "Philosophy",
    title: "Inquiry in Ancient Traditions: Then and Now",
    author: "Arjun Dev",
    minutes: 6,
    domain: "philosophy",
    href: "/domains/philosophy",
    color: "#aa7135",
  },
  {
    category: "Civilizations",
    title: "Writing, Memory, and the Making of Civilizations",
    author: "K. R. Iyer",
    minutes: 9,
    domain: "civilizational-thought",
    href: "/domains/civilizational-thought",
    color: "#6f7547",
  },
  {
    category: "Arts & Literature",
    title: "Caravans, Omens, and the Premodern Imagination",
    author: "Moon Sen",
    minutes: 9,
    domain: "aesthetics",
    href: "/domains/aesthetics",
    color: "#a35e3d",
  },
] as const;

const HOME_DOMAINS = [
  { label: "History", domain: "history", href: "/domains/history", color: "#8b5b39" },
  { label: "Philosophy", domain: "philosophy", href: "/domains/philosophy", color: "#a66735" },
  { label: "Civilizations", domain: "civilizational-thought", href: "/domains/civilizational-thought", color: "#536849" },
  { label: "Religion", domain: "aesthetics", href: "/archive", color: "#62526f" },
  { label: "Society", domain: "sociology", href: "/domains/sociology", color: "#9a7a42" },
  { label: "Arts & Literature", domain: "multimedia", href: "/domains/aesthetics", color: "#667252" },
] as const;

const HOME_ACTIONS = [
  { label: "Submit Your Work", href: "/submit", icon: Send, tone: "terracotta" },
  { label: "Explore Journal", href: "/browse", icon: BookOpen, tone: "sage" },
  { label: "Join Community", href: "/community", icon: Users, tone: "parchment" },
] as const;

function ReferenceHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="home-reference-header">
        <img src={REFERENCE_ART} alt="" aria-hidden="true" />
        <Link
          href="/"
          className="home-header-hit home-header-brand"
          aria-label="Anvikshiki home"
        />
        <Link
          href="/search"
          className="home-header-hit home-header-search"
          aria-label="Search the journal"
        />
        <button
          type="button"
          className="home-header-hit home-header-menu"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        />
      </header>

      {menuOpen ? (
        <div
          className="home-menu-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          onClick={() => setMenuOpen(false)}
        >
          <aside className="home-menu-panel" onClick={(event) => event.stopPropagation()}>
            <div className="home-menu-heading">
              <span>ANVIKSIKI</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X size={28} />
              </button>
            </div>
            <nav aria-label="Homepage navigation">
              {[
                ["Explore Journal", "/browse"],
                ["Browse Domains", "/browse"],
                ["Papers", "/papers"],
                ["Archive", "/archive"],
                ["Submit Your Work", "/submit"],
                ["Join Community", "/community"],
                ["About", "/about"],
              ].map(([label, href]) => (
                <Link key={href + label} href={href} onClick={() => setMenuOpen(false)}>
                  <span>{label}</span>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function ExactHero() {
  return (
    <section className="home-reference-hero" aria-labelledby="home-title">
      <img src={REFERENCE_ART} alt="" aria-hidden="true" />
      <div className="sr-only">
        <h1 id="home-title">A Journey Through Archives and Ideas</h1>
        <p>Where inquiry becomes insight and first essays find their home.</p>
      </div>
      <Link
        href="/browse"
        className="home-hero-cta-hit"
        aria-label="Explore the journal"
      />
    </section>
  );
}

function FeaturedEssays() {
  return (
    <section className="home-featured" aria-labelledby="featured-title">
      <div className="home-section-heading">
        <h2 id="featured-title">Featured Essays</h2>
        <Link href="/browse">
          View all <ArrowRight size={17} />
        </Link>
      </div>

      <div className="home-essay-rail">
        {FEATURED_ESSAYS.map((essay) => (
          <Link key={essay.title} href={essay.href} className="home-essay-card">
            <div className="home-essay-category" style={{ color: essay.color }}>
              <AnimalGlyph domain={essay.domain} size={42} />
              <span>{essay.category}</span>
            </div>
            <h3>{essay.title}</h3>
            <p>{essay.author}</p>
            <div className="home-read-time">
              <Clock3 size={17} />
              <span>{essay.minutes} min read</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="home-carousel-dots" aria-hidden="true">
        <span className="active" />
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function DomainStrip() {
  return (
    <section className="home-domains" aria-labelledby="domains-title">
      <h2 id="domains-title">Browse by Domain</h2>
      <div className="home-domain-grid">
        {HOME_DOMAINS.map((item) => (
          <Link key={item.label} href={item.href} className="home-domain-link">
            <span className="home-domain-glyph" style={{ color: item.color }}>
              <AnimalGlyph domain={item.domain} size={58} />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActionRows() {
  return (
    <section className="home-actions" aria-label="Continue exploring">
      {HOME_ACTIONS.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={`home-action-row is-${item.tone}`}>
            <Icon size={29} strokeWidth={1.35} />
            <span>{item.label}</span>
            <ArrowRight size={24} strokeWidth={1.5} />
          </Link>
        );
      })}
      <div className="home-bottom-ornament" aria-hidden="true">
        <span />
        <i>✧</i>
        <b>♧</b>
        <i>✧</i>
        <span />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="home-reference-page">
      <ReferenceHeader />
      <ExactHero />
      <FeaturedEssays />
      <DomainStrip />
      <ActionRows />
    </div>
  );
}
