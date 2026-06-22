import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { Emblem } from "@/components/brand/Emblem";

interface Domain {
  slug: string; label: string; desc: string; shortDesc: string;
  bg: string; glow: string; icon: React.ReactNode;
}

const DOMAINS: Domain[] = [
  {
    slug: "philosophy",
    label: "Philosophy",
    shortDesc: "Explore the nature of reality, knowledge, and ultimate truth.",
    desc: "Logic, metaphysics, ethics, and the nature of reality",
    bg: "radial-gradient(ellipse at 50% 30%, #3d1068 0%, #200840 50%, #0c0320 100%)",
    glow: "rgba(100,50,180,0.38)",
    icon: <EyeDomainIcon />,
  },
  {
    slug: "history",
    label: "History",
    shortDesc: "Trace the rise of civilizations, ideas, and turning points.",
    desc: "Ancient and modern civilizations, events, and patterns",
    bg: "radial-gradient(ellipse at 45% 35%, #4a1e0a 0%, #280e04 50%, #0e0402 100%)",
    glow: "rgba(140,80,30,0.38)",
    icon: <ScrollDomainIcon />,
  },
  {
    slug: "psychology",
    label: "Psychology",
    shortDesc: "Understand the mind, consciousness, and the inner world.",
    desc: "Mind, consciousness, behavior, and inner life",
    bg: "radial-gradient(ellipse at 50% 30%, #0a1840 0%, #060e28 50%, #020610 100%)",
    glow: "rgba(40,80,160,0.35)",
    icon: <MoonDomainIcon />,
  },
  {
    slug: "sociology",
    label: "Sociology",
    shortDesc: "Study societies, cultures, and human connections.",
    desc: "Society, culture, community, and collective identity",
    bg: "radial-gradient(ellipse at 50% 35%, #0a2215 0%, #061408 50%, #020806 100%)",
    glow: "rgba(30,100,60,0.32)",
    icon: <TreeDomainIcon />,
  },
  {
    slug: "science",
    label: "Science",
    shortDesc: "Discover natural laws, reason, and the wonders of the universe.",
    desc: "Cosmos, nature, discovery, and empirical inquiry",
    bg: "radial-gradient(ellipse at 45% 35%, #2c1e06 0%, #181002 50%, #060400 100%)",
    glow: "rgba(160,120,30,0.32)",
    icon: <ArmillaryDomainIcon />,
  },
  {
    slug: "geopolitics",
    label: "Geopolitics",
    shortDesc: "Examine power, territory, and the forces that shape the world.",
    desc: "Power, territory, nations, and civilizational orders",
    bg: "radial-gradient(ellipse at 50% 35%, #061e20 0%, #041012 50%, #010808 100%)",
    glow: "rgba(30,100,100,0.30)",
    icon: <CompassDomainIcon />,
  },
  {
    slug: "civilizational-thought",
    label: "Civilizational Thought",
    shortDesc: "Long-arc thinking about culture, tradition, and society.",
    desc: "Long-arc thinking about culture, tradition, and society",
    bg: "radial-gradient(ellipse at 50% 30%, #280a3a 0%, #180624 50%, #080212 100%)",
    glow: "rgba(120,30,160,0.30)",
    icon: <TempleDomainIcon />,
  },
  {
    slug: "aesthetics",
    label: "Aesthetics",
    shortDesc: "Art, beauty, literature, music, and creative expression.",
    desc: "Art, beauty, literature, music, and creative expression",
    bg: "radial-gradient(ellipse at 50% 35%, #301020 0%, #200a14 50%, #0c0408 100%)",
    glow: "rgba(180,50,100,0.30)",
    icon: <LotusDomainIcon />,
  },
  {
    slug: "sanskrit-studies",
    label: "Sanskrit Studies",
    shortDesc: "Sacred texts, grammar, language, and classical learning.",
    desc: "Sacred texts, grammar, language, and classical learning",
    bg: "radial-gradient(ellipse at 50% 40%, #2a1a04 0%, #1a0e02 50%, #080400 100%)",
    glow: "rgba(200,140,20,0.30)",
    icon: <OmDomainIcon />,
  },
  {
    slug: "political-theory",
    label: "Political Theory",
    shortDesc: "Governance, justice, sovereignty, and statecraft.",
    desc: "Governance, justice, sovereignty, and statecraft",
    bg: "radial-gradient(ellipse at 50% 35%, #081830 0%, #041020 50%, #020810 100%)",
    glow: "rgba(30,80,160,0.30)",
    icon: <ScalesDomainIcon />,
  },
  {
    slug: "papers",
    label: "Research Papers",
    shortDesc: "Peer-reviewed academic research across all disciplines.",
    desc: "Peer-reviewed academic research across all disciplines",
    bg: "radial-gradient(ellipse at 50% 40%, #10082a 0%, #0a0418 50%, #04020e 100%)",
    glow: "rgba(80,40,180,0.28)",
    icon: <QuillDomainIcon />,
  },
  {
    slug: "translations",
    label: "Translations",
    shortDesc: "Classical texts brought into living language.",
    desc: "Classical texts brought into living language",
    bg: "radial-gradient(ellipse at 50% 40%, #1e1208 0%, #120a04 50%, #060400 100%)",
    glow: "rgba(160,100,30,0.28)",
    icon: <BookDomainIcon />,
  },
];

export default function BrowsePage() {
  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #080318 0%, #0c0620 40%, #0a0418 100%)" }} />
          <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(100,50,20,0.22) 0%, transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: `${8 + (i*43)%84}%`, top: `${8 + (i*61)%82}%`, width: 1.5, height: 1.5, borderRadius: "50%", background: "var(--gold)", opacity: 0.06 + (i%5)*0.04 }} />
          ))}
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-16">
          <div className="animate-float mb-5" style={{ filter: "drop-shadow(0 0 20px rgba(201,152,58,0.3))" }}>
            <Emblem size={68} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span style={{ fontSize: "0.7rem", color: "var(--gold)", opacity: 0.55 }}>✦</span>
            <h1 className="font-display tracking-[0.14em]" style={{ fontSize: "clamp(2rem, 6vw, 3.8rem)", color: "var(--gold-bright)" }}>Browse by Domain</h1>
            <span style={{ fontSize: "0.7rem", color: "var(--gold)", opacity: 0.55 }}>✦</span>
          </div>
          <p className="font-body text-sm italic mb-3" style={{ color: "var(--ink-faint)" }}>
            Paths of inquiry. Realms of knowledge.
          </p>
          <div className="flex items-center gap-3">
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold))" }} />
            <LotusIcon size={14} style={{ color: "var(--gold)", opacity: 0.5 }} />
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, var(--border-gold), transparent)" }} />
          </div>
        </div>
      </div>

      {/* Domain grid */}
      <div className="container-anv py-12 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {DOMAINS.map(d => (
            <Link key={d.slug} href={`/domains/${d.slug}`} aria-label={`Browse ${d.label}`}>
              <div className="photo-card" style={{ aspectRatio: "1/1.2", background: d.bg }}>
                {/* Glow layer */}
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 32%, ${d.glow} 0%, transparent 58%)` }} aria-hidden="true" />
                {/* Border top glow */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,152,58,0.5), transparent)" }} aria-hidden="true" />
                {/* Corner ornaments */}
                <div style={{ position: "absolute", top: 7, left: 7, width: 15, height: 15, borderTop: "1px solid rgba(201,152,58,0.42)", borderLeft: "1px solid rgba(201,152,58,0.42)" }} aria-hidden="true" />
                <div style={{ position: "absolute", top: 7, right: 7, width: 15, height: 15, borderTop: "1px solid rgba(201,152,58,0.42)", borderRight: "1px solid rgba(201,152,58,0.42)" }} aria-hidden="true" />
                <div style={{ position: "absolute", bottom: 7, left: 7, width: 15, height: 15, borderBottom: "1px solid rgba(201,152,58,0.42)", borderLeft: "1px solid rgba(201,152,58,0.42)" }} aria-hidden="true" />
                <div style={{ position: "absolute", bottom: 7, right: 7, width: 15, height: 15, borderBottom: "1px solid rgba(201,152,58,0.42)", borderRight: "1px solid rgba(201,152,58,0.42)" }} aria-hidden="true" />

                {/* Circle emblem */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "3rem" }}>
                  <BrowseDomainCircle icon={d.icon} glow={d.glow} />
                </div>

                {/* Bottom text */}
                <div className="absolute bottom-0 inset-x-0 px-3 pb-4 text-center">
                  <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,152,58,0.28), transparent)", marginBottom: "0.5rem" }} />
                  <div className="font-display text-sm tracking-[0.06em] font-semibold mb-1" style={{ color: "var(--gold-bright)", fontSize: "0.8rem", textTransform: "capitalize" }}>{d.label}</div>
                  <p className="font-body text-[9.5px] leading-tight line-clamp-2" style={{ color: "var(--ink-faint)", opacity: 0.82 }}>{d.shortDesc}</p>
                  {/* Arrow */}
                  <div className="flex justify-center mt-2">
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(201,152,58,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowRight size={10} style={{ color: "var(--gold)" }} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Archive & Papers strip */}
      <div className="py-12" style={{ background: "linear-gradient(180deg, var(--bg) 0%, #080318 100%)" }}>
        <div className="container-anv">
          <LotusDivider className="mb-8" />
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { label: "Archive", href: "/archive", desc: "All published essays and papers, chronologically arranged." },
              { label: "Papers", href: "/papers", desc: "Peer-reviewed research and academic manuscripts." },
            ].map(p => (
              <Link key={p.href} href={p.href}>
                <div className="card-sacred p-6 flex items-center gap-5 cursor-pointer">
                  <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <LotusIcon size={20} style={{ color: "var(--gold)" }} />
                  </div>
                  <div className="flex-1">
                    <div className="section-label mb-1">{p.label}</div>
                    <p className="font-body text-sm" style={{ color: "var(--ink-faint)" }}>{p.desc}</p>
                  </div>
                  <ArrowRight size={18} style={{ color: "var(--gold)", flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowseDomainCircle({ icon, glow }: { icon: React.ReactNode; glow: string }) {
  return (
    <div style={{ position: "relative", width: 68, height: 68 }}>
      <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "0.5px solid rgba(201,152,58,0.2)" }} />
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        border: "1.5px solid rgba(201,152,58,0.52)",
        background: "rgba(7,4,10,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 18px ${glow}, inset 0 0 10px rgba(201,152,58,0.05)`,
      }}>
        {[0,90,180,270].map(a => (
          <div key={a} style={{
            position: "absolute", left: "50%", top: -3,
            width: 3.5, height: 3.5, borderRadius: "50%",
            background: "var(--gold)", opacity: 0.48,
            transformOrigin: "50% 37px",
            transform: `translateX(-50%) rotate(${a}deg)`,
          }} />
        ))}
        {icon}
      </div>
    </div>
  );
}

// Domain icons
function EyeDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M3 13C6 8 9 6 13 6C17 6 20 8 23 13C20 18 17 20 13 20C9 20 6 18 3 13Z" stroke="var(--gold)" strokeWidth="1.2" fill="none" opacity="0.7"/>
    <circle cx="13" cy="13" r="3.5" stroke="var(--gold)" strokeWidth="0.9" fill="var(--gold)" fillOpacity="0.12" opacity="0.8"/>
    <circle cx="13" cy="13" r="1.8" fill="var(--gold)" opacity="0.72"/>
  </svg>;
}
function ScrollDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <rect x="6" y="7" width="14" height="15" rx="2" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.7"/>
    <path d="M6 9C6 7.9 5 7 4 7C3 7 3 8 3 9C3 10 3 11 4 11H6" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
    <path d="M20 9C20 7.9 21 7 22 7C23 7 23 8 23 9C23 10 23 11 22 11H20" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
    <line x1="9" y1="12" x2="17" y2="12" stroke="var(--gold)" strokeWidth="0.8" opacity="0.5"/>
    <line x1="9" y1="15" x2="17" y2="15" stroke="var(--gold)" strokeWidth="0.8" opacity="0.5"/>
    <line x1="9" y1="18" x2="14" y2="18" stroke="var(--gold)" strokeWidth="0.8" opacity="0.5"/>
  </svg>;
}
function MoonDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M17 5C13 5 9 8.5 9 13C9 17.5 13 21 17 21C14 21 11 18.5 11 14C11 9.5 13.5 6 17 5Z" stroke="var(--gold)" strokeWidth="1.2" fill="var(--gold)" fillOpacity="0.1" opacity="0.8"/>
    <circle cx="19" cy="8" r="1.3" fill="var(--gold)" opacity="0.4"/>
    <circle cx="21" cy="13" r="0.9" fill="var(--gold)" opacity="0.3"/>
  </svg>;
}
function TreeDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <line x1="13" y1="21" x2="13" y2="12" stroke="var(--gold)" strokeWidth="1.1" strokeLinecap="round" opacity="0.7"/>
    <path d="M13 12C13 12 9 10 7 7C10 6 12 8 13 12Z" fill="var(--gold)" opacity="0.3" stroke="var(--gold)" strokeWidth="0.7"/>
    <path d="M13 12C13 12 17 10 19 7C16 6 14 8 13 12Z" fill="var(--gold)" opacity="0.3" stroke="var(--gold)" strokeWidth="0.7"/>
    <path d="M13 15C13 15 10 13 9 10C11 9 13 12 13 15Z" fill="var(--gold)" opacity="0.22" stroke="var(--gold)" strokeWidth="0.7"/>
    <path d="M13 15C13 15 16 13 17 10C15 9 13 12 13 15Z" fill="var(--gold)" opacity="0.22" stroke="var(--gold)" strokeWidth="0.7"/>
    <circle cx="9" cy="22" r="1.8" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
    <circle cx="13" cy="22.5" r="1.8" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
    <circle cx="17" cy="22" r="1.8" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
  </svg>;
}
function ArmillaryDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <circle cx="13" cy="13" r="8" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.68"/>
    <ellipse cx="13" cy="13" rx="8" ry="3.5" stroke="var(--gold)" strokeWidth="0.8" fill="none" opacity="0.42"/>
    <ellipse cx="13" cy="13" rx="3.5" ry="8" stroke="var(--gold)" strokeWidth="0.8" fill="none" opacity="0.42"/>
    <circle cx="13" cy="13" r="1.8" fill="var(--gold)" opacity="0.5"/>
  </svg>;
}
function CompassDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <circle cx="13" cy="13" r="8" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.6"/>
    <path d="M13 5L11.5 11L13 13L14.5 11Z" fill="var(--gold)" opacity="0.78"/>
    <path d="M13 21L14.5 15L13 13L11.5 15Z" fill="var(--gold)" opacity="0.32"/>
    <path d="M5 13L11 14.5L13 13L11 11.5Z" fill="var(--gold)" opacity="0.32"/>
    <path d="M21 13L15 11.5L13 13L15 14.5Z" fill="var(--gold)" opacity="0.78"/>
    <circle cx="13" cy="13" r="1.5" fill="var(--gold)" opacity="0.62"/>
  </svg>;
}
function TempleDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M13 5L20 10H6L13 5Z" stroke="var(--gold)" strokeWidth="1" fill="var(--gold)" fillOpacity="0.12" opacity="0.7"/>
    <rect x="9" y="10" width="8" height="11" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.6"/>
    <rect x="11.5" y="16" width="3" height="5" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.5"/>
    <line x1="6" y1="21" x2="20" y2="21" stroke="var(--gold)" strokeWidth="1.1" opacity="0.5"/>
    <circle cx="13" cy="8" r="1" fill="var(--gold)" opacity="0.5"/>
  </svg>;
}
function LotusDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M13 20C13 20 5 14 5 9C5 6.5 7.5 5 10 6.5C11 7 12 8.5 13 10C14 8.5 15 7 16 6.5C18.5 5 21 6.5 21 9C21 14 13 20 13 20Z" stroke="var(--gold)" strokeWidth="1.1" fill="var(--gold)" fillOpacity="0.1" opacity="0.7"/>
    <path d="M13 20C13 20 8 12 11 7C12 5 13 6 13 6C13 6 14 5 15 7C18 12 13 20 13 20Z" fill="var(--gold)" opacity="0.2" stroke="var(--gold)" strokeWidth="0.8"/>
    <circle cx="13" cy="13" r="2" fill="var(--gold)" opacity="0.45"/>
  </svg>;
}
function OmDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <text x="4" y="20" fontFamily="serif" fontSize="18" fill="var(--gold)" opacity="0.75">ॐ</text>
  </svg>;
}
function ScalesDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <line x1="13" y1="5" x2="13" y2="21" stroke="var(--gold)" strokeWidth="1" opacity="0.5"/>
    <line x1="7" y1="10" x2="19" y2="10" stroke="var(--gold)" strokeWidth="1.1" opacity="0.7"/>
    <circle cx="7" cy="10" r="1.2" fill="var(--gold)" opacity="0.55"/>
    <circle cx="19" cy="10" r="1.2" fill="var(--gold)" opacity="0.55"/>
    <path d="M4 10C4 10 5 14 7 14C9 14 10 10 10 10" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.62"/>
    <path d="M16 10C16 10 17 14 19 14C21 14 22 10 22 10" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.62"/>
    <line x1="10" y1="21" x2="16" y2="21" stroke="var(--gold)" strokeWidth="1.2" opacity="0.5"/>
  </svg>;
}
function QuillDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M20 4C20 4 12 8 9 15L10 16C13 13 20 8 22 5C21 4.5 20 4 20 4Z" stroke="var(--gold)" strokeWidth="1" fill="var(--gold)" fillOpacity="0.15" opacity="0.7"/>
    <path d="M9 15L7 21L10 18L10 16L9 15Z" stroke="var(--gold)" strokeWidth="0.9" fill="none" opacity="0.6"/>
    <line x1="8" y1="20" x2="14" y2="20" stroke="var(--gold)" strokeWidth="0.8" opacity="0.4"/>
  </svg>;
}
function BookDomainIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M4 6C7 5 10 5.5 13 7L13 21C10 19.5 7 19 4 20V6Z" stroke="var(--gold)" strokeWidth="1.1" fill="var(--gold)" fillOpacity="0.08" opacity="0.7"/>
    <path d="M22 6C19 5 16 5.5 13 7L13 21C16 19.5 19 19 22 20V6Z" stroke="var(--gold)" strokeWidth="1.1" fill="var(--gold)" fillOpacity="0.08" opacity="0.7"/>
    <line x1="13" y1="7" x2="13" y2="21" stroke="var(--gold)" strokeWidth="1" opacity="0.5"/>
    <line x1="7" y1="10" x2="11" y2="10" stroke="var(--gold)" strokeWidth="0.7" opacity="0.4"/>
    <line x1="7" y1="13" x2="11" y2="13" stroke="var(--gold)" strokeWidth="0.7" opacity="0.4"/>
    <line x1="15" y1="10" x2="19" y2="10" stroke="var(--gold)" strokeWidth="0.7" opacity="0.4"/>
    <line x1="15" y1="13" x2="19" y2="13" stroke="var(--gold)" strokeWidth="0.7" opacity="0.4"/>
  </svg>;
}
