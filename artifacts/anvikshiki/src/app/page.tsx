import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
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
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const b = base();
    fetch(`${b}/api/articles?limit=3`)
      .then(r => r.json())
      .catch(() => ({}))
      .then(data => {
        setRecent(data.articles || []);
        setLoading(false);
      });
  }, []);

  const heroImg = `${import.meta.env.BASE_URL}homepage_hero_scholar.png`;

  return (
    <div style={{ background: "#f5f0e8" }}>

      {/* ═══ HERO ═══ */}
      <section style={{ background: "#f5f0e8", margin: 0, padding: 0 }}>

        {/* Illustration — <img> with negative marginTop clips the fake phone-header.
            marginTop: "-10.5%" clips 10.5% × 941 ≈ 99px of original, identical at every
            screen width because CSS % margins are always relative to container width.
            The outer div's aspectRatio matches the illustration area (941:700) so no
            parchment text / CTA buttons from the mockup ever show. */}
        <div
          aria-hidden="false"
          style={{
            width: "100%",
            aspectRatio: "941/700",
            maxHeight: 700,
            overflow: "hidden",
            lineHeight: 0,
            background: "#f5f0e8",
          }}
        >
          <img
            src={heroImg}
            alt="A scholar walks through ancient temple ruins carrying lantern and books, accompanied by a leopard and serpent"
            style={{
              width: "100%",
              display: "block",
              marginTop: "-13%",
            }}
          />
        </div>

        {/* Parchment content — completely separate from the image, no overlap possible */}
        <div style={{ background: "#f5f0e8", textAlign: "center", padding: "2.5rem 1.5rem 2.5rem" }}>

          {/* Title */}
          <h1 className="font-display" style={{
            fontSize: "clamp(2.8rem, 11vw, 5.5rem)",
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxWidth: 420, margin: "0 auto 1.5rem" }}>

            <Link href="/submit">
              <div style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: "#b97455", borderRadius: 8, padding: "0.95rem 1.25rem",
                cursor: "pointer", border: "1.5px solid rgba(0,0,0,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 6px rgba(0,0,0,0.12)",
              }}>
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 6, background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3C9.5 7 6 8.5 2 9c4 .5 8 2 10 6 2-4 6-5.5 10-6-4-.5-7.5-2-10-6z" fill="#f5e6d0" opacity="0.85"/>
                  </svg>
                </div>
                <span className="font-ui" style={{ flex: 1, textAlign: "center", letterSpacing: "0.12em", fontSize: "0.82rem", color: "#f5e6d0", fontWeight: 600 }}>
                  SUBMIT YOUR WORK
                </span>
                <span style={{ color: "#f5e6d0", fontSize: "1.1rem", opacity: 0.8 }}>›</span>
              </div>
            </Link>

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

          {/* Bottom ornament */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", paddingTop: "0.5rem" }} aria-hidden="true">
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#b08050", opacity: 0.35 }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C10 7 6 9 2 9c4 0 8 2 10 6 2-4 6-6 10-6-4 0-8-2-10-6z" fill="#b08050" opacity="0.45"/>
            </svg>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#b08050", opacity: 0.35 }} />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #c8aa80, transparent)", margin: "0 2rem" }} aria-hidden="true" />

      {/* ═══ BROWSE BY DOMAIN ═══ */}
      <section style={{ background: "#f0ebe0", paddingTop: "4rem", paddingBottom: "4.5rem" }}>
        <div className="container-anv">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.7rem", color: "#a87c2b", opacity: 0.6 }}>✦</span>
              <h2 className="font-display" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: "#2a1a0e", letterSpacing: "0.1em", fontWeight: 400 }}>Browse by Domain</h2>
              <span style={{ fontSize: "0.7rem", color: "#a87c2b", opacity: 0.6 }}>✦</span>
            </div>
            <p className="font-body" style={{ fontSize: "0.875rem", fontStyle: "italic", color: "#6b4e2a" }}>Paths of inquiry. Realms of knowledge.</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: "linear-gradient(90deg, transparent, rgba(168,124,43,0.4))" }} />
              <LotusIcon size={14} style={{ color: "#a87c2b", opacity: 0.5 }} />
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: "linear-gradient(90deg, rgba(168,124,43,0.4), transparent)" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {DOMAINS_HOME.map(d => (
              <Link key={d.slug} href={`/domains/${d.slug}`} aria-label={`Browse ${d.label}`}>
                <div className="photo-card" style={{ aspectRatio: "1/1.15", background: d.bg }}>
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 35%, ${d.glow} 0%, transparent 60%)` }} aria-hidden="true" />
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,152,58,0.5), transparent)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", top: 8, left: 8, width: 16, height: 16, borderTop: "1px solid rgba(201,152,58,0.45)", borderLeft: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderTop: "1px solid rgba(201,152,58,0.45)", borderRight: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", bottom: 8, left: 8, width: 16, height: 16, borderBottom: "1px solid rgba(201,152,58,0.45)", borderLeft: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", bottom: 8, right: 8, width: 16, height: 16, borderBottom: "1px solid rgba(201,152,58,0.45)", borderRight: "1px solid rgba(201,152,58,0.45)" }} aria-hidden="true" />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "3.5rem" }}>
                    <DomainCircle icon={d.icon} glow={d.glow} />
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 0.75rem 1rem", textAlign: "center" }}>
                    <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,152,58,0.3), transparent)", marginBottom: "0.5rem" }} />
                    <div className="font-display" style={{ fontSize: "0.875rem", color: "#d5aa61", letterSpacing: "0.08em", fontWeight: 500, marginBottom: "0.2rem" }}>{d.label}</div>
                    <p className="font-body" style={{ fontSize: "0.625rem", lineHeight: 1.4, color: "rgba(240,225,200,0.75)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link href="/browse" className="btn-sacred btn-ghost" style={{ fontSize: "0.72rem" }}>
              All Domains <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ LATEST PUBLICATIONS ═══ */}
      <section style={{ background: "#faf7f0", paddingTop: "4rem", paddingBottom: "4.5rem", borderTop: "1px solid rgba(168,124,43,0.15)" }}>
        <div className="container-anv" style={{ maxWidth: 900 }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="section-label" style={{ marginBottom: "0.5rem" }}>Browse Journal</span>
            <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#2a1a0e", fontWeight: 400, letterSpacing: "0.05em", marginTop: "0.3rem" }}>
              Latest Publications
            </h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <div style={{ flex: 1, maxWidth: 60, height: 1, background: "linear-gradient(90deg, transparent, rgba(168,124,43,0.4))" }} />
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a87c2b", opacity: 0.5 }} />
              <div style={{ flex: 1, maxWidth: 60, height: 1, background: "linear-gradient(90deg, rgba(168,124,43,0.4), transparent)" }} />
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div style={{ width: 36, height: 36, border: "1.5px solid rgba(168,124,43,0.3)", borderTop: "1.5px solid #a87c2b", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
            </div>
          ) : recent.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recent.map(a => (
                <Link key={a.id} href={`/articles/${a.slug}`}>
                  <article className="card-sacred" style={{ padding: "1.25rem", height: "100%", display: "flex", flexDirection: "column", cursor: "pointer" }}>
                    <div style={{ flex: 1 }}>
                      {a.categoryId && <span className="section-label" style={{ marginBottom: "0.5rem" }}>{a.categoryId}</span>}
                      <h3 className="font-display" style={{ fontSize: "1.2rem", marginBottom: "0.5rem", lineHeight: 1.25, color: "#2a1a0e", fontWeight: 400 }}>{a.title}</h3>
                      {a.excerpt && <p className="font-body" style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "#5c3d22" }}>{a.excerpt}</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                      <span className="font-ui" style={{ fontSize: "0.75rem", color: "#766b5c" }}>{a.authorName || "Editorial"}</span>
                      <ArrowRight size={14} style={{ color: "#a87c2b" }} />
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ marginBottom: "1.5rem", opacity: 0.4 }}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <path d="M32 10C27 20 18 24 8 24c10 0 20 6 24 18 4-12 14-18 24-18-10 0-19-4-24-14z" stroke="#a87c2b" strokeWidth="1.5" fill="none"/>
                  <circle cx="32" cy="54" r="3" fill="#a87c2b" opacity="0.6"/>
                </svg>
              </div>
              <h3 className="font-display" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", color: "#2a1a0e", fontWeight: 400, marginBottom: "0.5rem" }}>
                No essays published yet
              </h3>
              <div style={{ height: 1, width: 40, background: "rgba(168,124,43,0.4)", margin: "0.75rem auto" }} aria-hidden="true" />
              <p className="font-body" style={{ fontSize: "0.9rem", fontStyle: "italic", color: "#6b4e2a", maxWidth: 340, lineHeight: 1.75, marginBottom: "2rem" }}>
                The archive is being prepared.<br/>Return soon to discover new works.
              </p>
              <Link href="/submit" className="btn-sacred btn-gold" style={{ padding: "0.75rem 2rem" }}>
                Submit Your Work <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ FEATURE PANELS ═══ */}
      <section style={{ background: "#f5f0e8", padding: "3.5rem 0", borderTop: "1px solid rgba(168,124,43,0.12)" }}>
        <div className="container-anv" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <FeaturePanel
            icon={<ArchiveCircleIcon />}
            title="Archive"
            desc="Peer-reviewed research across disciplines and time."
            href="/archive"
            label="Explore Archive"
            bg="#e8dfd0"
            accent="#a87c2b"
          />
          <FeaturePanel
            icon={<SubmitCircleIcon />}
            title="Submit Work"
            desc="Share your research, essays, and translations with the world."
            href="/submit"
            label="Submit Now"
            bg="#e8d8cc"
            accent="#b97455"
          />
          <FeaturePanel
            icon={<CommunityCircleIcon />}
            title="Community"
            desc="Join seekers and thinkers in meaningful discourse."
            href="/community"
            label="Join Conversation"
            bg="#d8e0d4"
            accent="#5e7352"
          />
        </div>
      </section>

      {/* ═══ NEWSLETTER ═══ */}
      <section style={{ background: "#ede8dc", padding: "4rem 0", borderTop: "1px solid rgba(168,124,43,0.15)" }}>
        <div className="container-anv" style={{ maxWidth: 520, textAlign: "center" }}>
          <LotusDivider style={{ marginBottom: "1.5rem" }} />
          <span className="section-label" style={{ marginBottom: "0.75rem" }}>Stay Connected</span>
          <h2 className="font-display" style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", color: "#2a1a0e", fontWeight: 400, letterSpacing: "0.05em", marginTop: "0.3rem", marginBottom: "0.6rem" }}>
            Receive the Archive
          </h2>
          <p className="font-body" style={{ fontSize: "0.875rem", color: "#6b4e2a", marginBottom: "1.75rem", lineHeight: 1.7 }}>
            Reflections, resources, and community updates delivered to your door.
          </p>
          <NewsletterForm />
          <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
            <LotusIcon size={18} style={{ color: "#a87c2b", opacity: 0.25 }} />
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
      <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "0.5px solid rgba(201,152,58,0.22)" }} />
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        border: "1.5px solid rgba(201,152,58,0.55)",
        background: "rgba(7,4,10,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 20px ${glow}, inset 0 0 12px rgba(201,152,58,0.06)`,
      }}>
        {[0,90,180,270].map(a => (
          <div key={a} style={{
            position: "absolute",
            left: "50%", top: -3,
            width: 4, height: 4, borderRadius: "50%",
            background: "#d5aa61", opacity: 0.5,
            transformOrigin: "50% 39px",
            transform: `translateX(-50%) rotate(${a}deg)`,
          }} />
        ))}
        {icon}
      </div>
    </div>
  );
}

// ─── Feature panel (earthy style) ─────────────────────────────────────────────
function FeaturePanel({ icon, title, desc, href, label, bg, accent }: {
  icon: React.ReactNode; title: string; desc: string; href: string; label: string;
  bg: string; accent: string;
}) {
  return (
    <Link href={href}>
      <div style={{
        display: "flex", alignItems: "center", gap: "1.25rem",
        background: bg, borderRadius: 14, padding: "1.25rem 1.5rem",
        border: `1px solid rgba(0,0,0,0.07)`,
        boxShadow: "0 2px 12px rgba(42,26,14,0.06)",
        cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease",
        textDecoration: "none",
      }}>
        <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: "50%", border: `1.5px solid ${accent}40`, background: `${accent}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="font-display" style={{ fontSize: "1.2rem", color: "#2a1a0e", fontWeight: 400, letterSpacing: "0.04em", marginBottom: "0.2rem" }}>{title}</h3>
          <p className="font-body" style={{ fontSize: "0.85rem", color: "#5c3d22", lineHeight: 1.5 }}>{desc}</p>
        </div>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.3rem", color: accent, fontFamily: "var(--font-ui)", fontSize: "0.7rem", letterSpacing: "0.1em", fontWeight: 500 }}>
          <span className="hide-mobile">{label}</span>
          <ArrowRight size={15} />
        </div>
      </div>
    </Link>
  );
}

// ─── Newsletter form ───────────────────────────────────────────────────────────
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 0", color: "#a87c2b" }}>
      <LotusIcon size={18} style={{ color: "#a87c2b" }} />
      <span className="font-ui" style={{ fontSize: "0.875rem" }}>You have joined the archive. Welcome.</span>
    </div>
  );
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.75rem", maxWidth: 400, margin: "0 auto" }}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Your email address" className="input-sacred" style={{ flex: 1 }} required aria-label="Email address" />
      <button type="submit" className="btn-sacred btn-gold" style={{ flexShrink: 0 }} disabled={status === "loading"}>
        {status === "loading" ? "…" : "Join"}
      </button>
    </form>
  );
}

// ─── Domain icons ──────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4 14C7 9 10 7 14 7C18 7 21 9 24 14C21 19 18 21 14 21C10 21 7 19 4 14Z" stroke="#d5aa61" strokeWidth="1.2" fill="none" opacity="0.7"/>
      <circle cx="14" cy="14" r="4" stroke="#d5aa61" strokeWidth="1" fill="#d5aa61" fillOpacity="0.12" opacity="0.8"/>
      <circle cx="14" cy="14" r="2" fill="#d5aa61" opacity="0.7"/>
    </svg>
  );
}
function ScrollIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="7" y="8" width="14" height="16" rx="2" stroke="#d5aa61" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <path d="M7 10C7 8.9 6 8 5 8C4 8 4 9 4 10C4 11 4 12 5 12H7" stroke="#d5aa61" strokeWidth="1" fill="none" opacity="0.55"/>
      <path d="M21 10C21 8.9 22 8 23 8C24 8 24 9 24 10C24 11 24 12 23 12H21" stroke="#d5aa61" strokeWidth="1" fill="none" opacity="0.55"/>
      <line x1="10" y1="13" x2="18" y2="13" stroke="#d5aa61" strokeWidth="0.9" opacity="0.5"/>
      <line x1="10" y1="16" x2="18" y2="16" stroke="#d5aa61" strokeWidth="0.9" opacity="0.5"/>
      <line x1="10" y1="19" x2="15" y2="19" stroke="#d5aa61" strokeWidth="0.9" opacity="0.5"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M18 6C14 6 10 9.5 10 14C10 18.5 14 22 18 22C15 22 12 19.5 12 15C12 10.5 14.5 7 18 6Z" stroke="#d5aa61" strokeWidth="1.2" fill="#d5aa61" fillOpacity="0.1" opacity="0.8"/>
      <circle cx="20" cy="9" r="1.5" fill="#d5aa61" opacity="0.4"/>
    </svg>
  );
}
function TreeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="14" y1="22" x2="14" y2="12" stroke="#d5aa61" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <path d="M14 12C14 12 10 10 8 7C11 6 13 8 14 12Z" fill="#d5aa61" opacity="0.3" stroke="#d5aa61" strokeWidth="0.7"/>
      <path d="M14 12C14 12 18 10 20 7C17 6 15 8 14 12Z" fill="#d5aa61" opacity="0.3" stroke="#d5aa61" strokeWidth="0.7"/>
      <path d="M14 15C14 15 10 13 9 10C12 9 14 12 14 15Z" fill="#d5aa61" opacity="0.25" stroke="#d5aa61" strokeWidth="0.7"/>
      <path d="M14 15C14 15 18 13 19 10C16 9 14 12 14 15Z" fill="#d5aa61" opacity="0.25" stroke="#d5aa61" strokeWidth="0.7"/>
    </svg>
  );
}
function ArmillaryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="9" stroke="#d5aa61" strokeWidth="1.1" fill="none" opacity="0.7"/>
      <ellipse cx="14" cy="14" rx="9" ry="4" stroke="#d5aa61" strokeWidth="0.8" fill="none" opacity="0.45"/>
      <ellipse cx="14" cy="14" rx="4" ry="9" stroke="#d5aa61" strokeWidth="0.8" fill="none" opacity="0.45"/>
      <circle cx="14" cy="14" r="2" fill="#d5aa61" opacity="0.5"/>
    </svg>
  );
}
function CompassIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="9" stroke="#d5aa61" strokeWidth="1.1" fill="none" opacity="0.6"/>
      <path d="M14 5L12 12L14 14L16 12Z" fill="#d5aa61" opacity="0.75"/>
      <path d="M14 23L16 16L14 14L12 16Z" fill="#d5aa61" opacity="0.35"/>
      <path d="M5 14L12 12L14 14L12 16Z" fill="#d5aa61" opacity="0.35"/>
      <path d="M23 14L16 16L14 14L16 12Z" fill="#d5aa61" opacity="0.75"/>
      <circle cx="14" cy="14" r="1.5" fill="#d5aa61" opacity="0.6"/>
    </svg>
  );
}

// ─── Feature panel icons (earthy colour) ──────────────────────────────────────
function ArchiveCircleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="18" height="5" rx="1" stroke="#a87c2b" strokeWidth="1.2" fill="none"/>
      <rect x="5" y="12" width="18" height="12" rx="1" stroke="#a87c2b" strokeWidth="1.2" fill="none"/>
      <line x1="9" y1="17" x2="19" y2="17" stroke="#a87c2b" strokeWidth="1" opacity="0.6"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="#a87c2b" strokeWidth="1" opacity="0.6"/>
    </svg>
  );
}
function SubmitCircleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M6 22L10 10L22 6L18 18Z" stroke="#b97455" strokeWidth="1.2" fill="none"/>
      <path d="M14 14L22 6" stroke="#b97455" strokeWidth="1" opacity="0.6"/>
      <circle cx="14" cy="14" r="2" fill="#b97455" opacity="0.5"/>
    </svg>
  );
}
function CommunityCircleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="9" r="3.5" stroke="#5e7352" strokeWidth="1.2" fill="none"/>
      <circle cx="7" cy="11" r="2.5" stroke="#5e7352" strokeWidth="1" fill="none" opacity="0.7"/>
      <circle cx="21" cy="11" r="2.5" stroke="#5e7352" strokeWidth="1" fill="none" opacity="0.7"/>
      <path d="M5 22C5 18.7 9 17 14 17C19 17 23 18.7 23 22" stroke="#5e7352" strokeWidth="1.2" fill="none"/>
    </svg>
  );
}
