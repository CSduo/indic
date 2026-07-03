import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { AnimalGlyph } from "./AnimalGlyph";
import { OrnamentDivider } from "./OrnamentDivider";
import { FloralCorner, LotusBlossom } from "@/components/sacred/FloralDecor";
import type { DomainKey } from "@/lib/domainMeta";
import { cn } from "@/lib/utils";

type HeroPanelProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  glyph?: DomainKey | string;
  layout?: "split" | "overlay" | "centered";
  focal?: "left" | "center" | "right";
  className?: string;
  children?: React.ReactNode;
};

export function HeroPanel({
  eyebrow,
  title,
  subtitle,
  description,
  image,
  imageAlt = "",
  ctaPrimary,
  ctaSecondary,
  glyph,
  layout = "split",
  focal = "center",
  className,
  children,
}: HeroPanelProps) {
  const objectPosition = focal === "left" ? "object-left" : focal === "right" ? "object-right" : "object-center";
  const overlay = layout === "overlay";

  return (
    <section
      className={cn(
        "manuscript-frame overflow-hidden animate-page-rise",
        overlay ? "relative min-h-[420px]" : "grid lg:grid-cols-[1.02fr_.98fr]",
        className,
      )}
    >
      {image ? (
        <div className={cn("relative h-72 sm:h-96 lg:h-[520px] w-full", overlay && "absolute inset-0 h-full")}>
          <img src={image} alt={imageAlt} className={cn("absolute inset-0 h-full w-full object-cover", objectPosition)} loading="eager" />
          <div
            className={cn(
              "absolute inset-0",
              overlay
                ? "bg-gradient-to-r from-[var(--bg)]/92 via-[var(--bg)]/62 to-[var(--bg)]/18"
                : "bg-gradient-to-t from-[var(--bg)]/40 via-transparent to-transparent",
            )}
            aria-hidden="true"
          />
          {/* Floral corner overlays on image */}
          <FloralCorner position="tl" size={60} className="absolute top-2 left-2 text-[var(--gold)] opacity-60" />
          <FloralCorner position="br" size={60} className="absolute bottom-2 right-2 text-[var(--gold)] opacity-50" />
          {/* Subtle lotus watermark on image */}
          <div className="absolute bottom-4 right-4 pointer-events-none" aria-hidden="true">
            <LotusBlossom size={110} className="text-[var(--gold)] opacity-[0.08]" />
          </div>
        </div>
      ) : null}

      <div className={cn("relative z-10 flex flex-col justify-center p-6 md:p-10 lg:p-12", overlay && "max-w-2xl min-h-[420px]")}>
        {/* Decorative corner on text side */}
        <FloralCorner position="tr" size={52} className="absolute top-2 right-2 text-[var(--gold)] opacity-30" />

        {glyph ? (
          <div className="mb-5 animate-marginalia text-[var(--gold)]">
            <AnimalGlyph domain={glyph} size={48} />
          </div>
        ) : null}
        {eyebrow ? <p className="type-section-label mb-4">{eyebrow}</p> : null}
        <h1 className="font-display animate-ink-reveal text-[clamp(2.4rem,6vw,5.7rem)] leading-[.95] text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-4 font-display text-2xl leading-snug text-[var(--terracotta)] italic">{subtitle}</p> : null}
        <OrnamentDivider variant="floral" className="my-6 justify-start" />
        {description ? <p className="max-w-xl font-body text-lg leading-8 text-[var(--ink-soft)]">{description}</p> : null}
        {children}
        {(ctaPrimary || ctaSecondary) ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {ctaPrimary ? <Link href={ctaPrimary.href} className="btn-terracotta">{ctaPrimary.label} <ArrowRight size={14} /></Link> : null}
            {ctaSecondary ? <Link href={ctaSecondary.href} className="btn-ink">{ctaSecondary.label}</Link> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
