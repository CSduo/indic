import { cn } from "@/lib/utils";

type OrnamentDividerProps = {
  variant?: "lotus" | "diamond" | "minimal" | "double" | "floral" | "grand";
  className?: string;
  style?: React.CSSProperties;
};

/** Small inline lotus bud used inside dividers */
function LotusBud({ size = 18, opacity = 0.5 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* 6 petals */}
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path
          key={a}
          d="M12,12 C10.5,9 10,6 12,3 C14,6 13.5,9 12,12Z"
          fill="currentColor"
          opacity={opacity * 0.7}
          transform={`rotate(${a} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="2.8" fill="currentColor" opacity={opacity} />
    </svg>
  );
}

export function OrnamentDivider({ variant = "lotus", className, style }: OrnamentDividerProps) {
  if (variant === "floral") {
    return (
      <div
        className={cn("flex items-center justify-center gap-2 text-[var(--gold)]", className)}
        style={style}
        aria-hidden="true"
      >
        <span
          className="h-px flex-1 max-w-[72px]"
          style={{ background: "linear-gradient(90deg, transparent, var(--border-gold))" }}
        />
        <LotusBud size={13} opacity={0.32} />
        <span className="h-px w-6 bg-[var(--border-gold)] opacity-50" />
        <LotusBud size={18} opacity={0.55} />
        <span className="h-px w-6 bg-[var(--border-gold)] opacity-50" />
        <LotusBud size={13} opacity={0.32} />
        <span
          className="h-px flex-1 max-w-[72px]"
          style={{ background: "linear-gradient(90deg, var(--border-gold), transparent)" }}
        />
      </div>
    );
  }

  if (variant === "grand") {
    return (
      <div
        className={cn("flex flex-col items-center gap-1.5 text-[var(--gold)]", className)}
        style={style}
        aria-hidden="true"
      >
        {/* Top hairline */}
        <div
          className="h-px w-full max-w-md"
          style={{ background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)" }}
        />
        {/* Floral row */}
        <div className="flex items-center gap-2">
          <span
            className="h-px w-12"
            style={{ background: "linear-gradient(90deg, transparent, var(--border-gold))" }}
          />
          <LotusBud size={12} opacity={0.28} />
          <span className="h-px w-4 bg-[var(--border-gold)] opacity-40" />
          <LotusBud size={16} opacity={0.42} />
          <span className="h-px w-2 bg-[var(--border-gold)] opacity-35" />
          <LotusBud size={22} opacity={0.6} />
          <span className="h-px w-2 bg-[var(--border-gold)] opacity-35" />
          <LotusBud size={16} opacity={0.42} />
          <span className="h-px w-4 bg-[var(--border-gold)] opacity-40" />
          <LotusBud size={12} opacity={0.28} />
          <span
            className="h-px w-12"
            style={{ background: "linear-gradient(90deg, var(--border-gold), transparent)" }}
          />
        </div>
        {/* Bottom hairline */}
        <div
          className="h-px w-full max-w-md"
          style={{ background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)" }}
        />
      </div>
    );
  }

  const mark =
    variant === "diamond" ? (
      <path d="M12 3 21 12 12 21 3 12 12 3Z" fill="currentColor" opacity=".45" />
    ) : variant === "minimal" ? (
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".5" />
    ) : (
      <>
        <path d="M12 4c-2 4-5 6-9 6 4 0 7 2 9 6 2-4 5-6 9-6-4 0-7-2-9-6Z" fill="currentColor" opacity=".44" />
        <path d="M12 14c-1.7 2.8-4 4.3-7 4.3 3 0 5.3 1.2 7 3.7 1.7-2.5 4-3.7 7-3.7-3 0-5.3-1.5-7-4.3Z" fill="currentColor" opacity=".24" />
      </>
    );

  return (
    <div className={cn("flex items-center justify-center gap-3 text-[var(--gold)]", className)} style={style} aria-hidden="true">
      <span
        className="h-px w-16"
        style={{ background: "linear-gradient(90deg, transparent, var(--border-gold))" }}
      />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {mark}
      </svg>
      <span
        className="h-px w-16"
        style={{ background: "linear-gradient(90deg, var(--border-gold), transparent)" }}
      />
      {variant === "double" ? (
        <span className="hidden h-px w-16 bg-[var(--border-gold)] sm:block" />
      ) : null}
    </div>
  );
}
