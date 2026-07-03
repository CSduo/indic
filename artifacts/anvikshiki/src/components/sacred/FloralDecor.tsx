/**
 * FloralDecor — reusable decorative components for the Anvikshiki aesthetic.
 * Lotus flowers, ambient petals, corner ornaments, floral borders.
 */
import { memo } from "react";

/* ─── Single full-bloom lotus ───────────────────────────────────────── */
export function LotusBlossom({
  size = 60,
  className = "",
  style,
  opacity = 1,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  opacity?: number;
}) {
  const c = 50; // centre of viewBox 0 0 100 100
  // Outer petals at 0°,45°,90°,… 315° — teardrop pointing outward
  const outer = [0, 45, 90, 135, 180, 225, 270, 315];
  // Inner petals at 22.5° offsets — slightly shorter
  const inner = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

  const outerPetal = `M50,50 C46,40 44,26 50,16 C56,26 54,40 50,50Z`;
  const innerPetal = `M50,50 C47,42 46,31 50,23 C54,31 53,42 50,50Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ opacity, ...style }}
    >
      {/* Outer petals — very light fill + stroke */}
      {outer.map((a) => (
        <path
          key={`o${a}`}
          d={outerPetal}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.14"
          transform={`rotate(${a} ${c} ${c})`}
        />
      ))}
      {/* Inner petals — slightly more saturated */}
      {inner.map((a) => (
        <path
          key={`i${a}`}
          d={innerPetal}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.24"
          transform={`rotate(${a} ${c} ${c})`}
        />
      ))}
      {/* Ring of stamens */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <circle
            key={`s${a}`}
            cx={c + 11 * Math.cos(r)}
            cy={c + 11 * Math.sin(r)}
            r="1.1"
            fill="currentColor"
            opacity="0.30"
          />
        );
      })}
      {/* Centre circle */}
      <circle cx={c} cy={c} r="6.5" fill="currentColor" opacity="0.42" />
      <circle cx={c} cy={c} r="3.5" fill="currentColor" opacity="0.28" />
    </svg>
  );
}

/* ─── Large faint lotus for page backgrounds ────────────────────────── */
export function LotusWatermark({
  size = 500,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={style}
    >
      <LotusBlossom size={size} opacity={0.045} className="text-[var(--gold)]" />
    </div>
  );
}

/* ─── Corner ornament ────────────────────────────────────────────────── */
export function FloralCorner({
  size = 72,
  position = "tl",
  className = "",
  style,
}: {
  size?: number;
  position?: "tl" | "tr" | "bl" | "br";
  className?: string;
  style?: React.CSSProperties;
}) {
  const flipX = position === "tr" || position === "br";
  const flipY = position === "bl" || position === "br";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none text-[var(--gold)] ${className}`}
      aria-hidden="true"
      style={{
        transform: `scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`,
        ...style,
      }}
    >
      {/* L-bracket lines */}
      <line x1="4" y1="4" x2="4" y2="36" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      <line x1="4" y1="4" x2="36" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      {/* Mini lotus in corner */}
      <g transform="translate(4,4)">
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          const dx = 8 * Math.cos(r - Math.PI / 2);
          const dy = 8 * Math.sin(r - Math.PI / 2);
          return (
            <ellipse
              key={a}
              cx={dx}
              cy={dy}
              rx="2.5"
              ry="5"
              transform={`rotate(${a}, ${dx}, ${dy})`}
              fill="currentColor"
              opacity="0.18"
            />
          );
        })}
        <circle cx="0" cy="0" r="3.5" fill="currentColor" opacity="0.32" />
      </g>
      {/* Trailing vine line */}
      <path
        d="M4,36 Q6,44 10,48 Q14,52 18,52 Q22,52 24,56 Q26,60 30,62 Q34,64 36,68"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.22"
      />
      {/* Small leaf buds on vine */}
      {[
        [10, 48, -20],
        [20, 53, 15],
        [30, 62, -10],
      ].map(([x, y, rot], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="2.5"
          ry="4.5"
          transform={`rotate(${rot} ${x} ${y})`}
          fill="currentColor"
          opacity="0.16"
        />
      ))}
      {/* Dot accents */}
      <circle cx="16" cy="4" r="1.2" fill="currentColor" opacity="0.28" />
      <circle cx="28" cy="4" r="0.9" fill="currentColor" opacity="0.2" />
      <circle cx="4" cy="16" r="1.2" fill="currentColor" opacity="0.28" />
      <circle cx="4" cy="28" r="0.9" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

/* ─── Horizontal floral border / separator ───────────────────────────── */
export function FloralBorder({
  className = "",
  style,
  petals = 5,
}: {
  className?: string;
  style?: React.CSSProperties;
  petals?: number;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-0 text-[var(--gold)] ${className}`}
      aria-hidden="true"
      style={style}
    >
      {/* Left gradient line */}
      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, var(--border-gold))" }} />

      {/* Centre floral row */}
      <div className="flex items-center gap-1.5 px-3">
        {Array.from({ length: petals }, (_, i) => {
          const mid = Math.floor(petals / 2);
          const isMid = i === mid;
          const isNearMid = Math.abs(i - mid) === 1;
          return (
            <LotusBlossom
              key={i}
              size={isMid ? 22 : isNearMid ? 16 : 12}
              opacity={isMid ? 0.55 : isNearMid ? 0.38 : 0.24}
              className="text-[var(--gold)]"
            />
          );
        })}
      </div>

      {/* Right gradient line */}
      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, var(--border-gold), transparent)" }} />
    </div>
  );
}

/* ─── Ambient floating petals — use on any page ─────────────────────── */
const PETAL_CONFIGS = Array.from({ length: 22 }, (_, i) => ({
  left: `${3 + (i * 29 + 13) % 94}%`,
  size: 6 + (i % 5) * 2,
  color: [
    "var(--gold)",
    "var(--terracotta-soft)",
    "var(--lotus)",
    "var(--gold-soft)",
    "var(--saffron-muted)",
    "var(--dusty-rose)",
  ][i % 6],
  opacity: 0.18 + (i % 4) * 0.06,
  delay: `${(i * 0.55) % 9}s`,
  dur: `${9 + (i % 6) * 1.2}s`,
  drift: `${((i % 7) - 3) * 30}px`,
  spin: `${((i % 2) === 0 ? -1 : 1) * (160 + (i % 5) * 40)}deg`,
  shape: i % 3, // 0=petal, 1=lotus, 2=circle
}));

export const AmbientPetals = memo(function AmbientPetals({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {PETAL_CONFIGS.map((p, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: p.left,
            opacity: p.opacity,
            animation: `sakuraFall ${p.dur} ${p.delay} linear infinite`,
            ["--petal-drift" as string]: p.drift,
            ["--petal-spin" as string]: p.spin,
          }}
        >
          {p.shape === 1 ? (
            /* mini lotus */
            <svg width={p.size * 1.4} height={p.size * 1.4} viewBox="0 0 100 100" fill="none">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <path
                  key={a}
                  d="M50,50 C46,38 44,22 50,12 C56,22 54,38 50,50Z"
                  fill={p.color}
                  transform={`rotate(${a} 50 50)`}
                />
              ))}
              <circle cx="50" cy="50" r="7" fill={p.color} />
            </svg>
          ) : p.shape === 2 ? (
            /* soft dot cluster */
            <svg width={p.size} height={p.size} viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="5" fill={p.color} />
              {[0, 72, 144, 216, 288].map((a) => {
                const r = (a * Math.PI) / 180;
                return (
                  <circle key={a} cx={10 + 8 * Math.cos(r)} cy={10 + 8 * Math.sin(r)} r="2" fill={p.color} />
                );
              })}
            </svg>
          ) : (
            /* teardrop petal */
            <svg width={p.size} height={p.size * 1.7} viewBox="0 0 14 24" fill="none">
              <path
                d="M7,24 C1,19 0,13 0,8 C0,2 3,0 7,0 C11,0 14,2 14,8 C14,13 13,19 7,24Z"
                fill={p.color}
              />
              <line x1="7" y1="2" x2="7" y2="21" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
});

/* ─── Ornate mandala ring with 8 lotus buds on the rim ──────────────── */
export function LotusRing({
  size = 120,
  className = "",
  style,
  spin = false,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  spin?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-[var(--gold)] ${spin ? "animate-spin-slow" : ""} ${className}`}
      aria-hidden="true"
      style={style}
    >
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
      <circle cx="60" cy="60" r="42" stroke="currentColor" strokeWidth="0.5" opacity="0.18" />
      <circle cx="60" cy="60" r="24" stroke="currentColor" strokeWidth="0.4" opacity="0.14" />
      {/* 12 radial spokes */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={60 + 24 * Math.cos(r)}
            y1={60 + 24 * Math.sin(r)}
            x2={60 + 56 * Math.cos(r)}
            y2={60 + 56 * Math.sin(r)}
            stroke="currentColor"
            strokeWidth="0.4"
            opacity="0.15"
          />
        );
      })}
      {/* 8 lotus buds on outer ring */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        const cx = 60 + 56 * Math.cos(r);
        const cy = 60 + 56 * Math.sin(r);
        return (
          <g key={a} transform={`translate(${cx},${cy}) rotate(${a + 90})`}>
            <path
              d="M0,0 C-2,-4 -1,-8 0,-10 C1,-8 2,-4 0,0Z"
              fill="currentColor"
              opacity="0.32"
            />
            <path
              d="M0,0 C-3.5,-2 -4,-6 0,-8 C4,-6 3.5,-2 0,0Z"
              fill="currentColor"
              opacity="0.18"
            />
          </g>
        );
      })}
      {/* 8 small dots on inner ring */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={60 + 42 * Math.cos(r)}
            cy={60 + 42 * Math.sin(r)}
            r="2"
            fill="currentColor"
            opacity="0.28"
          />
        );
      })}
      {/* Centre lotus */}
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <path
            key={a}
            d="M60,60 C58,55 57,48 60,44 C63,48 62,55 60,60Z"
            fill="currentColor"
            opacity="0.22"
            transform={`rotate(${a} 60 60)`}
          />
        );
      })}
      <circle cx="60" cy="60" r="5" fill="currentColor" opacity="0.38" />
    </svg>
  );
}
