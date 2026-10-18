import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { SSR_CSS_STYLES } from "./lib/ssr-html";

/*
  The site uses three colours: pure white, pure black and one orange, the
  journal's canonical terracotta #C84A10. Neutral greys between white and black
  (r = g = b, at any opacity) are allowed for borders, muted text and quiet
  surfaces. Every other hue is a regression, wherever it is written: the
  stylesheet, a component's inline style or Tailwind class, the server-rendered
  fallback CSS or the HTML shell.
*/

const REPO = path.resolve(__dirname, "../../..");
const SPA = path.join(REPO, "artifacts/anvikshiki");
const ACCENT: [number, number, number] = [200, 74, 16];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(css|tsx?)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const FILES = [
  ...sourceFiles(path.join(SPA, "src")),
  path.join(SPA, "index.html"),
  path.join(SPA, "public/manifest.json"),
  path.join(SPA, "public/theme-init.js"),
  path.join(REPO, "artifacts/api-server/src/lib/ssr-html.ts"),
];

/** A colour literal: #rgb or #rrggbb (not an HTML entity such as &#039;), or rgb()/rgba(). */
const HEX = /(?<![\w&/-])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![\w-])/g;
const RGB = /rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?))?\s*\)/g;
const OTHER_FUNCTIONS = /\b(?:oklch|oklab|lab|lch|hwb)\(|\bhsla?\(\s*\d/g;
/** A Tailwind opacity modifier on the orange ("bg-[var(--gold)]/10"): a paler orange. */
const TRANSLUCENT_ACCENT = /[\w:-]*-\[(?:#c84a10|var\(--(?:gold|terracotta|accent)[\w-]*\))\]\/\d+/gi;
/** rgb() around a variable hides its fallback colour from the checks above. */
const RGB_OF_VARIABLE = /rgba?\(\s*var\(/g;
const TAILWIND_HUES = /\b(?:text|bg|border|ring|ring-offset|from|via|to|fill|stroke|decoration|outline|shadow|accent|caret|divide|placeholder)-(?:red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|stone)-\d{2,3}\b/g;

/**
 * Regions the owner chose to keep in their original colours, between
 * `palette-exception:start` and `palette-exception:end` comments. Only the
 * home page's aphorism strip and the flower decorations are allowed (tested
 * below).
 */
const EXCEPTION = /\/\*\s*palette-exception:start[\s\S]*?palette-exception:end\s*\*\//g;

function isNeutral([r, g, b]: number[]): boolean {
  return r === g && g === b;
}

function isAccent([r, g, b]: number[]): boolean {
  return r === ACCENT[0] && g === ACCENT[1] && b === ACCENT[2];
}

/** Every colour in `text` that is not white, black, a neutral grey or the solid accent. */
export function offPaletteColours(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(HEX)) {
    const hex = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    if (!isNeutral(rgb) && !isAccent(rgb)) found.push(match[0]);
  }
  for (const match of text.matchAll(RGB)) {
    const rgb = [match[1], match[2], match[3]].map(Number);
    const alpha = match[4];
    // A translucent orange is a second, paler orange: only neutrals may fade.
    const opaque = alpha === undefined || Number.parseFloat(alpha) >= (alpha.endsWith("%") ? 100 : 1);
    if (!isNeutral(rgb) && !(isAccent(rgb) && opaque)) found.push(match[0]);
  }
  for (const match of text.matchAll(OTHER_FUNCTIONS)) found.push(match[0]);
  for (const match of text.matchAll(TRANSLUCENT_ACCENT)) found.push(match[0]);
  for (const match of text.matchAll(RGB_OF_VARIABLE)) found.push(match[0]);
  for (const match of text.matchAll(TAILWIND_HUES)) found.push(match[0]);
  return found;
}

describe("the three-colour palette", () => {
  it("recognises what is and is not allowed", () => {
    expect(offPaletteColours("color: #FFF; background: #000000; border: #E5E5E5; fill: #C84A10;")).toEqual([]);
    expect(offPaletteColours("rgba(0, 0, 0, 0.4) rgba(255,255,255,.1) rgb(200, 74, 16) &#039; href=\"#references\"")).toEqual([]);
    expect(offPaletteColours("color: #B45309; background: #FEF3C7")).toEqual(["#B45309", "#FEF3C7"]);
    expect(offPaletteColours("rgba(201,152,58,0.3) rgba(200,74,16,0.2)")).toEqual(["rgba(201,152,58,0.3)", "rgba(200,74,16,0.2)"]);
    expect(offPaletteColours('className="text-amber-800 bg-yellow-50 ring-offset-red-600"')).toEqual(["text-amber-800", "bg-yellow-50", "ring-offset-red-600"]);
    expect(offPaletteColours("color: oklch(57.7% .245 27.325)")).toEqual(["oklch("]);
    expect(offPaletteColours('className="hover:bg-[var(--gold)]/10 bg-[#c84a10]/20 border-[var(--border)]/40"')).toEqual(["hover:bg-[var(--gold)]/10", "bg-[#c84a10]/20"]);
    expect(offPaletteColours("background: rgba(var(--terracotta-rgb, 180,80,60),0.08)")).toEqual(["rgba(var("]);
  });

  it("uses no other colour anywhere in the site's styles, components or shell", () => {
    const problems = FILES.flatMap((file) => {
      const colours = offPaletteColours(fs.readFileSync(file, "utf8").replace(EXCEPTION, ""));
      return colours.length ? [`${path.relative(REPO, file)}: ${[...new Set(colours)].join(", ")}`] : [];
    });
    expect(problems).toEqual([]);
  });

  it("makes two exceptions: the aphorism strip and the flower decorations keep their original colours", () => {
    const regions = FILES.flatMap((file) =>
      [...fs.readFileSync(file, "utf8").matchAll(EXCEPTION)].map((m) => ({ file: path.relative(REPO, file), text: m[0] })));
    expect([...new Set(regions.map((r) => r.file))].sort()).toEqual([
      "artifacts/anvikshiki/src/components/sacred/FloralDecor.tsx",
      "artifacts/anvikshiki/src/index.css",
    ]);
    for (const region of regions) {
      const code = region.text.replace(/\/\*[\s\S]*?\*\//g, "");
      if (region.file.endsWith(".tsx")) {
        // Only the falling flowers' colours and the flower shapes that use them.
        expect(code).toContain("FLOWER_COLORS_AMBIENT");
        expect(code).not.toMatch(/export /);
        continue;
      }
      // The aphorism strip's rules, or the flower gold token in each theme.
      for (const [, selector, body] of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const name = selector.trim().replace(/^@media[^{]*\{?\s*/, "");
        if (/^:root$|^\[data-theme="dark"\]$/.test(name)) {
          expect(body.trim()).toMatch(/^--flower-gold:\s*#[0-9A-Fa-f]{6};$/);
        } else {
          expect(name).toMatch(/^\.home-wisdom-[\w-]+(?:,\s*\.home-wisdom-[\w-]+)*$/);
        }
      }
    }
  });

  it("points every accent token at the one orange, in both themes", () => {
    const css = fs.readFileSync(path.join(SPA, "src/index.css"), "utf8");
    const declared = (name: string) => [...css.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, "g"))].map((m) => m[1].trim().toUpperCase());
    for (const token of ["accent", "gold", "gold-bright", "gold-soft", "terracotta", "terracotta-soft"]) {
      const values = declared(token);
      expect(values.length, token).toBeGreaterThanOrEqual(2);
      expect(new Set(values), token).toEqual(new Set(["#C84A10"]));
    }
  });

  it("gives the server-rendered fallback the same accent and a dark theme the site actually sets", () => {
    expect(offPaletteColours(SSR_CSS_STYLES)).toEqual([]);
    expect(SSR_CSS_STYLES).not.toContain("--ssr-gold");
    expect(SSR_CSS_STYLES.match(/--ssr-accent:\s*#C84A10;/g)).toHaveLength(2);
    // theme-init.js sets data-theme on <html>; a .dark class is never set.
    expect(SSR_CSS_STYLES).toContain('html[data-theme="dark"]');
  });
});
