import { useEffect, useState } from "react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;

/** Stylised falcon — drawn from the hero illustration motif */
function FalconMark({ size = 90 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Outer mandala ring */}
      <circle cx="45" cy="45" r="42" stroke="var(--gold)" strokeWidth="0.7" opacity="0.28" strokeDasharray="3 9" />
      <circle cx="45" cy="45" r="36" stroke="var(--gold-soft)" strokeWidth="0.5" opacity="0.22" />

      {/* ── Falcon body ── warm sepia fill, gold outline */}
      {/* Torso */}
      <ellipse cx="45" cy="52" rx="10" ry="13" fill="var(--gold-soft)" opacity="0.18" />
      <ellipse cx="45" cy="52" rx="10" ry="13"
        stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.75" />

      {/* Head */}
      <circle cx="45" cy="37" r="7.5"
        stroke="var(--gold)" strokeWidth="1.1" fill="var(--gold-pale)" fillOpacity="0.22" opacity="0.85" />

      {/* Beak — curved, facing right */}
      <path d="M50.5 36.5 C53 36 54 38 51.5 39.5" stroke="var(--terracotta)" strokeWidth="1.2" fill="none" opacity="0.85" strokeLinecap="round" />

      {/* Eye */}
      <circle cx="48" cy="36" r="1.4" fill="var(--terracotta)" opacity="0.8" />
      <circle cx="48.4" cy="35.6" r="0.5" fill="var(--gold-bright)" opacity="0.6" />

      {/* Left wing — spread upward */}
      <path
        d="M36 48 C28 44 20 36 18 28 C24 30 30 36 36 42"
        stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.72" strokeLinecap="round"
      />
      <path
        d="M36 50 C26 50 16 44 14 36 C20 38 28 44 36 48"
        stroke="var(--gold)" strokeWidth="0.8" fill="none" opacity="0.45" strokeLinecap="round"
      />
      <path
        d="M36 52 C28 55 18 52 14 46 C20 46 28 50 36 52"
        stroke="var(--gold-soft)" strokeWidth="0.7" fill="none" opacity="0.35" strokeLinecap="round"
      />

      {/* Right wing — spread upward */}
      <path
        d="M54 48 C62 44 70 36 72 28 C66 30 60 36 54 42"
        stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.72" strokeLinecap="round"
      />
      <path
        d="M54 50 C64 50 74 44 76 36 C70 38 62 44 54 48"
        stroke="var(--gold)" strokeWidth="0.8" fill="none" opacity="0.45" strokeLinecap="round"
      />
      <path
        d="M54 52 C62 55 72 52 76 46 C70 46 62 50 54 52"
        stroke="var(--gold-soft)" strokeWidth="0.7" fill="none" opacity="0.35" strokeLinecap="round"
      />

      {/* Tail feathers */}
      <path d="M40 63 C38 70 36 74 34 76" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M45 64 C45 71 45 75 45 78" stroke="var(--gold)" strokeWidth="1.1" fill="none" opacity="0.65" strokeLinecap="round" />
      <path d="M50 63 C52 70 54 74 56 76" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.55" strokeLinecap="round" />

      {/* Talons / perch suggestion */}
      <path d="M40 65 L37 68 M40 65 L39 69 M40 65 L41 68" stroke="var(--terracotta)" strokeWidth="0.9" opacity="0.55" strokeLinecap="round" />
      <path d="M50 65 L53 68 M50 65 L51 69 M50 65 L49 68" stroke="var(--terracotta)" strokeWidth="0.9" opacity="0.55" strokeLinecap="round" />

      {/* Corner diamond marks on ring */}
      {[0, 90, 180, 270].map((a, i) => (
        <circle
          key={i}
          cx={45 + 36 * Math.cos((a * Math.PI) / 180)}
          cy={45 + 36 * Math.sin((a * Math.PI) / 180)}
          r="1.8"
          fill={i % 2 === 0 ? "var(--terracotta)" : "var(--gold)"}
          opacity="0.55"
        />
      ))}
    </svg>
  );
}

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const steps = [12, 32, 54, 72, 88, 100];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        setPct(steps[i++]);
        setTimeout(tick, i === steps.length ? 220 : 310 + Math.random() * 230);
      } else {
        setFade(true);
        setTimeout(() => onDone?.(), 600);
      }
    };
    const t = setTimeout(tick, 280);
    return () => clearTimeout(t);
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
        transition: "opacity 0.6s ease",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
      }}
    >
      {/* ── Hero image — very soft sepia wash, inspires the palette ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${asset("/images/provided/home-falcon-city-panorama-hero.jpg")})`,
          backgroundSize: "cover",
          backgroundPosition: "58% top",
          filter: "sepia(1) brightness(1.15) saturate(0.55)",
          opacity: 0.11,
        }}
      />

      {/* ── Atmospheric colour layers ── */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* Warm parchment base */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, var(--bg-deep) 0%, var(--bg) 52%, var(--bg-alt) 100%)",
        }} />
        {/* Terracotta bloom — upper centre (falcon warmth) */}
        <div style={{
          position: "absolute", top: "6%", left: "50%", transform: "translateX(-50%)",
          width: 580, height: 580, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184,76,42,0.10) 0%, transparent 65%)",
        }} />
        {/* Ochre bloom — lower left (city panorama) */}
        <div style={{
          position: "absolute", bottom: "4%", left: "22%",
          width: 420, height: 420, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,152,58,0.12) 0%, transparent 70%)",
        }} />
        {/* Sage bloom — upper right (architectural mist) */}
        <div style={{
          position: "absolute", top: "3%", right: "16%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100,118,80,0.07) 0%, transparent 70%)",
        }} />

        {/* Manuscript specks */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${7 + (i * 43) % 86}%`,
            top: `${7 + (i * 61) % 84}%`,
            width: i % 7 === 0 ? 3 : 1.5,
            height: i % 7 === 0 ? 3 : 1.5,
            borderRadius: "50%",
            background: i % 5 === 0 ? "var(--terracotta)" : "var(--gold)",
            opacity: 0.05 + (i % 6) * 0.04,
            animation: `shimmer ${2.2 + (i % 4) * 0.7}s ease-in-out infinite`,
            animationDelay: `${(i * 0.28) % 2.2}s`,
          }} />
        ))}
      </div>

      {/* ── Central falcon emblem with spinning rings ── */}
      <div style={{ position: "relative", marginBottom: "2.25rem" }} aria-hidden="true">
        {/* Slow outer spin ring */}
        <svg
          width="200" height="200" viewBox="0 0 200 200"
          className="animate-spin-slow"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <circle cx="100" cy="100" r="94" stroke="var(--gold)" strokeWidth="0.6" fill="none" opacity="0.16" strokeDasharray="4 18" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
            <circle
              key={i}
              cx={100 + 94 * Math.cos((a * Math.PI) / 180)}
              cy={100 + 94 * Math.sin((a * Math.PI) / 180)}
              r={i % 2 === 0 ? 2.4 : 1.4}
              fill={i % 4 === 0 ? "var(--terracotta)" : "var(--gold)"}
              opacity={0.2 + (i % 4) * 0.08}
            />
          ))}
        </svg>

        {/* Counter-spin inner ring */}
        <svg
          width="200" height="200" viewBox="0 0 200 200"
          style={{ position: "absolute", inset: 0, animation: "rotateSlow 22s linear infinite reverse" }}
        >
          <circle cx="100" cy="100" r="72" stroke="var(--gold)" strokeWidth="0.5" fill="none" opacity="0.18" strokeDasharray="2 10" />
          {[45, 135, 225, 315].map((a, i) => (
            <path
              key={i}
              d={`M ${100 + 65 * Math.cos((a * Math.PI) / 180)} ${100 + 65 * Math.sin((a * Math.PI) / 180)} L ${100 + 78 * Math.cos((a * Math.PI) / 180)} ${100 + 78 * Math.sin((a * Math.PI) / 180)}`}
              stroke="var(--gold-soft)" strokeWidth="1" opacity="0.32"
            />
          ))}
        </svg>

        {/* Falcon mark in the centre */}
        <div style={{
          position: "relative",
          width: 200, height: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div
            className="animate-glow"
            style={{
              borderRadius: "50%",
              padding: 8,
              background: "radial-gradient(circle, rgba(201,152,58,0.06) 0%, transparent 75%)",
            }}
          >
            <FalconMark size={90} />
          </div>
        </div>
      </div>

      {/* ── Single title instance ── */}
      <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
        <h1
          className="font-display animate-shimmer"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
            letterSpacing: "0.3em",
            color: "var(--gold-bright)",
            marginBottom: "0.6rem",
            lineHeight: 1,
          }}
        >
          ĀNVĪKṢIKĪ
        </h1>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.55rem",
        }}>
          <span style={{ width: 24, height: 1, background: "var(--gold-soft)", opacity: 0.5, flexShrink: 0 }} />
          <span
            className="font-ui"
            style={{
              fontSize: "0.55rem", letterSpacing: "0.4em",
              textTransform: "uppercase", color: "var(--ink-faint)",
            }}
          >
            Journal &amp; Research Platform
          </span>
          <span style={{ width: 24, height: 1, background: "var(--gold-soft)", opacity: 0.5, flexShrink: 0 }} />
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ width: 240 }}>
        <div style={{
          height: 1.5, background: "rgba(201,152,58,0.15)",
          borderRadius: 2, overflow: "hidden", marginBottom: 9,
        }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, var(--terracotta), var(--gold), var(--gold-bright))",
            width: `${pct}%`,
            transition: "width 0.5s ease",
            boxShadow: "0 0 10px rgba(184,76,42,0.45)",
            borderRadius: 2,
          }} />
        </div>
        <p
          className="font-ui"
          style={{
            fontSize: "0.52rem", letterSpacing: "0.25em",
            textTransform: "uppercase", textAlign: "center", color: "var(--ink-faint)",
          }}
        >
          {pct < 100 ? "Opening the archive…" : "Welcome"}
        </p>
      </div>

      {/* ── Drifting petal ornaments ── */}
      {[
        { left: "7%",  top: "16%", delay: "0s",   dur: "5.2s", big: false },
        { left: "89%", top: "22%", delay: "1.4s", dur: "6.8s", big: true },
        { left: "13%", top: "80%", delay: "2.6s", dur: "4.9s", big: false },
        { left: "83%", top: "75%", delay: "0.8s", dur: "5.6s", big: true },
        { left: "50%", top: "9%",  delay: "3.2s", dur: "7.1s", big: false },
        { left: "29%", top: "5%",  delay: "1.9s", dur: "5.8s", big: true },
      ].map((p, i) => (
        <div key={i} aria-hidden="true" style={{
          position: "absolute", left: p.left, top: p.top,
          animation: `float ${p.dur} ${p.delay} ease-in-out infinite`,
          opacity: 0.28,
        }}>
          <div style={{
            width: p.big ? 8 : 5,
            height: p.big ? 8 : 5,
            borderRadius: "50% 0 50% 0",
            background: i % 2 === 0 ? "var(--gold-pale)" : "var(--terracotta)",
            transform: "rotate(45deg)",
            opacity: 0.65,
          }} />
        </div>
      ))}
    </div>
  );
}
