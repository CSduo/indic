import { useEffect, useState } from "react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

/* ─────────────────────────────────────────────────────────────────────────────
   FALCON  —  drawn from the hero illustration motif
   Wings fully spread, detailed primary feathers, proud head, Mughal jesses
───────────────────────────────────────────────────────────────────────────── */
function Falcon({ size = 220 }: { size?: number }) {
  const sp = { fill: "none", stroke: "currentColor" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>

      {/* ── Wing surfaces (translucent warm fill) ── */}
      <path
        d="M 88,112 C 65,96 40,74 8,52 C 22,67 42,82 62,94 C 75,100 87,110 88,112 Z"
        fill="var(--gold-pale)" fillOpacity="0.22" stroke="none"
      />
      <path
        d="M 132,112 C 155,96 180,74 212,52 C 198,67 178,82 158,94 C 145,100 133,110 132,112 Z"
        fill="var(--gold-pale)" fillOpacity="0.22" stroke="none"
      />

      {/* ── Left wing – leading edge ── */}
      <path d="M 88,106 C 65,90 40,68 8,52" {...sp} stroke="var(--gold)" strokeWidth="1.25" opacity="0.85" />

      {/* ── Left wing – trailing edge ── */}
      <path d="M 88,116 C 72,108 54,98 40,88 C 26,78 14,66 8,60" {...sp} stroke="var(--gold-soft)" strokeWidth="0.9" opacity="0.6" />

      {/* ── Left wing – primary feathers (7) ── */}
      {[
        [8,52,  16,72], [18,49, 28,68], [30,47, 42,65],
        [43,46, 55,62], [56,47, 66,62], [67,49, 76,63], [76,53, 83,65],
      ].map(([x1,y1,x2,y2], i) => (
        <line key={`lp${i}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sp}
          stroke="var(--gold)" strokeWidth={1.05 - i * 0.04} opacity={0.62 + i * 0.03} />
      ))}

      {/* ── Left wing – secondary feathers (5) ── */}
      {[
        [44,78, 40,88], [55,84, 52,93], [65,89, 63,98],
        [74,94, 72,102], [82,100, 80,108],
      ].map(([x1,y1,x2,y2], i) => (
        <line key={`ls${i}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sp}
          stroke="var(--gold-soft)" strokeWidth="0.75" opacity={0.42 + i * 0.04} />
      ))}

      {/* ── Left wing – covert lines (texture) ── */}
      {[[30,62,40,58],[48,66,58,62],[62,70,70,66],[74,76,80,72]].map(([x1,y1,x2,y2],i) => (
        <line key={`lc${i}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sp}
          stroke="var(--gold)" strokeWidth="0.55" opacity="0.3" />
      ))}

      {/* ── Right wing – leading edge ── */}
      <path d="M 132,106 C 155,90 180,68 212,52" {...sp} stroke="var(--gold)" strokeWidth="1.25" opacity="0.85" />

      {/* ── Right wing – trailing edge ── */}
      <path d="M 132,116 C 148,108 166,98 180,88 C 194,78 206,66 212,60" {...sp} stroke="var(--gold-soft)" strokeWidth="0.9" opacity="0.6" />

      {/* ── Right wing – primary feathers (7) ── */}
      {[
        [212,52, 204,72], [202,49, 192,68], [190,47, 178,65],
        [177,46, 165,62], [164,47, 154,62], [153,49, 144,63], [144,53, 137,65],
      ].map(([x1,y1,x2,y2], i) => (
        <line key={`rp${i}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sp}
          stroke="var(--gold)" strokeWidth={1.05 - i * 0.04} opacity={0.62 + i * 0.03} />
      ))}

      {/* ── Right wing – secondary feathers (5) ── */}
      {[
        [176,78, 180,88], [165,84, 168,93], [155,89, 157,98],
        [146,94, 148,102], [138,100, 140,108],
      ].map(([x1,y1,x2,y2], i) => (
        <line key={`rs${i}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sp}
          stroke="var(--gold-soft)" strokeWidth="0.75" opacity={0.42 + i * 0.04} />
      ))}

      {/* ── Right wing – covert lines ── */}
      {[[190,62,180,58],[172,66,162,62],[158,70,150,66],[146,76,140,72]].map(([x1,y1,x2,y2],i) => (
        <line key={`rc${i}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sp}
          stroke="var(--gold)" strokeWidth="0.55" opacity="0.3" />
      ))}

      {/* ── Body ── */}
      <path
        d="M 88,112 C 84,106 82,120 84,134 C 87,152 98,174 110,178 C 122,174 133,152 136,134 C 138,120 136,106 132,112 C 126,106 118,102 110,102 C 102,102 94,106 88,112 Z"
        fill="var(--gold-pale)" fillOpacity="0.18"
        stroke="var(--gold)" strokeWidth="1.1" opacity="0.82"
      />

      {/* ── Breast feather streaks ── */}
      {[[104,118,102,148],[109,114,108,146],[115,114,115,147],[120,118,122,148]].map(([x1,y1,x2,y2],i) => (
        <path key={`br${i}`} d={`M ${x1},${y1} C ${x1-1},${(y1+y2)/2} ${x2-1},${(y1+y2)/2} ${x2},${y2}`}
          {...sp} stroke="var(--gold)" strokeWidth="0.6" opacity="0.3" />
      ))}

      {/* ── Head ── */}
      <circle cx="118" cy="80" r="18"
        fill="var(--gold-pale)" fillOpacity="0.22"
        stroke="var(--gold)" strokeWidth="1.15" opacity="0.88"
      />

      {/* ── Beak – hooked ── */}
      <path d="M 134,77 C 140,75 145,79 141,86 L 135,84" {...sp} stroke="var(--terracotta)" strokeWidth="1.3" opacity="0.85" />

      {/* ── Eye & highlight ── */}
      <circle cx="126" cy="76" r="3.2" fill="var(--terracotta)" opacity="0.85" />
      <circle cx="127.2" cy="75.2" r="1.1" fill="var(--gold-bright)" opacity="0.7" />

      {/* ── Supercilium (brow stripe) ── */}
      <path d="M 110,72 C 116,68 124,68 130,72" {...sp} stroke="var(--ink)" strokeWidth="0.6" opacity="0.3" />

      {/* ── Tail feathers (5) ── */}
      {[
        [102,174, 95,200], [106,176, 101,202], [110,177, 110,204],
        [114,176, 119,202], [118,174, 125,200],
      ].map(([x1,y1,x2,y2], i) => (
        <line key={`tf${i}`} x1={x1} y1={y1} x2={x2} y2={y2} {...sp}
          stroke="var(--gold)" strokeWidth={i === 2 ? 1.1 : 0.9} opacity={i === 2 ? 0.7 : 0.52} />
      ))}

      {/* ── Jesses (falconry straps on legs) ── */}
      <line x1="104" y1="174" x2="100" y2="186" {...sp} stroke="var(--terracotta)" strokeWidth="0.9" opacity="0.5" />
      <line x1="116" y1="174" x2="120" y2="186" {...sp} stroke="var(--terracotta)" strokeWidth="0.9" opacity="0.5" />
      <line x1="100" y1="186" x2="96" y2="190" {...sp} stroke="var(--terracotta)" strokeWidth="0.8" opacity="0.4" />
      <line x1="100" y1="186" x2="103" y2="192" {...sp} stroke="var(--terracotta)" strokeWidth="0.8" opacity="0.4" />
      <line x1="120" y1="186" x2="124" y2="190" {...sp} stroke="var(--terracotta)" strokeWidth="0.8" opacity="0.4" />
      <line x1="120" y1="186" x2="117" y2="192" {...sp} stroke="var(--terracotta)" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CITY SILHOUETTE  —  Mughal domes, minarets, mountain ridgeline
───────────────────────────────────────────────────────────────────────────── */
function CityScape() {
  const base = 165;   // ground line in SVG units
  const top  = 180;   // SVG height

  /* Helper: dome arc shape */
  const dome = (cx: number, r: number, h: number, key: string) => {
    const b = base;
    return (
      <path key={key}
        d={`M ${cx-r},${b} C ${cx-r},${b-h*0.62} ${cx-r*0.5},${b-h} ${cx},${b-h} C ${cx+r*0.5},${b-h} ${cx+r},${b-h*0.62} ${cx+r},${b} Z`}
      />
    );
  };

  /* Helper: minaret */
  const minaret = (x: number, topY: number, w: number, key: string) => (
    <path key={key}
      d={`M ${x-w/2},${base} L ${x-w/2},${topY+4} C ${x-w/2},${topY-1} ${x+w/2},${topY-1} ${x+w/2},${topY+4} L ${x+w/2},${base} Z`}
    />
  );

  /* Helper: flat parapet block */
  const parapet = (x1: number, x2: number, h: number, key: string) => (
    <rect key={key} x={x1} y={base-h} width={x2-x1} height={h} />
  );

  const nearFill = "var(--terracotta)";
  const nearOpacity = 0.22;

  return (
    <svg
      viewBox="0 0 1200 180"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "38%", pointerEvents: "none" }}
    >
      {/* ── Layer 1: Far mountains (sage mist) ── */}
      <path
        d="M 0,128 C 70,92 140,108 210,80 C 280,58 350,88 420,68 C 490,48 560,78 630,56 C 700,36 770,66 840,48 C 910,32 980,60 1050,42 C 1110,28 1160,52 1200,38 L 1200,180 L 0,180 Z"
        fill="var(--gold-soft)" opacity="0.09"
      />
      {/* Mountain ridgeline detail */}
      <path
        d="M 0,128 C 70,92 140,108 210,80 C 280,58 350,88 420,68 C 490,48 560,78 630,56 C 700,36 770,66 840,48 C 910,32 980,60 1050,42 C 1110,28 1160,52 1200,38"
        fill="none" stroke="var(--gold-soft)" strokeWidth="0.6" opacity="0.18"
      />

      {/* ── Layer 2: City silhouette (near) ── */}
      <g fill={nearFill} opacity={nearOpacity}>
        {/* Left cluster */}
        {parapet(0, 30, 14, "p1")}
        {dome(52, 22, 34, "d1")}
        {parapet(74, 82, 8, "p2")}
        {minaret(88, 78, 6, "m1")}
        {parapet(92, 108, 12, "p3")}
        {dome(125, 18, 26, "d2")}

        {/* Left-centre: main mosque */}
        {minaret(150, 38, 5.5, "m2")}
        {parapet(156, 168, 10, "p4")}
        {dome(215, 58, 92, "d3")}  {/* Grand dome */}
        {parapet(273, 290, 10, "p5")}
        {minaret(296, 36, 5.5, "m3")}
        {dome(320, 16, 24, "d4")}
        {parapet(338, 360, 10, "p6")}
        {dome(378, 20, 32, "d5")}

        {/* Centre: palace complex */}
        {parapet(400, 432, 16, "p7")}
        {minaret(438, 28, 5, "m4")}
        {parapet(444, 460, 20, "p8")}
        {dome(520, 68, 108, "d6")}  {/* Central palace dome */}
        {/* Chattri (small dome on drum) */}
        {dome(520, 22, 42, "d6b")}
        {parapet(590, 608, 20, "p9")}
        {minaret(614, 26, 5, "m5")}
        {parapet(620, 640, 12, "p10")}
        {dome(660, 22, 30, "d7")}

        {/* Right-centre */}
        {parapet(684, 700, 10, "p11")}
        {dome(718, 26, 42, "d8")}
        {dome(762, 20, 30, "d9")}
        {minaret(792, 56, 5.5, "m6")}
        {parapet(798, 820, 10, "p12")}
        {dome(840, 24, 38, "d10")}
        {dome(882, 20, 32, "d11")}

        {/* Right cluster */}
        {minaret(916, 64, 5, "m7")}
        {parapet(922, 944, 10, "p13")}
        {dome(965, 28, 40, "d12")}
        {parapet(995, 1020, 12, "p14")}
        {dome(1040, 22, 30, "d13")}
        {dome(1082, 18, 24, "d14")}
        {parapet(1102, 1200, 14, "p15")}
      </g>

      {/* ── Ground baseline ── */}
      <line x1="0" y1={base} x2="1200" y2={base} stroke="var(--terracotta)" strokeWidth="0.5" opacity="0.15" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CORNER ORNAMENT  —  manuscript-style filigree for each corner
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
      <g transform={flip} fill="none" stroke="var(--gold)" opacity="0.32">
        {/* Outer arc */}
        <path d="M 4,4 L 36,4 C 36,4 40,4 40,8 L 40,40" strokeWidth="0.6" opacity="0.4" />
        {/* Corner bracket */}
        <path d="M 4,4 L 4,28" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 4,4 L 28,4" strokeWidth="1.2" strokeLinecap="round" />
        {/* Lotus curl – vertical */}
        <path d="M 4,28 C 4,36 8,40 14,40 C 18,40 22,36 20,32 C 18,28 14,28 14,32" strokeWidth="0.8" opacity="0.7" />
        {/* Lotus curl – horizontal */}
        <path d="M 28,4 C 36,4 40,8 40,14 C 40,18 36,22 32,20 C 28,18 28,14 32,14" strokeWidth="0.8" opacity="0.7" />
        {/* Inner fine line */}
        <path d="M 8,8 L 24,8 C 26,8 28,10 28,12 L 28,24" strokeWidth="0.45" opacity="0.35" />
        {/* Diamond marks */}
        <circle cx="4" cy="4" r="2.5" fill="var(--gold)" opacity="0.45" />
        <circle cx="18" cy="4" r="1.2" fill="var(--gold)" opacity="0.3" />
        <circle cx="4" cy="18" r="1.2" fill="var(--gold)" opacity="0.3" />
        {/* Floral dot cluster */}
        {[[14,14],[20,10],[10,20],[22,18],[18,22]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="0.8" fill="var(--gold)" opacity={0.2 + i * 0.04} />
        ))}
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LANTERN GLOW  —  ornate Mughal lantern silhouette with inner flame
───────────────────────────────────────────────────────────────────────────── */
function Lantern() {
  return (
    <svg width="38" height="56" viewBox="0 0 38 56" aria-hidden="true" style={{ display: "block" }}>
      <g fill="none" stroke="var(--gold-soft)" strokeWidth="0.9" opacity="0.55">
        {/* Chain */}
        <line x1="19" y1="0" x2="19" y2="7" strokeWidth="0.7" />
        {/* Top cap */}
        <path d="M 12,7 C 12,4 26,4 26,7 L 28,12 L 10,12 Z" />
        {/* Body */}
        <path d="M 10,12 L 8,40 C 8,44 14,48 19,48 C 24,48 30,44 30,40 L 28,12 Z" />
        {/* Arch panels */}
        <path d="M 13,14 C 13,10 25,10 25,14" strokeWidth="0.6" opacity="0.6" />
        <path d="M 12,24 C 12,18 26,18 26,24" strokeWidth="0.5" opacity="0.5" />
        <path d="M 11,34 C 11,28 27,28 27,34" strokeWidth="0.5" opacity="0.4" />
        {/* Bottom finial */}
        <path d="M 14,48 C 14,52 24,52 24,48" strokeWidth="0.7" />
        <line x1="19" y1="52" x2="19" y2="56" strokeWidth="0.6" />
        <circle cx="19" cy="56" r="1.5" fill="var(--gold)" opacity="0.4" />
      </g>
      {/* Inner flame glow */}
      <ellipse cx="19" cy="30" rx="5" ry="8" fill="var(--terracotta)" opacity="0.25"
        style={{ animation: "lanternGlow 2.8s ease-in-out infinite" }}
      />
      <ellipse cx="19" cy="30" rx="2.5" ry="4" fill="var(--gold-bright)" opacity="0.35"
        style={{ animation: "lanternGlow 1.9s ease-in-out infinite reverse" }}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOADING SCREEN
───────────────────────────────────────────────────────────────────────────── */
export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const [fade, setFade] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTitleVisible(true), 420);
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
      role="status"
      aria-live="polite"
      aria-label="Loading Ānvīkṣikī"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.65s ease",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
      }}
    >

      {/* ══════════════════════════════════════════
          LAYER 1 — HERO IMAGE BACKDROP
      ══════════════════════════════════════════ */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${asset("/images/provided/home-falcon-city-panorama-hero.jpg")})`,
        backgroundSize: "cover",
        backgroundPosition: "58% 18%",
        filter: "sepia(0.9) brightness(1.12) saturate(0.52)",
        opacity: 0.18,
        animation: "heroZoom 14s ease-in-out infinite",
        transformOrigin: "center center",
      }} />

      {/* ══════════════════════════════════════════
          LAYER 2 — ATMOSPHERIC COLOUR WASHES
      ══════════════════════════════════════════ */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* Warm parchment base */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(168deg, var(--bg-deep) 0%, var(--bg) 48%, var(--bg-alt) 100%)",
        }} />
        {/* Terracotta bloom — upper-centre (falcon's warm tones) */}
        <div style={{
          position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184,76,42,0.11) 0%, transparent 62%)",
        }} />
        {/* Deep ochre bloom — lower-left (city panorama warmth) */}
        <div style={{
          position: "absolute", bottom: "0%", left: "18%",
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,152,58,0.13) 0%, transparent 68%)",
        }} />
        {/* Sage bloom — upper-right (architectural mist) */}
        <div style={{
          position: "absolute", top: "2%", right: "14%",
          width: 340, height: 340, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100,118,80,0.08) 0%, transparent 68%)",
        }} />
        {/* Warm sienna bloom — lower-right */}
        <div style={{
          position: "absolute", bottom: "10%", right: "20%",
          width: 260, height: 260, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(160,100,40,0.08) 0%, transparent 70%)",
        }} />

        {/* Manuscript specks — scattered gold/terracotta dust */}
        {Array.from({ length: 38 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${6 + (i * 43) % 88}%`,
            top: `${6 + (i * 61) % 86}%`,
            width: i % 9 === 0 ? 3.5 : i % 4 === 0 ? 2.2 : 1.4,
            height: i % 9 === 0 ? 3.5 : i % 4 === 0 ? 2.2 : 1.4,
            borderRadius: "50%",
            background: i % 5 === 0 ? "var(--terracotta)" : "var(--gold)",
            opacity: 0.04 + (i % 7) * 0.038,
            animation: `shimmer ${2.1 + (i % 5) * 0.65}s ease-in-out infinite`,
            animationDelay: `${(i * 0.27) % 2.4}s`,
          }} />
        ))}
      </div>

      {/* ══════════════════════════════════════════
          LAYER 3 — CORNER ORNAMENTS
      ══════════════════════════════════════════ */}
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <div key={corner} aria-hidden="true" style={{
          position: "absolute",
          ...(corner.includes("t") ? { top: 12 } : { bottom: 12 }),
          ...(corner.includes("l") ? { left: 12 } : { right: 12 }),
        }}>
          <CornerOrnament corner={corner} />
        </div>
      ))}

      {/* ══════════════════════════════════════════
          LAYER 4 — RISING EMBERS (lantern sparks)
      ══════════════════════════════════════════ */}
      {Array.from({ length: 18 }).map((_, i) => {
        const driftX = ((i % 5) - 2) * 18;
        const driftX2 = ((i % 3) - 1) * 12;
        const delay = (i * 0.38) % 3.2;
        const dur = 2.8 + (i % 5) * 0.55;
        const left = 45 + (((i * 37) % 20) - 10);
        return (
          <div key={i} aria-hidden="true" style={{
            position: "absolute",
            bottom: "8%",
            left: `${left}%`,
            width: i % 3 === 0 ? 4 : 2.5,
            height: i % 3 === 0 ? 4 : 2.5,
            borderRadius: "50%",
            background: i % 4 === 0 ? "var(--terracotta)" : "var(--gold-bright)",
            boxShadow: `0 0 ${i % 3 === 0 ? 6 : 3}px currentColor`,
            opacity: 0,
            animation: `embersRise ${dur}s ${delay}s ease-out infinite`,
            ["--ember-drift" as string]: `${driftX}px`,
            ["--ember-drift2" as string]: `${driftX2}px`,
          }} />
        );
      })}

      {/* ══════════════════════════════════════════
          LAYER 5 — CITY SILHOUETTE (bottom)
      ══════════════════════════════════════════ */}
      <CityScape />

      {/* ══════════════════════════════════════════
          CENTRAL COMPOSITION
      ══════════════════════════════════════════ */}
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 0,
      }}>

        {/* Lantern glow aura beneath emblem */}
        <div aria-hidden="true" style={{
          position: "absolute",
          bottom: "8%",
          left: "50%", transform: "translateX(-50%)",
          width: 180, height: 80,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(184,76,42,0.22) 0%, transparent 70%)",
          filter: "blur(16px)",
          animation: "lanternGlow 3.2s ease-in-out infinite",
        }} />

        {/* ── RINGS + FALCON EMBLEM ── */}
        <div style={{ position: "relative", width: 260, height: 260, flexShrink: 0 }}>

          {/* Outermost slow-spin ring */}
          <svg width="260" height="260" viewBox="0 0 260 260"
            className="animate-spin-slow"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <circle cx="130" cy="130" r="124" stroke="var(--gold)" strokeWidth="0.5" fill="none" opacity="0.14" strokeDasharray="5 20" />
            {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => (
              <circle key={i}
                cx={130 + 124 * Math.cos((a * Math.PI) / 180)}
                cy={130 + 124 * Math.sin((a * Math.PI) / 180)}
                r={i % 3 === 0 ? 3 : 1.8}
                fill={i % 4 === 0 ? "var(--terracotta)" : "var(--gold)"}
                opacity={0.2 + (i % 4) * 0.08}
              />
            ))}
          </svg>

          {/* Counter-rotating middle ring */}
          <svg width="260" height="260" viewBox="0 0 260 260"
            style={{ position: "absolute", inset: 0, animation: "rotateSlow 24s linear infinite reverse", pointerEvents: "none" }}>
            <circle cx="130" cy="130" r="100" stroke="var(--gold)" strokeWidth="0.5" fill="none" opacity="0.2" strokeDasharray="2 12" />
            {[0,45,90,135,180,225,270,315].map((a, i) => (
              <path key={i}
                d={`M ${130 + 92 * Math.cos((a * Math.PI) / 180)} ${130 + 92 * Math.sin((a * Math.PI) / 180)} L ${130 + 108 * Math.cos((a * Math.PI) / 180)} ${130 + 108 * Math.sin((a * Math.PI) / 180)}`}
                stroke="var(--gold-soft)" strokeWidth="0.8" opacity="0.3"
              />
            ))}
          </svg>

          {/* Static inner mandala ring */}
          <svg width="260" height="260" viewBox="0 0 260 260"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <circle cx="130" cy="130" r="76" stroke="var(--gold)" strokeWidth="0.4" fill="none" opacity="0.18" />
            {[0,60,120,180,240,300].map((a, i) => (
              <line key={i}
                x1={130 + 66 * Math.cos((a * Math.PI) / 180)}
                y1={130 + 66 * Math.sin((a * Math.PI) / 180)}
                x2={130 + 76 * Math.cos((a * Math.PI) / 180)}
                y2={130 + 76 * Math.sin((a * Math.PI) / 180)}
                stroke="var(--terracotta)" strokeWidth="0.8" opacity="0.3"
              />
            ))}
            {/* Cardinal diamond marks */}
            {[0,90,180,270].map((a, i) => {
              const x = 130 + 76 * Math.cos((a * Math.PI) / 180);
              const y = 130 + 76 * Math.sin((a * Math.PI) / 180);
              return <circle key={i} cx={x} cy={y} r="2.2" fill="var(--gold)" opacity="0.42" />;
            })}
          </svg>

          {/* Falcon — centred in rings */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div className="animate-glow" style={{ color: "var(--gold)" }}>
              <Falcon size={210} />
            </div>
          </div>
        </div>

        {/* Lantern beneath falcon */}
        <div aria-hidden="true" style={{ marginTop: -8, marginBottom: 10, opacity: 0.72 }}>
          <Lantern />
        </div>

        {/* ── ORNAMENTAL RULE ── */}
        <div aria-hidden="true" style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          marginBottom: "1.1rem", opacity: 0.55,
        }}>
          <div style={{ width: 48, height: 1, background: "linear-gradient(to right, transparent, var(--gold))" }} />
          <span style={{ color: "var(--terracotta)", fontSize: "0.5rem", letterSpacing: "0.4em" }}>✦ ✦ ✦</span>
          <div style={{ width: 48, height: 1, background: "linear-gradient(to left, transparent, var(--gold))" }} />
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
            textShadow: "0 0 28px rgba(184,76,42,0.3), 0 1px 0 rgba(0,0,0,0.08)",
            animation: titleVisible ? "inscribe 0.9s ease both" : "none",
            opacity: titleVisible ? undefined : 0,
          }}
        >
          ĀNVĪKṢIKĪ
        </h1>

        {/* Subtitle with flanking rules */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.55rem",
          marginBottom: "0.4rem",
        }}>
          <span style={{ width: 22, height: 1, background: "var(--gold-soft)", opacity: 0.45, flexShrink: 0 }} />
          <span className="font-ui" style={{ fontSize: "0.54rem", letterSpacing: "0.42em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
            Journal &amp; Research Platform
          </span>
          <span style={{ width: 22, height: 1, background: "var(--gold-soft)", opacity: 0.45, flexShrink: 0 }} />
        </div>

        {/* Tagline */}
        <p className="font-body" style={{
          fontSize: "0.72rem", color: "var(--ink-faint)", fontStyle: "italic",
          letterSpacing: "0.06em", marginBottom: "1.6rem", opacity: 0.65,
        }}>
          Where Inquiry Becomes Insight
        </p>

        {/* ── PROGRESS BAR ── */}
        <div style={{ width: 220 }}>
          <div style={{
            height: 2, background: "rgba(201,152,58,0.14)",
            borderRadius: 2, overflow: "hidden", marginBottom: 9,
            boxShadow: "inset 0 0 0 1px rgba(201,152,58,0.08)",
          }}>
            <div style={{
              height: "100%",
              background: "linear-gradient(90deg, var(--terracotta), var(--gold), var(--gold-bright))",
              width: `${pct}%`,
              transition: "width 0.52s ease",
              boxShadow: "0 0 14px rgba(184,76,42,0.55), 0 0 4px rgba(201,152,58,0.8)",
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

      </div>{/* /central composition */}

      {/* ══════════════════════════════════════════
          DRIFTING PETAL ORNAMENTS
      ══════════════════════════════════════════ */}
      {[
        { left: "6%",  top: "14%", delay: "0s",   dur: "5.4s", big: false },
        { left: "90%", top: "20%", delay: "1.5s", dur: "7.0s", big: true  },
        { left: "12%", top: "82%", delay: "2.8s", dur: "5.0s", big: false },
        { left: "85%", top: "76%", delay: "0.9s", dur: "5.8s", big: true  },
        { left: "52%", top: "8%",  delay: "3.4s", dur: "7.4s", big: false },
        { left: "28%", top: "5%",  delay: "2.0s", dur: "6.1s", big: true  },
        { left: "75%", top: "88%", delay: "1.1s", dur: "4.7s", big: false },
        { left: "3%",  top: "48%", delay: "3.8s", dur: "6.6s", big: true  },
      ].map((p, i) => (
        <div key={i} aria-hidden="true" style={{
          position: "absolute", left: p.left, top: p.top,
          animation: `float ${p.dur} ${p.delay} ease-in-out infinite`,
          zIndex: 1,
        }}>
          <div style={{
            width: p.big ? 9 : 5,
            height: p.big ? 9 : 5,
            borderRadius: "50% 0 50% 0",
            background: i % 3 === 0 ? "var(--terracotta)" : i % 3 === 1 ? "var(--gold-pale)" : "var(--gold-soft)",
            transform: "rotate(45deg)",
            opacity: 0.35,
          }} />
        </div>
      ))}

    </div>
  );
}
