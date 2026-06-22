interface EmblemProps {
  className?: string;
  size?: number;
}

export function Emblem({ className = "", size = 58 }: EmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Anvikshiki emblem — lamp and book"
    >
      {/* Peacock feather fan at top */}
      <ellipse cx="60" cy="28" rx="22" ry="14" fill="none" stroke="var(--gold)" strokeWidth="1.8" />
      <ellipse cx="60" cy="28" rx="14" ry="8" fill="none" stroke="var(--gold)" strokeWidth="1.4" opacity="0.7" />
      <ellipse cx="60" cy="28" rx="7" ry="4" fill="var(--gold)" opacity="0.3" />
      {/* Fan rays */}
      {[
        [60, 28, 38, 18], [60, 28, 42, 14], [60, 28, 50, 11],
        [60, 28, 60, 10], [60, 28, 70, 11], [60, 28, 78, 14], [60, 28, 82, 18]
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      ))}

      {/* Diya lamp body */}
      <path
        d="M46 72 Q46 62 60 60 Q74 62 74 72 L72 78 Q60 82 48 78 Z"
        fill="var(--gold)"
        opacity="0.25"
        stroke="var(--gold)"
        strokeWidth="1.8"
      />
      {/* Wick */}
      <line x1="60" y1="60" x2="60" y2="55" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
      {/* Flame */}
      <path
        d="M60 55 C64 49 66 44 60 38 C54 44 56 49 60 55 Z"
        fill="var(--rose)"
        className="emblem-lamp"
      />
      <path
        d="M60 54 C62 50 63 47 60 43 C57 47 58 50 60 54 Z"
        fill="var(--gold)"
        opacity="0.8"
        className="emblem-lamp"
      />

      {/* Open book base */}
      <path
        d="M32 90 Q60 84 88 90 L88 100 Q60 96 32 100 Z"
        fill="var(--gold)"
        opacity="0.15"
        stroke="var(--gold)"
        strokeWidth="1.6"
      />
      <line x1="60" y1="84" x2="60" y2="100" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Book page lines left */}
      <line x1="38" y1="89" x2="55" y2="87" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <line x1="38" y1="93" x2="55" y2="91" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      {/* Book page lines right */}
      <line x1="65" y1="87" x2="82" y2="89" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <line x1="65" y1="91" x2="82" y2="93" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />

      {/* Decorative dots */}
      <circle cx="42" cy="72" r="3" fill="var(--rose)" opacity="0.6" />
      <circle cx="78" cy="72" r="3" fill="var(--rose)" opacity="0.6" />
    </svg>
  );
}
