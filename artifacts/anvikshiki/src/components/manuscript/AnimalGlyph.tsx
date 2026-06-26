import type { DomainKey } from "@/lib/domainMeta";
import { normalizeDomainKey } from "@/lib/domainMeta";

type AnimalGlyphProps = {
  domain?: DomainKey | string | null;
  size?: number;
  className?: string;
  title?: string;
};

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Serpent() {
  return (
    <>
      <path {...strokeProps} d="M20 7c-5 1-8 4-8 8 0 5 8 3 8 8 0 4-6 5-10 2" />
      <path {...strokeProps} d="M19 7c3 1 4 3 3 5-1.5 3-7 2-8 5" />
      <circle cx="22" cy="8" r="1.2" fill="currentColor" opacity=".55" />
      <path {...strokeProps} d="M9 26c3-2 6-2 9 0" opacity=".55" />
    </>
  );
}

function Ram() {
  return (
    <>
      <path {...strokeProps} d="M10 16c0-5 4-8 8-6 4 2 4 8 0 10-4 2-8 0-8-4Z" />
      <path {...strokeProps} d="M10 15c-4-1-4-7 1-8 3 0 4 3 2 5" />
      <path {...strokeProps} d="M18 10c2-4 8-2 8 2 0 4-4 5-6 3" />
      <path {...strokeProps} d="M14 21v5M20 20v6M12 26h10" opacity=".7" />
    </>
  );
}

function Monkey() {
  return (
    <>
      <circle {...strokeProps} cx="14" cy="13" r="5" />
      <circle {...strokeProps} cx="8" cy="13" r="2.5" opacity=".7" />
      <path {...strokeProps} d="M18 18c3 1 5 3 5 6 0 2-2 3-4 2" />
      <path {...strokeProps} d="M12 18c-2 2-4 4-6 5M15 18v7" />
      <path {...strokeProps} d="M12 13h.1M16 13h.1M13 16c1 .6 2 .6 3 0" />
    </>
  );
}

function Crane() {
  return (
    <>
      <path {...strokeProps} d="M10 24c3-2 6-6 7-13" />
      <path {...strokeProps} d="M17 11c2-3 5-3 8-1-3 1-5 2-8 1Z" />
      <path {...strokeProps} d="M14 16c-4-2-8 0-9 4 4 1 7 0 10-3" />
      <path {...strokeProps} d="M13 24v4M17 23l2 5M10 28h10" opacity=".7" />
    </>
  );
}

function Spider() {
  return (
    <>
      <circle {...strokeProps} cx="16" cy="15" r="4.5" />
      <circle {...strokeProps} cx="16" cy="8" r="2.2" opacity=".75" />
      <path {...strokeProps} d="M12 13 6 9M12 16 5 16M12 18 7 23M20 13l6-4M20 16h7M20 18l5 5" />
      <path {...strokeProps} d="M14 11 10 6M18 11l4-5" opacity=".65" />
    </>
  );
}

function Elephant() {
  return (
    <>
      <path {...strokeProps} d="M7 19c0-6 4-10 10-10 5 0 8 3 8 8v6" />
      <path {...strokeProps} d="M10 13c-4 0-6 3-5 7 2 0 4-2 5-5" />
      <path {...strokeProps} d="M23 17c3 0 4 2 3 4-1 2-4 1-4-1" />
      <path {...strokeProps} d="M12 20v6M20 20v6M10 26h4M18 26h5" opacity=".7" />
      <path {...strokeProps} d="M24 13c2 2 2 5 0 7" />
    </>
  );
}

function Leopard() {
  return (
    <>
      <path {...strokeProps} d="M5 18c3-5 9-7 15-5 4 1 6 4 5 7" />
      <path {...strokeProps} d="M20 13c1-3 4-4 6-2M9 19l-2 6M16 19l1 6M7 25h4M16 25h4" />
      <path {...strokeProps} d="M23 20c3 0 4 2 3 4" opacity=".7" />
      <circle cx="12" cy="15" r=".9" fill="currentColor" opacity=".45" />
      <circle cx="16" cy="16" r=".8" fill="currentColor" opacity=".38" />
      <circle cx="19" cy="14" r=".75" fill="currentColor" opacity=".38" />
    </>
  );
}

function Bull() {
  return (
    <>
      <path {...strokeProps} d="M8 18c0-5 4-8 9-8 5 0 8 3 8 8 0 4-3 7-8 7s-9-3-9-7Z" />
      <path {...strokeProps} d="M10 11C8 7 5 7 3 10c2 0 4 1 5 3M23 11c2-4 5-4 7-1-2 0-4 1-5 3" />
      <path {...strokeProps} d="M13 18h.1M20 18h.1M14 22h5" />
    </>
  );
}

function Peacock() {
  return (
    <>
      <path {...strokeProps} d="M15 24c-1-6 1-10 4-13 2-2 5-2 7 0-3 0-5 2-6 5" />
      <path {...strokeProps} d="M12 22C8 17 6 12 8 7c4 2 6 6 6 12M16 22c5-5 7-10 6-15-4 2-7 6-7 12" opacity=".75" />
      <circle cx="8" cy="7" r="1" fill="currentColor" opacity=".45" />
      <circle cx="22" cy="7" r="1" fill="currentColor" opacity=".45" />
      <circle cx="15" cy="5" r="1" fill="currentColor" opacity=".35" />
      <path {...strokeProps} d="M15 24v4M12 28h6" />
    </>
  );
}

function Lion() {
  return (
    <>
      <circle {...strokeProps} cx="15" cy="15" r="6" />
      <path {...strokeProps} d="M9 15c-3-3-2-8 2-9M21 15c3-3 2-8-2-9M11 10l-3-4M19 10l3-4" opacity=".75" />
      <path {...strokeProps} d="M13 15h.1M17 15h.1M14 19c1 .7 2 .7 3 0M15 21v5" />
    </>
  );
}

function TwoBirds() {
  return (
    <>
      <path {...strokeProps} d="M5 17c4-5 8-5 12 0-4 1-8 1-12 0Z" />
      <path {...strokeProps} d="M16 14c4-4 8-3 11 1-4 1-7 1-11-1Z" />
      <path {...strokeProps} d="M9 17v5M21 15v6M7 22h5M19 21h5" opacity=".7" />
      <circle cx="13" cy="14" r=".8" fill="currentColor" opacity=".6" />
      <circle cx="24" cy="13" r=".8" fill="currentColor" opacity=".6" />
    </>
  );
}

function Bird() {
  return (
    <>
      <path {...strokeProps} d="M5 16c5-6 12-6 18 0-5 2-11 2-18 0Z" />
      <path {...strokeProps} d="M13 16c-1 4 1 7 5 8M19 14c2-2 5-2 8 0-2 1-4 2-7 1" />
      <path {...strokeProps} d="M17 24v4M14 28h7" opacity=".7" />
      <circle cx="20" cy="13" r=".8" fill="currentColor" opacity=".6" />
    </>
  );
}

function DefaultGlyph() {
  return (
    <>
      <path {...strokeProps} d="M16 4c-3 6-7 9-12 9 5 0 9 3 12 9 3-6 7-9 12-9-5 0-9-3-12-9Z" />
      <path {...strokeProps} d="M16 22v6" opacity=".65" />
      <circle cx="16" cy="29" r="1.3" fill="currentColor" opacity=".55" />
    </>
  );
}

function glyphFor(key: DomainKey) {
  switch (key) {
    case "philosophy": return <Serpent />;
    case "history": return <Ram />;
    case "psychology": return <Monkey />;
    case "sociology": return <Crane />;
    case "science": return <Spider />;
    case "geopolitics": return <Elephant />;
    case "papers": return <Leopard />;
    case "archive": return <Bull />;
    case "civilization":
    case "civilizational-thought":
    case "aesthetics":
    case "sanskrit":
    case "sanskrit-studies":
      return <Peacock />;
    case "political-theory": return <Lion />;
    case "translations": return <TwoBirds />;
    case "multimedia": return <Bird />;
    case "community": return <Crane />;
    case "submit": return <Leopard />;
    default: return <DefaultGlyph />;
  }
}

export function AnimalGlyph({ domain = "archive", size = 32, className, title }: AnimalGlyphProps) {
  const key = normalizeDomainKey(domain);
  const labelled = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {glyphFor(key)}
    </svg>
  );
}
