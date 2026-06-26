import { useEffect, useState } from "react";
import { Emblem } from "@/components/brand/Emblem";

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const steps = [15, 35, 58, 78, 92, 100];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        setPct(steps[i++]);
        setTimeout(tick, i === steps.length ? 250 : 280 + Math.random() * 220);
      } else {
        setFade(true);
        setTimeout(() => onDone?.(), 550);
      }
    };
    const t = setTimeout(tick, 300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="loading-screen"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        transition: "opacity 0.55s ease", opacity: fade ? 0 : 1, pointerEvents: fade ? "none" : "auto",
      }}
      role="status" aria-live="polite" aria-label="Loading Ānvīkṣikī"
    >
      {/* Atmospheric radial layers */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, var(--bg-deep) 0%, var(--bg) 55%, var(--bg-alt) 100%)" }} />
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, var(--terracotta-pale) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "30%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, var(--gold-pale) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "5%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, var(--sage-pale) 0%, transparent 70%)" }} />
        {/* Manuscript specks */}
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${8 + (i * 43) % 84}%`, top: `${8 + (i * 61) % 82}%`,
            width: i % 7 === 0 ? 3 : 1.5, height: i % 7 === 0 ? 3 : 1.5,
            borderRadius: "50%", background: "var(--gold)",
            opacity: 0.06 + (i % 6) * 0.04,
            animation: `shimmer ${2 + (i % 4) * 0.8}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 2}s`,
          }} />
        ))}
      </div>

      {/* Central emblem with spinning outer ring */}
      <div className="relative mb-10" aria-hidden="true">
        {/* Outer slow-spin ring */}
        <svg width="200" height="200" viewBox="0 0 200 200" className="animate-spin-slow absolute inset-0 pointer-events-none">
          <circle cx="100" cy="100" r="94" stroke="var(--gold)" strokeWidth="0.5" fill="none" opacity="0.15" strokeDasharray="3 14"/>
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => (
            <circle key={i}
              cx={100 + 94 * Math.cos((a * Math.PI) / 180)}
              cy={100 + 94 * Math.sin((a * Math.PI) / 180)}
              r={i % 3 === 0 ? 2.5 : 1.5}
              fill="var(--gold)" opacity={0.15 + (i % 4) * 0.08}
            />
          ))}
        </svg>
        {/* Counter-spin inner ring */}
        <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0" style={{ animation: "rotateSlow 20s linear infinite reverse" }}>
          <circle cx="100" cy="100" r="72" stroke="var(--gold)" strokeWidth="0.4" fill="none" opacity="0.18" strokeDasharray="1 8"/>
        </svg>
        {/* Emblem */}
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          <div className="animate-glow" style={{ borderRadius: "50%", padding: 8 }}>
            <Emblem size={120} />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="font-display tracking-[0.3em] mb-2 animate-shimmer"
          style={{ fontSize: "clamp(1.6rem, 5vw, 2.5rem)", color: "var(--gold-bright)" }}>
          ĀNVĪKṢIKĪ
        </h1>
        <p className="font-ui text-[9px] tracking-[0.45em] uppercase" style={{ color: "var(--ink-faint)" }}>
          A Journal of Inquiry &amp; Civilizational Wisdom
        </p>
      </div>

      {/* Progress */}
      <div style={{ width: 280 }}>
        <div style={{ height: 1, background: "rgba(201,152,58,0.18)", borderRadius: 1, overflow: "hidden", marginBottom: 8 }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, var(--rose-bright), var(--gold), var(--gold-bright))",
            width: `${pct}%`,
            transition: "width 0.45s ease",
            boxShadow: "0 0 10px rgba(201,152,58,0.65)",
          }} />
        </div>
        <p className="font-ui text-[9px] tracking-[0.22em] uppercase text-center" style={{ color: "var(--ink-faint)" }}>
          {pct < 100 ? "Opening the archive…" : "Welcome"}
        </p>
      </div>

      {/* Drifting petals */}
      {[
        { left: "8%",  top: "18%", delay: "0s",   dur: "5s" },
        { left: "88%", top: "25%", delay: "1.2s",  dur: "6.5s" },
        { left: "15%", top: "78%", delay: "2.4s",  dur: "4.8s" },
        { left: "80%", top: "72%", delay: "0.7s",  dur: "5.5s" },
        { left: "50%", top: "12%", delay: "3s",    dur: "7s" },
      ].map((p, i) => (
        <div key={i} aria-hidden="true" style={{
          position: "absolute", left: p.left, top: p.top,
          animation: `float ${p.dur} ${p.delay} ease-in-out infinite`, opacity: 0.28,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50% 0 50% 0", background: "var(--lotus)", transform: "rotate(45deg)" }} />
        </div>
      ))}
    </div>
  );
}
