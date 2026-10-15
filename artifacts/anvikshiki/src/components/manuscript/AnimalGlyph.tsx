import React from "react";
import type { DomainKey } from "@/lib/domainMeta";
import { normalizeDomainKey } from "@/lib/domainMeta";
import { DOMAIN_ICON_MARKUP, type DomainIconKey } from "./domainIcons";

export type AnimalGlyphProps = {
  domain?: DomainKey | string | null;
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
};

const ICON_FOR_DOMAIN: Partial<Record<DomainKey, DomainIconKey>> = {
  civilization: "civilizational-thought",
  sanskrit: "sanskrit-studies",
};

/*
  The set is drawn on a 32-unit grid. A fixed stroke in grid units would be a
  hairline at 16px and a marker line at 120px, so the stroke is chosen in
  screen pixels (about 1.1px small, 2.2px large) and converted back to units.
*/
function strokeUnitsFor(size: number) {
  const px = Math.min(2.2, Math.max(1.1, 0.75 + size * 0.018));
  return Math.round(((px * 32) / size) * 100) / 100;
}

function markupFor(key: DomainKey) {
  const iconKey = ICON_FOR_DOMAIN[key] ?? (key in DOMAIN_ICON_MARKUP ? (key as DomainIconKey) : "compass");
  return DOMAIN_ICON_MARKUP[iconKey];
}

/** Domain icon. Colour comes from CSS: `.domain-glyph` sets the domain gray. */
export function AnimalGlyph({
  domain = "archive",
  size = 48,
  className,
  title,
  style,
}: AnimalGlyphProps) {
  const id = `domain-glyph-${React.useId()}`;
  const key = normalizeDomainKey(domain);
  const stroke = strokeUnitsFor(size);
  const labelled = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className ? `domain-glyph ${className}` : "domain-glyph"}
      style={style}
      role={labelled ? "img" : undefined}
      aria-labelledby={labelled ? id : undefined}
      aria-hidden={!labelled}
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {labelled && <title id={id}>{title}</title>}
      <g dangerouslySetInnerHTML={{ __html: markupFor(key) }} />
    </svg>
  );
}

export { AnimalGlyph as DomainIcon, AnimalGlyph as DomainGlyph };
