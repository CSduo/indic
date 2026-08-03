import { useEffect, useState } from "react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

/* ─────────────────────────────────────────────────────────────────────────────
   LOTUS FLOWER  —  top-down, three rings of petals, central seed pod
   Inspired by the sacred lotus motif in Indian philosophical tradition
───────────────────────────────────────────────────────────────────────────── */
function LotusFlower({ size = 200 }: { size?: number }) {
  const cx = 100, cy = 100;

  // Petal shape: an elongated teardrop pointing outward from (cx,cy)
  // Each petal path written for "pointing north" (up), rotated by SVG transform
  const outerPetal = (angle: number, i: number) => (
    <g key={`op${i}`} transform={`rotate(${angle},${cx},${cy})`}>
      {/* Petal fill */}
      <path
        d={`M ${cx},${cy} C ${cx-15},${cy-22} ${cx-12},${cy-52} ${cx},${cy-62} C ${cx+12},${cy-52} ${cx+15},${cy-22} ${cx},${cy}`}
        fill="url(#outerGrad)" opacity="0.82"
      />
      {/* Petal centre vein */}
      <line x1={cx} y1={cy-2} x2={cx} y2={cy-56} stroke="#e88fa8" strokeWidth="0.5" opacity="0.45" />
      {/* Side veins */}
      <path d={`M ${cx},${cy-18} C ${cx-8},${cy-32} ${cx-6},${cy-44} ${cx-4},${cy-50}`} fill="none" stroke="#e88fa8" strokeWidth="0.35" opacity="0.3" />
      <path d={`M ${cx},${cy-18} C ${cx+8},${cy-32} ${cx+6},${cy-44} ${cx+4},${cy-50}`} fill="none" stroke="#e88fa8" strokeWidth="0.35" opacity="0.3" />
    </g>
  );

  const middlePetal = (angle: number, i: number) => (
    <g key={`mp${i}`} transform={`rotate(${angle},${cx},${cy})`}>
      <path
        d={`M ${cx},${cy} C ${cx-12},${cy-16} ${cx-10},${cy-38} ${cx},${cy-46} C ${cx+10},${cy-38} ${cx+12},${cy-16} ${cx},${cy}`}
        fill="url(#middleGrad)" opacity="0.9"
      />
      <line x1={cx} y1={cy-2} x2={cx} y2={cy-40} stroke="#d4688a" strokeWidth="0.5" opacity="0.4" />
    </g>
  );

  const innerPetal = (angle: number, i: number) => (
    <g key={`ip${i}`} transform={`rotate(${angle},${cx},${cy})`}>
      <path
        d={`M ${cx},${cy} C ${cx-9},${cy-12} ${cx-7},${cy-26} ${cx},${cy-32} C ${cx+7},${cy-26} ${cx+9},${cy-12} ${cx},${cy}`}
        fill="url(#innerGrad)" opacity="0.92"
      />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <defs>
        {/* Outer petal: pale blush at base → medium pink at tip */}
        <radialGradient id="outerGrad" cx="50%" cy="95%" r="85%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fce8f0" />
          <stop offset="55%" stopColor="#f7b8cc" />
          <stop offset="100%" stopColor="#e8789a" />
        </radialGradient>
        {/* Middle petal: soft pink → rose */}
        <radialGradient id="middleGrad" cx="50%" cy="95%" r="85%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fbd0e0" />
          <stop offset="55%" stopColor="#f09ab8" />
          <stop offset="100%" stopColor="#d45882" />
        </radialGradient>
        {/* Inner petal: blush-white → deep rose */}
        <radialGradient id="innerGrad" cx="50%" cy="95%" r="85%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fff0f5" />
          <stop offset="50%" stopColor="#f5a0bc" />
          <stop offset="100%" stopColor="#c04872" />
        </radialGradient>
        {/* Seed pod */}
        <radialGradient id="podGrad" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffe8b4" />
          <stop offset="70%" stopColor="#c9983a" />
          <stop offset="100%" stopColor="#8b6020" />
        </radialGradient>
      </defs>

      {/* Water ripple rings beneath */}
      <circle cx={cx} cy={cy} r="88" stroke="#e8a0b8" strokeWidth="0.4" fill="none" opacity="0.18" />
      <circle cx={cx} cy={cy} r="74" stroke="#e8a0b8" strokeWidth="0.3" fill="none" opacity="0.14" />

      {/* ── Outer petals — 8, 45° apart ── */}
      {[0,45,90,135,180,225,270,315].map((a, i) => outerPetal(a, i))}

      {/* ── Middle petals — 8, offset 22.5° ── */}
      {[22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5].map((a, i) => middlePetal(a, i))}

      {/* ── Inner petals — 6, 60° apart ── */}
      {[0,60,120,180,240,300].map((a, i) => innerPetal(a, i))}

      {/* ── Central seed pod ── */}
      <circle cx={cx} cy={cy} r="17" fill="url(#podGrad)" stroke="#b87820" strokeWidth="0.8" opacity="0.95" />
      {/* Seed cells */}
      {[0,45,90,135,180,225,270,315].map((a, i) => (
        <circle key={i}
          cx={cx + 9 * Math.cos((a * Math.PI) / 180)}
          cy={cy + 9 * Math.sin((a * Math.PI) / 180)}
          r="2.2" fill="#6b4010" opacity="0.5"
        />
      ))}
      <circle cx={cx} cy={cy} r="3.5" fill="#4a2c08" opacity="0.55" />

      {/* ── Petal sheen highlights ── */}
      {[0,90,180,270].map((a, i) => (
        <path key={i}
          transform={`rotate(${a},${cx},${cy})`}
          d={`M ${cx-3},${cy-30} C ${cx-1},${cy-42} ${cx-1},${cy-50} ${cx},${cy-55}`}
          stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FALLING SAKURA PETAL  —  single petal SVG shape, used for many instances
───────────────────────────────────────────────────────────────────────────── */
function SakuraPetal({ size = 14, color = "#ffaa52", opacity = 0.8 }: { size?: number; color?: string; opacity?: number }) {
  // Single cherry blossom petal — rounded oblong, slightly notched tip
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 14 22" aria-hidden="true" style={{ display: "block" }}>
      <path
        d="M 7,22 C 1,18 0,12 0,8 C 0,2 3,0 7,0 C 11,0 14,2 14,8 C 14,12 13,18 7,22 Z"
        fill={color} opacity={opacity}
      />
      {/* Central vein */}
      <line x1="7" y1="2" x2="7" y2="19" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CORNER ORNAMENT  —  manuscript filigree, all four corners
───────────────────────────────────────────────────────────────────────────── */
function CornerOrnament({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const flip = {
    tl: "",
    tr: "scale(-1,1) translate(-80,0)",
    bl: "scale(1,-1) translate(0,-80)",
    br: "scale(-1,-1) translate(-80,-80)",
  }[corner];

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true" style={{ display: "block" }}>
      <g transform={flip} fill="none" stroke="#d4688a" opacity="0.28">
        <path d="M 4,4 L 36,4 C 38,4 40,6 40,8 L 40,40" strokeWidth="0.55" opacity="0.35" />
        <path d="M 4,4 L 4,28" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M 4,4 L 28,4" strokeWidth="1.1" strokeLinecap="round" />
        {/* Lotus curl — vertical */}
        <path d="M 4,28 C 4,36 8,40 14,40 C 18,40 22,36 20,32 C 18,28 14,28 14,32" strokeWidth="0.8" opacity="0.65" />
        {/* Lotus curl — horizontal */}
        <path d="M 28,4 C 36,4 40,8 40,14 C 40,18 36,22 32,20 C 28,18 28,14 32,14" strokeWidth="0.8" opacity="0.65" />
        {/* Inner line */}
        <path d="M 8,8 L 22,8 C 24,8 26,10 26,12 L 26,22" strokeWidth="0.4" opacity="0.3" />
        {/* Blossom dots */}
        <circle cx="4" cy="4" r="2.4" fill="#e88fa8" opacity="0.45" />
        <circle cx="16" cy="4" r="1.1" fill="#e88fa8" opacity="0.28" />
        <circle cx="4" cy="16" r="1.1" fill="#e88fa8" opacity="0.28" />
        {/* Sakura petal micro-cluster */}
        {[[13,13],[19,9],[9,19],[20,17],[17,20]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="0.9" fill="#d4688a" opacity={0.18 + i*0.04} />
        ))}
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LANTERN  —  Mughal ornate lantern with flickering inner glow
───────────────────────────────────────────────────────────────────────────── */
function Lantern() {
  return (
    <svg width="34" height="50" viewBox="0 0 34 50" aria-hidden="true" style={{ display: "block" }}>
      <g fill="none" stroke="#d4688a" strokeWidth="0.85" opacity="0.5">
        <line x1="17" y1="0" x2="17" y2="6" strokeWidth="0.65" />
        <path d="M 11,6 C 11,3 23,3 23,6 L 25,10 L 9,10 Z" />
        <path d="M 9,10 L 7,36 C 7,40 12,44 17,44 C 22,44 27,40 27,36 L 25,10 Z" />
        <path d="M 12,12 C 12,8 22,8 22,12" strokeWidth="0.55" opacity="0.5" />
        <path d="M 11,21 C 11,16 23,16 23,21" strokeWidth="0.45" opacity="0.4" />
        <path d="M 10,30 C 10,25 24,25 24,30" strokeWidth="0.45" opacity="0.35" />
        <path d="M 13,44 C 13,48 21,48 21,44" strokeWidth="0.65" />
        <line x1="17" y1="48" x2="17" y2="50" strokeWidth="0.55" />
        <circle cx="17" cy="50" r="1.4" fill="#d4688a" opacity="0.38" />
      </g>
      {/* Inner rose-gold flame */}
      <ellipse cx="17" cy="27" rx="4.5" ry="7" fill="#f5a0c0" opacity="0.22"
        style={{ animation: "lanternGlow 2.8s ease-in-out infinite" }} />
      <ellipse cx="17" cy="27" rx="2" ry="3.5" fill="#ffd4e8" opacity="0.3"
        style={{ animation: "lanternGlow 1.9s ease-in-out infinite reverse" }} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SAKURA PETAL CONFIG  —  falling petals data
───────────────────────────────────────────────────────────────────────────── */
const SAKURA_PETALS = Array.from({ length: 32 }, (_, i) => ({
  left: `${3 + (i * 37) % 94}%`,
  size: 8 + (i % 5) * 3,
  color: ["#ffc87a", "#ff9f43", "#ffd59d", "#ff8c42", "#ffebd0", "#f97316"][i % 6],
  opacity: 0.55 + (i % 4) * 0.1,
  delay: `${(i * 0.42) % 5.8}s`,
  dur: `${5.2 + (i % 7) * 0.88}s`,
  drift: `${((i % 9) - 4) * 28}px`,
  spin: `${((i % 3) === 0 ? -1 : 1) * (200 + (i % 5) * 60)}deg`,
}));

/* ─────────────────────────────────────────────────────────────────────────────
   LOADING SCREEN
───────────────────────────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";

const WISDOM_QUOTES = [
  { text: "Satyam Eva Jayate", sub: "Truth alone triumphs" },
  { text: "Ātmānaṃ Viddhi", sub: "Know Thyself" },
  { text: "Charaivetī Charaivetī", sub: "Keep moving forward, always" },
  { text: "Tamaso Mā Jyotirgamaya", sub: "Lead me from darkness into light" },
];

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const [fade, setFade] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * WISDOM_QUOTES.length));
    const steps = [15, 35, 60, 82, 100];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        setPct(steps[i++]);
        setTimeout(tick, i === steps.length ? 150 : 250 + Math.random() * 150);
      } else {
        setFade(true);
        setTimeout(() => onDone?.(), 550);
      }
    };
    const timer = setTimeout(tick, 200);
    return () => clearTimeout(timer);
  }, [onDone]);

  const currentQuote = WISDOM_QUOTES[quoteIdx];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ĀnvīkṢikī"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        color: "#FFFFFF",
        transition: "opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
        padding: "2rem",
      }}
    >
      {/* Subtle ambient bloom */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200, 74, 16, 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: "420px", width: "100%" }}>
        {/* Brand Name */}
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            letterSpacing: "0.35em",
            color: "#FFFFFF",
            marginBottom: "0.4rem",
            fontWeight: 400,
            textTransform: "uppercase",
          }}
        >
          ĀNVĪKṢIKĪ
        </h1>

        {/* Subtitle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <span style={{ width: 20, height: 1, background: "#C84A10", opacity: 0.8 }} />
          <span
            className="font-ui"
            style={{
              fontSize: "0.62rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#A3A3A3",
              fontWeight: 600,
            }}
          >
            Journal &amp; Research Platform
          </span>
          <span style={{ width: 20, height: 1, background: "#C84A10", opacity: 0.8 }} />
        </div>

        {/* Glowing Progress Bar */}
        <div style={{ width: "100%", maxWidth: "240px", margin: "0 auto 1.5rem" }}>
          <div
            style={{
              height: "2px",
              background: "#1F1F1F",
              borderRadius: "4px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #C84A10, #E06020)",
                width: `${pct}%`,
                transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 0 12px rgba(200, 74, 16, 0.8)",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>

        {/* Quote & Progress text */}
        <p
          className="font-body"
          style={{
            fontSize: "0.82rem",
            color: "#D4D4D4",
            fontStyle: "italic",
            marginBottom: "0.25rem",
          }}
        >
          "{currentQuote.sub}"
        </p>
        <p
          className="font-ui"
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#737373",
          }}
        >
          {currentQuote.text} · {pct}%
        </p>
      </div>
    </div>
  );
}

