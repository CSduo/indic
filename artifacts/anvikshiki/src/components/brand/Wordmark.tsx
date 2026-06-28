interface WordmarkProps {
  compact?: boolean;
  className?: string;
}

export function Wordmark({ compact = false, className = "" }: WordmarkProps) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <span
        className="block font-display font-semibold leading-[1.0] tracking-[-0.02em]"
        style={{
          color: "var(--gold)",
          fontSize: compact ? "clamp(16px, 4vw, 22px)" : "clamp(20px, 5vw, 28px)",
        }}
      >
        आन्वीक्षिकी
      </span>
      <span
        className="block font-ui font-semibold tracking-[0.22em] uppercase"
        style={{
          color: "var(--ink)",
          fontSize: compact ? "clamp(7px, 1.5vw, 9px)" : "clamp(8px, 2vw, 10px)",
          marginTop: "1px",
        }}
      >
        Ānvīkṣikī
      </span>
      {!compact && (
        <span
          className="block font-ui tracking-[0.06em]"
          style={{
            color: "var(--muted)",
            fontSize: "clamp(7px, 1.5vw, 9px)",
            marginTop: "2px",
          }}
        >
          Journal &amp; Research Platform
        </span>
      )}
    </div>
  );
}
