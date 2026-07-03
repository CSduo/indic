import type { DomainKey } from "@/lib/domainMeta";
import { normalizeDomainKey } from "@/lib/domainMeta";

type AnimalGlyphProps = {
  domain?: DomainKey | string | null;
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
};

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ─── Premium abstract domain marks ─── */

/** Lotus flower — Philosophy */
function Lotus() {
  return (
    <>
      <path {...strokeProps} d="M16 26c-2-4-1-10 0-14 1 4 2 10 0 14" />
      <path {...strokeProps} d="M16 12c-3 2-6 7-5 14 3-3 4-8 5-14" opacity=".75" />
      <path {...strokeProps} d="M16 12c3 2 6 7 5 14-3-3-4-8-5-14" opacity=".75" />
      <path {...strokeProps} d="M16 10c-5 1-9 6-9 12 3-2 6-6 9-12" opacity=".5" />
      <path {...strokeProps} d="M16 10c5 1 9 6 9 12-3-2-6-6-9-12" opacity=".5" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" opacity=".4" />
    </>
  );
}

/** Arch/Column — History */
function Arch() {
  return (
    <>
      <path {...strokeProps} d="M8 28V12a8 8 0 0 1 16 0v16" />
      <path {...strokeProps} d="M11 28V14a5 5 0 0 1 10 0v14" opacity=".6" />
      <line {...strokeProps} x1="6" y1="28" x2="26" y2="28" />
      <line {...strokeProps} x1="8" y1="8" x2="24" y2="8" opacity=".4" />
      <circle cx="16" cy="6" r="1.2" fill="currentColor" opacity=".45" />
    </>
  );
}

/** Spiral eye — Psychology */
function Spiral() {
  return (
    <>
      <circle {...strokeProps} cx="16" cy="16" r="10" opacity=".35" />
      <path {...strokeProps} d="M16 10c3.3 0 6 2.7 6 6s-2.7 6-6 6-5-2.2-5-5 1.8-4 4-4 3 1.3 3 3-1 2-2 2" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity=".55" />
    </>
  );
}

/** Network nodes — Sociology */
function Network() {
  return (
    <>
      <circle {...strokeProps} cx="16" cy="8" r="3" />
      <circle {...strokeProps} cx="8" cy="22" r="3" />
      <circle {...strokeProps} cx="24" cy="22" r="3" />
      <circle {...strokeProps} cx="16" cy="20" r="2.5" opacity=".6" />
      <line {...strokeProps} x1="16" y1="11" x2="16" y2="17.5" />
      <line {...strokeProps} x1="14" y1="19" x2="10.5" y2="20.5" opacity=".6" />
      <line {...strokeProps} x1="18" y1="19" x2="21.5" y2="20.5" opacity=".6" />
      <line {...strokeProps} x1="10" y1="20" x2="22" y2="20" opacity=".35" />
    </>
  );
}

/** Atom — Science */
function Atom() {
  return (
    <>
      <ellipse {...strokeProps} cx="16" cy="16" rx="10" ry="4" />
      <ellipse {...strokeProps} cx="16" cy="16" rx="10" ry="4" transform="rotate(60 16 16)" />
      <ellipse {...strokeProps} cx="16" cy="16" rx="10" ry="4" transform="rotate(120 16 16)" />
      <circle cx="16" cy="16" r="2" fill="currentColor" opacity=".5" />
    </>
  );
}

/** Globe — Geopolitics */
function Globe() {
  return (
    <>
      <circle {...strokeProps} cx="16" cy="16" r="10" />
      <ellipse {...strokeProps} cx="16" cy="16" rx="5" ry="10" />
      <line {...strokeProps} x1="6" y1="12" x2="26" y2="12" opacity=".5" />
      <line {...strokeProps} x1="6" y1="20" x2="26" y2="20" opacity=".5" />
      <line {...strokeProps} x1="16" y1="6" x2="16" y2="26" opacity=".35" />
    </>
  );
}

/** Scroll — Papers */
function Scroll() {
  return (
    <>
      <path {...strokeProps} d="M10 6c-2 0-3 1.5-3 3v16c0 1.5 1 3 3 3h12c2 0 3-1.5 3-3" />
      <path {...strokeProps} d="M10 6h12c2 0 3 1.5 3 3 0 1.5-1 3-3 3H10c-2 0-3-1.5-3-3s1-3 3-3z" />
      <line {...strokeProps} x1="11" y1="16" x2="21" y2="16" opacity=".5" />
      <line {...strokeProps} x1="11" y1="19.5" x2="19" y2="19.5" opacity=".4" />
      <line {...strokeProps} x1="11" y1="23" x2="17" y2="23" opacity=".35" />
    </>
  );
}

/** Book/chest — Archive */
function BookChest() {
  return (
    <>
      <rect {...strokeProps} x="6" y="8" width="20" height="18" rx="2" />
      <line {...strokeProps} x1="6" y1="14" x2="26" y2="14" />
      <line {...strokeProps} x1="14" y1="14" x2="14" y2="26" opacity=".4" />
      <rect {...strokeProps} x="9" y="10" width="3" height="4" rx=".5" opacity=".5" />
      <rect {...strokeProps} x="13" y="9" width="3.5" height="5" rx=".5" opacity=".6" />
      <circle cx="22" cy="20" r="1.2" fill="currentColor" opacity=".35" />
    </>
  );
}

/** Ziggurat — Civilizational Thought (stepped monument) */
function Ziggurat() {
  return (
    <>
      <line {...strokeProps} x1="4" y1="28" x2="28" y2="28" />
      <rect {...strokeProps} x="5" y="23" width="22" height="5" rx="0.5" />
      <rect {...strokeProps} x="8" y="18" width="16" height="5" rx="0.5" />
      <rect {...strokeProps} x="11" y="14" width="10" height="4" rx="0.5" />
      <rect {...strokeProps} x="13" y="11" width="6" height="3" rx="0.5" />
      <line {...strokeProps} x1="16" y1="8" x2="16" y2="11" opacity=".7" />
      <circle cx="16" cy="7" r="1.5" fill="currentColor" opacity=".5" />
    </>
  );
}

/** Rasa — Aesthetics (mandala eye — art, beauty, symbol, form) */
function Rasa() {
  return (
    <>
      <circle {...strokeProps} cx="16" cy="16" r="9" opacity=".28" />
      <path {...strokeProps} d="M7 16 C9 11 13 8 16 8 C19 8 23 11 25 16 C23 21 19 24 16 24 C13 24 9 21 7 16 Z" />
      <path {...strokeProps} d="M11 16 C12 14 14 12 16 12 C18 12 20 14 21 16 C20 18 18 20 16 20 C14 20 12 18 11 16 Z" opacity=".7" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" opacity=".5" />
      <line {...strokeProps} x1="16" y1="5" x2="16" y2="8" opacity=".45" />
      <line {...strokeProps} x1="16" y1="24" x2="16" y2="27" opacity=".35" />
      <line {...strokeProps} x1="5" y1="16" x2="7" y2="16" opacity=".3" />
      <line {...strokeProps} x1="25" y1="16" x2="27" y2="16" opacity=".3" />
    </>
  );
}

/** Shirorekha — Sanskrit Studies (Devanagari horizontal bar + stems) */
function Shirorekha() {
  return (
    <>
      {/* Shirorekha — the defining top-bar of Devanagari script */}
      <line {...strokeProps} x1="6" y1="10" x2="26" y2="10" strokeWidth="2.2" />
      {/* Left stem with arm */}
      <line {...strokeProps} x1="9" y1="10" x2="9" y2="22" />
      <path {...strokeProps} d="M9 15 C11 15 13 14.5 14 13" opacity=".75" />
      {/* Central stem with curved base */}
      <line {...strokeProps} x1="16" y1="10" x2="16" y2="20" />
      <path {...strokeProps} d="M13 20 C14 22 18 23 20 21 L20 19" opacity=".65" />
      {/* Right stem */}
      <line {...strokeProps} x1="23" y1="10" x2="23" y2="22" />
      <path {...strokeProps} d="M23 17 C21 17 19 17 18 18" opacity=".5" />
      {/* Anusvar dot */}
      <circle cx="24.5" cy="7.5" r="1.5" fill="currentColor" opacity=".5" />
    </>
  );
}

/** Temple — Civilization */
function Temple() {
  return (
    <>
      <path {...strokeProps} d="M16 4l-12 8h24z" />
      <line {...strokeProps} x1="8" y1="12" x2="8" y2="26" />
      <line {...strokeProps} x1="13" y1="12" x2="13" y2="26" />
      <line {...strokeProps} x1="19" y1="12" x2="19" y2="26" />
      <line {...strokeProps} x1="24" y1="12" x2="24" y2="26" />
      <line {...strokeProps} x1="5" y1="26" x2="27" y2="26" />
      <line {...strokeProps} x1="6" y1="12" x2="26" y2="12" />
      <circle cx="16" cy="8" r="1" fill="currentColor" opacity=".4" />
    </>
  );
}

/** Shield/seal — Political Theory */
function Shield() {
  return (
    <>
      <path {...strokeProps} d="M16 4l-9 4v8c0 6 4 10 9 12 5-2 9-6 9-12V8z" />
      <path {...strokeProps} d="M16 10v10M12 15h8" opacity=".5" />
      <circle cx="16" cy="11" r="1.2" fill="currentColor" opacity=".35" />
    </>
  );
}

/** Two quills — Translations */
function TwoQuills() {
  return (
    <>
      <path {...strokeProps} d="M8 26c1-8 3-14 8-18" />
      <path {...strokeProps} d="M16 8c-1 2-3 4-6 5" opacity=".6" />
      <path {...strokeProps} d="M24 26c-1-8-3-14-8-18" />
      <path {...strokeProps} d="M16 8c1 2 3 4 6 5" opacity=".6" />
      <circle cx="16" cy="6" r="1.3" fill="currentColor" opacity=".45" />
      <line {...strokeProps} x1="12" y1="28" x2="20" y2="28" opacity=".4" />
    </>
  );
}

/** Lyre/harp — Multimedia */
function Lyre() {
  return (
    <>
      <path {...strokeProps} d="M10 24V10c0-3 3-5 6-5s6 2 6 5v14" />
      <path {...strokeProps} d="M10 10c3 3 9 3 12 0" opacity=".6" />
      <line {...strokeProps} x1="13" y1="12" x2="13" y2="24" opacity=".35" />
      <line {...strokeProps} x1="16" y1="11" x2="16" y2="24" opacity=".4" />
      <line {...strokeProps} x1="19" y1="12" x2="19" y2="24" opacity=".35" />
      <line {...strokeProps} x1="8" y1="24" x2="24" y2="24" />
    </>
  );
}

/** Compass star — Default */
function CompassStar() {
  return (
    <>
      <path {...strokeProps} d="M16 4l2 10 10 2-10 2-2 10-2-10-10-2 10-2z" />
      <circle cx="16" cy="16" r="2" fill="currentColor" opacity=".35" />
    </>
  );
}

function glyphFor(key: DomainKey) {
  switch (key) {
    case "philosophy": return <Lotus />;
    case "history": return <Arch />;
    case "psychology": return <Spiral />;
    case "sociology": return <Network />;
    case "science": return <Atom />;
    case "geopolitics": return <Globe />;
    case "papers": return <Scroll />;
    case "archive": return <BookChest />;
    case "civilization":
    case "civilizational-thought":
      return <Ziggurat />;
    case "aesthetics":
      return <Rasa />;
    case "sanskrit":
    case "sanskrit-studies":
      return <Shirorekha />;
    /* Temple kept for internal use but not exposed via DomainKey */
    case "political-theory": return <Shield />;
    case "translations": return <TwoQuills />;
    case "multimedia": return <Lyre />;
    case "community": return <Network />;
    case "submit": return <Scroll />;
    default: return <CompassStar />;
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
