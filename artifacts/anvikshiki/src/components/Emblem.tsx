interface EmblemProps {
  size?: number;
  className?: string;
}

export function Emblem({ size = 40, className = "" }: EmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Open book base */}
      <path
        d="M8 52 Q8 48 12 46 L38 40 L38 68 Q24 68 12 62 Q8 60 8 56 Z"
        fill="var(--gold)"
        opacity="0.85"
      />
      <path
        d="M72 52 Q72 48 68 46 L42 40 L42 68 Q56 68 68 62 Q72 60 72 56 Z"
        fill="var(--gold)"
        opacity="0.7"
      />
      <path d="M38 40 L42 40 L42 68 L38 68 Z" fill="var(--gold)" />
      {/* Book spine line */}
      <line x1="40" y1="40" x2="40" y2="68" stroke="var(--gold)" strokeWidth="1.5" />
      
      {/* Banyan trunk */}
      <rect x="37" y="16" width="6" height="26" rx="2" fill="var(--gold)" opacity="0.9" />
      
      {/* Banyan canopy branches */}
      <path
        d="M40 16 Q30 10 20 14 Q25 8 35 10 Q38 8 40 16 Z"
        fill="var(--gold)"
        opacity="0.75"
      />
      <path
        d="M40 16 Q50 10 60 14 Q55 8 45 10 Q42 8 40 16 Z"
        fill="var(--gold)"
        opacity="0.65"
      />
      <path
        d="M40 20 Q32 15 24 18 Q28 12 37 15 Z"
        fill="var(--gold)"
        opacity="0.6"
      />
      <path
        d="M40 20 Q48 15 56 18 Q52 12 43 15 Z"
        fill="var(--gold)"
        opacity="0.55"
      />
      {/* Aerial roots */}
      <line x1="28" y1="25" x2="28" y2="35" stroke="var(--gold)" strokeWidth="1" opacity="0.6" />
      <line x1="52" y1="25" x2="52" y2="35" stroke="var(--gold)" strokeWidth="1" opacity="0.6" />

      {/* Diya lamp — center front */}
      <ellipse cx="40" cy="62" rx="5" ry="2.5" fill="var(--gold)" opacity="0.9" />
      <path d="M37 62 Q40 59 43 62" stroke="var(--gold)" strokeWidth="1.5" fill="none" />
      {/* Flame */}
      <ellipse cx="40" cy="57.5" rx="2" ry="3" fill="var(--rose)" opacity="0.85" />
      <path d="M39 57 Q40 54 41 57" fill="var(--gold)" opacity="0.9" />
    </svg>
  );
}
