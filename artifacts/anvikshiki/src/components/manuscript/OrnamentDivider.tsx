import { cn } from "@/lib/utils";

type OrnamentDividerProps = {
  variant?: "lotus" | "diamond" | "minimal" | "double" | "floral" | "grand";
  className?: string;
  style?: React.CSSProperties;
};

export function OrnamentDivider({ className, style }: OrnamentDividerProps) {
  return (
    <div
      className={cn("flex items-center justify-center my-6 text-[var(--border)]", className)}
      style={style}
      aria-hidden="true"
    >
      <span className="h-px w-full max-w-xs bg-[var(--border)] opacity-60" />
    </div>
  );
}

