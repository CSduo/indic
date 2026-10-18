/**
 * ColorfulDecor — vivid multi-color decorative SVG library for Anvikshiki.
 * PeacockFeather · ColorMandala · YantraPattern · RainbowDivider · PrismaticBurst · GemstoneDots
 */

import { memo } from "react";

/* ─── Spectrum palette (8 hues, used across all components) ─────────── */
export const SPECTRUM = [
  "#C84A10", // crimson
  "#C84A10", // saffron
  "#C84A10", // amber
  "#C84A10", // jade
  "#C84A10", // teal
  "#C84A10", // indigo
  "#C84A10", // violet
  "#C84A10", // rose
] as const;

/* ─── Vivid domain color map ─────────────────────────────────────────── */
export const DOMAIN_VIVID: Record<string, { from: string; to: string; text: string; bg: string; accent: string }> = {
  philosophy:              { from: "#C84A10", to: "#C84A10", text: "#BDBDBD", bg: "rgba(85,85,85,0.08)",   accent: "#C84A10" },
  history:                 { from: "#C84A10", to: "#C84A10", text: "#E4E4E4", bg: "rgba(132,132,132,0.08)",    accent: "#C84A10" },
  psychology:              { from: "#C84A10", to: "#C84A10", text: "#B8B8B8", bg: "rgba(74,74,74,0.08)",    accent: "#C84A10" },
  sociology:               { from: "#3D3D3D", to: "#C84A10", text: "#C84A10", bg: "rgba(116,116,116,0.08)",    accent: "#C84A10" },
  science:                 { from: "#C84A10", to: "#C84A10", text: "#DEDEDE", bg: "rgba(138,138,138,0.08)",   accent: "#C84A10" },
  geopolitics:             { from: "#3D3D3D", to: "#565656", text: "#C9C9C9", bg: "rgba(86,86,86,0.08)",    accent: "#565656" },
  "sanskrit-studies":      { from: "#C84A10", to: "#C84A10", text: "#E4E4E4", bg: "rgba(142,142,142,0.08)",   accent: "#C84A10" },
  "political-theory":      { from: "#191919", to: "#C84A10", text: "#BCBCBC", bg: "rgba(55,55,55,0.08)",   accent: "#C84A10" },
  translations:            { from: "#1F1F1F", to: "#C84A10", text: "#B6B6B6", bg: "rgba(69,69,69,0.08)",   accent: "#C84A10" },
  aesthetics:              { from: "#C84A10", to: "#C84A10", text: "#DADADA", bg: "rgba(85,85,85,0.08)",  accent: "#C84A10" },
  "civilizational-thought":{ from: "#242424", to: "#C84A10", text: "#D4D4D4", bg: "rgba(127,127,127,0.08)",   accent: "#C84A10" },
  multimedia:              { from: "#151515", to: "#C84A10", text: "#D8D8D8", bg: "rgba(78,78,78,0.08)",   accent: "#C84A10" },
  archive:                 { from: "#272727", to: "#727272", text: "#D4D4D4", bg: "rgba(114,114,114,0.08)", accent: "#727272" },
  papers:                  { from: "#2E2E2E", to: "#C84A10", text: "#E4E4E4", bg: "rgba(98,98,98,0.08)",    accent: "#C84A10" },
};

/* ─── Peacock Feather ─────────────────────────────────────────────────── */
export function PeacockFeather({
  height = 180,
  className = "",
  style,
}: {
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const w = Math.round(height * 0.42);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 50 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={style}
    >
      {/* Shaft */}
      <path d="M25,148 C25,130 23,105 25,85 C27,65 23,45 25,20 C25,12 24,6 25,1" stroke="#C84A10" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Left barbs */}
      {[22, 38, 54, 70, 84].map((y, i) => (
        <path key={`bl${i}`}
          d={`M25,${y} C${25 - (8 + i * 3)},${y - 2} ${25 - (12 + i * 4)},${y + 3} ${25 - (16 + i * 5)},${y + 1}`}
          stroke={["#C84A10","#C84A10","#C84A10","#C84A10","#C84A10"][i]}
          strokeWidth={0.85 + i * 0.08}
          strokeLinecap="round"
          opacity="0.70"
        />
      ))}

      {/* Right barbs */}
      {[22, 38, 54, 70, 84].map((y, i) => (
        <path key={`br${i}`}
          d={`M25,${y} C${25 + (8 + i * 3)},${y - 2} ${25 + (12 + i * 4)},${y + 3} ${25 + (16 + i * 5)},${y + 1}`}
          stroke={["#C84A10","#C84A10","#C84A10","#999999","#C84A10"][i]}
          strokeWidth={0.85 + i * 0.08}
          strokeLinecap="round"
          opacity="0.70"
        />
      ))}

      {/* Eye – outer teal glow */}
      <ellipse cx="25" cy="13" rx="13" ry="15" fill="#C84A10" opacity="0.12" />
      <ellipse cx="25" cy="13" rx="13" ry="15" stroke="#C84A10" strokeWidth="0.9" opacity="0.45" />
      {/* Eye – blue ring */}
      <ellipse cx="25" cy="13" rx="8.5" ry="10.5" fill="#C84A10" opacity="0.18" />
      <ellipse cx="25" cy="13" rx="8.5" ry="10.5" stroke="#C84A10" strokeWidth="0.7" opacity="0.55" />
      {/* Eye – violet iris */}
      <ellipse cx="25" cy="13" rx="5" ry="6.5" fill="#C84A10" opacity="0.60" />
      {/* Eye – dark pupil */}
      <ellipse cx="25" cy="13" rx="2.5" ry="3.2" fill="#1F1F1F" />
      {/* Eye – glint */}
      <ellipse cx="23.5" cy="11.5" rx="0.9" ry="1.1" fill="rgba(255,255,255,0.7)" />
      {/* Gold tip */}
      <circle cx="25" cy="1.5" r="1.8" fill="#C84A10" opacity="0.85" />
    </svg>
  );
}

/* ─── Color Mandala — 8-sector spectrum wheel ────────────────────────── */
export const ColorMandala = memo(function ColorMandala({
  size = 200,
  className = "",
  style,
  spin = false,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  spin?: boolean;
}) {
  const c = 100, outerR = 90, midR = 62, innerR = 34;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none"
      className={`pointer-events-none select-none ${spin ? "animate-spin-slow" : ""} ${className}`}
      aria-hidden="true" style={style}>

      {/* 8 colored pie sectors */}
      {SPECTRUM.map((color, i) => {
        const a1 = ((i * 45 - 90) * Math.PI) / 180;
        const a2 = (((i + 1) * 45 - 90) * Math.PI) / 180;
        return (
          <path key={`sec${i}`}
            d={`M${c},${c} L${c + outerR * Math.cos(a1)},${c + outerR * Math.sin(a1)} A${outerR},${outerR} 0 0,1 ${c + outerR * Math.cos(a2)},${c + outerR * Math.sin(a2)} Z`}
            fill={color} opacity="0.20" />
        );
      })}

      {/* Rings */}
      <circle cx={c} cy={c} r={outerR} stroke="#C84A10" strokeWidth="1.4" opacity="0.40" />
      <circle cx={c} cy={c} r={midR}   stroke="#C84A10" strokeWidth="0.8" opacity="0.28" />
      <circle cx={c} cy={c} r={innerR} stroke="#C84A10" strokeWidth="0.5" opacity="0.22" />

      {/* Spokes */}
      {SPECTRUM.map((color, i) => {
        const a = ((i * 45 - 90) * Math.PI) / 180;
        return (
          <line key={`sp${i}`}
            x1={c + innerR * Math.cos(a)} y1={c + innerR * Math.sin(a)}
            x2={c + outerR * Math.cos(a)} y2={c + outerR * Math.sin(a)}
            stroke={color} strokeWidth="0.7" opacity="0.40" />
        );
      })}

      {/* Mid-ring colored dots (offset 22.5°) */}
      {SPECTRUM.map((color, i) => {
        const a = ((i * 45 - 90 + 22.5) * Math.PI) / 180;
        return (
          <circle key={`md${i}`}
            cx={c + midR * Math.cos(a)} cy={c + midR * Math.sin(a)}
            r="4.5" fill={color} opacity="0.65" />
        );
      })}

      {/* Outer lotus buds on outer ring */}
      {SPECTRUM.map((color, i) => {
        const a = ((i * 45 - 90 + 22.5) * Math.PI) / 180;
        const bx = c + outerR * Math.cos(a), by = c + outerR * Math.sin(a);
        return (
          <g key={`lb${i}`}>
            <circle cx={bx} cy={by} r="7" fill={color} opacity="0.30" />
            <circle cx={bx} cy={by} r="3.5" fill={color} opacity="0.65" />
          </g>
        );
      })}

      {/* Centre gold */}
      <circle cx={c} cy={c} r="12" fill="#C84A10" opacity="0.50" />
      <circle cx={c} cy={c} r="6"  fill="#C84A10" opacity="0.90" />
      <circle cx={c} cy={c} r="2"  fill="#FBFBFB" opacity="0.95" />
    </svg>
  );
});

/* ─── Yantra Pattern — sacred geometry ───────────────────────────────── */
export const YantraPattern = memo(function YantraPattern({
  size = 240,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const c = 120;
  const tri = (r: number, up: boolean) => {
    const a0 = up ? -90 : 90;
    return [0, 120, 240]
      .map(d => {
        const ang = ((a0 + d) * Math.PI) / 180;
        return `${c + r * Math.cos(ang)},${c + r * Math.sin(ang)}`;
      })
      .join(" ");
  };

  const WARM = ["#C84A10","#C84A10","#C84A10","#C84A10"];
  const COOL = ["#C84A10","#C84A10","#C84A10","#C84A10","#C84A10"];

  return (
    <svg width={size} height={size} viewBox="0 0 240 240" fill="none"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true" style={style}>

      {/* Outer square frames */}
      <rect x="8"  y="8"  width="224" height="224" stroke="#C84A10" strokeWidth="0.9" opacity="0.25" />
      <rect x="14" y="14" width="212" height="212" stroke="#C84A10" strokeWidth="0.5" opacity="0.18" />

      {/* T-gates on the square (simplified) */}
      {[0, 90, 180, 270].map(rot => (
        <g key={rot} transform={`rotate(${rot} 120 120)`}>
          <rect x="108" y="8" width="24" height="10" stroke="#C84A10" strokeWidth="0.5" opacity="0.22" fill="none" />
        </g>
      ))}

      {/* Outer 16-petal lotus circle */}
      <circle cx={c} cy={c} r="104" stroke="#C84A10" strokeWidth="0.5" opacity="0.18" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * 22.5 * Math.PI) / 180;
        const px = c + 104 * Math.cos(a), py = c + 104 * Math.sin(a);
        return (
          <ellipse key={`op${i}`}
            cx={px} cy={py} rx="7" ry="13"
            transform={`rotate(${i * 22.5 + 90} ${px} ${py})`}
            fill={SPECTRUM[i % 8]} opacity="0.15" />
        );
      })}

      {/* 5 upward triangles (cool) */}
      {[96, 74, 54, 37, 23].map((r, i) => (
        <polygon key={`up${i}`} points={tri(r, true)}
          stroke={COOL[i]} strokeWidth="1.1" fill={COOL[i]} opacity="0.12" />
      ))}

      {/* 4 downward triangles (warm) */}
      {[84, 63, 46, 31].map((r, i) => (
        <polygon key={`dn${i}`} points={tri(r, false)}
          stroke={WARM[i]} strokeWidth="1.1" fill={WARM[i]} opacity="0.12" />
      ))}

      {/* 8-petal inner lotus */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        const px = c + 15 * Math.cos(a), py = c + 15 * Math.sin(a);
        return (
          <ellipse key={`il${i}`}
            cx={px} cy={py} rx="4" ry="10"
            transform={`rotate(${i * 45 + 90} ${px} ${py})`}
            fill={SPECTRUM[i]} opacity="0.30" />
        );
      })}

      {/* Bindu */}
      <circle cx={c} cy={c} r="6" fill="#C84A10" opacity="0.80" />
      <circle cx={c} cy={c} r="2.8" fill="#E4E4E4" />
    </svg>
  );
});

/* ─── Rainbow Divider — spectrum horizontal separator ────────────────── */
export function RainbowDivider({ className = "" }: { className?: string }) {
  const spectrumGrad = "linear-gradient(90deg,#C84A10,#C84A10,#C84A10,#C84A10,#C84A10,#C84A10,#C84A10,#C84A10)";

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`} aria-hidden="true">
      {/* Top line */}
      <div style={{ height: "1.5px", width: "100%", background: spectrumGrad, opacity: 0.28, borderRadius: "2px" }} />

      {/* Center row */}
      <div className="flex items-center justify-center gap-1 px-4">
        {/* Left fade line */}
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg,transparent,rgba(101,101,101,0.4))" }} />

        {/* 7 colored gems */}
        {SPECTRUM.slice(0, 7).map((color, i) => (
          <svg key={i} width="10" height="10" viewBox="0 0 12 12" fill={color} opacity={i === 3 ? 0.9 : 0.65}>
            <path d="M6,0 L12,4 L9,12 L3,12 L0,4Z" />
          </svg>
        ))}

        {/* Centre lotus */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {[0,60,120,180,240,300].map(a => (
            <path key={a} d="M12,12 C10,8 9.5,5 12,2 C14.5,5 14,8 12,12Z" fill="#C84A10" opacity="0.75" transform={`rotate(${a} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="3" fill="#C84A10" opacity="0.9" />
        </svg>

        {/* 7 colored gems (mirrored) */}
        {[...SPECTRUM.slice(0, 7)].reverse().map((color, i) => (
          <svg key={i} width="10" height="10" viewBox="0 0 12 12" fill={color} opacity={i === 3 ? 0.9 : 0.65}>
            <path d="M6,0 L12,4 L9,12 L3,12 L0,4Z" />
          </svg>
        ))}

        {/* Right fade line */}
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg,rgba(101,101,101,0.4),transparent)" }} />
      </div>

      {/* Bottom line */}
      <div style={{ height: "1.5px", width: "100%", background: spectrumGrad, opacity: 0.28, borderRadius: "2px" }} />
    </div>
  );
}

/* ─── Prismatic burst — 24 spectrum radial rays ───────────────────────── */
export function PrismaticBurst({
  size = 200,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const burstColors = [
    "#C84A10","#C84A10","#C84A10","#C84A10","#C84A10","#C84A10",
    "#C84A10","#C84A10","#C84A10","#C84A10","#C84A10","#C84A10",
    "#C84A10","#999999","#C84A10","#C84A10","#C84A10","#C84A10",
    "#C84A10","#C84A10","#C84A10","#C84A10","#C84A10","#C84A10",
  ];
  const c = 100, r1 = 24, r2 = 94;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true" style={style}>
      {burstColors.map((color, i) => {
        const a = ((i * 15 - 90) * Math.PI) / 180;
        return (
          <line key={i}
            x1={c + r1 * Math.cos(a)} y1={c + r1 * Math.sin(a)}
            x2={c + r2 * Math.cos(a)} y2={c + r2 * Math.sin(a)}
            stroke={color} strokeWidth="2.2" opacity="0.38" strokeLinecap="round" />
        );
      })}
      <circle cx={c} cy={c} r={r1} stroke="#C84A10" strokeWidth="0.9" opacity="0.45" />
      <circle cx={c} cy={c} r="12" fill="#C84A10" opacity="0.55" />
      <circle cx={c} cy={c} r="6"  fill="#C84A10" opacity="0.90" />
      <circle cx={c} cy={c} r="2.5" fill="#FBFBFB" />
    </svg>
  );
}

/* ─── Gemstone Row — spectrum colored gems in a row ──────────────────── */
export function GemstoneRow({
  className = "",
  count = 7,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} aria-hidden="true">
      {SPECTRUM.slice(0, count).map((color, i) => {
        const isMid = i === Math.floor(count / 2);
        const sz = isMid ? 16 : 11;
        return (
          <svg key={i} width={sz} height={sz * 1.3} viewBox="0 0 12 16" fill={color} opacity={isMid ? 0.85 : 0.55}>
            {/* Gem shape: flat top, pointed bottom */}
            <path d="M2,0 L10,0 L12,5 L6,16 L0,5 Z" />
            <path d="M2,0 L10,0 L12,5 L10,0" fill="rgba(255,255,255,0.25)" />
          </svg>
        );
      })}
    </div>
  );
}

/* ─── Domain colored ring — for icon containers ──────────────────────── */
export function DomainRing({
  domain,
  size = 72,
  children,
  className = "",
}: {
  domain: string;
  size?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const v = DOMAIN_VIVID[domain] ?? DOMAIN_VIVID.archive;
  return (
    <div
      className={`relative flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${v.from}22 0%, ${v.to}18 100%)`,
        border: `2px solid ${v.accent}44`,
        boxShadow: `0 0 0 4px ${v.accent}12, 0 0 18px ${v.accent}22`,
      }}
      aria-hidden="true"
    >
      {/* Inner glow ring */}
      <div
        className="absolute inset-1 rounded-full"
        style={{ background: `radial-gradient(circle, ${v.accent}18 0%, transparent 70%)` }}
      />
      <div className="relative" style={{ color: v.accent }}>{children}</div>
    </div>
  );
}
