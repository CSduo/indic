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
export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const [fade, setFade] = useState(false);
  const [titleIn, setTitleIn] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTitleIn(true), 440);
    const steps = [10, 28, 48, 66, 84, 100];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        setPct(steps[i++]);
        setTimeout(tick, i === steps.length ? 200 : 320 + Math.random() * 250);
      } else {
        setFade(true);
        setTimeout(() => onDone?.(), 650);
      }
    };
    const t2 = setTimeout(tick, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      role="status" aria-live="polite" aria-label="Loading Ānvīkṣikī"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.65s ease",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
      }}
    >

      {/* ══ LAYER 1 — HERO IMAGE, sepia tinted, barely visible ══ */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${asset("/images/provided/home-falcon-city-panorama-hero.jpg")})`,
        backgroundSize: "cover",
        backgroundPosition: "58% 18%",
        filter: "sepia(1) hue-rotate(290deg) brightness(1.6) saturate(0.28)",
        opacity: 0.07,
        animation: "heroZoom 16s ease-in-out infinite",
        transformOrigin: "center center",
      }} />

      {/* ══ LAYER 2 — ATMOSPHERIC COLOUR WASHES ══ */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* Warm parchment base */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(168deg, #f7ede0 0%, var(--bg) 45%, #fdf0f5 100%)",
        }} />
        {/* Saffron bloom — upper-centre */}
        <div style={{
          position: "absolute", top: "4%", left: "50%", transform: "translateX(-50%)",
          width: 720, height: 720, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 60%)",
        }} />
        {/* Amber bloom — lower-left */}
        <div style={{
          position: "absolute", bottom: "0%", left: "16%",
          width: 520, height: 520, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,160,80,0.10) 0%, transparent 65%)",
        }} />
        {/* Deep orange bloom — lower-right */}
        <div style={{
          position: "absolute", bottom: "8%", right: "12%",
          width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)",
        }} />
        {/* Warm gold bloom — upper-right */}
        <div style={{
          position: "absolute", top: "3%", right: "10%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,140,60,0.06) 0%, transparent 68%)",
        }} />

        {/* Manuscript specks — pink/gold dust */}
        {Array.from({ length: 38 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${6 + (i * 43) % 88}%`,
            top: `${6 + (i * 61) % 86}%`,
            width: i % 9 === 0 ? 3 : i % 4 === 0 ? 2 : 1.3,
            height: i % 9 === 0 ? 3 : i % 4 === 0 ? 2 : 1.3,
            borderRadius: "50%",
            background: i % 4 === 0 ? "#f97316" : i % 6 === 0 ? "#c9983a" : "#ff9f43",
            opacity: 0.04 + (i % 7) * 0.04,
            animation: `shimmer ${2.1 + (i % 5) * 0.65}s ease-in-out infinite`,
            animationDelay: `${(i * 0.27) % 2.4}s`,
          }} />
        ))}
      </div>

      {/* ══ LAYER 3 — FALLING SAKURA PETALS ══ */}
      {SAKURA_PETALS.map((p, i) => (
        <div key={i} aria-hidden="true" style={{
          position: "absolute",
          top: "-4%",
          left: p.left,
          opacity: 0,
          animation: `sakuraFall ${p.dur} ${p.delay} linear infinite`,
          ["--petal-drift" as string]: p.drift,
          ["--petal-spin"  as string]: p.spin,
          zIndex: i % 4 === 0 ? 3 : 1,
        }}>
          <SakuraPetal size={p.size} color={p.color} opacity={p.opacity} />
        </div>
      ))}

      {/* ══ LAYER 4 — CORNER ORNAMENTS ══ */}
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <div key={corner} aria-hidden="true" style={{
          position: "absolute",
          ...(corner.includes("t") ? { top: 10 } : { bottom: 10 }),
          ...(corner.includes("l") ? { left: 10 } : { right: 10 }),
          zIndex: 2,
        }}>
          <CornerOrnament corner={corner} />
        </div>
      ))}

      {/* ══ CENTRAL COMPOSITION (z=4) ══ */}
      <div style={{
        position: "relative", zIndex: 4,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>

        {/* Lotus glow aura — saffron */}
        <div aria-hidden="true" style={{
          position: "absolute",
          top: "15%", left: "50%", transform: "translateX(-50%)",
          width: 220, height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 68%)",
          filter: "blur(20px)",
          animation: "lanternGlow 4s ease-in-out infinite",
        }} />

        {/* ── RING SYSTEM ── */}
        <div style={{ position: "relative", width: 280, height: 280, flexShrink: 0 }}>

          {/* Outer slow-spin ring */}
          <svg width="280" height="280" viewBox="0 0 280 280"
            className="animate-spin-slow"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <circle cx="140" cy="140" r="134" stroke="#ffaa52" strokeWidth="0.55" fill="none" opacity="0.18" strokeDasharray="4 18" />
            {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => (
              <circle key={i}
                cx={140 + 134 * Math.cos((a * Math.PI) / 180)}
                cy={140 + 134 * Math.sin((a * Math.PI) / 180)}
                r={i % 3 === 0 ? 3 : 1.8}
                fill={i % 4 === 0 ? "#e87c30" : "#c9983a"}
                opacity={0.22 + (i % 4) * 0.08}
              />
            ))}
          </svg>

          {/* Counter-rotating middle ring */}
          <svg width="280" height="280" viewBox="0 0 280 280"
            style={{ position: "absolute", inset: 0, animation: "rotateSlow 26s linear infinite reverse", pointerEvents: "none" }}>
            <circle cx="140" cy="140" r="108" stroke="#e88fa8" strokeWidth="0.5" fill="none" opacity="0.2" strokeDasharray="2 12" />
            {[0,45,90,135,180,225,270,315].map((a, i) => (
              <path key={i}
                d={`M ${140 + 100 * Math.cos((a * Math.PI) / 180)} ${140 + 100 * Math.sin((a * Math.PI) / 180)} L ${140 + 116 * Math.cos((a * Math.PI) / 180)} ${140 + 116 * Math.sin((a * Math.PI) / 180)}`}
                stroke="#f5a8be" strokeWidth="0.8" opacity="0.32"
              />
            ))}
          </svg>

          {/* Inner static mandala ring */}
          <svg width="280" height="280" viewBox="0 0 280 280"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <circle cx="140" cy="140" r="82" stroke="#e88fa8" strokeWidth="0.4" fill="none" opacity="0.2" />
            {[0,60,120,180,240,300].map((a, i) => (
              <line key={i}
                x1={140 + 72 * Math.cos((a * Math.PI) / 180)}
                y1={140 + 72 * Math.sin((a * Math.PI) / 180)}
                x2={140 + 82 * Math.cos((a * Math.PI) / 180)}
                y2={140 + 82 * Math.sin((a * Math.PI) / 180)}
                stroke="#d4688a" strokeWidth="0.9" opacity="0.3"
              />
            ))}
            {[0,90,180,270].map((a, i) => {
              const x = 140 + 82 * Math.cos((a * Math.PI) / 180);
              const y = 140 + 82 * Math.sin((a * Math.PI) / 180);
              return <circle key={i} cx={x} cy={y} r="2.5" fill="#d4688a" opacity="0.42" />;
            })}
          </svg>

          {/* Lotus — centred in rings */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div className="animate-glow">
              <LotusFlower size={220} />
            </div>
          </div>
        </div>

        {/* Lantern beneath lotus */}
        <div aria-hidden="true" style={{ marginTop: -10, marginBottom: 12, opacity: 0.68 }}>
          <Lantern />
        </div>

        {/* ── ORNAMENTAL RULE ── */}
        <div aria-hidden="true" style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          marginBottom: "1.1rem", opacity: 0.5,
        }}>
          <div style={{ width: 48, height: 1, background: "linear-gradient(to right, transparent, #d4688a)" }} />
          <span style={{ color: "#e88fa8", fontSize: "0.48rem", letterSpacing: "0.4em" }}>✦ ✦ ✦</span>
          <div style={{ width: 48, height: 1, background: "linear-gradient(to left, transparent, #d4688a)" }} />
        </div>

        {/* ── SINGLE TITLE ── */}
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)",
            letterSpacing: "0.32em",
            color: "var(--gold-bright)",
            marginBottom: "0.55rem",
            lineHeight: 1,
            textShadow: "0 0 32px rgba(220,100,150,0.22), 0 1px 0 rgba(0,0,0,0.06)",
            animation: titleIn ? "inscribe 0.9s ease both" : "none",
            opacity: titleIn ? undefined : 0,
          }}
        >
          ĀNVĪKṢIKĪ
        </h1>

        {/* Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.4rem" }}>
          <span style={{ width: 22, height: 1, background: "#ff9f43", opacity: 0.45, flexShrink: 0 }} />
          <span className="font-ui" style={{ fontSize: "0.54rem", letterSpacing: "0.42em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
            Journal &amp; Research Platform
          </span>
          <span style={{ width: 22, height: 1, background: "#ff9f43", opacity: 0.45, flexShrink: 0 }} />
        </div>

        {/* Tagline */}
        <p className="font-body" style={{
          fontSize: "0.72rem", color: "var(--ink-faint)", fontStyle: "italic",
          letterSpacing: "0.06em", marginBottom: "1.6rem", opacity: 0.62,
        }}>
          Where Inquiry Becomes Insight
        </p>

        {/* ── PROGRESS BAR ── */}
        <div style={{ width: 220 }}>
          <div style={{
            height: 2, background: "rgba(249,115,22,0.12)",
            borderRadius: 2, overflow: "hidden", marginBottom: 9,
          }}>
            <div style={{
              height: "100%",
              background: "linear-gradient(90deg, #e87c30, #ffaa52, #c9983a)",
              width: `${pct}%`,
              transition: "width 0.52s ease",
              boxShadow: "0 0 14px rgba(232,124,48,0.55), 0 0 4px rgba(255,170,82,0.8)",
              borderRadius: 2,
            }} />
          </div>
          <p className="font-ui" style={{
            fontSize: "0.5rem", letterSpacing: "0.28em",
            textTransform: "uppercase", textAlign: "center", color: "var(--ink-faint)",
          }}>
            {pct < 100 ? "Opening the archive…" : "Welcome"}
          </p>
        </div>

      </div>{/* /central */}

      {/* ══ FLOATING PETAL ORNAMENTS (large, slow sway) ══ */}
      {[
        { left: "5%",  top: "15%", delay: "0s",    dur: "6s",   big: false },
        { left: "92%", top: "18%", delay: "1.6s",  dur: "7.5s", big: true  },
        { left: "10%", top: "84%", delay: "3.0s",  dur: "5.2s", big: false },
        { left: "88%", top: "78%", delay: "1.0s",  dur: "6.2s", big: true  },
        { left: "2%",  top: "50%", delay: "4.2s",  dur: "7.0s", big: false },
        { left: "96%", top: "52%", delay: "2.4s",  dur: "5.8s", big: true  },
      ].map((p, i) => (
        <div key={i} aria-hidden="true" style={{
          position: "absolute", left: p.left, top: p.top, zIndex: 5,
          animation: `float ${p.dur} ${p.delay} ease-in-out infinite`,
        }}>
          <SakuraPetal
            size={p.big ? 12 : 7}
            color={["#ff9f43", "#ffc87a", "#f97316"][i % 3]}
            opacity={0.4}
          />
        </div>
      ))}

    </div>
  );
}
