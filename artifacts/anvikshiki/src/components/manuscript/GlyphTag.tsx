import { AnimalGlyph } from "./AnimalGlyph";
import { getDomainMeta } from "@/lib/domainMeta";
import { cn } from "@/lib/utils";

type GlyphTagProps = {
  domain?: string | null;
  label?: string;
  className?: string;
};

export function GlyphTag({ domain, label, className }: GlyphTagProps) {
  const meta = getDomainMeta(domain);
  return (
    <span className={cn("glyph-tag", className)} style={{ color: meta.color }}>
      <AnimalGlyph domain={meta.key} size={16} />
      <span style={{ color: "var(--ink-soft)" }}>{label || meta.label}</span>
    </span>
  );
}
