import { cn } from "@/lib/utils";

type OrnamentDividerProps = {
  variant?: "lotus" | "diamond" | "minimal" | "double";
  className?: string;
  style?: React.CSSProperties;
};

export function OrnamentDivider({ variant = "lotus", className, style }: OrnamentDividerProps) {
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
      <span className="h-px w-16 bg-[var(--border-gold)]" />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {mark}
      </svg>
      <span className="h-px w-16 bg-[var(--border-gold)]" />
      {variant === "double" ? <span className="hidden h-px w-16 bg-[var(--border-gold)] sm:block" /> : null}
    </div>
  );
}
