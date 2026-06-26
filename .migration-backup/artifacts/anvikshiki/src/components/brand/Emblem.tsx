interface EmblemProps { className?: string; size?: number; style?: React.CSSProperties; }

export function Emblem({ className = "", size = 58, style }: EmblemProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 120 120" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}
      role="img" aria-label="Ānvīkṣikī emblem — eye in lotus compass"
    >
      {/* Outer dashed orbit */}
      <circle cx="60" cy="60" r="56" stroke="var(--gold)" strokeWidth="0.6" opacity="0.22" strokeDasharray="2 9"/>

      {/* N compass needle (bright — primary) */}
      <path d="M60 4L57 14L60 20L63 14Z" fill="var(--gold)" opacity="0.82"/>
      <line x1="60" y1="20" x2="60" y2="27" stroke="var(--gold)" strokeWidth="1.1" opacity="0.42"/>

      {/* E compass needle (bright) */}
      <path d="M116 60L106 57L100 60L106 63Z" fill="var(--gold)" opacity="0.82"/>
      <line x1="100" y1="60" x2="93" y2="60" stroke="var(--gold)" strokeWidth="1.1" opacity="0.42"/>

      {/* S compass (dim) */}
      <path d="M60 116L57 106L60 100L63 106Z" fill="var(--gold)" opacity="0.32"/>
      <line x1="60" y1="100" x2="60" y2="93" stroke="var(--gold)" strokeWidth="0.8" opacity="0.28"/>

      {/* W compass (dim) */}
      <path d="M4 60L14 57L20 60L14 63Z" fill="var(--gold)" opacity="0.32"/>
      <line x1="20" y1="60" x2="27" y2="60" stroke="var(--gold)" strokeWidth="0.8" opacity="0.28"/>

      {/* Diagonal ornament dots + lines */}
      <circle cx="17" cy="17" r="1.8" fill="var(--gold)" opacity="0.28"/>
      <line x1="17" y1="17" x2="29" y2="29" stroke="var(--gold)" strokeWidth="0.6" opacity="0.16"/>
      <circle cx="103" cy="17" r="1.8" fill="var(--gold)" opacity="0.28"/>
      <line x1="103" y1="17" x2="91" y2="29" stroke="var(--gold)" strokeWidth="0.6" opacity="0.16"/>
      <circle cx="17" cy="103" r="1.8" fill="var(--gold)" opacity="0.28"/>
      <line x1="17" y1="103" x2="29" y2="91" stroke="var(--gold)" strokeWidth="0.6" opacity="0.16"/>
      <circle cx="103" cy="103" r="1.8" fill="var(--gold)" opacity="0.28"/>
      <line x1="103" y1="103" x2="91" y2="91" stroke="var(--gold)" strokeWidth="0.6" opacity="0.16"/>

      {/* Main outer ring */}
      <circle cx="60" cy="60" r="42" stroke="var(--gold)" strokeWidth="1.2" opacity="0.68"/>

      {/* 8 Lotus petals via rotation — cardinal brighter, diagonal softer */}
      {[0,45,90,135,180,225,270,315].map((a, i) => (
        <path key={a}
          d="M60 21C55 27 55 35 60 40C65 35 65 27 60 21Z"
          transform={`rotate(${a} 60 60)`}
          fill="var(--gold)" fillOpacity={i % 2 === 0 ? 0.22 : 0.13}
          stroke="var(--gold)" strokeWidth="0.6" opacity={i % 2 === 0 ? 0.6 : 0.4}
        />
      ))}

      {/* Inner ring */}
      <circle cx="60" cy="60" r="20" stroke="var(--gold)" strokeWidth="0.9" opacity="0.52"/>

      {/* Cardinal dots on inner ring */}
      <circle cx="60" cy="40" r="1.6" fill="var(--gold)" opacity="0.58"/>
      <circle cx="60" cy="80" r="1.6" fill="var(--gold)" opacity="0.58"/>
      <circle cx="40" cy="60" r="1.6" fill="var(--gold)" opacity="0.58"/>
      <circle cx="80" cy="60" r="1.6" fill="var(--gold)" opacity="0.58"/>

      {/* Teardrop / flame above eye */}
      <path d="M60 49C57.5 43 57.5 39 60 37C62.5 39 62.5 43 60 49Z"
        fill="var(--gold)" opacity="0.62" stroke="var(--gold)" strokeWidth="0.5"/>
      <line x1="60" y1="49" x2="60" y2="54" stroke="var(--gold)" strokeWidth="0.7" opacity="0.38"/>

      {/* Eye — almond */}
      <path d="M47 63C51 55 69 55 73 63C69 71 51 71 47 63Z"
        fill="var(--gold)" fillOpacity="0.07" stroke="var(--gold)" strokeWidth="1.1" opacity="0.78"/>
      {/* Upper lash accent */}
      <path d="M47 63C51 56 69 56 73 63" stroke="var(--gold)" strokeWidth="0.7" fill="none" opacity="0.45"/>
      {/* Iris */}
      <circle cx="60" cy="63" r="5.5" stroke="var(--gold)" strokeWidth="0.8" fill="var(--gold)" fillOpacity="0.1"/>
      {/* Pupil */}
      <circle cx="60" cy="63" r="2.5" fill="var(--gold)" opacity="0.68"/>
    </svg>
  );
}
