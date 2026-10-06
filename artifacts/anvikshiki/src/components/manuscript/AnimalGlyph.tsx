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

/* ─── Shared styling primitives for crisp vector rendering in 0 0 48 48 ─── */
const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const sf = { ...s, strokeWidth: 1.4 };
const st = { ...s, strokeWidth: 1 };

/* ─── 1. Philosophy (दर्शन / प्रदीपः सर्वविद्यानाम्) — Sacred Diya & Lotus of Pramāṇa ─── */
function PhilosophyGlyph() {
  return (
    <g>
      {/* Plinth & Lotus Petal Base */}
      <path {...sf} d="M12 43 C20 44.5 28 44.5 36 43" opacity="0.6" />
      <path {...sf} d="M14 41 C19 38 29 38 34 41" />
      <path {...st} d="M16 41 C18 39 21 39 24 41 C27 39 30 39 32 41" opacity="0.5" />
      
      {/* Lotus Petals embracing the oil vessel */}
      <path {...sf} d="M10 38 C14 34 19 35 24 38 C29 35 34 34 38 38" opacity="0.75" />
      <path d="M17 38 C20 35 24 35 24 38 C24 35 28 35 31 38 C28 40 20 40 17 38 Z" fill="currentColor" fillOpacity="0.2" />

      {/* Classical Bronze Oil Vessel (Dīpa-pātra) */}
      <path
        {...s}
        d="M10 35 C11 31 16 30 24 30 C32 30 37 31 38 35 C34 38.5 14 38.5 10 35 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      {/* Oil basin rim & spout tip */}
      <path {...sf} d="M37 33.5 C40 32.5 42 30.5 43 28.5 C40 30.5 37 31.5 35 32.5" />
      <ellipse cx="24" cy="33.5" rx="10" ry="2.2" {...st} opacity="0.5" />

      {/* Outer Radiance Glow of Wisdom */}
      <path
        {...sf}
        d="M24 7 C18 13 14 18.5 14 23.5 C14 28.5 18.5 32 24 32 C29.5 32 34 28.5 34 23.5 C34 18.5 30 13 24 7 Z"
        fill="currentColor"
        fillOpacity="0.12"
        opacity="0.7"
      />

      {/* Leaping Tongue of Sacred Fire (Jñāna-Jyoti) */}
      <path
        {...s}
        d="M24 10 C21 15 18 19 18 23.5 C18 26.8 20.7 29.5 24 29.5 C27.3 29.5 30 26.8 30 23.5 C30 19 27 15 24 10 Z"
        fill="currentColor"
        fillOpacity="0.35"
      />

      {/* Inner Concentrated Flame Core */}
      <path
        d="M24 15.5 C22.8 18 21 20.8 21 23.5 C21 25.5 22.3 27 24 27 C25.7 27 27 25.5 27 23.5 C27 20.8 25.2 18 24 15.5 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />

      {/* Floating Bindu of Transcendence */}
      <circle cx="24" cy="4.5" r="1.8" fill="currentColor" />

      {/* Radiating Epistemic Aura Rays (Pramāṇas) */}
      <path {...st} d="M11 16 C9 19.5 9 24.5 11 28" opacity="0.4" />
      <path {...st} d="M37 16 C39 19.5 39 24.5 37 28" opacity="0.4" />
      <circle cx="14" cy="11" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="34" cy="11" r="1" fill="currentColor" opacity="0.5" />
    </g>
  );
}

/* ─── 2. History (इतिहास / कालचक्र) — The Great Cosmic Time Wheel & Ashokan Pillar ─── */
function HistoryGlyph() {
  return (
    <g>
      {/* Outer Time Rim with Dual Track */}
      <circle cx="24" cy="23" r="19" {...s} />
      <circle cx="24" cy="23" r="15.8" {...sf} opacity="0.65" />
      <circle cx="24" cy="23" r="17.4" {...st} strokeDasharray="1.5 2" opacity="0.45" />

      {/* Solar Epoch Studs (12 Yuga Notches) */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 24 + 17.4 * Math.cos(rad);
        const cy = 23 + 17.4 * Math.sin(rad);
        return <circle key={deg} cx={cx} cy={cy} r="0.9" fill="currentColor" opacity="0.6" />;
      })}

      {/* 8 Primary Ornate Sculpted Spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 24 + 5.5 * Math.cos(rad);
        const y1 = 23 + 5.5 * Math.sin(rad);
        const x2 = 24 + 15.8 * Math.cos(rad);
        const y2 = 23 + 15.8 * Math.sin(rad);
        return <line key={`p-${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sf} />;
      })}

      {/* 8 Secondary Fine Interstitial Rays */}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 24 + 5.5 * Math.cos(rad);
        const y1 = 23 + 5.5 * Math.sin(rad);
        const x2 = 24 + 14 * Math.cos(rad);
        const y2 = 23 + 14 * Math.sin(rad);
        return <line key={`s-${deg}`} x1={x1} y1={y1} x2={x2} y2={y2} {...st} opacity="0.45" />;
      })}

      {/* Central Solar Hub (Nābhi) */}
      <circle cx="24" cy="23" r="5.5" {...s} fill="currentColor" fillOpacity="0.25" />
      <circle cx="24" cy="23" r="3.2" fill="currentColor" />
      <circle cx="24" cy="23" r="1.3" fill="var(--surface, #FFF)" opacity="0.9" />

      {/* Inscribed Pillar Capital Base (Śilā-Stambha Pedestal) */}
      <path {...sf} d="M14 43 C18 41 30 41 34 43" opacity="0.75" />
      <path {...s} d="M11 45.5 L37 45.5" strokeWidth="2.2" />
      <line x1="16" y1="43" x2="16" y2="45.5" {...st} opacity="0.5" />
      <line x1="24" y1="42.5" x2="24" y2="45.5" {...st} opacity="0.5" />
      <line x1="32" y1="43" x2="32" y2="45.5" {...st} opacity="0.5" />
    </g>
  );
}

/* ─── 3. Psychology (चित्त / अन्तःकरण) — Awakened Eye of Consciousness & Sahasrāra ─── */
function PsychologyGlyph() {
  return (
    <g>
      {/* Outer Radiant Sahasrāra Lotus Petals */}
      <path {...sf} d="M24 37 C18 41 12 37 9 32 C13 32 18 34 24 37" fill="currentColor" fillOpacity="0.15" />
      <path {...sf} d="M24 37 C30 41 36 37 39 32 C35 32 30 34 24 37" fill="currentColor" fillOpacity="0.15" />
      <path {...st} d="M7 24 C7 17 12 11 18 9" opacity="0.5" />
      <path {...st} d="M41 24 C41 17 36 11 30 9" opacity="0.5" />

      {/* Petal Tips Aura Arc */}
      {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 24 + 18.5 * Math.cos(rad);
        const cy = 24 + 13 * Math.sin(rad);
        return <circle key={deg} cx={cx} cy={cy} r="0.9" fill="currentColor" opacity="0.35" />;
      })}

      {/* Almond Eye of Perception (Jñāna-cakṣu) */}
      <path
        {...s}
        d="M8 24 C14 14 34 14 40 24 C34 34 14 34 8 24 Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* Eyelid Contours */}
      <path {...st} d="M12 21 C17 16 31 16 36 21" opacity="0.5" />
      <path {...st} d="M12 27 C17 32 31 32 36 27" opacity="0.5" />

      {/* Concentric Iris Rings */}
      <circle cx="24" cy="24" r="7.5" {...sf} fill="currentColor" fillOpacity="0.2" />
      <circle cx="24" cy="24" r="5.2" {...st} strokeDasharray="2 1.5" opacity="0.7" />

      {/* Pupil & Core Reflection Glint */}
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <circle cx="22.2" cy="22.2" r="1.1" fill="var(--surface, #FFF)" opacity="0.95" />

      {/* Sacred Third Eye / Ūrdhva-Puṇḍra Bindi */}
      <path
        d="M24 7 C22.5 10 21 12 21 13.8 C21 15.5 22.3 16.8 24 16.8 C25.7 16.8 27 15.5 27 13.8 C27 12 25.5 10 24 7 Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      {/* Chandra-kalā Crescent beneath Bindi */}
      <path {...sf} d="M20.5 14.5 C21.5 16.5 26.5 16.5 27.5 14.5" opacity="0.65" />
      <circle cx="24" cy="4" r="1" fill="currentColor" opacity="0.5" />
    </g>
  );
}

/* ─── 4. Sociology (समाज / धर्मसंस्था) — Samāja-Maṇḍala & Communion of Shared Dharma ─── */
function SociologyGlyph() {
  return (
    <g>
      {/* Outer Protective Ring of Society */}
      <circle cx="24" cy="24" r="20" {...st} strokeDasharray="4 3" opacity="0.4" />
      <circle cx="24" cy="24" r="17.2" {...sf} opacity="0.3" />

      {/* Cardinal Assembly Figures (4 figures linked in mutual reverence) */}
      {/* Top Figure */}
      <circle cx="24" cy="9" r="3" {...sf} fill="currentColor" fillOpacity="0.35" />
      <path {...sf} d="M19 18 C19 13.5 29 13.5 29 18" />

      {/* Bottom Figure */}
      <circle cx="24" cy="39" r="3" {...sf} fill="currentColor" fillOpacity="0.35" />
      <path {...sf} d="M19 30 C19 34.5 29 34.5 29 30" />

      {/* Left Figure */}
      <circle cx="9" cy="24" r="3" {...sf} fill="currentColor" fillOpacity="0.35" />
      <path {...sf} d="M18 19 C13.5 19 13.5 29 18 29" />

      {/* Right Figure */}
      <circle cx="39" cy="24" r="3" {...sf} fill="currentColor" fillOpacity="0.35" />
      <path {...sf} d="M30 19 C34.5 19 34.5 29 30 29" />

      {/* Central Diamond Altar of Dharma */}
      <path
        {...s}
        d="M24 17.5 L30.5 24 L24 30.5 L17.5 24 Z"
        fill="currentColor"
        fillOpacity="0.22"
      />
      {/* Central Flame of Communal Harmony */}
      <path
        d="M24 20.5 C22.5 22.5 22.5 24.5 24 26 C25.5 24.5 25.5 22.5 24 20.5 Z"
        fill="currentColor"
        fillOpacity="0.85"
      />

      {/* Intertwining Linking Arcs between all 4 figures */}
      <path {...st} d="M19 18 C14 18 18 14 18 19" opacity="0.5" />
      <path {...st} d="M29 18 C34 18 30 14 30 19" opacity="0.5" />
      <path {...st} d="M19 30 C14 30 18 34 18 29" opacity="0.5" />
      <path {...st} d="M29 30 C34 30 30 34 30 29" opacity="0.5" />

      {/* Four Interstitial Fellowship Beads */}
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" opacity="0.6" />
      <circle cx="32.5" cy="15.5" r="1.3" fill="currentColor" opacity="0.6" />
      <circle cx="15.5" cy="32.5" r="1.3" fill="currentColor" opacity="0.6" />
      <circle cx="32.5" cy="32.5" r="1.3" fill="currentColor" opacity="0.6" />
    </g>
  );
}

/* ─── 5. Science (विज्ञान / पदार्थ) — Kaṇāda’s Paramāṇu & Quantum Orbital Cosmography ─── */
function ScienceGlyph() {
  return (
    <g>
      {/* Sacred Hexagonal Physical Lattice (Ṛta) */}
      <path
        {...st}
        d="M24 4.5 L40.8 14.2 L40.8 33.8 L24 43.5 L7.2 33.8 L7.2 14.2 Z"
        strokeDasharray="3 2"
        opacity="0.32"
      />

      {/* Three Intersecting 3D Orbital Tracks */}
      {/* Track 1: Horizontal */}
      <ellipse cx="24" cy="24" rx="18" ry="7" {...s} opacity="0.75" />
      {/* Track 2: Rotated 60 degrees */}
      <ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(60 24 24)" {...s} opacity="0.75" />
      {/* Track 3: Rotated 120 degrees */}
      <ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(120 24 24)" {...s} opacity="0.75" />

      {/* Orbiting Quantum Energy Particles */}
      <circle cx="42" cy="24" r="2.2" fill="currentColor" />
      <circle cx="42" cy="24" r="3.8" {...st} opacity="0.4" />
      <circle cx="15" cy="8.4" r="2" fill="currentColor" />
      <circle cx="33" cy="39.6" r="2" fill="currentColor" />

      {/* Central Atomic Cluster (Paramāṇu / Tri-aṇuka) */}
      <circle cx="24" cy="21.5" r="3.8" {...st} fill="currentColor" fillOpacity="0.7" />
      <circle cx="20.2" cy="26.2" r="3.5" {...st} fill="currentColor" fillOpacity="0.55" />
      <circle cx="27.8" cy="26.2" r="3.5" {...st} fill="currentColor" fillOpacity="0.55" />

      {/* Central Inward Luminous Spark of Discovery */}
      <circle cx="24" cy="24" r="1.5" fill="var(--surface, #FFF)" opacity="0.95" />
      
      {/* Vertical Spectral Induction Line */}
      <line x1="24" y1="9" x2="24" y2="15" {...st} opacity="0.4" />
      <line x1="24" y1="33" x2="24" y2="39" {...st} opacity="0.4" />
    </g>
  );
}

/* ─── 6. Geopolitics (मण्डल सिद्धान्त / अर्थशास्त्र) — Kautilya’s Mandala & Sovereign Falcon ─── */
function GeopoliticsGlyph() {
  return (
    <g>
      {/* Concentric Geopolitical Rings of Mandala Theory */}
      <circle cx="24" cy="27" r="17.5" {...s} />
      <circle cx="24" cy="27" r="11.5" {...sf} opacity="0.4" />
      <circle cx="24" cy="27" r="5.5" {...st} fill="currentColor" fillOpacity="0.2" />

      {/* Directional Cardinal Compass Rose (Aṣṭa-diś) */}
      {/* North Arrow */}
      <path d="M24 10 L26.5 17.5 L24 15.5 L21.5 17.5 Z" fill="currentColor" />
      {/* South Arrow */}
      <path d="M24 44.5 L26 38.5 L24 40 L22 38.5 Z" fill="currentColor" opacity="0.6" />
      {/* East & West Points */}
      <path d="M41.5 27 L35.5 29 L37 27 L35.5 25 Z" fill="currentColor" opacity="0.6" />
      <path d="M6.5 27 L12.5 25 L11 27 L12.5 29 Z" fill="currentColor" opacity="0.6" />

      {/* Sovereign Regal Falcon / Eagle (Śyenā Crest) */}
      {/* Outstretched Wings of Strategic Deterrence */}
      <path
        {...s}
        d="M24 8 C16 5 8 9 4 16 C10 15 16 17 21 20"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path
        {...s}
        d="M24 8 C32 5 40 9 44 16 C38 15 32 17 27 20"
        fill="currentColor"
        fillOpacity="0.18"
      />
      {/* Falcon Head & Sharp Beak */}
      <path d="M24 5 C22.5 7 21 8 19 8.5 L21.5 9.5 C22.5 9 23.5 8 24 8 C24.5 8 25.5 9 26.5 9.5 L29 8.5 C27 8 25.5 7 24 5 Z" fill="currentColor" />
      <circle cx="24" cy="7.2" r="1" fill="var(--surface, #FFF)" opacity="0.8" />

      {/* Scepter of Statecraft (Daṇḍa) clutched horizontally */}
      <line x1="18" y1="21" x2="30" y2="21" {...s} strokeWidth="2.5" />
      <circle cx="18" cy="21" r="1.5" fill="currentColor" />
      <circle cx="30" cy="21" r="1.5" fill="currentColor" />

      {/* Tail Feathers merging into central hub */}
      <path {...sf} d="M21 21 L19.5 27 L24 25 L28.5 27 L27 21" opacity="0.75" />
      <circle cx="24" cy="27" r="1.6" fill="currentColor" />
    </g>
  );
}

/* ─── 7. Papers (शोधपत्र / ग्रन्थ) — Inscribed Palm-Leaf Manuscript, Sūtra Cord & Seal ─── */
function PapersGlyph() {
  return (
    <g>
      {/* Stacked Ancient Palm-Leaf Folios (Tālapattra) */}
      {/* Bottom Folio */}
      <rect x="7" y="22" width="34" height="15" rx="2.5" {...st} opacity="0.35" fill="currentColor" fillOpacity="0.08" />
      {/* Middle Folio */}
      <rect x="6" y="18" width="34" height="15" rx="2.5" {...sf} opacity="0.6" fill="currentColor" fillOpacity="0.14" />
      {/* Top Folio (Primary Manuscript) */}
      <rect x="5" y="14" width="34" height="15" rx="2.5" {...s} fill="currentColor" fillOpacity="0.22" />

      {/* Binding Cord Holes (Khaṭva) */}
      <circle cx="13" cy="21.5" r="1.8" {...st} fill="var(--surface, #FFF)" />
      <circle cx="31" cy="21.5" r="1.8" {...st} fill="var(--surface, #FFF)" />

      {/* Silk Binding Sūtra Cord */}
      <line x1="13" y1="21.5" x2="31" y2="21.5" {...sf} strokeDasharray="3 1.5" />
      {/* Hanging Sūtra Tassel */}
      <path {...sf} d="M31 21.5 C36 21 38 25 36 29 C34 32 31 30 31 26" opacity="0.7" />

      {/* Inscribed Calligraphic Manuscript Text Lines */}
      <line x1="16" y1="18" x2="28" y2="18" {...sf} opacity="0.75" />
      <line x1="16" y1="21.5" x2="28" y2="21.5" {...st} opacity="0.5" />
      <line x1="16" y1="25" x2="25" y2="25" {...sf} opacity="0.65" />

      {/* Scholar’s Peacock Quill (Lekhanī) laid diagonally */}
      <line x1="41" y1="5" x2="22" y2="35" {...s} strokeWidth="2.2" />
      {/* Metal Nib */}
      <path d="M22 35 L19 39 L23 37 Z" fill="currentColor" />
      {/* Feather Vanes at the crest */}
      <path {...sf} d="M41 5 C36 8 33 13 34 18 C37 16 40 11 41 5 Z" fill="currentColor" fillOpacity="0.3" />
      <path {...st} d="M41 5 C44 9 43 14 39 18" opacity="0.5" />

      {/* Stamped Royal Medallion Seal */}
      <circle cx="15" cy="33" r="5" {...s} fill="currentColor" fillOpacity="0.45" />
      <circle cx="15" cy="33" r="3" {...st} strokeDasharray="1.5 1" opacity="0.8" />
      <circle cx="15" cy="33" r="1.2" fill="var(--surface, #FFF)" />
    </g>
  );
}

/* ─── 8. Archive (अभिलेखागार / कोष) — Temple Manuscript Chest & Lotus Key ─── */
function ArchiveGlyph() {
  return (
    <g>
      {/* Temple Treasury Chest Body (Pustaka-Mañjūṣā) */}
      <rect x="7" y="20" width="34" height="22" rx="3" {...s} fill="currentColor" fillOpacity="0.16" />
      
      {/* Tiered Temple-Architecture Lid */}
      <path
        {...s}
        d="M5 20 L10 13 L38 13 L43 20 Z"
        fill="currentColor"
        fillOpacity="0.28"
      />
      {/* Ornate Handle on Lid */}
      <path {...sf} d="M19 13 C19 9.5 29 9.5 29 13" />

      {/* Corner Brass Straps with Rivets */}
      <line x1="8.5" y1="20" x2="8.5" y2="42" {...st} opacity="0.6" />
      <line x1="39.5" y1="20" x2="39.5" y2="42" {...st} opacity="0.6" />
      <circle cx="8.5" cy="24" r="0.8" fill="currentColor" />
      <circle cx="8.5" cy="38" r="0.8" fill="currentColor" />
      <circle cx="39.5" cy="24" r="0.8" fill="currentColor" />
      <circle cx="39.5" cy="38" r="0.8" fill="currentColor" />

      {/* Horizontal Carved Panel Band */}
      <line x1="7" y1="31" x2="41" y2="31" {...sf} opacity="0.7" />

      {/* Escutcheon Keyhole Plate */}
      <circle cx="24" cy="27" r="3.2" {...sf} fill="currentColor" fillOpacity="0.3" />
      <path d="M24 25.5 L24 28 L23 29.5 L25 29.5 Z" fill="currentColor" />

      {/* Exquisite Antique Indian Lotus Key (Kuñcikā) floating diagonally */}
      {/* Lotus Bow */}
      <path
        {...sf}
        d="M37 5 C34 3 31 6 33 9 C31 12 34 15 37 13 C40 15 43 12 41 9 C43 6 40 3 37 5 Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <circle cx="37" cy="9" r="1.5" fill="var(--surface, #FFF)" opacity="0.9" />
      {/* Fluted Shaft & Collars */}
      <line x1="34" y1="11" x2="19" y2="26" {...s} strokeWidth="2.2" />
      <line x1="31" y1="12" x2="33" y2="14" {...st} opacity="0.7" />
      <line x1="28" y1="15" x2="30" y2="17" {...st} opacity="0.7" />
      {/* Classical Key Bit Teeth */}
      <path {...sf} d="M21 24 L23 26 M19 26 L21 28" />
    </g>
  );
}

/* ─── 9. Civilizational Thought (सभ्यता / संस्कृति) — Monumental Śikhara & Cosmic Dawn Sun ─── */
function CivilizationalThoughtGlyph() {
  return (
    <g>
      {/* Cosmic Dawn Sun Rising behind the Temple */}
      <circle cx="24" cy="14" r="11" {...st} fill="currentColor" fillOpacity="0.18" opacity="0.6" />
      {/* 8 Glorious Solar Flare Rays */}
      {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 24 + 11 * Math.cos(rad - Math.PI / 2);
        const y1 = 14 + 11 * Math.sin(rad - Math.PI / 2);
        const x2 = 24 + 15 * Math.cos(rad - Math.PI / 2);
        const y2 = 14 + 15 * Math.sin(rad - Math.PI / 2);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} {...st} opacity="0.55" />;
      })}

      {/* The Architectural Temple Śikhara */}
      {/* Tier 4 (Adhiṣṭhāna Foundation Plinth) */}
      <rect x="6" y="39" width="36" height="5.5" rx="1" {...s} fill="currentColor" fillOpacity="0.38" />
      {/* Tier 3 (Maha-pīṭha Shrine Tier) */}
      <rect x="10" y="32" width="28" height="7" rx="1" {...s} fill="currentColor" fillOpacity="0.3" />
      {/* Tier 2 (Jangha Niches) */}
      <rect x="14" y="24" width="20" height="8" rx="1" {...s} fill="currentColor" fillOpacity="0.24" />
      {/* Tier 1 (Griva Neck) */}
      <rect x="18" y="17" width="12" height="7" rx="1" {...s} fill="currentColor" fillOpacity="0.18" />

      {/* Architectural Niches on Tiers */}
      <line x1="16" y1="32" x2="16" y2="39" {...st} opacity="0.4" />
      <line x1="24" y1="32" x2="24" y2="39" {...st} opacity="0.4" />
      <line x1="32" y1="32" x2="32" y2="39" {...st} opacity="0.4" />
      <line x1="20" y1="24" x2="20" y2="32" {...st} opacity="0.4" />
      <line x1="28" y1="24" x2="28" y2="32" {...st} opacity="0.4" />

      {/* The Fluted Stone Āmalaka Crown */}
      <ellipse cx="24" cy="14.5" rx="6.5" ry="2.8" {...s} fill="currentColor" fillOpacity="0.55" />
      <line x1="20" y1="12" x2="20" y2="17" {...st} opacity="0.6" />
      <line x1="24" y1="11.8" x2="24" y2="17.2" {...st} opacity="0.6" />
      <line x1="28" y1="12" x2="28" y2="17" {...st} opacity="0.6" />

      {/* The Golden Kalaśa Spire Finial */}
      <path d="M22.5 12 C22.5 9 24 7 24 6.5 C24 7 25.5 9 25.5 12 Z" fill="currentColor" />
      <line x1="24" y1="6.5" x2="24" y2="3" {...s} strokeWidth="1.8" />
      <circle cx="24" cy="2.5" r="1.2" fill="currentColor" />

      {/* Ceremonial Sanctum Steps */}
      <line x1="20" y1="39" x2="28" y2="39" {...st} />
      <line x1="21" y1="41.5" x2="27" y2="41.5" {...st} />
      <line x1="22" y1="44" x2="26" y2="44" {...st} />
    </g>
  );
}

/* ─── 10. Aesthetics (सौन्दर्य / रस) — Lyrical Peacock of Poetic Ecstasy & Lotus ─── */
function AestheticsGlyph() {
  return (
    <g>
      {/* Peacock Body & Slender Graceful Arched Neck */}
      <path
        {...s}
        d="M20 18 C20 13 23 9.5 26.5 9.5 C28.5 9.5 30 10.5 30.5 12 L34.5 11.5 L31.5 13.5 C32 15.5 31 17.5 29 19.5 C25.5 23 21 24 18 28"
        fill="currentColor"
        fillOpacity="0.2"
      />
      {/* Peacock Eye */}
      <circle cx="28" cy="12" r="1" fill="var(--surface, #FFF)" />
      <circle cx="28" cy="12" r="0.5" fill="currentColor" />

      {/* Royal Crest Feathers (Kalāpa) */}
      <path {...sf} d="M26.5 9.5 L24 4" />
      <path {...sf} d="M27.5 9.5 L27.5 3.5" />
      <path {...sf} d="M28.5 9.5 L31 4" />
      <circle cx="24" cy="3.5" r="1.3" fill="currentColor" />
      <circle cx="27.5" cy="3" r="1.3" fill="currentColor" />
      <circle cx="31" cy="3.5" r="1.3" fill="currentColor" />

      {/* Sweeping Plumage Tail Fan (Candrikā Mandala) */}
      <path
        {...s}
        d="M12 43 C6 35 6 24 11 17 C16 12 23 12 26 16"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path {...sf} d="M15 43 C10 35 11 27 16 22 C19 19 23 20 25 24" opacity="0.75" />

      {/* Three Iridescent Peacock Eyes (Candrikā) along plumage */}
      {/* Eye 1 */}
      <circle cx="12" cy="22" r="3.8" {...sf} fill="currentColor" fillOpacity="0.3" />
      <circle cx="12" cy="22" r="2.2" fill="currentColor" fillOpacity="0.7" />
      <circle cx="12" cy="22" r="1" fill="var(--surface, #FFF)" opacity="0.9" />

      {/* Eye 2 */}
      <circle cx="10" cy="32" r="4.2" {...sf} fill="currentColor" fillOpacity="0.3" />
      <circle cx="10" cy="32" r="2.4" fill="currentColor" fillOpacity="0.7" />
      <circle cx="10" cy="32" r="1" fill="var(--surface, #FFF)" opacity="0.9" />

      {/* Eye 3 */}
      <circle cx="17" cy="39" r="3.6" {...sf} fill="currentColor" fillOpacity="0.3" />
      <circle cx="17" cy="39" r="2" fill="currentColor" fillOpacity="0.7" />

      {/* Blooming Champaka Lotus Flower at Base */}
      <path {...sf} d="M28 38 C32 33 38 34 42 38 C37 42 31 41 28 38 Z" fill="currentColor" fillOpacity="0.3" />
      <path {...st} d="M34 38 C36 34 40 34 42 38" />
    </g>
  );
}

/* ─── 11. Sanskrit Studies (संस्कृतम् / शब्दब्रह्म) — Sacred Conch & Devanāgarī Calligraphy ─── */
function SanskritGlyph() {
  return (
    <g>
      {/* Divine Dakṣiṇāvarti Conch Shell (Śaṅkha) */}
      <path
        {...s}
        d="M12 21 C10 13.5 15 7 24 7 C33 7 38 13.5 36 21 C35 25 32 28.5 29 32.5 L24 42.5 L19 32.5 C16 28.5 13 25 12 21 Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {/* Spiral Conch Shell Ribs */}
      <path {...sf} d="M16 14.5 C20 11.5 28 11.5 32 14.5" opacity="0.65" />
      <path {...sf} d="M13.5 21 C18 17.5 30 17.5 34.5 21" opacity="0.65" />
      <path {...sf} d="M16.5 28 C20 24.5 28 24.5 31.5 28" opacity="0.65" />
      <ellipse cx="24" cy="7" rx="3" ry="1.8" {...sf} fill="currentColor" fillOpacity="0.3" />

      {/* Illuminated Devanāgarī Glyph (ॐ / Śabda-Brahma) */}
      {/* Upper Horizontal Bar (Śiro-rekhā) */}
      <line x1="16" y1="16.5" x2="32" y2="16.5" {...s} strokeWidth="2.4" />

      {/* Devanagari Glyphic Curves */}
      <path
        {...s}
        d="M19 16.5 C19 12.5 23.5 12.5 24 16 C24.5 12.5 29 12.5 29 16.5 C29 19.5 26.5 21 24 21"
        strokeWidth="2"
      />
      <path
        {...s}
        d="M24 21 C27.5 21 29 23.5 29 26.5 C29 30 25 32 21 30.5"
        strokeWidth="2"
      />
      {/* Sweeping Virāma Accent Tail */}
      <path {...sf} d="M25 25.5 C28 25.5 32 23.5 33 20" strokeWidth="1.8" />

      {/* Chandrabindu Crescent & Bindu */}
      <path {...sf} d="M21 11.5 C23 13.5 25 13.5 27 11.5" strokeWidth="1.5" />
      <circle cx="24" cy="9.5" r="1.4" fill="currentColor" />

      {/* Radiant Soundwaves of Śabda-Brahman */}
      <path {...st} d="M7 17 C5 21 5 27 7 31" opacity="0.45" />
      <path {...st} d="M41 17 C43 21 43 27 41 31" opacity="0.45" />
    </g>
  );
}

/* ─── 12. Political Theory (राजधर्म / दण्डनीति) — Imperial Chhatra & Scales of Justice ─── */
function PoliticalTheoryGlyph() {
  return (
    <g>
      {/* Imperial Sovereign Parasol (Rāja-Chhatra) */}
      <path
        {...s}
        d="M10 16.5 C10 8.5 38 8.5 38 16.5 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      {/* Canopy Scalloped Valance */}
      <path {...sf} d="M10 16.5 Q13.5 19 17 16.5 Q20.5 19 24 16.5 Q27.5 19 31 16.5 Q34.5 19 38 16.5" />
      {/* Parasol Spire & Finial Jewel */}
      <line x1="24" y1="8.5" x2="24" y2="4" {...s} />
      <circle cx="24" cy="3" r="1.5" fill="currentColor" />
      {/* Pearl Tassels */}
      <circle cx="17" cy="18.5" r="0.9" fill="currentColor" opacity="0.7" />
      <circle cx="24" cy="18.5" r="0.9" fill="currentColor" opacity="0.7" />
      <circle cx="31" cy="18.5" r="0.9" fill="currentColor" opacity="0.7" />

      {/* Vertical Scepter of Governance (Daṇḍanīti) */}
      <line x1="24" y1="16.5" x2="24" y2="44" {...s} strokeWidth="2.4" />
      {/* Pedestal Base */}
      <path {...sf} d="M17 44 L31 44" strokeWidth="2.2" />

      {/* Horizontal Scales of Justice (Tulā) */}
      <line x1="12" y1="24.5" x2="36" y2="24.5" {...s} strokeWidth="2" />
      <circle cx="24" cy="24.5" r="2.5" fill="currentColor" />

      {/* Left Weighing Pan (Equal Balance) */}
      <line x1="12" y1="24.5" x2="7.5" y2="33" {...st} opacity="0.7" />
      <line x1="12" y1="24.5" x2="16.5" y2="33" {...st} opacity="0.7" />
      <path {...sf} d="M7 33 C7 36.5 17 36.5 17 33 Z" fill="currentColor" fillOpacity="0.4" />

      {/* Right Weighing Pan (Equal Balance) */}
      <line x1="36" y1="24.5" x2="31.5" y2="33" {...st} opacity="0.7" />
      <line x1="36" y1="24.5" x2="40.5" y2="33" {...st} opacity="0.7" />
      <path {...sf} d="M31 33 C31 36.5 41 36.5 41 33 Z" fill="currentColor" fillOpacity="0.4" />
    </g>
  );
}

/* ─── 13. Translations (अनुवाद / भाषासेतु) — Twin Scrolls & Stone Arch Bridge ─── */
function TranslationsGlyph() {
  return (
    <g>
      {/* Left Open Scroll (Source Language / Classical Heritage) */}
      <path
        {...sf}
        d="M6 10 C6 7.5 8.5 7.5 11 9 L11 37 C8.5 35 6 35 6 38 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <rect x="11" y="9" width="9" height="28" rx="1" {...st} fill="currentColor" fillOpacity="0.12" />
      {/* Ancient Script Glyphs */}
      <line x1="13.5" y1="14" x2="17.5" y2="14" {...sf} opacity="0.8" />
      <line x1="13.5" y1="18" x2="18.5" y2="18" {...sf} opacity="0.7" />
      <line x1="13.5" y1="22" x2="16.5" y2="22" {...sf} opacity="0.6" />
      <line x1="13.5" y1="26" x2="18" y2="26" {...sf} opacity="0.7" />

      {/* Right Open Scroll (Target Language / Living Horizon) */}
      <path
        {...sf}
        d="M42 10 C42 7.5 39.5 7.5 37 9 L37 37 C39.5 35 42 35 42 38 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <rect x="28" y="9" width="9" height="28" rx="1" {...st} fill="currentColor" fillOpacity="0.12" />
      {/* Phonetic / Contemporary Text Lines */}
      <line x1="30.5" y1="14" x2="34.5" y2="14" {...sf} opacity="0.8" />
      <line x1="29.5" y1="18" x2="34.5" y2="18" {...sf} opacity="0.7" />
      <line x1="31" y1="22" x2="34.5" y2="22" {...sf} opacity="0.6" />
      <line x1="29.5" y1="26" x2="34.5" y2="26" {...sf} opacity="0.7" />

      {/* Arched Stone Bridge (Setu) spanning between both worlds */}
      <path {...s} d="M15 33 C18 24 30 24 33 33" strokeWidth="2.2" />
      <line x1="13" y1="31" x2="35" y2="31" {...sf} />
      <line x1="20" y1="27" x2="20" y2="31" {...st} opacity="0.6" />
      <line x1="28" y1="27" x2="28" y2="31" {...st} opacity="0.6" />
      {/* Keystone at Arch Peak */}
      <rect x="22.5" y="24.5" width="3" height="3.5" rx="0.5" fill="currentColor" />

      {/* Dynamic Möbius Infinity Flow of Semantic Meaning */}
      <path
        {...sf}
        d="M15 18 C20 18 20 28 24 23 C28 18 28 28 33 28"
        strokeDasharray="2.5 1.5"
        opacity="0.85"
      />
      <circle cx="24" cy="20" r="1.8" fill="currentColor" />
    </g>
  );
}

/* ─── 14. Multimedia (नाद / दृश्य) — Saraswatī Vīṇā & Living Sonic Performance ─── */
function MultimediaGlyph() {
  return (
    <g>
      {/* Resonating Pear-Shaped Gourd Body (Kudam) */}
      <ellipse cx="16" cy="33" rx="10.5" ry="9.5" {...s} fill="currentColor" fillOpacity="0.22" />
      {/* Bridge (Kudirai) on Gourd */}
      <rect x="12" y="31.5" width="8" height="3.5" rx="1" fill="currentColor" />

      {/* Slender Fretted Neck (Daṇḍa) rising diagonally */}
      <line x1="16" y1="31" x2="34" y2="10" {...s} strokeWidth="3" />

      {/* Secondary Upper Gourd (Suraikkai) */}
      <circle cx="34.5" cy="14" r="5" {...sf} fill="currentColor" fillOpacity="0.32" />

      {/* Carved Yāli Headstock Crest */}
      <path
        {...s}
        d="M34 10 C36 6 41 6 43 9 C41 12 37 12 35 14"
        fill="currentColor"
        fillOpacity="0.35"
      />
      {/* Tuning Pegs (Birudais) */}
      <line x1="31.5" y1="16" x2="29" y2="13.5" {...sf} />
      <line x1="34" y1="13.5" x2="31.5" y2="11" {...sf} />
      <line x1="37" y1="11" x2="39.5" y2="13.5" {...sf} />
      <line x1="39.5" y1="8.5" x2="42" y2="11" {...sf} />

      {/* Vibrating Strings & Harmonics */}
      <line x1="14" y1="32" x2="33" y2="10" {...st} opacity="0.75" />
      <line x1="15.5" y1="33" x2="33.5" y2="11" {...st} opacity="0.65" />
      <line x1="17" y1="34" x2="34.5" y2="12" {...st} opacity="0.55" />

      {/* Soundwaves / Visual Projection Radiance */}
      <path {...sf} d="M38 18 C42 22 42 29 38 33" opacity="0.65" />
      <path {...st} d="M41 15 C46 21 46 32 41 37" opacity="0.4" />

      {/* Center Multimedia Play/Energy Aperture */}
      <path d="M26 23 L31 26 L26 29 Z" fill="currentColor" opacity="0.9" />
    </g>
  );
}

/* ─── 15. Community (संवाद / सभा / वादसभा) — The Sacred Gathering of Philosophers ─── */
function CommunityGlyph() {
  return (
    <g>
      {/* Tiered Assembly Amphitheater (Sadas) */}
      <path {...st} d="M6 38 C6 21 42 21 42 38" opacity="0.35" />
      <path {...sf} d="M10 38 C10 25 38 25 38 38" opacity="0.55" />
      <path {...s} d="M15 38 C15 29 33 29 33 38" opacity="0.75" />

      {/* Five Seated Scholars in Deliberation */}
      <circle cx="9" cy="27" r="2.5" fill="currentColor" />
      <circle cx="15.5" cy="22" r="2.5" fill="currentColor" />
      {/* Presiding Elder Scholar (Center) */}
      <circle cx="24" cy="18" r="3" fill="currentColor" />
      <path {...st} d="M21 16 C21 13 27 13 27 16" opacity="0.6" />
      <circle cx="32.5" cy="22" r="2.5" fill="currentColor" />
      <circle cx="39" cy="27" r="2.5" fill="currentColor" />

      {/* Sacred Central Agni-Kuṇḍa (Fire Altar of Truth) */}
      <rect x="18" y="36" width="12" height="4" rx="1" {...sf} fill="currentColor" fillOpacity="0.4" />
      {/* Sacred Flame */}
      <path
        d="M24 25 C21.5 29 20.5 32 21.5 35 L26.5 35 C27.5 32 26.5 29 24 25 Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <path
        d="M24 27.5 C22.8 30 22.5 32 23.5 35 L24.5 35 C25.5 32 25.2 30 24 27.5 Z"
        fill="currentColor"
      />

      {/* Protective Arch of Shared Inquiry Overhead */}
      <path {...st} d="M14 12 C18 8 30 8 34 12" strokeDasharray="2 1.5" opacity="0.6" />
    </g>
  );
}

/* ─── 16. Submit (समर्पण / विद्यादान) — Añjali Mudrā Offering the Radiant Lotus Gem ─── */
function SubmitGlyph() {
  return (
    <g>
      {/* Sculpted Añjali / Añjali-Kūrma Mudrā Hands (Reverent Cupped Palms) */}
      <path
        {...s}
        d="M13 42 C11 36 12 32 16 29 C18 32 21 34 23 35"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        {...s}
        d="M35 42 C37 36 36 32 32 29 C30 32 27 34 25 35"
        fill="currentColor"
        fillOpacity="0.2"
      />
      {/* Cupped Cradle Join */}
      <path {...s} d="M16 38 C20 42 28 42 32 38" strokeWidth="2.2" />
      {/* Wrist Ornament Rings */}
      <line x1="12" y1="41" x2="16" y2="43" {...st} opacity="0.6" />
      <line x1="36" y1="41" x2="32" y2="43" {...st} opacity="0.6" />

      {/* Floating Lotus of Scholarly Discovery */}
      <path
        {...sf}
        d="M24 19 C20 22 17 26 19 29 C21 28 23 27 24 27 C25 27 27 28 29 29 C31 26 28 22 24 19 Z"
        fill="currentColor"
        fillOpacity="0.38"
      />
      <path {...sf} d="M19 28 C14 26 13 22 17 19 C18 22 19 25 20 27" opacity="0.75" />
      <path {...sf} d="M29 28 C34 26 35 22 31 19 C30 22 29 25 28 27" opacity="0.75" />

      {/* The Radiant Jewel of Newly Minted Knowledge (Vidyā-Ratna) */}
      <path
        {...sf}
        d="M24 7 L26.5 13 L32 14 L27.5 17.5 L29 23 L24 19.5 L19 23 L20.5 17.5 L16 14 L21.5 13 Z"
        fill="currentColor"
      />
      {/* Celestial Radiance Sparks */}
      <line x1="24" y1="2" x2="24" y2="5" {...sf} />
      <line x1="34" y1="9" x2="32" y2="11" {...st} opacity="0.7" />
      <line x1="14" y1="9" x2="16" y2="11" {...st} opacity="0.7" />
    </g>
  );
}

/* ─── 17. Default / Compass (Aṣṭa-Māṅgalika Universal Compass) ─── */
function CompassGlyph() {
  return (
    <g>
      <circle cx="24" cy="24" r="19" {...s} />
      <circle cx="24" cy="24" r="14.5" {...st} strokeDasharray="3 2" opacity="0.5" />
      <circle cx="24" cy="24" r="8" {...sf} opacity="0.4" />

      {/* Primary 8-pointed star */}
      <path
        {...s}
        d="M24 3 L27 21 L45 24 L27 27 L24 45 L21 27 L3 24 L21 21 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <line x1="24" y1="24" x2="34" y2="14" {...st} opacity="0.4" />
      <line x1="24" y1="24" x2="34" y2="34" {...st} opacity="0.4" />
      <line x1="24" y1="24" x2="14" y2="34" {...st} opacity="0.4" />
      <line x1="24" y1="24" x2="14" y2="14" {...st} opacity="0.4" />
      <circle cx="24" cy="24" r="3.2" fill="currentColor" />
      <circle cx="24" cy="24" r="1.3" fill="var(--surface, #FFF)" />
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
  size = 36,
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
      viewBox="0 0 48 48"
      className={className}
      style={style}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {glyphFor(key)}
    </svg>
  );
}

/* ─── Export semantic aliases for future codebase use ─── */
export { AnimalGlyph as DomainIcon, AnimalGlyph as DomainGlyph };
