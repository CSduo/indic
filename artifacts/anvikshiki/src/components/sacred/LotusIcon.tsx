export function LotusIcon({ size = 24, className = "", opacity = 1, style }: { size?: number; className?: string; opacity?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" style={{ opacity, ...style }}>
      <path d="M20 32 C20 32 8 24 8 16 C8 12 12 8 16 10 C17.5 10.5 19 12 20 14 C21 12 22.5 10.5 24 10 C28 8 32 12 32 16 C32 24 20 32 20 32Z" fill="currentColor" opacity="0.18"/>
      <path d="M20 32 C20 32 8 24 8 16 C8 12 12 8 16 10 C17.5 10.5 19 12 20 14 C21 12 22.5 10.5 24 10 C28 8 32 12 32 16 C32 24 20 32 20 32Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M20 32 C20 32 11 20 14 12 C16 7 20 8 20 8 C20 8 24 7 26 12 C29 20 20 32 20 32Z" fill="currentColor" opacity="0.28"/>
      <path d="M20 32 C20 32 11 20 14 12 C16 7 20 8 20 8 C20 8 24 7 26 12 C29 20 20 32 20 32Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M20 32 L20 10" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <circle cx="20" cy="22" r="2.5" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}

export function LotusDivider({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-hidden="true" style={style}>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border-gold))" }} />
      <LotusIcon size={16} className="text-gold" />
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--border-gold), transparent)" }} />
    </div>
  );
}

export function OrnateCorner({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" style={style}>
      <path d="M2 2 L2 10 M2 2 L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}

export function TrishulIcon({ size = 20, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" style={style}>
      <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 7 C9 5 10 4 12 4 C14 4 15 5 15 7 L13 9 L11 9 Z" fill="currentColor" opacity="0.7"/>
      <path d="M6 6 C5 5 5 3 7 3 C8 3 9 4 8 6 L7 8 Z" fill="currentColor" opacity="0.5"/>
      <path d="M18 6 C19 5 19 3 17 3 C16 3 15 4 16 6 L17 8 Z" fill="currentColor" opacity="0.5"/>
      <line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

export function MandalaRing({ size = 48, className = "", spin = false, style }: { size?: number; className?: string; spin?: boolean; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`${className} ${spin ? "animate-spin-slow" : ""}`} aria-hidden="true" style={style}>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="0.6" opacity="0.2"/>
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle, i) => (
        <line
          key={i}
          x1="24" y1="24"
          x2={24 + 22 * Math.cos((angle * Math.PI) / 180)}
          y2={24 + 22 * Math.sin((angle * Math.PI) / 180)}
          stroke="currentColor" strokeWidth="0.5" opacity="0.2"
        />
      ))}
      <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}
