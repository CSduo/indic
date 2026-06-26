import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Users, Archive as ArchiveIcon } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const DOMAINS_HOME = [
  { slug: "philosophy",  label: "Philosophy",  desc: "Explore the nature of reality, knowledge, and ultimate truth.", bg: "radial-gradient(ellipse at 50% 30%, #3d1068 0%, #200840 50%, #0c0320 100%)", glow: "rgba(100,50,180,0.35)", icon: <EyeIcon /> },
  { slug: "history",     label: "History",     desc: "Trace the rise of civilizations, ideas, and turning points.",  bg: "radial-gradient(ellipse at 45% 35%, #4a1e0a 0%, #280e04 50%, #0e0402 100%)", glow: "rgba(140,80,30,0.35)", icon: <ScrollIcon /> },
  { slug: "psychology",  label: "Psychology",  desc: "Understand the mind, consciousness, and the inner world.",    bg: "radial-gradient(ellipse at 50% 30%, #0a1840 0%, #060e28 50%, #020610 100%)", glow: "rgba(40,80,160,0.32)", icon: <MoonIcon /> },
  { slug: "sociology",   label: "Sociology",   desc: "Study societies, cultures, and human connections.",           bg: "radial-gradient(ellipse at 50% 35%, #0a2215 0%, #061408 50%, #020806 100%)", glow: "rgba(30,100,60,0.30)", icon: <TreeIcon /> },
  { slug: "science",     label: "Science",     desc: "Discover natural laws, reason, and the wonders of the universe.", bg: "radial-gradient(ellipse at 45% 35%, #2c1e06 0%, #181002 50%, #060400 100%)", glow: "rgba(160,120,30,0.30)", icon: <ArmillaryIcon /> },
  { slug: "geopolitics", label: "Geopolitics", desc: "Examine power, territory, and the forces that shape the world.", bg: "radial-gradient(ellipse at 50% 35%, #061e20 0%, #041012 50%, #010808 100%)", glow: "rgba(30,100,100,0.28)", icon: <CompassIcon /> },
];

export default function HomePage() {
  const [featured, setFeatured] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const b = base();
    Promise.all([
      fetch(`${b}/api/articles?limit=1`).then(r => r.json()).catch(() => ({})),
      fetch(`${b}/api/articles?limit=3`).then(r => r.json()).catch(() => ({})),
    ]).then(([feat, latest]) => {
      setFeatured(feat.articles?.[0] || null);
      setRecent(latest.articles || []);
      setLoading(false);
    });
  }, []);

  const heroImg = `${import.meta.env.BASE_URL}homepage_hero_scholar.png`;

  return (
    <div style={{ background: "var(--bg)" }}>

      {/* ═══ HERO ═══ */}
      <section style={{ background: "#f2e8d5", margin: 0, padding: 0 }}>

        {/* Illustration — full width */}
        <div style={{ width: "100%", lineHeight: 0, overflow: "hidden", maxHeight: "58vw", minHeight: 220 }}>
          <img
            src={heroImg}
            alt="A scholar walks through ancient ruins with a lantern and books, accompanied by a leopard and a great serpent, while a bird carries a scroll overhead"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
          />
        </div>

        {/* Parchment content area */}
        <div style={{ background: "#f2e8d5", textAlign: "center", padding: "2.5rem 1.5rem 2rem" }}>

          {/* Title */}
          <h1 className="font-display" style={{
            fontSize: "clamp(2.8rem, 12vw, 5.5rem)",
            color: "#2a1a0e",
            letterSpacing: "0.13em",
            lineHeight: 1,
            marginBottom: "0.6rem",
            fontWeight: 400,
          }}>
            ĀNVĪKṢIKĪ
          </h1>

          {/* Italic subtitle */}
          <p className="font-body" style={{ fontStyle: "italic", color: "#5c3d22", fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)", marginBottom: "0.9rem" }}>
            A Journal of Inquiry &amp; Civilizational Thought
          </p>

          {/* Ornamental divider */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <div style={{ height: 1, width: 48, background: "#b08050" }} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C10 6 6 8 2 8c4 0 8 2 10 6 2-4 6-6 10-6-4 0-8-2-10-6z" fill="#b08050" opacity="0.7"/>
              <circle cx="12" cy="20" r="1.5" fill="#b08050" opacity="0.5"/>
            </svg>
            <div style={{ height: 1, width: 48, background: "#b08050" }} />
          </div>

          {/* Tagline */}
          <p className="font-body" style={{ color: "#5c3d22", fontSize: "clamp(0.85rem, 2.2vw, 0.97rem)", lineHeight: 1.65, marginBottom: "2rem", maxWidth: 380, margin: "0 auto 2rem" }}>
            A journey through archives and ideas,<br />
            where inquiry becomes insight and first essays find their home.
          </p>

          {/* Three stacked CTA buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxWidth: 420, margin: "0 auto 2rem" }}>

            {/* Submit Your Work */}
            <Link href="/submit">
              <div style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: "#b97455", borderRadius: 8, padding: "0.95rem 1.25rem",
                cursor: "pointer", border: "1.5px solid rgba(0,0,0,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 6px rgba(0,0,0,0.12)",
                transition: "filter 0.15s",
              }}>
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 6, background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3C9.5 7 6 8.5 2 9c4 .5 8 2 10 6 2-4 6-5.5 10-6-4-.5-7.5-2-10-6z" fill="#f5e6d0" opacity="0.85"/>
                    <circle cx="12" cy="21" r="1.3" fill="#f5e6d0" opacity="0.6"/>
                  </svg>
                </div>
                <span className="font-ui" style={{ flex: 1, textAlign: "center", letterSpacing: "0.12em", fontSize: "0.82rem", color: "#f5e6d0", fontWeight: 600 }}>
                  SUBMIT YOUR WORK
                </span>
                <span style={{ color: "#f5e6d0", fontSize: "1.1rem", opacity: 0.8 }}>›</span>
              </div>
            </Link>

            {/* Explore Journal */}
            <Link href="/browse">
              <div style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: "#5e7352", borderRadius: 8, padding: "0.95rem 1.25rem",
                cursor: "pointer", border: "1.5px solid rgba(0,0,0,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 6px rgba(0,0,0,0.10)",
              }}>
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 6, background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8d9c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <span className="font-ui" style={{ flex: 1, textAlign: "center", letterSpacing: "0.12em", fontSize: "0.82rem", color: "#e8d9c0", fontWeight: 600 }}>
                  EXPLORE JOURNAL
                </span>
                <span style={{ color: "#e8d9c0", fontSize: "1.1rem", opacity: 0.8 }}>›</span>
              </div>
            </Link>

            {/* Join Community */}
            <Link href="/community">
              <div style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: "#7a8f6c", borderRadius: 8, padding: "0.95rem 1.25rem",
                cursor: "pointer", border: "1.5px solid rgba(0,0,0,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 6px rgba(0,0,0,0.08)",
              }}>
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 6, background: "rgba(0,0,0,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8d9c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <span className="font-ui" style={{ flex: 1, textAlign: "center", letterSpacing: "0.12em", fontSize: "0.82rem", color: "#e8d9c0", fontWeight: 600 }}>
                  JOIN COMMUNITY
                </span>
                <span style={{ color: "#e8d9c0", fontSize: "1.1rem", opacity: 0.8 }}>›</span>
              </div>
            </Link>
          </div>

          {/* Bottom lotus ornament */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", paddingTop: "0.5rem", paddingBottom: "0.25rem" }} aria-hidden="true">
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#b08050", opacity: 0.35 }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C10 7 6 9 2 9c4 0 8 2 10 6 2-4 6-6 10-6-4 0-8-2-10-6z" fill="#b08050" opacity="0.45"/>
            </svg>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#b08050", opacity: 0.35 }} />
          </div>
        </div>
      </section>

      {/* ═══ BROWSE BY DOMAIN ═══ */}
      <section style={{ background: "var(--bg)", paddingTop: "4.5rem", paddingBottom: "5rem" }}>
        <div className="container-anv">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span style={{ fontSize: "0.75rem", color: "var(--gold)", opacity: 0.6 }}>✦</span>
              <h2 className="font-display tracking-[0.14em]" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: "var(--gold-bright)" }}>Browse by Domain</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--gold)", opacity: 0.6 }}>✦</span>
            </div>
            <p className="font-body text-sm italic" style={{ color: "var(--ink-faint)" }}>Paths of inquiry. Realms of knowledge.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold))" }} />
              <LotusIcon size={14} style={{ color: "var(--gold)", opacity: 0.5 }} />
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: "linear-gradient(90deg, var(--border-gold), transparent)" }} />
            </div>
          </div>

          {/* 2-col card grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {DOMAINS_HOME.map(d => (
              <Link key={d.slug} href={`/domains/${d.slug}`} aria-label={`Browse ${d.label}`}>
                <div className="photo-card" style={{ aspectRatio: "1/1.15", background: d.bg }}>
                  {/* Atmospheric glow */}
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 35%, ${d.glow} 0%, transparent 60%)` }} aria-hidden="true" />
                  {/* Top glow line */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(201,152,58,0.5), transparent)` }} aria-hidden="true" />
                  {/* Corner ornaments */}
                  <div style={{ position: "absolute", top: 8, left: 8, width: 16, height: 16, borderTop: "1px solid rgba(201,152,58,0.45)", borderLeft: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderTop: "1px solid rgba(201,152,58,0.45)", borderRight: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", bottom: 8, left: 8, width: 16, height: 16, borderBottom: "1px solid rgba(201,152,58,0.45)", borderLeft: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", bottom: 8, right: 8, width: 16, height: 16, borderBottom: "1px solid rgba(201,152,58,0.45)", borderRight: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />

                  {/* Domain circle emblem */}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "3.5rem" }}>
                    <DomainCircle icon={d.icon} glow={d.glow} />
                  </div>

                  {/* Bottom text */}
                  <div className="absolute bottom-0 inset-x-0 px-3 pb-4 text-center">
                    <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,152,58,0.3), transparent)", marginBottom: "0.5rem" }} />
                    <div className="font-display text-sm font-semibold tracking-[0.08em] mb-1" style={{ color: "var(--gold-bright)", fontSize: "0.875rem" }}>{d.label}</div>
                    <p className="font-body text-[10px] leading-tight line-clamp-2" style={{ color: "var(--ink-faint)", opacity: 0.85 }}>{d.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/browse" className="btn-sacred btn-ghost text-xs">
              All Domains <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ LATEST PUBLICATIONS ═══ */}
      <section className="relative overflow-hidden" style={{ minHeight: 560 }}>
        {/* Full atmospheric bg */}
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #080318 0%, #0c0620 40%, #080414 100%)" }} />
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(100,50,20,0.25) 0%, transparent 60%)" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 400, height: 400, background: "radial-gradient(circle at bottom right, rgba(139,26,74,0.2) 0%, transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 350, height: 300, background: "radial-gradient(circle at bottom left, rgba(74,40,120,0.18) 0%, transparent 65%)" }} />
          {/* Subtle grid-like texture */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,152,58,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(201,152,58,0.025) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--bg) 0%, transparent 15%, transparent 85%, var(--bg) 100%)" }} />
        </div>

        <div className="container-anv relative z-10 flex flex-col items-center justify-center text-center py-20">
          <div className="section-label mb-2">Browse Journal</div>
          <h2 className="font-display mb-8" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--parchment)" }}>Latest Publications</h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <div style={{ width: 40, height: 40, border: "1.5px solid var(--border-gold)", borderTop: "1.5px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
            </div>
          ) : recent.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl text-left">
              {recent.map(a => (
                <Link key={a.id} href={`/articles/${a.slug}`}>
                  <article className="card-sacred p-5 h-full flex flex-col cursor-pointer">
                    <div className="flex-1">
                      {a.categoryId && <div className="section-label mb-2">{a.categoryId}</div>}
                      <h3 className="font-display text-xl mb-2 leading-tight" style={{ color: "var(--parchment)" }}>{a.title}</h3>
                      {a.excerpt && <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ink-faint)" }}>{a.excerpt}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="font-ui text-xs" style={{ color: "var(--muted)" }}>{a.authorName || "Editorial"}</span>
                      <ArrowRight size={14} style={{ color: "var(--gold)" }} />
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center">
              {/* Large glowing emblem */}
              <div className="mb-8 animate-float" style={{ filter: "drop-shadow(0 0 40px rgba(201,152,58,0.45))" }}>
                <Emblem size={100} />
              </div>

              <h3 className="font-display mb-3" style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", color: "var(--parchment)" }}>
                No essays published yet
              </h3>
              <div style={{ height: 1, width: 40, background: "var(--border-gold)", marginBottom: "0.85rem" }} aria-hidden="true" />
              <p className="font-body text-sm italic mb-8" style={{ color: "var(--ink-faint)", maxWidth: 340, lineHeight: 1.75 }}>
                The archive is being prepared.<br/>Return soon to discover new works.
              </p>
              <LotusIcon size={16} style={{ color: "var(--gold)", opacity: 0.4, marginBottom: "2rem" }} />
              <Link href="/submit" className="btn-sacred btn-gold px-10">
                Submit Your Work <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ FEATURE PANELS ═══ */}
      <section className="container-anv py-16 space-y-5">
        <FeaturePanel
          icon={<ArchiveCircleIcon />}
          title="Archive"
          desc="Peer-reviewed research across disciplines and time."
          href="/archive"
          label="Explore Archive"
          bg="radial-gradient(ellipse at 70% 45%, #3a1c04 0%, #1e0e02 42%, #080400 100%)"
          glow="rgba(160,90,20,0.4)"
          glowPos="70% 45%"
        />
        <FeaturePanel
          icon={<SubmitCircleIcon />}
          title="Submit Work"
          desc="Share your research, essays, and translations with the world."
          href="/submit"
          label="Submit Now"
          bg="radial-gradient(ellipse at 65% 50%, #2c1602 0%, #160a01 42%, #060300 100%)"
          glow="rgba(200,120,20,0.38)"
          glowPos="65% 50%"
        />
        <FeaturePanel
          icon={<CommunityCircleIcon />}
          title="Community"
          desc="Join seekers and thinkers in meaningful discourse."
          href="/community"
          label="Join Conversation"
          bg="radial-gradient(ellipse at 65% 45%, #0c1630 0%, #060e1c 42%, #020508 100%)"
          glow="rgba(50,80,160,0.35)"
          glowPos="65% 45%"
        />
      </section>

      {/* ═══ NEWSLETTER ═══ */}
      <section className="py-16" style={{ background: "linear-gradient(160deg, #060118 0%, #0a0318 50%, #060210 100%)" }}>
        <div className="container-anv max-w-xl text-center">
          <LotusDivider className="mb-6" />
          <div className="section-label mb-3">Stay Connected</div>
          <h2 className="font-display text-3xl mb-3" style={{ color: "var(--gold-bright)" }}>Receive the Archive</h2>
          <p className="font-body text-sm mb-6" style={{ color: "var(--ink-faint)" }}>Reflections, resources, and community updates delivered to your door.</p>
          <NewsletterForm />
          <div className="mt-8 flex justify-center">
            <LotusIcon size={18} style={{ color: "var(--gold)", opacity: 0.25 }} />
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Domain circle icon wrapper ───────────────────────────────────────────────
function DomainCircle({ icon, glow }: { icon: React.ReactNode; glow: string }) {
  return (
    <div style={{ position: "relative", width: 72, height: 72 }}>
      {/* Outer thin ring */}
      <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "0.5px solid rgba(201,152,58,0.22)" }} />
      {/* Main circle */}
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        border: "1.5px solid rgba(201,152,58,0.55)",
        background: "rgba(7,4,10,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 20px ${glow}, inset 0 0 12px rgba(201,152,58,0.06)`,
      }}>
        {/* Cardinal dots */}
        {[0,90,180,270].map(a => (
          <div key={a} style={{
            position: "absolute",
            left: "50%", top: -3,
            width: 4, height: 4, borderRadius: "50%",
            background: "var(--gold)", opacity: 0.5,
            transformOrigin: "50% 39px",
            transform: `translateX(-50%) rotate(${a}deg)`,
          }} />
        ))}
        {icon}
      </div>
    </div>
  );
}

// ─── Feature panel ────────────────────────────────────────────────────────────
function FeaturePanel({ icon, title, desc, href, label, bg, glow, glowPos }: {
  icon: React.ReactNode; title: string; desc: string; href: string; label: string;
  bg: string; glow: string; glowPos: string;
}) {
  return (
    <Link href={href}>
      <div className="feature-panel" style={{ background: bg }}>
        {/* Photo-like glow */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at ${glowPos}, ${glow} 0%, transparent 55%)` }} aria-hidden="true" />
        {/* Left text overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(5,2,12,0.92) 0%, rgba(5,2,12,0.75) 42%, rgba(5,2,12,0.35) 70%, transparent 100%)" }} aria-hidden="true" />
        {/* Gold border */}
        <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(201,152,58,0.28)", borderRadius: 14, pointerEvents: "none" }} aria-hidden="true" />
        {/* Top gold line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, rgba(201,152,58,0.6) 0%, transparent 65%)" }} aria-hidden="true" />
        {/* Corner ornaments */}
        <div style={{ position: "absolute", top: 10, left: 10, width: 18, height: 18, borderTop: "1px solid rgba(201,152,58,0.4)", borderLeft: "1px solid rgba(201,152,58,0.4)" }} aria-hidden="true" />
        <div style={{ position: "absolute", bottom: 10, left: 10, width: 18, height: 18, borderBottom: "1px solid rgba(201,152,58,0.4)", borderLeft: "1px solid rgba(201,152,58,0.4)" }} aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8 flex flex-col gap-3" style={{ maxWidth: "clamp(240px, 55%, 420px)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", border: "1px solid rgba(201,152,58,0.5)", background: "rgba(7,4,10,0.5)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4, boxShadow: `0 0 16px ${glow}` }}>
            {icon}
          </div>
          <h3 className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", color: "var(--gold-bright)", letterSpacing: "0.04em" }}>{title}</h3>
          <div style={{ height: 1, width: 48, background: "var(--border-gold)" }} aria-hidden="true" />
          <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{desc}</p>
          <span className="btn-sacred btn-ghost self-start mt-2 text-xs">
            {label} <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Newsletter form ──────────────────────────────────────────────────────────
function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const r = await fetch(`${base()}/api/newsletter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(r.ok ? "ok" : "err");
    } catch { setStatus("err"); }
  };
  if (status === "ok") return (
    <div className="flex items-center justify-center gap-2 py-4" style={{ color: "var(--gold-bright)" }}>
      <LotusIcon size={18} style={{ color: "var(--gold)" }} />
      <span className="font-ui text-sm">You have joined the archive. Welcome.</span>
    </div>
  );
  return (
    <form onSubmit={submit} className="flex gap-3 max-w-sm mx-auto">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Your email address" className="input-sacred flex-1" required aria-label="Email address" />
      <button type="submit" className="btn-sacred btn-gold shrink-0" disabled={status === "loading"}>
        {status === "loading" ? "…" : "Join"}
      </button>
    </form>
  );
}

// ─── SVG domain icons ─────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 14C7 9 10 7 14 7C18 7 21 9 24 14C21 19 18 21 14 21C10 21 7 19 4 14Z" stroke="var(--gold)" strokeWidth="1.2" fill="none" opacity="0.7"/>
      <circle cx="14" cy="14" r="4" stroke="var(--gold)" strokeWidth="1" fill="var(--gold)" fillOpacity="0.12" opacity="0.8"/>
      <circle cx="14" cy="14" r="2" fill="var(--gold)" opacity="0.7"/>
    </svg>
  );
}
function ScrollIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="7" y="8" width="14" height="16" rx="2" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <path d="M7 10C7 8.9 6 8 5 8C4 8 4 9 4 10C4 11 4 12 5 12H7" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.55"/>
      <path d="M21 10C21 8.9 22 8 23 8C24 8 24 9 24 10C24 11 24 12 23 12H21" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.55"/>
      <line x1="10" y1="13" x2="18" y2="13" stroke="var(--gold)" strokeWidth="0.9" opacity="0.5"/>
      <line x1="10" y1="16" x2="18" y2="16" stroke="var(--gold)" strokeWidth="0.9" opacity="0.5"/>
      <line x1="10" y1="19" x2="15" y2="19" stroke="var(--gold)" strokeWidth="0.9" opacity="0.5"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M18 6C14 6 10 9.5 10 14C10 18.5 14 22 18 22C15 22 12 19.5 12 15C12 10.5 14.5 7 18 6Z" stroke="var(--gold)" strokeWidth="1.2" fill="var(--gold)" fillOpacity="0.1" opacity="0.8"/>
      <circle cx="20" cy="9" r="1.5" fill="var(--gold)" opacity="0.4"/>
      <circle cx="22" cy="14" r="1" fill="var(--gold)" opacity="0.3"/>
    </svg>
  );
}
function TreeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="14" y1="22" x2="14" y2="12" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <path d="M14 12C14 12 10 10 8 7C11 6 13 8 14 12Z" fill="var(--gold)" opacity="0.3" stroke="var(--gold)" strokeWidth="0.7"/>
      <path d="M14 12C14 12 18 10 20 7C17 6 15 8 14 12Z" fill="var(--gold)" opacity="0.3" stroke="var(--gold)" strokeWidth="0.7"/>
      <path d="M14 15C14 15 10 13 9 10C12 9 14 12 14 15Z" fill="var(--gold)" opacity="0.25" stroke="var(--gold)" strokeWidth="0.7"/>
      <path d="M14 15C14 15 18 13 19 10C16 9 14 12 14 15Z" fill="var(--gold)" opacity="0.25" stroke="var(--gold)" strokeWidth="0.7"/>
      <circle cx="10" cy="22" r="2" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.5"/>
      <circle cx="14" cy="23" r="2" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.5"/>
      <circle cx="18" cy="22" r="2" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.5"/>
    </svg>
  );
}
function ArmillaryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="9" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <ellipse cx="14" cy="14" rx="9" ry="4" stroke="var(--gold)" strokeWidth="0.8" fill="none" opacity="0.45"/>
      <ellipse cx="14" cy="14" rx="4" ry="9" stroke="var(--gold)" strokeWidth="0.8" fill="none" opacity="0.45"/>
      <line x1="14" y1="5" x2="14" y2="23" stroke="var(--gold)" strokeWidth="0.7" opacity="0.35"/>
      <circle cx="14" cy="14" r="2" fill="var(--gold)" opacity="0.5"/>
    </svg>
  );
}
function CompassIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="9" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.6"/>
      <path d="M14 5L12 12L14 14L16 12Z" fill="var(--gold)" opacity="0.75"/>
      <path d="M14 23L16 16L14 14L12 16Z" fill="var(--gold)" opacity="0.35"/>
      <path d="M5 14L12 12L14 14L12 16Z" fill="var(--gold)" opacity="0.35"/>
      <path d="M23 14L16 16L14 14L16 12Z" fill="var(--gold)" opacity="0.75"/>
      <circle cx="14" cy="14" r="1.5" fill="var(--gold)" opacity="0.6"/>
    </svg>
  );
}

// Feature panel icons
function ArchiveCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="18" height="5" rx="1" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <rect x="5" y="12" width="18" height="12" rx="1" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <line x1="9" y1="17" x2="19" y2="17" stroke="var(--gold)" strokeWidth="0.9" opacity="0.5"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="var(--gold)" strokeWidth="0.9" opacity="0.5"/>
    </svg>
  );
}
function SubmitCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M6 22L10 10L22 6L18 18Z" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <path d="M14 14L22 6" stroke="var(--gold)" strokeWidth="1" opacity="0.5"/>
      <circle cx="14" cy="14" r="2" fill="var(--gold)" opacity="0.5"/>
    </svg>
  );
}
function CommunityCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="9" r="3.5" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <circle cx="7" cy="11" r="2.5" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
      <circle cx="21" cy="11" r="2.5" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
      <path d="M5 22C5 18.7 9 17 14 17C19 17 23 18.7 23 22" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.65"/>
    </svg>
  );
}
