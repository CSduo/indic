import React from "react";
import type { DomainKey } from "@/lib/domainMeta";
import { normalizeDomainKey } from "@/lib/domainMeta";

export type AnimalGlyphProps = {
  domain?: DomainKey | string | null;
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
};

/* ─── Shared SVG Palette & Filter Definitions ─── */
function IndicGlyphGradients() {
  return (
    <defs>
      {/* 1. Luminous Temple Gold (Suvarṇa) */}
      <linearGradient id="anvGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>

      {/* 2. Deep Sacred Bronze / Copper (Tāmra / Kāṃsya) */}
      <linearGradient id="anvBronze" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="50%" stopColor="#B45309" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>

      {/* 3. Living Agni Flame (Jñāna-Agni) */}
      <radialGradient id="anvFlame" cx="50%" cy="80%" r="75%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="25%" stopColor="#FEF08A" />
        <stop offset="60%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#DC2626" />
      </radialGradient>

      {/* 4. Kashmiri Saffron (Kesara / Kumkuma) */}
      <linearGradient id="anvSaffron" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FED7AA" />
        <stop offset="50%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#C2410C" />
      </linearGradient>

      {/* 5. Vedic Sapphire / Lapis (Nīla-Maṇi) */}
      <linearGradient id="anvSapphire" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#BAE6FD" />
        <stop offset="45%" stopColor="#38BDF8" />
        <stop offset="80%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>

      {/* 6. Sacred Lotus Carmine / Ruby (Padma-Rāga) */}
      <linearGradient id="anvLotus" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FECDD3" />
        <stop offset="45%" stopColor="#FB7185" />
        <stop offset="100%" stopColor="#BE123C" />
      </linearGradient>

      {/* 7. Forest Emerald / Jade (Marakata) */}
      <linearGradient id="anvJade" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A7F3D0" />
        <stop offset="45%" stopColor="#34D399" />
        <stop offset="85%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064E3B" />
      </linearGradient>

      {/* 8. Saraswati Amethyst (Brāhmī-Jāmbava) */}
      <linearGradient id="anvAmethyst" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DDD6FE" />
        <stop offset="45%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#6B21A8" />
      </linearGradient>
    </defs>
  );
}

/* ─── Shared Stroke Style Primitives (Canvas 56x56) ─── */
const base = {
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const s = { stroke: "currentColor", strokeWidth: 2, fill: "none", ...base };
const sf = { stroke: "currentColor", strokeWidth: 1.4, fill: "none", ...base };
const st = { stroke: "currentColor", strokeWidth: 1, fill: "none", ...base };

/* ─── 1. Philosophy (दर्शन / प्रदीपः सर्वविद्यानाम्) — Sacred Diya & Lotus of Pramāṇa ─── */
function PhilosophyGlyph() {
  return (
    <g>
      {/* Radiant Sunburst Aura overhead */}
      <circle cx="28" cy="6" r="2.2" fill="url(#anvGold)" />
      <line x1="28" y1="1" x2="28" y2="3.5" {...st} stroke="url(#anvGold)" />
      <line x1="20" y1="11" x2="22" y2="13" {...st} stroke="url(#anvGold)" opacity="0.8" />
      <line x1="36" y1="11" x2="34" y2="13" {...st} stroke="url(#anvGold)" opacity="0.8" />
      <line x1="14" y1="22" x2="16.5" y2="23" {...st} stroke="url(#anvGold)" opacity="0.6" />
      <line x1="42" y1="22" x2="39.5" y2="23" {...st} stroke="url(#anvGold)" opacity="0.6" />

      {/* Outer Halo Rings */}
      <path d="M12 28 C12 17 20 9 28 9 C36 9 44 17 44 28" {...st} strokeDasharray="3 2" opacity="0.45" />

      {/* Outer Sacred Flame with Living Agni Gradient */}
      <path
        d="M28 10 C20 20 18 28 21 34 L35 34 C38 28 36 20 28 10 Z"
        fill="url(#anvFlame)"
        opacity="0.95"
      />
      {/* Inner Radiant Mantle */}
      <path
        d="M28 15 C23 23 22 28 24 33 L32 33 C34 28 33 23 28 15 Z"
        fill="url(#anvGold)"
      />
      {/* Core Brilliant Teardrop */}
      <path
        d="M28 23 C26.2 26 26.2 30 28 32 C29.8 30 29.8 26 28 23 Z"
        fill="#FFFFFF"
      />

      {/* Classical Cast Bronze Oil Vessel (Dīpa-pātra) */}
      <path
        d="M11 35 C12 30 19 29 28 29 C37 29 44 30 45 35 C41 40 15 40 11 35 Z"
        fill="url(#anvBronze)"
        stroke="currentColor"
        strokeWidth="1.5"
        {...base}
      />
      {/* Fluted Oil Vessel Lip Highlight */}
      <path
        d="M14 34.5 C20 32.5 36 32.5 42 34.5"
        stroke="url(#anvGold)"
        strokeWidth="1.4"
        {...base}
      />

      {/* Tiered Lotus Base & Plinth */}
      <path
        d="M15 39 C19 36 24 36 28 39 C32 36 37 36 41 39 C38 43 18 43 15 39 Z"
        fill="url(#anvGold)"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="1.2"
        {...base}
      />
      {/* Stepped Temple Pedestal */}
      <path d="M16 44 L40 44" {...s} />
      <path d="M13 48 L43 48" {...sf} opacity="0.85" />
      <path d="M10 52 L46 52" {...st} opacity="0.65" />
      {/* Pedestal Engravings */}
      <circle cx="28" cy="48" r="1.5" fill="url(#anvGold)" />
      <circle cx="21" cy="48" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="35" cy="48" r="1.2" fill="currentColor" opacity="0.5" />
    </g>
  );
}

/* ─── 2. History (कालचक्र / Konark Sun & Time Wheel) ─── */
function HistoryGlyph() {
  return (
    <g>
      {/* Outer Chariot Wheel Rims */}
      <circle cx="28" cy="28" r="23" {...s} />
      <circle cx="28" cy="28" r="20" {...st} strokeDasharray="3 2" opacity="0.6" />
      <circle cx="28" cy="28" r="16.5" {...sf} />

      {/* 12 Solar Epoch Notches around perimeter */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <circle
          key={deg}
          cx={28 + 21.5 * Math.cos((deg * Math.PI) / 180)}
          cy={28 + 21.5 * Math.sin((deg * Math.PI) / 180)}
          r="1.2"
          fill="url(#anvGold)"
        />
      ))}

      {/* 8 Primary Carved Spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 28 + 7.5 * Math.cos(rad);
        const y1 = 28 + 7.5 * Math.sin(rad);
        const x2 = 28 + 16.5 * Math.cos(rad);
        const y2 = 28 + 16.5 * Math.sin(rad);
        const xm = 28 + 12 * Math.cos(rad);
        const ym = 28 + 12 * Math.sin(rad);
        return (
          <g key={deg}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} {...s} stroke="url(#anvGold)" />
            <circle cx={xm} cy={ym} r="1.5" fill="currentColor" opacity="0.75" />
          </g>
        );
      })}

      {/* Central Sun Axle Hub */}
      <circle cx="28" cy="28" r="7.5" fill="url(#anvGold)" stroke="currentColor" strokeWidth="1.6" {...base} />
      <circle cx="28" cy="28" r="4.5" fill="url(#anvBronze)" />
      <circle cx="28" cy="28" r="2" fill="#FFFFFF" />

      {/* Grounding Ashokan Lotus Plinth */}
      <path d="M18 51 C22 49 34 49 38 51" {...sf} />
      <path d="M14 54 L42 54" {...s} />
    </g>
  );
}

/* ─── 3. Psychology (अन्तःकरण / Sahasrāra & Awakened Third Eye) ─── */
function PsychologyGlyph() {
  return (
    <g>
      {/* Blooming Sahasrāra Petals (Outer Circle) */}
      <circle cx="28" cy="28" r="23" {...st} strokeDasharray="3 2" opacity="0.4" />
      <path
        d="M28 6 C23 14 23 20 28 23 C33 20 33 14 28 6 Z"
        fill="url(#anvLotus)"
        opacity="0.75"
      />
      <path
        d="M28 50 C23 42 23 36 28 33 C33 36 33 42 28 50 Z"
        fill="url(#anvLotus)"
        opacity="0.75"
      />
      <path
        d="M6 28 C14 23 20 23 23 28 C20 33 14 33 6 28 Z"
        fill="url(#anvLotus)"
        opacity="0.75"
      />
      <path
        d="M50 28 C42 23 36 23 33 28 C36 33 42 33 50 28 Z"
        fill="url(#anvLotus)"
        opacity="0.75"
      />

      {/* Diagonal Supporting Petals */}
      <path d="M12 12 C18 17 21 21 22 25" {...st} opacity="0.5" />
      <path d="M44 12 C38 17 35 21 34 25" {...st} opacity="0.5" />
      <path d="M12 44 C18 39 21 35 22 31" {...st} opacity="0.5" />
      <path d="M44 44 C38 39 35 35 34 31" {...st} opacity="0.5" />

      {/* The Inward Awakened Eye (Jñāna-cakṣu) */}
      <path
        d="M13 28 C17 18 39 18 43 28 C39 38 17 38 13 28 Z"
        fill="color-mix(in srgb, var(--surface) 85%, transparent)"
        stroke="currentColor"
        strokeWidth="2.2"
        {...base}
      />
      {/* Iris Band */}
      <circle cx="28" cy="28" r="7.5" fill="url(#anvSapphire)" stroke="currentColor" strokeWidth="1.2" {...base} />
      {/* Pupil Core */}
      <circle cx="28" cy="28" r="4.2" fill="#0B132B" />
      {/* Cosmic Light Spark */}
      <circle cx="29.5" cy="26.5" r="1.6" fill="#FFFFFF" />

      {/* Chandra-kalā (Golden Crescent Moon above) */}
      <path
        d="M23 13 C26 15 30 15 33 13 C31 16 25 16 23 13 Z"
        fill="url(#anvGold)"
      />
      <circle cx="28" cy="10" r="1.6" fill="url(#anvGold)" />
    </g>
  );
}

/* ─── 4. Sociology (समाज-मण्डल / Sacred Harmonious Assembly) ─── */
function SociologyGlyph() {
  return (
    <g>
      {/* Outer Social Horizon Ring */}
      <circle cx="28" cy="28" r="23.5" {...st} strokeDasharray="4 2.5" opacity="0.4" />
      <circle cx="28" cy="28" r="20" {...sf} opacity="0.35" />

      {/* 4 Cardinal Assembly Figures */}
      {/* Top Figure */}
      <circle cx="28" cy="11" r="3.6" fill="url(#anvJade)" stroke="currentColor" strokeWidth="1.2" {...base} />
      <path d="M22 21 C22 16 34 16 34 21" {...s} />

      {/* Bottom Figure */}
      <circle cx="28" cy="45" r="3.6" fill="url(#anvJade)" stroke="currentColor" strokeWidth="1.2" {...base} />
      <path d="M22 35 C22 40 34 40 34 35" {...s} />

      {/* Left Figure */}
      <circle cx="11" cy="28" r="3.6" fill="url(#anvJade)" stroke="currentColor" strokeWidth="1.2" {...base} />
      <path d="M21 22 C16 22 16 34 21 34" {...s} />

      {/* Right Figure */}
      <circle cx="45" cy="28" r="3.6" fill="url(#anvJade)" stroke="currentColor" strokeWidth="1.2" {...base} />
      <path d="M35 22 C40 22 40 34 35 34" {...s} />

      {/* Interweaving Web of Social Dharma */}
      <line x1="28" y1="21" x2="35" y2="28" {...sf} opacity="0.6" />
      <line x1="35" y1="28" x2="28" y2="35" {...sf} opacity="0.6" />
      <line x1="28" y1="35" x2="21" y2="28" {...sf} opacity="0.6" />
      <line x1="21" y1="28" x2="28" y2="21" {...sf} opacity="0.6" />

      {/* Central Diamond Altar of Shared Virtue */}
      <path
        d="M28 20.5 L35.5 28 L28 35.5 L20.5 28 Z"
        fill="url(#anvGold)"
        fillOpacity="0.45"
        stroke="currentColor"
        strokeWidth="1.6"
        {...base}
      />
      <circle cx="28" cy="28" r="3" fill="url(#anvJade)" />
      <circle cx="28" cy="28" r="1.2" fill="#FFFFFF" />
    </g>
  );
}

/* ─── 5. Science (परमाणु व ऋत / Cosmic Quantum Lattice & Atom) ─── */
function ScienceGlyph() {
  return (
    <g>
      {/* Hexagonal Cosmic Order Lattice (Ṛta) */}
      <polygon
        points="28,5 47,16 47,40 28,51 9,40 9,16"
        {...st}
        strokeDasharray="4 2"
        opacity="0.4"
      />

      {/* 3D Quantum Orbital Tracks */}
      {/* Orbit 1: Horizontal */}
      <ellipse cx="28" cy="28" rx="22" ry="8.5" {...sf} stroke="url(#anvSapphire)" opacity="0.85" />
      {/* Orbit 2: Tilted 60 deg */}
      <ellipse
        cx="28"
        cy="28"
        rx="22"
        ry="8.5"
        transform="rotate(60 28 28)"
        {...sf}
        stroke="url(#anvSapphire)"
        opacity="0.85"
      />
      {/* Orbit 3: Tilted -60 deg */}
      <ellipse
        cx="28"
        cy="28"
        rx="22"
        ry="8.5"
        transform="rotate(-60 28 28)"
        {...sf}
        stroke="url(#anvSapphire)"
        opacity="0.85"
      />

      {/* Orbiting Quantum Energy Nodes */}
      <circle cx="50" cy="28" r="2.4" fill="url(#anvGold)" />
      <circle cx="17" cy="9" r="2.2" fill="url(#anvGold)" />
      <circle cx="39" cy="47" r="2.2" fill="url(#anvGold)" />

      {/* Central Atomic Nucleus Triad (Kaṇāda's Tri-aṇuka) */}
      <circle cx="28" cy="25" r="4.5" fill="url(#anvSapphire)" stroke="currentColor" strokeWidth="1.2" {...base} />
      <circle cx="23.5" cy="31" r="4.2" fill="url(#anvGold)" stroke="currentColor" strokeWidth="1.2" {...base} />
      <circle cx="32.5" cy="31" r="4.2" fill="url(#anvBronze)" stroke="currentColor" strokeWidth="1.2" {...base} />
      {/* Center White Spark of Direct Observation */}
      <circle cx="28" cy="28" r="1.8" fill="#FFFFFF" />
    </g>
  );
}

/* ─── 6. Geopolitics (मण्डल-सिद्धान्त / Kautilyan Mandala & Sovereign Falcon) ─── */
function GeopoliticsGlyph() {
  return (
    <g>
      {/* Concentric Territorial Rings */}
      <circle cx="28" cy="30" r="21" {...st} strokeDasharray="3 2" opacity="0.4" />
      <circle cx="28" cy="30" r="16" {...sf} opacity="0.5" />
      <circle cx="28" cy="30" r="10.5" {...st} opacity="0.6" />

      {/* 8-Directional Imperial Compass Points */}
      <line x1="28" y1="9" x2="28" y2="51" {...sf} opacity="0.5" />
      <line x1="7" y1="30" x2="49" y2="30" {...sf} opacity="0.5" />
      <line x1="13" y1="15" x2="43" y2="45" {...st} opacity="0.35" />
      <line x1="43" y1="15" x2="13" y2="45" {...st} opacity="0.35" />

      {/* Cardinal Arrowheads */}
      <polygon points="28,5 26,10 30,10" fill="url(#anvGold)" />
      <polygon points="28,55 26,50 30,50" fill="url(#anvGold)" />
      <polygon points="3,30 8,28 8,32" fill="url(#anvGold)" />
      <polygon points="53,30 48,28 48,32" fill="url(#anvGold)" />

      {/* Sovereign Falcon Crest (Śyena) hovering at Zenith */}
      <path
        d="M17 14 C22 10 26 12 28 15 C30 12 34 10 39 14 C35 18 31 18 28 21 C25 18 21 18 17 14 Z"
        fill="url(#anvSaffron)"
        stroke="currentColor"
        strokeWidth="1.4"
        {...base}
      />
      {/* Crowned Falcon Head */}
      <circle cx="28" cy="11.5" r="2" fill="url(#anvGold)" />

      {/* Central Throne Diamond of the Vijigīṣu (Sovereign Ruler) */}
      <polygon
        points="28,24 34,30 28,36 22,30"
        fill="url(#anvGold)"
        stroke="currentColor"
        strokeWidth="1.5"
        {...base}
      />
      <circle cx="28" cy="30" r="2.5" fill="url(#anvBronze)" />
      <circle cx="28" cy="30" r="1" fill="#FFFFFF" />
    </g>
  );
}

/* ─── 7. Papers (शोधपत्र व लेखनी / Stacked Manuscripts & Peacock Quill) ─── */
function PapersGlyph() {
  return (
    <g>
      {/* Bottom Folio */}
      <rect x="9" y="27" width="38" height="17" rx="3" {...st} opacity="0.4" fill="url(#anvBronze)" fillOpacity="0.15" />
      {/* Middle Folio */}
      <rect x="7" y="22" width="38" height="17" rx="3" {...sf} opacity="0.6" fill="url(#anvBronze)" fillOpacity="0.25" />
      {/* Primary Top Folio */}
      <rect
        x="5"
        y="17"
        width="38"
        height="17"
        rx="3"
        fill="url(#anvSaffron)"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="1.8"
        {...base}
      />

      {/* Manuscript Binding Holes */}
      <circle cx="14" cy="25.5" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="1" {...base} />
      <circle cx="34" cy="25.5" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="1" {...base} />

      {/* Silk Binding Sūtra Cord */}
      <line x1="14" y1="25.5" x2="34" y2="25.5" {...sf} strokeDasharray="3 1.5" stroke="url(#anvGold)" />
      {/* Hanging Silk Sūtra Tassel */}
      <path d="M34 25.5 C40 25 43 30 40 35 C38 38 34 37 34 31" {...sf} stroke="url(#anvGold)" />

      {/* Inscribed Sacred Text Lines */}
      <line x1="18" y1="21.5" x2="30" y2="21.5" {...sf} opacity="0.8" />
      <line x1="18" y1="25.5" x2="30" y2="25.5" {...st} opacity="0.6" />
      <line x1="18" y1="29.5" x2="27" y2="29.5" {...sf} opacity="0.75" />

      {/* The Scholar's Peacock Quill (Lekhanī) crossing diagonally */}
      <path
        d="M20 38 L38 10 C40 6 45 6 47 9 C49 12 47 16 43 18 L24 42 L20 44 Z"
        fill="url(#anvGold)"
        fillOpacity="0.85"
        stroke="currentColor"
        strokeWidth="1.4"
        {...base}
      />
      {/* Quill Barbs Detail */}
      <line x1="39" y1="12" x2="44" y2="8" {...st} stroke="#FFFFFF" />
      <line x1="36" y1="16" x2="42" y2="12" {...st} stroke="#FFFFFF" />
      {/* Golden Writing Nib */}
      <polygon points="20,44 17,47 22,43" fill="url(#anvBronze)" />

      {/* Consecrated Royal Seal at corner */}
      <circle cx="39" cy="40" r="3.5" fill="url(#anvLotus)" />
      <circle cx="39" cy="40" r="1.5" fill="#FFFFFF" />
    </g>
  );
}

/* ─── 8. Archive (शास्त्रकोश / Temple Manuscript Treasury & Antique Key) ─── */
function ArchiveGlyph() {
  return (
    <g>
      {/* Vaulted Lid of the Coffer */}
      <path
        d="M9 22 C9 15 17 11 28 11 C39 11 47 15 47 22 Z"
        fill="url(#anvGold)"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="2"
        {...base}
      />
      {/* Ornamental Handle on Lid */}
      <path d="M23 11 C23 7 33 7 33 11" {...s} stroke="url(#anvGold)" />

      {/* Main Treasury Chest Body */}
      <rect
        x="9"
        y="22"
        width="38"
        height="22"
        rx="2"
        fill="url(#anvBronze)"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="2"
        {...base}
      />

      {/* Brass Corner Brackets & Rivets */}
      <path d="M9 28 L15 28 L15 22" {...sf} stroke="url(#anvGold)" />
      <path d="M47 28 L41 28 L41 22" {...sf} stroke="url(#anvGold)" />
      <path d="M9 38 L15 38 L15 44" {...sf} stroke="url(#anvGold)" />
      <path d="M47 38 L41 38 L41 44" {...sf} stroke="url(#anvGold)" />

      {/* Central Padlock Plate & Keyhole */}
      <rect x="24" y="27" width="8" height="9" rx="1.5" fill="url(#anvGold)" stroke="currentColor" strokeWidth="1.2" {...base} />
      <circle cx="28" cy="30" r="1.3" fill="#000000" />
      <line x1="28" y1="31.3" x2="28" y2="33.5" stroke="#000000" strokeWidth="1.2" {...base} />

      {/* Antique Lotus-Bow Key (Kuñcikā) placed across */}
      <g transform="translate(6, 10)">
        <circle cx="16" cy="37" r="4.5" {...sf} stroke="url(#anvGold)" />
        <circle cx="16" cy="37" r="2.2" fill="url(#anvGold)" />
        <line x1="19.5" y1="34" x2="35" y2="18.5" {...s} stroke="url(#anvGold)" />
        {/* Key Notches */}
        <line x1="32" y1="21.5" x2="34.5" y2="24" {...sf} stroke="url(#anvGold)" />
        <line x1="34.5" y1="19" x2="37.5" y2="22" {...sf} stroke="url(#anvGold)" />
      </g>
    </g>
  );
}

/* ─── 9. Civilizational Thought (शिखर व महामेरु / Temple Vimāna Spire) ─── */
function CivilizationalThoughtGlyph() {
  return (
    <g>
      {/* Dawn Solar Radiance behind temple spire */}
      <line x1="28" y1="2" x2="28" y2="5" {...st} stroke="url(#anvGold)" />
      <line x1="18" y1="5" x2="21" y2="8" {...st} stroke="url(#anvGold)" />
      <line x1="38" y1="5" x2="35" y2="8" {...st} stroke="url(#anvGold)" />
      <line x1="11" y1="12" x2="15" y2="14" {...st} stroke="url(#anvGold)" opacity="0.6" />
      <line x1="45" y1="12" x2="41" y2="14" {...st} stroke="url(#anvGold)" opacity="0.6" />

      {/* Kalaśa Spire & Dhvaja Flag at Zenith */}
      <line x1="28" y1="4" x2="28" y2="8" stroke="url(#anvGold)" strokeWidth="1.6" {...base} />
      <circle cx="28" cy="9.5" r="2.2" fill="url(#anvGold)" />
      <path d="M28 5 C32 4 33 7 28 8" {...st} fill="url(#anvSaffron)" />

      {/* Fluted Āmalaka Disc */}
      <ellipse cx="28" cy="13.5" rx="6.5" ry="2.2" fill="url(#anvGold)" stroke="currentColor" strokeWidth="1.2" {...base} />

      {/* Tier 1 (Apex Spire) */}
      <polygon points="24,15 32,15 30,21 26,21" fill="url(#anvBronze)" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.4" {...base} />
      {/* Tier 2 */}
      <polygon points="22,21 34,21 33,28 23,28" fill="url(#anvBronze)" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.4" {...base} />
      <circle cx="28" cy="24.5" r="1.5" fill="url(#anvGold)" />

      {/* Tier 3 */}
      <polygon points="19,28 37,28 36,36 20,36" fill="url(#anvBronze)" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.5" {...base} />
      <rect x="25" y="30" width="6" height="5" rx="1" {...st} fill="url(#anvGold)" fillOpacity="0.5" />

      {/* Tier 4 (Gopuram Niches) */}
      <polygon points="16,36 40,36 39,44 17,44" fill="url(#anvBronze)" fillOpacity="0.6" stroke="currentColor" strokeWidth="1.6" {...base} />
      <circle cx="22" cy="40" r="1.5" fill="url(#anvGold)" />
      <circle cx="28" cy="40" r="1.8" fill="url(#anvGold)" />
      <circle cx="34" cy="40" r="1.5" fill="url(#anvGold)" />

      {/* Monumental Adhiṣṭhāna Plinth Base */}
      <rect x="12" y="44" width="32" height="5" rx="1" {...s} fill="url(#anvGold)" fillOpacity="0.4" />
      <line x1="8" y1="51" x2="48" y2="51" {...s} />
      <line x1="6" y1="54" x2="50" y2="54" {...st} opacity="0.65" />
    </g>
  );
}

/* ─── 10. Aesthetics (रसमयूर / The Royal Peacock of Rasa & Beauty) ─── */
function AestheticsGlyph() {
  return (
    <g>
      {/* Sweeping Peacock Tail Plumage Fan */}
      <path
        d="M26 35 C17 32 10 24 10 14 C16 11 23 15 27 24"
        {...sf}
        stroke="url(#anvJade)"
      />
      <path
        d="M26 35 C20 27 16 17 21 8 C27 8 31 15 30 25"
        {...sf}
        stroke="url(#anvSapphire)"
      />
      <path
        d="M28 35 C26 23 27 14 34 7 C39 10 39 18 34 26"
        {...sf}
        stroke="url(#anvGold)"
      />

      {/* Peacock Feather Eyes (Candrodaya Ocelli) */}
      {/* Eye 1 */}
      <g transform="translate(13, 14)">
        <ellipse cx="0" cy="0" rx="4.5" ry="3.2" fill="url(#anvGold)" />
        <ellipse cx="0" cy="0" rx="2.8" ry="2" fill="url(#anvSapphire)" />
        <circle cx="0" cy="0" r="1" fill="#FFFFFF" />
      </g>
      {/* Eye 2 */}
      <g transform="translate(23, 9)">
        <ellipse cx="0" cy="0" rx="4.8" ry="3.5" fill="url(#anvGold)" />
        <ellipse cx="0" cy="0" rx="3" ry="2.2" fill="url(#anvLotus)" />
        <circle cx="0" cy="0" r="1.1" fill="#FFFFFF" />
      </g>
      {/* Eye 3 */}
      <g transform="translate(35, 10)">
        <ellipse cx="0" cy="0" rx="4.5" ry="3.2" fill="url(#anvGold)" />
        <ellipse cx="0" cy="0" rx="2.8" ry="2" fill="url(#anvJade)" />
        <circle cx="0" cy="0" r="1" fill="#FFFFFF" />
      </g>

      {/* Peacock Body & Slender Curved Neck */}
      <path
        d="M34 46 C34 40 37 34 38 28 C38 24 35 22 34 24 C33 26 31 29 27 34 C24 38 26 44 31 46 Z"
        fill="url(#anvSapphire)"
        stroke="currentColor"
        strokeWidth="1.4"
        {...base}
      />
      {/* Regal Head & Beak */}
      <circle cx="36" cy="22" r="2.8" fill="url(#anvSapphire)" />
      <polygon points="38.5,21 43,22.5 38.5,23.5" fill="url(#anvGold)" />
      {/* Kalāpa Crown Crest */}
      <line x1="36" y1="19.5" x2="37" y2="15.5" {...st} stroke="url(#anvGold)" />
      <circle cx="37" cy="14.5" r="1.2" fill="url(#anvGold)" />

      {/* Perched Blooming Champaka / Lotus Branch */}
      <path d="M12 49 C22 47 38 47 46 51" {...s} stroke="url(#anvBronze)" />
      <circle cx="16" cy="46" r="2.5" fill="url(#anvLotus)" />
      <circle cx="43" cy="48" r="2" fill="url(#anvLotus)" />
    </g>
  );
}

/* ─── 11. Sanskrit Studies (शब्दब्रह्म व शङ्ख / Sacred Conch & Primordial Dhvani) ─── */
function SanskritGlyph() {
  return (
    <g>
      {/* Concentric Spheres of Acoustic Primordial Sound (Nāda-Brahma) */}
      <path d="M10 26 C10 15 20 6 32 6" {...st} strokeDasharray="3 2" opacity="0.45" stroke="url(#anvGold)" />
      <path d="M7 30 C7 14 19 3 34 3" {...st} strokeDasharray="4 3" opacity="0.3" stroke="url(#anvGold)" />

      {/* Sacred Spiraling Dakṣiṇāvarti Conch Shell */}
      <path
        d="M21 48 C16 45 13 38 15 30 C17 22 23 15 32 14 C41 13 46 20 46 28 C46 36 39 45 28 47 L21 48 Z"
        fill="url(#anvGold)"
        fillOpacity="0.45"
        stroke="currentColor"
        strokeWidth="2"
        {...base}
      />

      {/* Spiraling Inner Whorls of the Conch */}
      <path
        d="M32 14 C27 15 23 20 22 27 C21 34 26 40 33 39 C39 38 42 32 40 25 C39 20 34 18 30 20 C27 22 26 27 29 30"
        {...sf}
        stroke="url(#anvBronze)"
      />
      {/* Embossed Conch Tip Flutes */}
      <path d="M16 42 L20 48 L23 44" {...sf} />
      <path d="M26 15 L24 10" {...sf} stroke="url(#anvGold)" />

      {/* Calligraphic Devanāgarī Sacred Ligature above Aperture */}
      <path
        d="M27 24 C27 20 31 19 34 21 C37 23 35 27 31 28 C36 29 37 34 33 36 C30 37 27 35 27 33"
        stroke="url(#anvSaffron)"
        strokeWidth="2.2"
        {...base}
      />
      {/* Chandra-Bindu of Sound Consecration */}
      <path d="M30 17 C32 18 34 18 36 17" {...st} stroke="url(#anvGold)" />
      <circle cx="33" cy="14.5" r="1.4" fill="url(#anvGold)" />
    </g>
  );
}

/* ─── 12. Political Theory (राजधर्म / Chhatra, Daṇḍa & Tulā) ─── */
function PoliticalTheoryGlyph() {
  return (
    <g>
      {/* Imperial Protective Parasol (Chhatra) */}
      <path
        d="M12 21 C12 12 28 9 28 9 C28 9 44 12 44 21 C39 19 33 22 28 20 C23 22 17 19 12 21 Z"
        fill="url(#anvGold)"
        fillOpacity="0.5"
        stroke="currentColor"
        strokeWidth="2"
        {...base}
      />
      {/* Pearl Festoons along umbrella fringe */}
      <circle cx="16" cy="22" r="1.2" fill="url(#anvGold)" />
      <circle cx="22" cy="22" r="1.2" fill="url(#anvGold)" />
      <circle cx="28" cy="22" r="1.5" fill="url(#anvGold)" />
      <circle cx="34" cy="22" r="1.2" fill="url(#anvGold)" />
      <circle cx="40" cy="22" r="1.2" fill="url(#anvGold)" />

      {/* Central Sovereign Daṇḍa (Scepter of Law) */}
      <line x1="28" y1="5" x2="28" y2="52" stroke="url(#anvBronze)" strokeWidth="2.4" {...base} />
      {/* Finial at apex */}
      <circle cx="28" cy="5" r="2.4" fill="url(#anvGold)" />

      {/* Balanced Tulā (Scales of Justice) */}
      <line x1="14" y1="31" x2="42" y2="31" stroke="currentColor" strokeWidth="2" {...base} />
      <circle cx="28" cy="31" r="2.5" fill="url(#anvGold)" />

      {/* Left Pan */}
      <line x1="15" y1="31" x2="11" y2="40" {...st} />
      <line x1="15" y1="31" x2="19" y2="40" {...st} />
      <path d="M9 40 C12 43 18 43 21 40 Z" fill="url(#anvGold)" stroke="currentColor" strokeWidth="1.4" {...base} />

      {/* Right Pan */}
      <line x1="41" y1="31" x2="37" y2="40" {...st} />
      <line x1="41" y1="31" x2="45" y2="40" {...st} />
      <path d="M35 40 C38 43 44 43 47 40 Z" fill="url(#anvGold)" stroke="currentColor" strokeWidth="1.4" {...base} />

      {/* Pedestal Base */}
      <path d="M21 52 L35 52" stroke="currentColor" strokeWidth="2.5" {...base} />
      <path d="M17 55 L39 55" {...st} opacity="0.65" />
    </g>
  );
}

/* ─── 13. Translations (भाषासेतु / Twin Codices & Stone Arch Bridge) ─── */
function TranslationsGlyph() {
  return (
    <g>
      {/* Left Classical Folio (Source Tongue) */}
      <rect
        x="6"
        y="18"
        width="18"
        height="26"
        rx="2"
        fill="url(#anvSapphire)"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.6"
        {...base}
      />
      <line x1="10" y1="23" x2="20" y2="23" {...sf} opacity="0.75" />
      <line x1="10" y1="27" x2="20" y2="27" {...st} opacity="0.5" />
      <line x1="10" y1="31" x2="17" y2="31" {...st} opacity="0.6" />
      <circle cx="15" cy="38" r="2" fill="url(#anvSapphire)" />

      {/* Right Classical Folio (Target Tongue) */}
      <rect
        x="32"
        y="18"
        width="18"
        height="26"
        rx="2"
        fill="url(#anvGold)"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.6"
        {...base}
      />
      <line x1="36" y1="23" x2="46" y2="23" {...sf} opacity="0.75" />
      <line x1="36" y1="27" x2="46" y2="27" {...st} opacity="0.5" />
      <line x1="36" y1="31" x2="43" y2="31" {...st} opacity="0.6" />
      <circle cx="41" cy="38" r="2" fill="url(#anvGold)" />

      {/* Classical Arched Stone Bridge spanning between them */}
      <path
        d="M20 28 C23 20 33 20 36 28"
        stroke="url(#anvBronze)"
        strokeWidth="3.2"
        fill="none"
        {...base}
      />
      <path
        d="M21 28 C24 23 32 23 35 28"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        {...base}
      />
      {/* Bridge Keystone */}
      <rect x="26.5" y="19" width="3" height="4.5" fill="url(#anvGold)" />

      {/* Flowing Möbius Infinity Loop of Meaning */}
      <path
        d="M17 14 C22 9 34 9 39 14 C43 18 39 23 28 23 C17 23 13 18 17 14 Z"
        stroke="url(#anvSaffron)"
        strokeWidth="1.5"
        strokeDasharray="3 1.5"
        fill="none"
        {...base}
      />
      <circle cx="28" cy="23" r="1.8" fill="url(#anvGold)" />
    </g>
  );
}

/* ─── 14. Multimedia (नादवीणा / Saraswatī Vīṇā of Sound & Vision) ─── */
function MultimediaGlyph() {
  return (
    <g>
      {/* Concentric Audio-Visual Waves radiating from the soundbox */}
      <path d="M42 27 C46 31 46 41 42 45" {...st} strokeDasharray="3 2" opacity="0.5" stroke="url(#anvAmethyst)" />
      <path d="M45 23 C51 29 51 43 45 49" {...st} strokeDasharray="4 2.5" opacity="0.35" stroke="url(#anvAmethyst)" />

      {/* Main Resonance Gourd (Kudam) */}
      <circle
        cx="36"
        cy="36"
        r="12"
        fill="url(#anvGold)"
        fillOpacity="0.4"
        stroke="currentColor"
        strokeWidth="2"
        {...base}
      />
      {/* Inner Rosette Soundboard Inlay */}
      <circle cx="36" cy="36" r="6" fill="url(#anvBronze)" stroke="currentColor" strokeWidth="1" {...base} />
      <circle cx="36" cy="36" r="2.2" fill="#FFFFFF" />

      {/* Long Fretted Fingerboard (Daṇḍī) */}
      <line x1="14" y1="14" x2="31" y2="31" stroke="currentColor" strokeWidth="4.5" {...base} />
      <line x1="15" y1="13" x2="32" y2="30" stroke="url(#anvGold)" strokeWidth="2.2" {...base} />

      {/* Frets along the neck */}
      <line x1="17" y1="19" x2="20" y2="16" {...sf} stroke="#000" />
      <line x1="20.5" y1="22.5" x2="23.5" y2="19.5" {...sf} stroke="#000" />
      <line x1="24" y1="26" x2="27" y2="23" {...sf} stroke="#000" />

      {/* Mythical Carved Yāli Headstock at upper apex */}
      <path
        d="M13 15 C10 13 8 9 11 6 C14 3 18 5 16 9 L13 15 Z"
        fill="url(#anvBronze)"
        stroke="currentColor"
        strokeWidth="1.4"
        {...base}
      />
      <circle cx="12" cy="7.5" r="1.3" fill="url(#anvGold)" />

      {/* Tuning Pegs */}
      <circle cx="9" cy="11" r="1.8" fill="url(#anvGold)" />
      <circle cx="15" cy="5" r="1.8" fill="url(#anvGold)" />

      {/* Upper Resonator Gourd */}
      <circle cx="21" cy="13" r="4.5" fill="url(#anvBronze)" fillOpacity="0.6" stroke="currentColor" strokeWidth="1.2" {...base} />
    </g>
  );
}

/* ─── 15. Community (वादसभा / Semicircular Sabha & Sacred Agni-Kuṇḍa) ─── */
function CommunityGlyph() {
  return (
    <g>
      {/* Tiered Semicircular Sabha Amphitheater */}
      <path d="M8 22 C8 12 17 6 28 6 C39 6 48 12 48 22" {...st} strokeDasharray="3 2" opacity="0.4" />
      <path d="M12 25 C12 16 19 10 28 10 C37 10 44 16 44 25" {...sf} opacity="0.5" />
      <path d="M16 28 C16 20 21 15 28 15 C35 15 40 20 40 28" {...s} />

      {/* Assembled Scholars around perimeter */}
      <circle cx="14" cy="24" r="2.5" fill="url(#anvGold)" />
      <circle cx="20" cy="17" r="2.5" fill="url(#anvGold)" />
      <circle cx="28" cy="13.5" r="2.8" fill="url(#anvGold)" />
      <circle cx="36" cy="17" r="2.5" fill="url(#anvGold)" />
      <circle cx="42" cy="24" r="2.5" fill="url(#anvGold)" />

      {/* Stepped Central Agni-Kuṇḍa (Sacred Fire Altar) */}
      <rect x="20" y="38" width="16" height="12" rx="1.5" fill="url(#anvBronze)" stroke="currentColor" strokeWidth="1.6" {...base} />
      <line x1="16" y1="50" x2="40" y2="50" {...s} />
      <line x1="14" y1="53" x2="42" y2="53" {...st} opacity="0.6" />

      {/* Sacred Agni Fire Rising from Kuṇḍa */}
      <path
        d="M28 22 C23 29 23 34 25 38 L31 38 C33 34 33 29 28 22 Z"
        fill="url(#anvFlame)"
        opacity="0.95"
      />
      <circle cx="28" cy="26" r="1.5" fill="#FFFFFF" />
    </g>
  );
}

/* ─── 16. Submit (विद्यासमर्पण / Añjali Mudrā Offering the Radiant Lotus Gem) ─── */
function SubmitGlyph() {
  return (
    <g>
      {/* Sculpted Añjali Mudrā Cupped Hands */}
      <path
        d="M14 49 C11 41 12 36 17 32 C20 36 24 38 27 40"
        fill="url(#anvGold)"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.8"
        {...base}
      />
      <path
        d="M42 49 C45 41 44 36 39 32 C36 36 32 38 29 40"
        fill="url(#anvGold)"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.8"
        {...base}
      />
      {/* Base Wrist Cradle */}
      <path d="M18 45 C23 49 33 49 38 45" stroke="currentColor" strokeWidth="2.2" {...base} />
      {/* Bangles / Valaya on wrists */}
      <line x1="13" y1="48" x2="18" y2="51" {...sf} stroke="url(#anvGold)" />
      <line x1="43" y1="48" x2="38" y2="51" {...sf} stroke="url(#anvGold)" />

      {/* Blooming Consecrated Lotus Flower */}
      <path
        d="M28 21 C23 25 20 30 22 34 C24 33 26 32 28 32 C30 32 32 33 34 34 C36 30 33 25 28 21 Z"
        fill="url(#anvLotus)"
        fillOpacity="0.5"
        stroke="currentColor"
        strokeWidth="1.4"
        {...base}
      />
      <path d="M22 33 C16 30 15 25 20 21 C21 25 22 29 23 31" {...st} stroke="url(#anvLotus)" />
      <path d="M34 33 C40 30 41 25 36 21 C35 25 34 29 33 31" {...st} stroke="url(#anvLotus)" />

      {/* The Radiant Jewel of Newly Minted Knowledge (Vidyā-Ratna) */}
      <polygon
        points="28,6 32,13 39,15 34,19 36,26 28,22 20,26 22,19 17,15 24,13"
        fill="url(#anvGold)"
        stroke="currentColor"
        strokeWidth="1.4"
        {...base}
      />
      {/* Center Jewel Spark */}
      <circle cx="28" cy="16" r="2.2" fill="#FFFFFF" />

      {/* Ascending Celestial Rays of Knowledge */}
      <line x1="28" y1="1" x2="28" y2="4" stroke="url(#anvGold)" strokeWidth="1.8" {...base} />
      <line x1="39" y1="9" x2="37" y2="11.5" stroke="url(#anvGold)" strokeWidth="1.4" {...base} />
      <line x1="17" y1="9" x2="19" y2="11.5" stroke="url(#anvGold)" strokeWidth="1.4" {...base} />
    </g>
  );
}

/* ─── 17. Default / Atlas (अष्टमाङ्गलिक / Universal Astrolabe Compass) ─── */
function CompassGlyph() {
  return (
    <g>
      <circle cx="28" cy="28" r="23" {...s} />
      <circle cx="28" cy="28" r="17.5" {...st} strokeDasharray="3 2" opacity="0.5" />
      <circle cx="28" cy="28" r="10" {...sf} opacity="0.4" />

      {/* Primary 8-Pointed Star of Directional Navigation */}
      <path
        d="M28 4 L31.5 24.5 L52 28 L31.5 31.5 L28 52 L24.5 31.5 L4 28 L24.5 24.5 Z"
        fill="url(#anvGold)"
        fillOpacity="0.4"
        stroke="currentColor"
        strokeWidth="1.8"
        {...base}
      />
      {/* Diagonal Needle Rays */}
      <line x1="28" y1="28" x2="40" y2="16" {...st} opacity="0.5" />
      <line x1="28" y1="28" x2="40" y2="40" {...st} opacity="0.5" />
      <line x1="28" y1="28" x2="16" y2="40" {...st} opacity="0.5" />
      <line x1="28" y1="28" x2="16" y2="16" {...st} opacity="0.5" />

      {/* Central Axle Jewel */}
      <circle cx="28" cy="28" r="3.6" fill="url(#anvBronze)" />
      <circle cx="28" cy="28" r="1.5" fill="#FFFFFF" />
    </g>
  );
}

/* ─── Glyph Selector Function ─── */
function glyphFor(key: DomainKey) {
  switch (key) {
    case "philosophy":
      return <PhilosophyGlyph />;
    case "history":
      return <HistoryGlyph />;
    case "psychology":
      return <PsychologyGlyph />;
    case "sociology":
      return <SociologyGlyph />;
    case "science":
      return <ScienceGlyph />;
    case "geopolitics":
      return <GeopoliticsGlyph />;
    case "papers":
      return <PapersGlyph />;
    case "archive":
      return <ArchiveGlyph />;
    case "civilization":
    case "civilizational-thought":
      return <CivilizationalThoughtGlyph />;
    case "aesthetics":
      return <AestheticsGlyph />;
    case "sanskrit":
    case "sanskrit-studies":
      return <SanskritGlyph />;
    case "political-theory":
      return <PoliticalTheoryGlyph />;
    case "translations":
      return <TranslationsGlyph />;
    case "multimedia":
      return <MultimediaGlyph />;
    case "community":
      return <CommunityGlyph />;
    case "submit":
      return <SubmitGlyph />;
    default:
      return <CompassGlyph />;
  }
}

export function AnimalGlyph({
  domain = "archive",
  size = 48,
  className,
  title,
  style,
}: AnimalGlyphProps) {
  const key = normalizeDomainKey(domain);
  const labelled = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className={className}
      style={style}
      role={labelled ? "img" : undefined}
      aria-label={title}
      aria-hidden={!labelled}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <IndicGlyphGradients />
      {glyphFor(key)}
    </svg>
  );
}

/* ─── Export semantic aliases for future codebase use ─── */
export { AnimalGlyph as DomainIcon, AnimalGlyph as DomainGlyph };
