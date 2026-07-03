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

/* ─── Ambient falling flowers — use on any page ─────────────────────── */
const FLOWER_COLORS_AMBIENT = [
  "#E8426A",  /* rose red */
  "#F97316",  /* marigold orange */
  "#EC4899",  /* lotus pink */
  "#A855F7",  /* violet */
  "#FBBF24",  /* saffron yellow */
  "#34D399",  /* sage green */
  "#60A5FA",  /* cornflower */
  "#F472B6",  /* petal pink */
  "#FB923C",  /* deep marigold */
  "#C084FC",  /* lavender */
  "#FCD34D",  /* jasmine gold */
  "#6EE7B7",  /* mint */
];

const PETAL_CONFIGS = Array.from({ length: 26 }, (_, i) => ({
  left: `${2 + (i * 27 + 11) % 95}%`,
  size: 18 + (i % 5) * 5,
  color: FLOWER_COLORS_AMBIENT[i % FLOWER_COLORS_AMBIENT.length],
  opacity: 0.55 + (i % 4) * 0.1,
  delay: `${(i * 0.6) % 11}s`,
  dur: `${10 + (i % 7) * 1.4}s`,
  drift: `${((i % 7) - 3) * 32}px`,
  spin: `${((i % 2) === 0 ? -1 : 1) * (120 + (i % 5) * 50)}deg`,
  shape: i % 4,
}));

function AmbientFlower({ color, shape }: { color: string; shape: number }) {
  if (shape === 0) {
    /* 5-petal round flower */
    return (
      <>
        {[0, 72, 144, 216, 288].map((a) => {
          const rad = (a * Math.PI) / 180;
          const cx = 12 + 7 * Math.cos(rad);
          const cy = 12 + 7 * Math.sin(rad);
          return <ellipse key={a} cx={cx} cy={cy} rx="5.5" ry="3.5" fill={color} transform={`rotate(${a} ${cx} ${cy})`} opacity=".9" />;
        })}
        <circle cx="12" cy="12" r="4" fill="rgba(255,255,200,0.9)" />
        <circle cx="12" cy="12" r="1.8" fill={color} opacity=".5" />
      </>
    );
  }
  if (shape === 1) {
    /* 6-petal lotus flower */
    return (
      <>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path key={a} d="M12,12 C10,7.5 9,3.5 12,1.5 C15,3.5 14,7.5 12,12Z"
            fill={color} transform={`rotate(${a} 12 12)`} opacity=".88" />
        ))}
        {[30, 90, 150, 210, 270, 330].map((a) => (
          <path key={a} d="M12,12 C11,9 10.5,6.5 12,5 C13.5,6.5 13,9 12,12Z"
            fill={color} transform={`rotate(${a} 12 12)`} opacity=".5" />
        ))}
        <circle cx="12" cy="12" r="3" fill="rgba(255,240,200,0.95)" />
        <circle cx="12" cy="12" r="1.2" fill={color} opacity=".6" />
      </>
    );
  }
  if (shape === 2) {
    /* 8-petal marigold */
    return (
      <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const rad = (a * Math.PI) / 180;
          const cx = 12 + 6.5 * Math.cos(rad);
          const cy = 12 + 6.5 * Math.sin(rad);
          return <ellipse key={a} cx={cx} cy={cy} rx="4.5" ry="3" fill={color} transform={`rotate(${a} ${cx} ${cy})`} opacity=".88" />;
        })}
        <circle cx="12" cy="12" r="4" fill="rgba(255,230,120,0.95)" />
        <circle cx="12" cy="12" r="1.8" fill={color} opacity=".55" />
      </>
    );
  }
  /* shape 3 — rose / cupped bloom */
  return (
    <>
      <path d="M12,3 C8,4.5 5,8 5,12 C5,16.5 8.2,19.5 12,20 C15.8,19.5 19,16.5 19,12 C19,8 16,4.5 12,3Z" fill={color} opacity=".3" />
      <path d="M12,6 C9,7 7,9.5 7,12 C7,15.5 9.3,17.5 12,18 C14.7,17.5 17,15.5 17,12 C17,9.5 15,7 12,6Z" fill={color} opacity=".65" />
      <path d="M12,9.5 C10.5,10 9.5,11 9.5,12 C9.5,13.8 10.6,15 12,15 C13.4,15 14.5,13.8 14.5,12 C14.5,11 13.5,10 12,9.5Z" fill={color} opacity=".9" />
      <circle cx="12" cy="12" r="2" fill="rgba(255,245,230,0.95)" />
    </>
  );
}

export const AmbientPetals = memo(function AmbientPetals({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {PETAL_CONFIGS.map((p, i) => (
        <svg
          key={i}
          width={p.size}
          height={p.size}
          viewBox="0 0 24 24"
          fill="none"
          className="absolute top-0"
          style={{
            left: p.left,
            opacity: p.opacity,
            animation: `sakuraFall ${p.dur} ${p.delay} linear infinite`,
            ["--petal-drift" as string]: p.drift,
            ["--petal-spin" as string]: p.spin,
          }}
        >
          <AmbientFlower color={p.color} shape={p.shape} />
        </svg>
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
