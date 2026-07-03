import type { DomainKey } from "@/lib/domainMeta";
import { normalizeDomainKey } from "@/lib/domainMeta";

type AnimalGlyphProps = {
  domain?: DomainKey | string | null;
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
};

const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const sf = { ...s, strokeWidth: 1.3 };

/* ─── Diya (oil lamp with flame) — Philosophy: wisdom, inquiry, jyoti ── */
function Diya() {
  return (
    <>
      {/* Flame — outer glow */}
      <path {...s} d="M16 5 C14 8 12 12 12 15 C12 18.5 13.8 20 16 20 C18.2 20 20 18.5 20 15 C20 12 18 8 16 5Z" opacity=".3" />
      {/* Flame — inner core */}
      <path d="M16 8 C15 10 14 13 14 15 C14 17 15 18.5 16 18.5 C17 18.5 18 17 18 15 C18 13 17 10 16 8Z" fill="currentColor" opacity=".75" />
      {/* Wick */}
      <line {...s} x1="16" y1="19" x2="16" y2="22" strokeWidth="1.1" />
      {/* Lamp body */}
      <path {...s} d="M9 22 C9 20.5 10 19.5 11 19 L16 18.5 L21 19 C22 19.5 23 20.5 23 22Z" opacity=".9" />
      {/* Spout */}
      <path {...s} d="M21.5 21 C23 20.5 25 20 26 19" strokeWidth="1.2" />
      {/* Lamp base */}
      <path {...s} d="M8 22 Q16 24.5 24 22" />
      {/* Base plate */}
      <line {...s} x1="6" y1="26" x2="26" y2="26" strokeWidth="1.8" opacity=".5" />
      {/* Decorative dots on base */}
      <circle cx="10" cy="24.5" r=".9" fill="currentColor" opacity=".35" />
      <circle cx="16" cy="25.2" r=".9" fill="currentColor" opacity=".35" />
      <circle cx="22" cy="24.5" r=".9" fill="currentColor" opacity=".35" />
    </>
  );
}

/* ─── Hourglass — History: time, memory, civilisations ── */
function Hourglass() {
  return (
    <>
      {/* Frame top & bottom bars */}
      <line {...s} x1="8" y1="5" x2="24" y2="5" strokeWidth="2" />
      <line {...s} x1="8" y1="27" x2="24" y2="27" strokeWidth="2" />
      {/* Side pillars */}
      <line {...s} x1="9" y1="5" x2="9" y2="27" opacity=".4" strokeWidth="1" />
      <line {...s} x1="23" y1="5" x2="23" y2="27" opacity=".4" strokeWidth="1" />
      {/* Glass body */}
      <path {...s} d="M9 6 L22 6 C22 6 18 10 18 16 C18 22 22 26 22 26 L9 26 C9 26 13 22 13 16 C13 10 9 6 9 6Z" opacity=".5" />
      {/* Sand — upper chamber */}
      <path d="M10.5 7.5 Q16 8 21.5 7.5 L18.5 12 Q16 10.5 13.5 12Z" fill="currentColor" opacity=".35" />
      {/* Sand — lower chamber */}
      <path d="M13 20 Q16 22 19 20 L21 25 Q16 24 11 25Z" fill="currentColor" opacity=".45" />
      {/* Narrow point grain */}
      <circle cx="16" cy="16" r="1.2" fill="currentColor" opacity=".6" />
      {/* Decorative columns on top */}
      <line {...s} x1="11" y1="4" x2="11" y2="6" opacity=".6" strokeWidth="2.2" />
      <line {...s} x1="21" y1="4" x2="21" y2="6" opacity=".6" strokeWidth="2.2" />
    </>
  );
}

/* ─── Third Eye mandala — Psychology: consciousness, inner landscape ── */
function ThirdEye() {
  return (
    <>
      {/* Outer ring */}
      <circle {...s} cx="16" cy="16" r="11" opacity=".2" />
      {/* Petals around eye */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x = 16 + 8.5 * Math.cos(rad);
        const y = 16 + 8.5 * Math.sin(rad);
        return <circle key={a} cx={x} cy={y} r="1.1" fill="currentColor" opacity=".3" />;
      })}
      {/* Eye outline */}
      <path {...s} d="M6 16 C8 11 12 8 16 8 C20 8 24 11 26 16 C24 21 20 24 16 24 C12 24 8 21 6 16Z" />
      {/* Eyelid crease */}
      <path {...sf} d="M9 14 C11 12 13 11 16 11 C19 11 21 12 23 14" opacity=".4" />
      {/* Iris */}
      <circle {...s} cx="16" cy="16" r="4.5" opacity=".7" />
      {/* Spiral iris */}
      <path {...sf} d="M16 12.5 C18 13.5 19.5 15 19 17 C18.5 19 16.5 19.5 15 18.5 C13.5 17.5 13.5 15.5 15 15 C16 14.7 17 15.5 16.5 16.5" opacity=".5" />
      {/* Pupil */}
      <circle cx="16" cy="16" r="1.8" fill="currentColor" opacity=".65" />
      {/* Third eye mark above — bindi */}
      <circle cx="16" cy="7" r="1.3" fill="currentColor" opacity=".5" />
      <line {...sf} x1="14" y1="7" x2="18" y2="7" opacity=".3" strokeWidth="0.8" />
    </>
  );
}

/* ─── Interconnected people — Sociology: community, institutions, culture ── */
function Community() {
  return (
    <>
      {/* Three figures */}
      {/* Left */}
      <circle {...s} cx="9" cy="9.5" r="2.5" />
      <path {...s} d="M5 20 C5 15 7 13.5 9 13 C10 12.8 10.5 13.5 9 14.5 C8.2 15 7 17 7 20" opacity=".6" />
      <path {...s} d="M9 12 C9 13 9.5 14.5 9 15.5 C8.5 16.5 7.5 17 8 19" />
      {/* Centre */}
      <circle {...s} cx="16" cy="8.5" r="2.5" />
      <path {...s} d="M13 20 C13 15.5 14.5 14 16 13.5 C17.5 14 19 15.5 19 20" />
      {/* Right */}
      <circle {...s} cx="23" cy="9.5" r="2.5" />
      <path {...s} d="M23 12 C23 13 22.5 14.5 23 15.5 C23.5 16.5 24.5 17 24 19" />
      <path {...s} d="M27 20 C27 17 25.8 15 25 14.5 C23.5 13.5 22 12.8 23 13" opacity=".6" />
      {/* Connection arcs between them */}
      <path {...sf} d="M11 11 C13 9.5 14 9 16 9" opacity=".5" />
      <path {...sf} d="M21 11 C19 9.5 18 9 16 9" opacity=".5" />
      {/* Ground / gathering line */}
      <path {...s} d="M5 24 Q16 26.5 27 24" opacity=".55" />
      {/* Sharing gesture — joined hands at center */}
      <path {...sf} d="M12 20 C13.5 21.5 14.5 22 16 22 C17.5 22 18.5 21.5 20 20" opacity=".7" />
    </>
  );
}

/* ─── DNA Atom — Science: observation, logic, nature, discovery ── */
function DnaAtom() {
  return (
    <>
      {/* Orbital rings */}
      <ellipse {...s} cx="16" cy="16" rx="11" ry="4.5" opacity=".5" />
      <ellipse {...s} cx="16" cy="16" rx="11" ry="4.5" transform="rotate(60 16 16)" opacity=".5" />
      <ellipse {...s} cx="16" cy="16" rx="11" ry="4.5" transform="rotate(120 16 16)" opacity=".5" />
      {/* Nucleus */}
      <circle cx="16" cy="16" r="3" fill="currentColor" opacity=".45" />
      <circle {...s} cx="16" cy="16" r="3" />
      {/* DNA spiral on side */}
      <path {...sf} d="M8 8 C10 10 10 13 8 16 C10 19 10 22 8 24" opacity=".55" />
      <path {...sf} d="M9.5 7.5 C11.5 9.5 11.5 12.5 9.5 15.5 C11.5 18.5 11.5 21.5 9.5 23.5" opacity=".3" />
      {/* Rungs */}
      <line {...sf} x1="8.2" y1="10" x2="10.2" y2="10.5" opacity=".4" />
      <line {...sf} x1="8.5" y1="13" x2="10.5" y2="13" opacity=".4" />
      <line {...sf} x1="8.2" y1="16" x2="10.2" y2="16" opacity=".4" />
      <line {...sf} x1="8.5" y1="19" x2="10.5" y2="19" opacity=".4" />
      <line {...sf} x1="8.2" y1="22" x2="10.2" y2="22.5" opacity=".4" />
      {/* Orbiting electron dot */}
      <circle cx="27" cy="16" r="1.5" fill="currentColor" opacity=".7" />
      <circle cx="10.5" cy="6.5" r="1.5" fill="currentColor" opacity=".6" />
    </>
  );
}

/* ─── Globe with compass — Geopolitics: power, geography, statecraft ── */
function GlobeCompass() {
  return (
    <>
      {/* Globe */}
      <circle {...s} cx="16" cy="16" r="10" />
      {/* Meridians */}
      <ellipse {...s} cx="16" cy="16" rx="5" ry="10" opacity=".5" />
      <ellipse {...s} cx="16" cy="16" rx="9" ry="3.5" opacity=".45" />
      <line {...sf} x1="6" y1="16" x2="26" y2="16" opacity=".3" />
      {/* Compass rose overlay */}
      <path d="M16 7 L17 10 L16 9 L15 10Z" fill="currentColor" opacity=".7" />
      <path d="M16 25 L17 22 L16 23 L15 22Z" fill="currentColor" opacity=".5" />
      <path d="M25 16 L22 15 L23 16 L22 17Z" fill="currentColor" opacity=".5" />
      <path d="M7 16 L10 17 L9 16 L10 15Z" fill="currentColor" opacity=".5" />
      {/* Centre cross */}
      <circle cx="16" cy="16" r="1.8" fill="currentColor" opacity=".6" />
      {/* Chess-piece crown on top (strategy) */}
      <path {...sf} d="M13.5 5.5 L14.5 4 L16 5 L17.5 4 L18.5 5.5" opacity=".6" strokeWidth="1.1" />
      <line {...sf} x1="13" y1="5.5" x2="19" y2="5.5" opacity=".5" strokeWidth="1.1" />
    </>
  );
}

/* ─── Manuscript scroll with wax seal — Papers ── */
function ManuscriptScroll() {
  return (
    <>
      {/* Scroll body */}
      <rect {...s} x="8" y="8" width="18" height="18" rx="1.5" />
      {/* Top scroll curl */}
      <path {...s} d="M8 8 C8 5 10 4 12 4 C14 4 14 6 12 6 C10 6 10 8 12 8" opacity=".8" />
      <path {...s} d="M26 8 C26 5 24 4 22 4 C20 4 20 6 22 6 C24 6 24 8 22 8" opacity=".8" />
      {/* Bottom scroll curl */}
      <path {...s} d="M8 26 C8 29 10 30 12 30 C14 30 14 28 12 28 C10 28 10 26 12 26" opacity=".8" />
      <path {...s} d="M26 26 C26 29 24 30 22 30 C20 30 20 28 22 28 C24 28 24 26 22 26" opacity=".8" />
      {/* Text lines */}
      <line {...sf} x1="11" y1="13" x2="21" y2="13" opacity=".6" />
      <line {...sf} x1="11" y1="16" x2="21" y2="16" opacity=".5" />
      <line {...sf} x1="11" y1="19" x2="17" y2="19" opacity=".45" />
      {/* Wax seal */}
      <circle cx="21" cy="21" r="3.5" fill="currentColor" opacity=".2" />
      <circle {...s} cx="21" cy="21" r="3.5" opacity=".8" />
      {/* Seal monogram */}
      <path {...sf} d="M19.5 22 L21 19.5 L22.5 22" opacity=".6" strokeWidth="1" />
      <line {...sf} x1="19.5" y1="21" x2="22.5" y2="21" opacity=".5" strokeWidth=".9" />
    </>
  );
}

/* ─── Ancient key over tome — Archive: records, timelines, memory ── */
function ArchiveKey() {
  return (
    <>
      {/* Book / tome base */}
      <rect {...s} x="5" y="16" width="22" height="11" rx="1.5" />
      <line {...s} x1="9" y1="16" x2="9" y2="27" opacity=".4" strokeWidth="1" />
      {/* Spine */}
      <rect {...s} x="5" y="16" width="4" height="11" opacity=".6" />
      {/* Pages detail */}
      <line {...sf} x1="11" y1="19" x2="25" y2="19" opacity=".35" />
      <line {...sf} x1="11" y1="22" x2="25" y2="22" opacity=".3" />
      {/* Large ornate key */}
      <circle {...s} cx="16" cy="8.5" r="4" />
      <circle cx="16" cy="8.5" r="2" fill="currentColor" opacity=".3" />
      {/* Key shaft */}
      <line {...s} x1="16" y1="12.5" x2="16" y2="18" />
      {/* Key teeth */}
      <line {...s} x1="16" y1="15" x2="18.5" y2="15" />
      <line {...s} x1="16" y1="17" x2="18.5" y2="17" />
      {/* Key decorative bow circles */}
      <circle {...sf} cx="13.5" cy="7" r="1" opacity=".5" />
      <circle {...sf} cx="18.5" cy="7" r="1" opacity=".5" />
    </>
  );
}

/* ─── Ornate ziggurat with rising sun — Civilizational Thought ── */
function ZigguratSun() {
  return (
    <>
      {/* Sun rays above */}
      {[0, 30, 60, 90, 120, 150, 180].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 16 + 4 * Math.cos(rad - Math.PI / 2);
        const y1 = 6 + 4 * Math.sin(rad - Math.PI / 2);
        const x2 = 16 + 7 * Math.cos(rad - Math.PI / 2);
        const y2 = 6 + 7 * Math.sin(rad - Math.PI / 2);
        return <line key={a} {...sf} x1={x1} y1={y1} x2={x2} y2={y2} opacity=".4" />;
      })}
      {/* Sun disc */}
      <circle cx="16" cy="6" r="3" fill="currentColor" opacity=".4" />
      <circle {...s} cx="16" cy="6" r="3" opacity=".7" />
      {/* Ziggurat — 4 tiers */}
      <rect {...s} x="4" y="24" width="24" height="4" rx=".5" />
      <rect {...s} x="6.5" y="20" width="19" height="4" rx=".5" />
      <rect {...s} x="9" y="16" width="14" height="4" rx=".5" />
      <rect {...s} x="12" y="12" width="8" height="4" rx=".5" />
      {/* Steps detail on largest tier */}
      <line {...sf} x1="8" y1="24" x2="8" y2="28" opacity=".35" />
      <line {...sf} x1="12" y1="24" x2="12" y2="28" opacity=".35" />
      <line {...sf} x1="20" y1="24" x2="20" y2="28" opacity=".35" />
      <line {...sf} x1="24" y1="24" x2="24" y2="28" opacity=".35" />
    </>
  );
}

/* ─── Peacock feather — Aesthetics: rasa, beauty, art, form ── */
function PeacockFeather() {
  return (
    <>
      {/* Feather shaft */}
      <path {...s} d="M16 28 C16 22 15.5 15 13 7" strokeWidth="1.8" />
      {/* Quill line */}
      <path {...sf} d="M16 28 C16.5 22 17 15 19 7" opacity=".35" />
      {/* Eye of the feather — main circle */}
      <circle {...s} cx="14" cy="9" r="5.5" />
      {/* Eye — iridescent rings */}
      <circle {...s} cx="14" cy="9" r="3.5" opacity=".6" />
      <circle cx="14" cy="9" r="2" fill="currentColor" opacity=".4" />
      <circle cx="14" cy="9" r="1" fill="currentColor" opacity=".7" />
      {/* Barbs fanning outward */}
      <path {...sf} d="M8.5 7 C10 8 11 9 11 10" opacity=".4" />
      <path {...sf} d="M8 10 C9.5 10 11 10.5 11.5 11.5" opacity=".35" />
      <path {...sf} d="M9 13 C10.5 12.5 12 12.5 12.5 13.5" opacity=".3" />
      <path {...sf} d="M19.5 7 C18 8 17 9 17 10" opacity=".4" />
      <path {...sf} d="M20 10 C18.5 10 17 10.5 16.5 11.5" opacity=".35" />
      <path {...sf} d="M19 13 C17.5 12.5 16 12.5 15.5 13.5" opacity=".3" />
      {/* Upper wisps */}
      <path {...sf} d="M11 5.5 C12 6.5 12.5 7.5 12 8" opacity=".4" />
      <path {...sf} d="M17 5.5 C16 6.5 15.5 7.5 16 8" opacity=".4" />
      <path {...sf} d="M14 4 C14 5.5 14 7 14 8.5" opacity=".5" />
    </>
  );
}

/* ─── OM symbol — Sanskrit Studies: language, shastra, tradition ── */
function OmSymbol() {
  return (
    <>
      {/* Om ॐ drawn as SVG paths — stylised */}
      {/* The "3" / Omkara body */}
      <path {...s}
        d="M10 14 C10 11 12 9 14.5 9 C17 9 18.5 11 18.5 13 C18.5 14.5 17.5 15.5 16.5 16 C18 16.5 20 18 20 20.5 C20 23.5 17.5 25.5 14.5 25.5 C12 25.5 10 24 9.5 22"
        strokeWidth="1.8"
      />
      {/* Middle arm */}
      <path {...s} d="M10.5 16 C13 16 16 16.5 16.5 16" opacity=".8" />
      {/* Virama / curved tail */}
      <path {...s} d="M18 23 C21 22 23 20 23 17 C23 15 22 14 20.5 14" opacity=".7" />
      {/* Chandrabindu — curved hook above */}
      <path {...s} d="M16 7.5 C17.5 7.5 19 6.5 19 5" opacity=".7" strokeWidth="1.4" />
      {/* Bindu — dot */}
      <circle cx="20" cy="5" r="1.8" fill="currentColor" opacity=".7" />
      {/* Decorative lotus petals at base */}
      <path {...sf} d="M6 27 C8 25.5 11 25 14.5 25.5" opacity=".35" />
      <path {...sf} d="M24 27 C22 25.5 19 25 14.5 25.5" opacity=".35" />
      <line {...sf} x1="5" y1="28" x2="27" y2="28" opacity=".4" strokeWidth="1.6" />
    </>
  );
}

/* ─── Dharma wheel — Political Theory: state, sovereignty, order ── */
function DharmaWheel() {
  return (
    <>
      {/* Outer rim */}
      <circle {...s} cx="16" cy="16" r="11" />
      {/* Inner rim */}
      <circle {...s} cx="16" cy="16" r="7.5" opacity=".6" />
      {/* Hub */}
      <circle {...s} cx="16" cy="16" r="2.5" />
      <circle cx="16" cy="16" r="1.3" fill="currentColor" opacity=".55" />
      {/* 8 spokes — Dharma Chakra has 24 but we use 8 for clarity */}
      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 16 + 2.5 * Math.cos(rad);
        const y1 = 16 + 2.5 * Math.sin(rad);
        const x2 = 16 + 11 * Math.cos(rad);
        const y2 = 16 + 11 * Math.sin(rad);
        return <line key={a} {...sf} x1={x1} y1={y1} x2={x2} y2={y2} opacity={a % 45 === 0 ? ".7" : ".35"} />;
      })}
      {/* Outer decorative dots between rim and spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <circle key={a} cx={16 + 9.5 * Math.cos(rad)} cy={16 + 9.5 * Math.sin(rad)} r="1" fill="currentColor" opacity=".4" />
        );
      })}
    </>
  );
}

/* ─── Bridge with twin scripts — Translations: language, meaning, bridge ── */
function TranslationBridge() {
  return (
    <>
      {/* Bridge arch */}
      <path {...s} d="M4 20 Q16 8 28 20" />
      {/* Bridge deck */}
      <line {...s} x1="4" y1="20" x2="28" y2="20" />
      {/* Bridge pillars */}
      <line {...s} x1="9" y1="14" x2="9" y2="20" />
      <line {...s} x1="16" y1="10.5" x2="16" y2="20" />
      <line {...s} x1="23" y1="14" x2="23" y2="20" />
      {/* Left script marks — Latin-style */}
      <line {...sf} x1="5" y1="23" x2="12" y2="23" opacity=".7" strokeWidth="1.5" />
      <line {...sf} x1="5" y1="25.5" x2="11" y2="25.5" opacity=".5" />
      <line {...sf} x1="5" y1="28" x2="9" y2="28" opacity=".4" />
      {/* Right script marks — Devanagari-style */}
      <line {...sf} x1="20" y1="22.5" x2="27" y2="22.5" strokeWidth="1.9" opacity=".7" />
      <line {...sf} x1="21" y1="22.5" x2="21" y2="25" opacity=".6" />
      <line {...sf} x1="24" y1="22.5" x2="24" y2="26" opacity=".6" />
      <line {...sf} x1="20" y1="27" x2="27" y2="27" opacity=".35" />
    </>
  );
}

/* ─── Veena strings — Multimedia: visual stories, audio, lectures ── */
function Veena() {
  return (
    <>
      {/* Resonating gourd body — bottom */}
      <ellipse {...s} cx="10" cy="23" rx="6" ry="5.5" />
      {/* Neck / fingerboard */}
      <path {...s} d="M14.5 19 L20 8" strokeWidth="2" />
      {/* Second gourd — top */}
      <ellipse {...s} cx="22" cy="7" rx="4" ry="3.5" />
      {/* Strings — 4 strings across */}
      <line {...sf} x1="8" y1="20.5" x2="20" y2="8" opacity=".55" />
      <line {...sf} x1="9.5" y1="22" x2="20.5" y2="8.5" opacity=".45" />
      <line {...sf} x1="11" y1="23.5" x2="21.5" y2="9" opacity=".4" />
      <line {...sf} x1="13" y1="24.5" x2="22.5" y2="9.5" opacity=".35" />
      {/* Frets */}
      <line {...sf} x1="15.5" y1="17.5" x2="17" y2="17" opacity=".4" strokeWidth="1.2" />
      <line {...sf} x1="16.5" y1="14.5" x2="18" y2="14" opacity=".4" strokeWidth="1.2" />
      <line {...sf} x1="17.5" y1="11.5" x2="19" y2="11" opacity=".4" strokeWidth="1.2" />
      {/* Tuning pegs */}
      <circle cx="22" cy="5.5" r="1.2" fill="currentColor" opacity=".5" />
      <circle cx="24" cy="7.5" r="1.2" fill="currentColor" opacity=".45" />
      {/* Sound waves emanating */}
      <path {...sf} d="M5 12 C3.5 11 3.5 9 5 8" opacity=".35" />
      <path {...sf} d="M5 13.5 C2.5 12 2.5 7.5 5 6.5" opacity=".2" />
    </>
  );
}

/* ─── Flame with 3 figures — Community: conversation, gathering, inquiry ── */
function GatheringFlame() {
  return (
    <>
      {/* Central flame */}
      <path {...s} d="M16 6 C14 9 13 12 13 15 C13 18 14.5 19.5 16 19.5 C17.5 19.5 19 18 19 15 C19 12 18 9 16 6Z" opacity=".5" />
      <path d="M16 9 C15 11.5 14.5 13.5 14.5 15 C14.5 17 15.3 18 16 18 C16.7 18 17.5 17 17.5 15 C17.5 13.5 17 11.5 16 9Z" fill="currentColor" opacity=".65" />
      {/* Figure left */}
      <circle {...s} cx="8" cy="16" r="2.2" />
      <path {...s} d="M6.5 18.2 C5.5 20 5.5 23 7 25.5" opacity=".7" />
      <path {...s} d="M9.5 18.2 C10 19.5 9.5 22 10 24.5" opacity=".6" />
      {/* Figure right */}
      <circle {...s} cx="24" cy="16" r="2.2" />
      <path {...s} d="M25.5 18.2 C26.5 20 26.5 23 25 25.5" opacity=".7" />
      <path {...s} d="M22.5 18.2 C22 19.5 22.5 22 22 24.5" opacity=".6" />
      {/* Reaching arms toward flame */}
      <path {...sf} d="M10 17 C12 16.5 13.5 17 13 18" opacity=".5" />
      <path {...sf} d="M22 17 C20 16.5 18.5 17 19 18" opacity=".5" />
      {/* Ground */}
      <path {...s} d="M4 27 Q16 29 28 27" opacity=".45" />
    </>
  );
}

/* ─── Hand offering lotus — Submit: contribution, sending work ── */
function OfferingHand() {
  return (
    <>
      {/* Lotus flower above */}
      {/* Outer petals */}
      <path {...s} d="M16 5 C14 7 12 10 13 13 C14 10.5 15 8 16 7 C17 8 18 10.5 19 13 C20 10 18 7 16 5Z" opacity=".7" />
      <path {...s} d="M16 6 C13 6 9 9 9 13 C11 10 13.5 9 16 9" opacity=".55" />
      <path {...s} d="M16 6 C19 6 23 9 23 13 C21 10 18.5 9 16 9" opacity=".55" />
      {/* Lotus centre */}
      <circle {...s} cx="16" cy="13" r="2.5" />
      <circle cx="16" cy="13" r="1.2" fill="currentColor" opacity=".5" />
      {/* Stem */}
      <line {...s} x1="16" y1="15.5" x2="16" y2="19" />
      {/* Offering / cupped hands */}
      <path {...s} d="M8 22 C8 19.5 10 18.5 12 18.5 L16 19 L20 18.5 C22 18.5 24 19.5 24 22" />
      <path {...s} d="M8 22 Q10 24.5 16 25 Q22 24.5 24 22" />
      {/* Fingers */}
      <path {...sf} d="M9 21 C9 20 10 19.5 11 20" opacity=".5" />
      <path {...sf} d="M23 21 C23 20 22 19.5 21 20" opacity=".5" />
      {/* Decorative dots on hands */}
      <circle cx="12" cy="22.5" r=".8" fill="currentColor" opacity=".35" />
      <circle cx="20" cy="22.5" r=".8" fill="currentColor" opacity=".35" />
    </>
  );
}

/* ─── Compass star — Default ── */
function CompassStar() {
  return (
    <>
      <path {...s} d="M16 4 L17.5 13 L26 16 L17.5 19 L16 28 L14.5 19 L6 16 L14.5 13 Z" opacity=".8" />
      <circle cx="16" cy="16" r="3" fill="currentColor" opacity=".35" />
      <circle {...s} cx="16" cy="16" r="3" opacity=".6" />
      {/* Tiny diagonal points */}
      <path {...sf} d="M11.5 11.5 L14 14" opacity=".35" />
      <path {...sf} d="M20.5 11.5 L18 14" opacity=".35" />
      <path {...sf} d="M11.5 20.5 L14 18" opacity=".35" />
      <path {...sf} d="M20.5 20.5 L18 18" opacity=".35" />
    </>
  );
}

function glyphFor(key: DomainKey) {
  switch (key) {
    case "philosophy":          return <Diya />;
    case "history":             return <Hourglass />;
    case "psychology":          return <ThirdEye />;
    case "sociology":           return <Community />;
    case "science":             return <DnaAtom />;
    case "geopolitics":         return <GlobeCompass />;
    case "papers":              return <ManuscriptScroll />;
    case "archive":             return <ArchiveKey />;
    case "civilization":
    case "civilizational-thought": return <ZigguratSun />;
    case "aesthetics":          return <PeacockFeather />;
    case "sanskrit":
    case "sanskrit-studies":    return <OmSymbol />;
    case "political-theory":    return <DharmaWheel />;
    case "translations":        return <TranslationBridge />;
    case "multimedia":          return <Veena />;
    case "community":           return <GatheringFlame />;
    case "submit":              return <OfferingHand />;
    default:                    return <CompassStar />;
  }
}

export function AnimalGlyph({ domain = "archive", size = 32, className, title, style }: AnimalGlyphProps) {
  const key = normalizeDomainKey(domain);
  const labelled = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
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
