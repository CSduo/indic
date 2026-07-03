# ĀNVĪKṢIKĪ Homepage Implementation Plan

**Deliverable:** Replit-ready frontend architecture and creative code library  
**Status:** Planning only — no application code has been modified  
**Prepared:** 28 June 2026  
**Visual target:** A premium, cinematic, living ancient archive

---

## 0. Executive implementation contract

This document is the build specification for replacing the current homepage with a manuscript-framed experience centered on a clearly visible hero video. It is intentionally prescriptive: filenames, component boundaries, state models, CSS selectors, responsive rules, fallbacks, budgets, and acceptance tests are defined before implementation.

### Non-negotiable visual rules

1. The hero video remains the dominant visual. Never place a page-wide white, ivory, parchment, blur, or “mist” layer over it.
2. Readability treatment is local to the text safe zone. On desktop it may occupy at most the left 48% of the hero and must fade to fully transparent before the subject safe zone.
3. The traveler, architecture, and important animals in the source video must not sit beneath copy, controls, or decorative overlays.
4. Decorative animal layers are used only when they add depth to an already coherent scene. They are not stickers.
5. All illustration assets must share a sepia/terracotta/olive palette, clean alpha edges, believable scale, and a common implied light source.
6. Featured Essays is absent from this homepage until real essays exist. No empty carousel, placeholder cards, or invented content.
7. Motion is slow and scarce. Video supplies primary motion; CSS atmosphere supplies only secondary motion.
8. Every core path—Explore Journal, Submit Work, Browse by Domain, Join Community, Enter Archive, Knowledge Map, Newsletter—works with JavaScript disabled except enhancements such as animated reveals.
9. Reduced-motion mode replaces video and ambient animation with the static poster.
10. Visual polish may never compromise semantic HTML, keyboard access, contrast, loading stability, or mobile performance.

### Definition of “ready to implement”

Implementation may start only after the Phase A audit gate records:

- actual framework and version;
- homepage route and layout ownership;
- styling strategy;
- router/link component;
- public asset URL convention;
- existing header/footer reuse decision;
- confirmed destination routes for all CTAs;
- dimensions and formats of the ten Phase 1 asset families;
- hero video codecs, duration, file size, and subject safe zones.

---

# 1. PROJECT AUDIT

## 1.1 Evidence from the supplied workspace

The requested source audit cannot yet identify a framework because no application source was supplied in this workspace.

| Audit item | Observed evidence | Conclusion |
|---|---|---|
| Workspace contents | `outputs/` and `work/` only | No Replit project is present |
| Package manifest | No `package.json` found | Framework and dependencies are unknown |
| Build configuration | No Vite, Next.js, Tailwind, or equivalent config found | Build tool is unknown |
| Source directory | No `src/`, `app/`, `pages/`, or HTML entry found | Homepage file and component structure are unknown |
| Routes | No route files found | URL destinations cannot be verified |
| Styling | No CSS files found | CSS strategy and tokens are unknown |
| Existing assets | Only three visual reference PNGs were supplied externally | Phase 1 sheets and hero video are unavailable |
| Reference dimensions | Each supplied PNG is 1055 × 1491 | References are portrait compositions, not production-ready desktop assets |

Therefore, all paths in this document are a **provisional React + Vite implementation track**, chosen because it is a common Replit frontend arrangement and because its component/CSS examples are directly portable. They are not a claim about the missing codebase. The audit gate below determines the actual mapping before any file is changed.

## 1.2 Reference-image analysis

### Reference 1 — hero and featured-card language

- Cream manuscript frame with a precise double-line ornamental border.
- Header is light, calm, and horizontal; the logo lockup carries most brand character.
- Hero copy sits in a protected left zone; the illustrated world carries visual weight on the right.
- Terracotta primary CTA and parchment secondary CTA.
- Six compact domain chips below the hero copy.
- A narrow animal-symbol frieze closes the hero.
- Serif typography is spacious rather than “fantasy.”

### Reference 2 — domain and action language

- A six-card, three-by-two domain grid.
- Domain animal icons are symbolic and centrally composed.
- Card frames use fine nested rules and clipped/ornamented corners.
- Three large horizontal actions use terracotta, olive, and parchment treatments.
- Decorative flora remains peripheral; content stays readable.

### Reference 3 — newsletter and footer language

- Newsletter is a framed parchment inset rather than a generic dark signup band.
- Footer shifts to deep olive for closure and contrast.
- Navigation is organized into Explore and Community columns.
- Animal glyphs establish rhythm near the footer transition.
- Ornament works as hierarchy and punctuation, not continuous clutter.

### Synthesis

The site should use **controlled maximalism**: richly framed section boundaries, but quiet content interiors. The hero is cinematic; following sections behave more like editorial plates. Ornament density should decrease around body copy and increase at transitions, corners, and action boundaries.

## 1.3 Missing inputs register

Before implementation, add or link:

1. the actual Replit project or repository;
2. desktop hero video in WebM and MP4;
3. hero poster;
4. mobile hero poster;
5. animal layer sheet or individual transparent exports;
6. wind/dust/leaves overlay sheet;
7. header/logo ornament sheet;
8. domain icon sheet or individual SVG/PNG exports;
9. CTA plate sheet;
10. hero bottom glyph frieze;
11. scholar/traveler detail sheet;
12. architecture extension sheet;
13. final logo wordmark and pronunciation/orthography rules;
14. real navigation and CTA routes;
15. licensed font files or approved web-font source.

## 1.4 Mandatory stack-detection gate

Run these read-only checks in the Replit Shell before planning edits:

```bash
pwd
find . -maxdepth 3 -type f \
  \( -name "package.json" -o -name "vite.config.*" -o -name "next.config.*" \
  -o -name "astro.config.*" -o -name "tailwind.config.*" -o -name "*.css" \) \
  | sort
cat package.json
find src app pages public -maxdepth 3 -type f 2>/dev/null | sort
```

Record the result in `docs/homepage-audit.md`:

```md
framework:
framework_version:
build_command:
homepage_route:
homepage_file:
root_layout:
router_link_component:
style_system:
global_css_entry:
public_asset_base:
existing_header:
existing_footer:
animation_dependencies:
test_commands:
```

### Path adaptation matrix

| Detected stack | Homepage | Shared layout | Static assets | Navigation |
|---|---|---|---|---|
| Vite + React | `src/pages/HomePage.jsx` or current route component | `src/App.jsx` | `public/assets/...` | Existing router `Link`; plain `<a>` if no router |
| Next.js App Router | `app/page.tsx` | `app/layout.tsx` | `public/assets/...` | `next/link` |
| Next.js Pages Router | `pages/index.tsx` | `pages/_app.tsx` | `public/assets/...` | `next/link` |
| Astro | `src/pages/index.astro` | `src/layouts/...` | `public/assets/...` | Native `<a>` |
| Plain HTML | Existing `index.html` | N/A | `assets/...` | Native `<a>` |

Do not install React, Tailwind, Framer Motion, GSAP, or an icon package merely to match this plan. Adapt to what exists. The reference implementation uses React plus plain CSS and needs no animation library.

## 1.5 Safe integration policy

- Create a feature branch or Replit checkpoint before edits.
- Preserve unrelated local changes.
- Copy the current homepage markup into a temporary audit note; do not maintain a duplicate production route.
- Reuse existing app-level header/footer only if their API and ownership are stable.
- Add new styles beneath `.anvikshiki-home` to avoid global leakage.
- Implement structure before decorative layers.
- Add actual route destinations before polishing hover states.
- Remove the old Featured Essays render call rather than hiding it with CSS; if other pages use the component, keep the component file.

---

# 2. TARGET HOMEPAGE ARCHITECTURE

## 2.1 Page sequence

```text
SiteHeader
└── brand / desktop navigation / utility actions / mobile drawer

main#main-content
├── HeroSection
│   ├── HeroMedia (video, poster, local readability scrim)
│   ├── WindAtmosphere
│   ├── HeroContent
│   │   ├── eyebrow / headline / body
│   │   ├── primary + secondary CTA
│   │   └── DomainChips
│   └── AnimalGlyphFrieze
├── BrowseByDomain
├── HomeCTAStack
├── KnowledgeMapPreview (optional, data-backed only)
└── NewsletterSection

PremiumFooter
```

## 2.2 Provisional React composition

```jsx
// src/pages/HomePage.jsx
import { SiteHeader } from "../components/layout/SiteHeader";
import { PremiumFooter } from "../components/layout/PremiumFooter";
import {
  HeroSection,
  BrowseByDomain,
  HomeCTAStack,
  KnowledgeMapPreview,
  NewsletterSection,
} from "../components/home";
import "../styles/anvikshiki.home.css";

export function HomePage() {
  return (
    <div className="anvikshiki-home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <BrowseByDomain />
        <HomeCTAStack />
        <KnowledgeMapPreview />
        <NewsletterSection />
      </main>
      <PremiumFooter />
    </div>
  );
}
```

`KnowledgeMapPreview` should render only if real nodes/routes exist. A useful conditional is:

```jsx
{knowledgeNodes.length >= 4 && <KnowledgeMapPreview nodes={knowledgeNodes} />}
```

No `FeaturedEssays` import or render belongs on this page.

## 2.3 Data ownership

- Content labels, descriptions, and destinations live in `src/data/homepageContent.js`.
- Asset paths and crop metadata live in `public/assets/anvikshiki/phase-1/assets-manifest.json`.
- Components render data; they do not embed route arrays.
- Visual constants live in CSS custom properties.
- Motion preference and intersection reveal logic live in utilities/hooks.

---

# 3. ASSET FOLDER STRUCTURE

Use public assets because video, posters, and JSON must be addressable by stable URLs without bundling multi-megabyte files into JavaScript.

```text
public/
└── assets/
    └── anvikshiki/
        └── phase-1/
            ├── manifest/
            │   └── assets-manifest.json
            ├── hero/
            │   ├── hero-world-desktop.webm
            │   ├── hero-world-desktop.mp4
            │   ├── hero-poster-desktop.avif
            │   ├── hero-poster-desktop.webp
            │   ├── hero-poster-mobile.avif
            │   └── hero-poster-mobile.webp
            ├── animals/
            │   ├── animal-layers@2x.webp
            │   ├── leopard.webp
            │   ├── falcon.webp
            │   ├── snake.webp
            │   └── deer.webp
            ├── atmosphere/
            │   ├── wind-lines.webp
            │   ├── dust-flecks.webp
            │   └── leaf-particles.webp
            ├── ornaments/
            │   ├── header-ornaments.svg
            │   ├── lotus-divider.svg
            │   ├── manuscript-corners.svg
            │   └── animal-glyph-frieze.svg
            ├── domains/
            │   ├── history.svg
            │   ├── philosophy.svg
            │   ├── civilizations.svg
            │   ├── religion.svg
            │   ├── society.svg
            │   └── arts-literature.svg
            ├── cta/
            │   ├── plate-terracotta.webp
            │   ├── plate-olive.webp
            │   └── plate-parchment.webp
            ├── character/
            │   └── traveler-detail.webp
            └── architecture/
                └── background-extension.webp
```

Prefer individual transparent exports over runtime sprite cropping. Retain the source sheet only as an archival file outside production or use it as a build input. SVG is preferred for flat ornaments and glyphs; AVIF/WebP for painterly imagery; WebM plus MP4 for video.

## 3.1 Detailed asset map

| Suggested file | Purpose and placement | Crop / class | Motion | Desktop / mobile / fallback |
|---|---|---|---|---|
| `hero-world-desktop.webm` + `.mp4` | Primary hero world | 16:9 or wider; `.hero-media__video` | Native loop only | Desktop/tablet; source order WebM then MP4 |
| `hero-poster-desktop.avif` | First paint and video failure | Match video frame exactly; `.hero-media__poster` | 500ms opacity crossfade | Desktop first paint, reduced motion, failure |
| `hero-poster-mobile.avif` | Mobile composition with subject shifted away from text | 4:5 recommended; `.hero-media__poster--mobile` | Static | ≤767px and Save-Data |
| `animal-layers@2x.webp` | Archival layer sheet only | Do not render whole sheet | None | Source for clean per-animal exports |
| `leopard.webp` | Optional foreground depth at lower right | Tight alpha crop; `.animal--leopard` | 6s, 1–2px breathing | Desktop only unless embedded in poster |
| `falcon.webp` | Optional upper-sky detail | Wings fully contained; `.animal--falcon` | One slow 16s drift | Hide on small/mobile |
| `snake.webp` | Optional extreme-right foreground | Head separated from CTA safe zone; `.animal--snake` | 8s, ≤1deg sway | Desktop large only |
| `deer.webp` | Transition/frieze punctuation | Tight crop; `.animal--deer` | None or reveal only | Desktop/tablet; hide if crowded |
| `wind-lines.webp` | Transparent hero atmosphere | Seam-safe crop; `.wind-layer--lines` | Translate3d 30s | Desktop; opacity halved tablet; absent mobile |
| `dust-flecks.webp` | Sparse ambient particles | Transparent, no baked background; `.wind-layer--dust` | Translate/opacity 18s | Desktop/tablet; absent reduced motion |
| `leaf-particles.webp` | At most 3–5 leaves | Export individual leaves if possible; `.wind-layer--leaves` | 22s path-like drift | Desktop only |
| `header-ornaments.svg` | Logo arch, separators, flourishes | Split into named SVGs if sprite; `.brand-mark` | None | All sizes, simplified mobile |
| domain SVG files | Chips and six domain cards | Same 48×48 viewBox; `.domain-icon` | Hover translateY(-2px) | All sizes |
| CTA plate files | Texture inside large action bars | 3-slice-safe or background crop; `.home-action__plate` | Background-position 600ms | Desktop; subtler/no texture mobile |
| `animal-glyph-frieze.svg` | Hero-to-content transition | Horizontal 1920×96 viewBox; `.glyph-frieze` | Reveal, not continuous marquee | All sizes; center-crop mobile |
| `traveler-detail.webp` | Optional high-resolution overlay if video lacks detail | Exact registration to poster/video; `.traveler-detail` | None | Only if registration is pixel-accurate |
| `background-extension.webp` | Extends architecture into wide screens | Paint-safe edge; `.hero-media__extension` | ≤12px parallax | ≥1440px only |

### Asset quality rules

- Inspect transparent edges at 200% over black and white.
- Remove matte halos and accidental baked parchment backgrounds.
- Do not color-correct individual assets independently in CSS. Normalize source exports.
- Match grain scale across assets; oversized grain exposes compositing.
- Keep icon stroke weights consistent at rendered 24px and 48px sizes.
- Never stretch painterly imagery; use `object-fit: cover` plus recorded focal points.
- Do not use `mix-blend-mode` as a repair strategy. It behaves unpredictably and may destroy contrast.
- Do not animate a detached animal over a moving video unless it registers naturally to the scene.
- Prefer deleting a decorative layer over accepting an obviously synthetic composite.

---

# 4. ASSET MANIFEST

## 4.1 JSON example

```json
{
  "version": 1,
  "basePath": "/assets/anvikshiki/phase-1",
  "hero": {
    "video": {
      "webm": "hero/hero-world-desktop.webm",
      "mp4": "hero/hero-world-desktop.mp4"
    },
    "poster": {
      "desktopAvif": "hero/hero-poster-desktop.avif",
      "desktopWebp": "hero/hero-poster-desktop.webp",
      "mobileAvif": "hero/hero-poster-mobile.avif",
      "mobileWebp": "hero/hero-poster-mobile.webp"
    },
    "focalPoint": {
      "desktop": "68% 48%",
      "tablet": "64% 50%",
      "mobile": "62% 42%"
    },
    "safeZones": {
      "desktopText": { "x": 0.05, "y": 0.13, "w": 0.39, "h": 0.70 },
      "mobileText": { "x": 0.06, "y": 0.04, "w": 0.88, "h": 0.42 }
    }
  },
  "domains": {
    "history": "domains/history.svg",
    "philosophy": "domains/philosophy.svg",
    "civilizations": "domains/civilizations.svg",
    "religion": "domains/religion.svg",
    "society": "domains/society.svg",
    "artsLiterature": "domains/arts-literature.svg"
  },
  "ornaments": {
    "header": "ornaments/header-ornaments.svg",
    "lotus": "ornaments/lotus-divider.svg",
    "corners": "ornaments/manuscript-corners.svg",
    "frieze": "ornaments/animal-glyph-frieze.svg"
  },
  "atmosphere": {
    "wind": "atmosphere/wind-lines.webp",
    "dust": "atmosphere/dust-flecks.webp",
    "leaves": "atmosphere/leaf-particles.webp"
  },
  "cta": {
    "terracotta": "cta/plate-terracotta.webp",
    "olive": "cta/plate-olive.webp",
    "parchment": "cta/plate-parchment.webp"
  },
  "optionalLayers": {
    "leopard": "animals/leopard.webp",
    "falcon": "animals/falcon.webp",
    "snake": "animals/snake.webp",
    "deer": "animals/deer.webp",
    "traveler": "character/traveler-detail.webp",
    "architecture": "architecture/background-extension.webp"
  }
}
```

## 4.2 Loader and URL safety

```js
// src/data/anvikshikiAssets.js
const BASE = "/assets/anvikshiki/phase-1";

export function assetUrl(relativePath) {
  if (!relativePath || relativePath.startsWith("http") || relativePath.includes("..")) {
    throw new Error(`Invalid Anvikshiki asset path: ${relativePath}`);
  }
  return `${BASE}/${relativePath}`;
}

export async function loadAssetManifest(signal) {
  const response = await fetch(`${BASE}/manifest/assets-manifest.json`, {
    signal,
    cache: "force-cache",
  });
  if (!response.ok) throw new Error(`Asset manifest failed: ${response.status}`);
  return response.json();
}
```

Core hero URLs should also be available as static constants so a failed manifest request cannot blank the hero.

---

# 5. DESIGN TOKEN SYSTEM

Create `src/styles/anvikshiki.tokens.css` and load it once before homepage CSS.

```css
:root {
  /* Color */
  --av-ink-950: #241b14;
  --av-ink-900: #2e231a;
  --av-ink-700: #574534;
  --av-sepia-600: #765f47;
  --av-sepia-400: #a88d69;
  --av-parchment-50: #fbf6e9;
  --av-parchment-100: #f4ead6;
  --av-parchment-200: #ead9bb;
  --av-parchment-300: #d8bd91;
  --av-terracotta-500: #a85f3f;
  --av-terracotta-600: #8d4b33;
  --av-terracotta-700: #713a29;
  --av-olive-500: #69705a;
  --av-olive-600: #565d49;
  --av-olive-800: #373c31;
  --av-gold-400: #c4a76b;
  --av-gold-500: #aa8750;
  --av-focus: #1e66d0;
  --av-error: #8b2f2f;

  /* Alpha colors */
  --av-rule: rgb(113 77 43 / 42%);
  --av-rule-soft: rgb(113 77 43 / 20%);
  --av-paper-glass: rgb(244 234 214 / 86%);
  --av-hero-scrim: rgb(31 23 17 / 44%);

  /* Font families: replace with licensed project fonts after audit */
  --av-font-display: "Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --av-font-body: "Libre Baskerville", "Baskerville", Georgia, serif;
  --av-font-ui: Inter, ui-sans-serif, system-ui, sans-serif;

  /* Fluid type */
  --av-text-xs: 0.75rem;
  --av-text-sm: 0.875rem;
  --av-text-base: clamp(1rem, 0.96rem + 0.18vw, 1.125rem);
  --av-text-lg: clamp(1.125rem, 1.03rem + 0.38vw, 1.375rem);
  --av-text-xl: clamp(1.4rem, 1.17rem + 0.9vw, 2rem);
  --av-text-2xl: clamp(2rem, 1.45rem + 2.2vw, 3.5rem);
  --av-text-hero: clamp(3rem, 1.7rem + 5vw, 6.75rem);

  /* Spacing */
  --av-space-1: 0.25rem;
  --av-space-2: 0.5rem;
  --av-space-3: 0.75rem;
  --av-space-4: 1rem;
  --av-space-5: 1.5rem;
  --av-space-6: 2rem;
  --av-space-7: 3rem;
  --av-space-8: 4rem;
  --av-space-9: 6rem;
  --av-space-10: 8rem;
  --av-section-y: clamp(4.5rem, 8vw, 8rem);

  /* Geometry */
  --av-radius-sm: 0.375rem;
  --av-radius-md: 0.75rem;
  --av-radius-lg: 1.25rem;
  --av-border-thin: 1px;
  --av-border-strong: 2px;
  --av-content: 75rem;
  --av-reading: 43rem;
  --av-header-h: 5.5rem;

  /* Shadows */
  --av-shadow-1: 0 1px 2px rgb(45 31 20 / 10%);
  --av-shadow-2: 0 12px 36px rgb(45 31 20 / 12%);
  --av-shadow-inset: inset 0 0 0 1px rgb(255 255 255 / 28%);

  /* Motion */
  --av-dur-fast: 160ms;
  --av-dur-base: 280ms;
  --av-dur-slow: 700ms;
  --av-dur-cinematic: 1200ms;
  --av-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --av-ease-cinematic: cubic-bezier(0.22, 1, 0.36, 1);

  /* Layers */
  --av-z-base: 0;
  --av-z-media: 1;
  --av-z-atmosphere: 2;
  --av-z-content: 3;
  --av-z-header: 20;
  --av-z-drawer: 30;
  --av-z-skip: 40;

  /* Asset roots */
  --av-asset-root: "/assets/anvikshiki/phase-1";
}

@media (max-width: 47.999rem) {
  :root {
    --av-header-h: 4.5rem;
    --av-section-y: 4.5rem;
  }
}
```

CSS variables cannot define media-query breakpoints reliably. Document breakpoints as constants:

```js
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};
```

---

# 6. TYPOGRAPHY SYSTEM

## 6.1 Roles

- Display serif: logo, hero headline, section titles, CTA titles.
- Text serif: editorial descriptions, card summaries, newsletter copy.
- UI sans: small uppercase labels, navigation, durations, form status.

```css
.av-display {
  font-family: var(--av-font-display);
  font-weight: 500;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

.av-body {
  font-family: var(--av-font-body);
  font-size: var(--av-text-base);
  line-height: 1.72;
}

.av-eyebrow {
  font-family: var(--av-font-ui);
  font-size: var(--av-text-xs);
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.4;
  text-transform: uppercase;
}
```

Font loading:

```css
@font-face {
  font-family: "Anvikshiki Display";
  src: url("/assets/fonts/anvikshiki-display.woff2") format("woff2");
  font-display: swap;
  font-weight: 400 700;
}
```

Use only if a licensed, subsetted WOFF2 is available. Preload the display font only when it is under approximately 80KB. Do not load more than two families or unnecessary weight files.

---

# 7. LAYOUT SYSTEM

```css
.av-container {
  width: min(100% - 2rem, var(--av-content));
  margin-inline: auto;
}

.av-section {
  position: relative;
  padding-block: var(--av-section-y);
}

.av-manuscript-frame {
  position: relative;
  border: 1px solid var(--av-rule);
  border-radius: var(--av-radius-lg);
  box-shadow: var(--av-shadow-inset);
}

.av-manuscript-frame::after {
  position: absolute;
  inset: 0.35rem;
  border: 1px solid var(--av-rule-soft);
  border-radius: calc(var(--av-radius-lg) - 0.25rem);
  content: "";
  pointer-events: none;
}
```

Homepage base:

```css
.anvikshiki-home {
  min-width: 20rem;
  overflow: clip;
  color: var(--av-ink-900);
  background:
    radial-gradient(circle at 50% 0%, rgb(255 255 255 / 38%), transparent 32rem),
    var(--av-parchment-100);
}

.anvikshiki-home *,
.anvikshiki-home *::before,
.anvikshiki-home *::after {
  box-sizing: border-box;
}
```

Avoid fixed section heights below the hero. Use grid and content-driven block sizing. Minimum interactive target: 44×44 CSS pixels.

---

# 8. HERO VIDEO SYSTEM

## 8.1 State model

`idle → loading → ready → playing`  
`loading/playing → error`  
`any state + reduced motion/save-data → poster`

Use the poster as real markup, not merely the `<video poster>` attribute, so it can remain visible during loading and error states.

## 8.2 Complete component example

```jsx
// src/components/home/HeroVideo.jsx
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const ROOT = "/assets/anvikshiki/phase-1/hero";

export function HeroVideo() {
  const videoRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const saveData = Boolean(navigator.connection?.saveData);
  const [status, setStatus] = useState("loading");
  const usePosterOnly = reduceMotion || saveData;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || usePosterOnly) return;

    const play = async () => {
      try {
        await video.play();
      } catch {
        // Autoplay refusal is not a broken hero: leave the poster visible.
        setStatus("ready");
      }
    };
    play();
  }, [usePosterOnly]);

  return (
    <div className="hero-media" data-video-status={status}>
      <picture className="hero-media__poster" aria-hidden="true">
        <source
          media="(max-width: 767px)"
          srcSet={`${ROOT}/hero-poster-mobile.avif`}
          type="image/avif"
        />
        <source
          media="(max-width: 767px)"
          srcSet={`${ROOT}/hero-poster-mobile.webp`}
          type="image/webp"
        />
        <source srcSet={`${ROOT}/hero-poster-desktop.avif`} type="image/avif" />
        <img
          src={`${ROOT}/hero-poster-desktop.webp`}
          alt=""
          width="1920"
          height="1080"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {!usePosterOnly && (
        <video
          ref={videoRef}
          className="hero-media__video"
          muted
          loop
          playsInline
          preload="metadata"
          poster={`${ROOT}/hero-poster-desktop.webp`}
          aria-hidden="true"
          tabIndex="-1"
          onCanPlay={() => setStatus("ready")}
          onPlaying={() => setStatus("playing")}
          onError={() => setStatus("error")}
        >
          <source src={`${ROOT}/hero-world-desktop.webm`} type="video/webm" />
          <source src={`${ROOT}/hero-world-desktop.mp4`} type="video/mp4" />
        </video>
      )}

      <div className="hero-media__local-scrim" aria-hidden="true" />
    </div>
  );
}
```

Important implementation note: referencing `navigator` at render time breaks server rendering. In Next.js, move Save-Data detection into an effect or a client-only hook and add `"use client"` to this component.

## 8.3 Hero structure

```jsx
// src/components/home/HeroSection.jsx
export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <HeroVideo />
      <WindAtmosphere />
      <div className="hero__inner av-container">
        <HeroContent />
      </div>
      <AnimalGlyphFrieze />
    </section>
  );
}

function HeroContent() {
  return (
    <div className="hero-content">
      <p className="hero-content__eyebrow av-eyebrow">
        <span aria-hidden="true">✦</span> Journal &amp; Research Platform
      </p>
      <h1 id="hero-title" className="hero-content__title av-display">
        Where Inquiry<br />Becomes Insight.
      </h1>
      <div className="lotus-rule" aria-hidden="true"><span /></div>
      <p className="hero-content__lede av-body">
        A home for essays, research papers, and long-form ideas at the
        intersection of history, philosophy, civilization, and the arts.
      </p>
      <div className="hero-content__actions">
        <a className="av-button av-button--primary" href="/journal">
          <span>Explore Journal</span><span aria-hidden="true">→</span>
        </a>
        <a className="av-button av-button--secondary" href="/submit">
          <span>Submit Work</span><span aria-hidden="true">→</span>
        </a>
      </div>
      <DomainChips />
    </div>
  );
}
```

## 8.4 Hero CSS and safe zones

```css
.hero {
  position: relative;
  min-height: clamp(42rem, calc(100svh - var(--av-header-h)), 58rem);
  isolation: isolate;
  overflow: hidden;
  background: var(--av-olive-800);
}

.hero-media,
.hero-media__poster,
.hero-media__poster img,
.hero-media__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-media { z-index: var(--av-z-media); }

.hero-media__poster img,
.hero-media__video {
  object-fit: cover;
  object-position: 68% 48%;
}

.hero-media__video {
  opacity: 0;
  transition: opacity var(--av-dur-slow) var(--av-ease-standard);
}

.hero-media[data-video-status="playing"] .hero-media__video { opacity: 1; }

.hero-media__local-scrim {
  position: absolute;
  inset: 0 auto 0 0;
  width: min(54rem, 52vw);
  background: linear-gradient(
    90deg,
    rgb(243 232 211 / 96%) 0%,
    rgb(243 232 211 / 82%) 52%,
    rgb(243 232 211 / 38%) 78%,
    transparent 100%
  );
  pointer-events: none;
}

.hero::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: radial-gradient(ellipse at center, transparent 62%, rgb(33 24 18 / 20%));
  content: "";
  pointer-events: none;
}

.hero__inner {
  position: relative;
  z-index: var(--av-z-content);
  display: grid;
  align-items: center;
  min-height: inherit;
  padding-block: clamp(5rem, 10vh, 8rem) 8rem;
}

.hero-content {
  width: min(41rem, 44vw);
}

.hero-content__title {
  max-width: 10ch;
  margin: 1.1rem 0;
  color: var(--av-ink-950);
  font-size: var(--av-text-hero);
  line-height: 0.92;
}

.hero-content__lede { max-width: 36rem; }

@media (max-width: 63.999rem) {
  .hero-content { width: min(36rem, 52vw); }
  .hero-media__local-scrim { width: 64vw; }
  .hero-media__video,
  .hero-media__poster img { object-position: 64% 50%; }
}

@media (max-width: 47.999rem) {
  .hero {
    min-height: 47rem;
    background: var(--av-parchment-100);
  }

  .hero__inner {
    align-items: start;
    padding-block: 3.5rem 7rem;
  }

  .hero-content {
    width: 100%;
    max-width: 33rem;
  }

  .hero-media__video { display: none; }

  .hero-media__poster img {
    object-position: 62% 42%;
  }

  .hero-media__local-scrim {
    inset: 0;
    width: 100%;
    height: 58%;
    background: linear-gradient(
      180deg,
      rgb(244 234 214 / 94%) 0%,
      rgb(244 234 214 / 75%) 58%,
      transparent 100%
    );
  }

  .hero-content__title {
    max-width: 9ch;
    font-size: clamp(3rem, 14vw, 4.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-media__video { display: none; }
}
```

The mobile gradient is restricted to the upper text region. If the mobile poster’s subject sits under that region, regenerate the mobile crop instead of strengthening the gradient.

## 8.5 Loading and failure

- Poster is painted immediately with explicit width/height.
- Video starts at `preload="metadata"`, not `auto`.
- Poster remains beneath video and never disappears on error.
- No spinner is needed for a decorative background video; a spinner introduces noise.
- If the video is essential to brand storytelling, an unobtrusive “Play scene” button may appear after autoplay refusal, but it must be user-tested.
- Record video error telemetry without user-identifying data.

---

# 9. HEADER SYSTEM

## 9.1 Structure

```jsx
<header className="site-header" data-scrolled={scrolled || undefined}>
  <div className="site-header__inner av-container">
    <a className="brand-lockup" href="/" aria-label="Ānvīkṣikī home">
      <img className="brand-lockup__mark" src=".../header-mark.svg" alt="" />
      <span>
        <span className="brand-lockup__name">ĀNVĪKṢIKĪ</span>
        <span className="brand-lockup__descriptor">Journal &amp; Research Platform</span>
      </span>
    </a>
    <nav className="desktop-nav" aria-label="Primary">...</nav>
    <div className="header-actions">...</div>
    <button className="menu-toggle" aria-expanded={open} aria-controls="mobile-nav">...</button>
  </div>
  <MobileNav open={open} onClose={() => setOpen(false)} />
</header>
```

## 9.2 Behavior

- Header starts at `--av-header-h`, parchment background at 96% opacity.
- After 24px scroll, reduce height by no more than 12px and add a thin sepia bottom rule.
- Do not place transparent header text over busy hero art.
- Desktop navigation: Journal, Essays (only if route exists), Library/Archive, Community, About.
- Utilities: Search, notifications/account only if functional. Do not render decorative dead icons.
- Mobile drawer traps focus, closes on Escape and route change, restores focus to the toggle, and locks body scroll without layout jump.

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--av-z-header);
  height: var(--av-header-h);
  border-bottom: 1px solid var(--av-rule-soft);
  background: rgb(248 240 224 / 96%);
  transition: height var(--av-dur-base), box-shadow var(--av-dur-base);
}

@supports (backdrop-filter: blur(1px)) {
  .site-header {
    background: rgb(248 240 224 / 88%);
    backdrop-filter: blur(12px) saturate(0.85);
  }
}

.site-header[data-scrolled] { box-shadow: var(--av-shadow-1); }
```

---

# 10. CTA SYSTEM

Use semantic links for navigation and buttons for actions/forms.

```css
.av-button {
  position: relative;
  display: inline-flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.85rem 1.4rem;
  overflow: hidden;
  border: 1px solid currentColor;
  border-radius: var(--av-radius-sm);
  font: 700 var(--av-text-sm)/1 var(--av-font-ui);
  letter-spacing: 0.06em;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    transform var(--av-dur-fast) var(--av-ease-standard),
    background-color var(--av-dur-base),
    color var(--av-dur-base),
    box-shadow var(--av-dur-base);
}

.av-button--primary {
  color: var(--av-parchment-50);
  border-color: var(--av-terracotta-700);
  background: var(--av-terracotta-500);
  box-shadow: 0 4px 0 var(--av-terracotta-700);
}

.av-button--secondary {
  color: var(--av-ink-900);
  border-color: var(--av-sepia-400);
  background: rgb(250 245 233 / 82%);
}

.av-button:hover { transform: translateY(-2px); }
.av-button:active { transform: translateY(1px); box-shadow: none; }
.av-button:focus-visible { outline: 3px solid var(--av-focus); outline-offset: 3px; }
```

The large action stack uses three data-driven variants:

```js
export const HOME_ACTIONS = [
  { title: "Submit Your Work", body: "Share original essays and research.", href: "/submit", tone: "terracotta" },
  { title: "Explore Journal", body: "Enter the archive of ideas.", href: "/journal", tone: "olive" },
  { title: "Join Community", body: "Connect with scholars and readers.", href: "/community", tone: "parchment" },
];
```

---

# 11. DOMAIN CHIP SYSTEM

```jsx
const DOMAINS = [
  ["History", "history", "/domains/history"],
  ["Philosophy", "philosophy", "/domains/philosophy"],
  ["Civilizations", "civilizations", "/domains/civilizations"],
  ["Religion", "religion", "/domains/religion"],
  ["Society", "society", "/domains/society"],
  ["Arts & Lit", "arts-literature", "/domains/arts-literature"],
];

export function DomainChips() {
  return (
    <nav className="domain-chips" aria-label="Browse by domain">
      {DOMAINS.map(([label, icon, href]) => (
        <a className="domain-chip" href={href} key={href}>
          <img src={`/assets/anvikshiki/phase-1/domains/${icon}.svg`} alt="" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
```

```css
.domain-chips {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 2rem;
}

.domain-chip {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--av-rule);
  border-radius: var(--av-radius-md);
  color: var(--av-ink-900);
  background: rgb(248 240 224 / 78%);
  font: 700 var(--av-text-xs)/1.2 var(--av-font-ui);
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: uppercase;
}

.domain-chip img { width: 1.75rem; height: 1.75rem; }
.domain-chip:hover img { transform: translateY(-2px); }

@media (max-width: 29.999rem) {
  .domain-chips { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

---

# 12. WIND ATMOSPHERE SYSTEM

Use three fixed image layers, not dozens of DOM particles. All are decorative and ignored by assistive technology.

```jsx
export function WindAtmosphere() {
  return (
    <div className="wind-atmosphere" aria-hidden="true">
      <span className="wind-layer wind-layer--lines" />
      <span className="wind-layer wind-layer--dust" />
      <span className="wind-layer wind-layer--leaves" />
    </div>
  );
}
```

```css
.wind-atmosphere {
  position: absolute;
  inset: 0;
  z-index: var(--av-z-atmosphere);
  contain: layout paint;
  overflow: hidden;
  pointer-events: none;
}

.wind-layer {
  position: absolute;
  inset: -10%;
  background: center / cover no-repeat;
  will-change: transform, opacity;
}

.wind-layer--lines {
  opacity: 0.12;
  background-image: url("/assets/anvikshiki/phase-1/atmosphere/wind-lines.webp");
  animation: av-wind-lines 30s linear infinite;
}

.wind-layer--dust {
  opacity: 0.16;
  background-image: url("/assets/anvikshiki/phase-1/atmosphere/dust-flecks.webp");
  animation: av-dust 18s ease-in-out infinite alternate;
}

.wind-layer--leaves {
  opacity: 0.22;
  background-image: url("/assets/anvikshiki/phase-1/atmosphere/leaf-particles.webp");
  animation: av-leaves 22s linear infinite;
}

@keyframes av-wind-lines {
  to { transform: translate3d(8%, -2%, 0); }
}

@keyframes av-dust {
  from { transform: translate3d(-2%, 1%, 0); opacity: 0.08; }
  to { transform: translate3d(3%, -2%, 0); opacity: 0.18; }
}

@keyframes av-leaves {
  from { transform: translate3d(-4%, -3%, 0) rotate(-1deg); }
  to { transform: translate3d(8%, 7%, 0) rotate(2deg); }
}

@media (max-width: 63.999rem) {
  .wind-layer--leaves { display: none; }
  .wind-atmosphere { opacity: 0.55; }
}

@media (max-width: 47.999rem), (prefers-reduced-motion: reduce) {
  .wind-atmosphere { display: none; }
}
```

Atmosphere opacity must be reviewed over both darkest and lightest video frames.

---

# 13. ANIMAL GLYPH SYSTEM

Prefer the frieze as a single optimized SVG with decorative semantics:

```jsx
export function AnimalGlyphFrieze() {
  return (
    <div className="glyph-frieze" aria-hidden="true">
      <img
        src="/assets/anvikshiki/phase-1/ornaments/animal-glyph-frieze.svg"
        alt=""
        width="1920"
        height="96"
        loading="eager"
      />
    </div>
  );
}
```

```css
.glyph-frieze {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--av-z-content);
  display: grid;
  height: 5.5rem;
  place-items: center;
  border-block: 1px solid var(--av-rule);
  background: rgb(244 234 214 / 92%);
}

.glyph-frieze img {
  width: max(70rem, 100%);
  height: 100%;
  object-fit: cover;
  object-position: center;
}
```

Detached hero animals are optional premium layers. Register them only after comparing a still frame at desktop, tablet, and wide breakpoints. Animate wrapper transforms, never alpha-mask internals.

---

# 14. BROWSE BY DOMAIN SECTION

## 14.1 Content

```js
export const DOMAIN_CARDS = [
  { key: "history", title: "History", body: "Uncover civilizations, events, and the threads of time.", href: "/domains/history" },
  { key: "philosophy", title: "Philosophy", body: "Explore ideas, ethics, and the nature of existence.", href: "/domains/philosophy" },
  { key: "civilizations", title: "Civilizations", body: "Journey through cultures and human achievement.", href: "/domains/civilizations" },
  { key: "religion", title: "Religion", body: "Discover beliefs, texts, and spiritual traditions.", href: "/domains/religion" },
  { key: "society", title: "Society", body: "Understand communities, structures, and human connections.", href: "/domains/society" },
  { key: "arts-literature", title: "Arts & Literature", body: "Celebrate creativity through literature, art, and expression.", href: "/domains/arts-literature" }
];
```

## 14.2 Markup

```jsx
export function BrowseByDomain() {
  return (
    <section className="domain-section av-section" aria-labelledby="domains-title">
      <div className="av-container">
        <SectionHeading id="domains-title">Browse by Domain</SectionHeading>
        <div className="domain-grid">
          {DOMAIN_CARDS.map((domain) => (
            <a className="domain-card av-manuscript-frame" href={domain.href} key={domain.key}>
              <img className="domain-card__icon" src={`.../${domain.key}.svg`} alt="" />
              <h3>{domain.title}</h3>
              <p>{domain.body}</p>
              <span className="domain-card__hint">Explore <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
```

## 14.3 Layout

```css
.domain-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 1.75rem);
}

.domain-card {
  display: flex;
  min-height: 23rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.75rem;
  color: var(--av-ink-900);
  background:
    radial-gradient(circle at 50% 15%, rgb(255 255 255 / 52%), transparent 45%),
    var(--av-parchment-100);
  text-align: center;
  text-decoration: none;
  transition: transform var(--av-dur-base) var(--av-ease-cinematic), box-shadow var(--av-dur-base);
}

.domain-card:hover { transform: translateY(-5px); box-shadow: var(--av-shadow-2); }
.domain-card__icon { width: 6rem; height: 6rem; margin-bottom: 1.25rem; }
.domain-card h3 { margin: 0; font: 600 var(--av-text-xl)/1 var(--av-font-display); text-transform: uppercase; }
.domain-card p { max-width: 23ch; line-height: 1.6; }
.domain-card__hint { margin-top: auto; font: 700 var(--av-text-xs)/1 var(--av-font-ui); text-transform: uppercase; }

@media (max-width: 63.999rem) {
  .domain-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 39.999rem) {
  .domain-grid { grid-template-columns: 1fr; }
  .domain-card { min-height: 18rem; }
}
```

---

# 15. MAIN CTA ACTION SECTION

```jsx
export function HomeCTAStack() {
  return (
    <section className="home-actions av-section" aria-labelledby="actions-title">
      <h2 id="actions-title" className="sr-only">Continue your journey</h2>
      <div className="av-container home-actions__stack">
        {HOME_ACTIONS.map((item) => (
          <a className={`home-action home-action--${item.tone}`} href={item.href} key={item.href}>
            <span className="home-action__icon" aria-hidden="true" />
            <span className="home-action__copy">
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </span>
            <span className="home-action__arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </div>
    </section>
  );
}
```

Desktop action row: icon 18%, copy 68%, arrow 14%. Mobile: icon 3rem, copy fills, arrow remains. Titles wrap naturally; bars must not use fixed heights.

---

# 16. KNOWLEDGE MAP PREVIEW

This section is optional and must be based on real taxonomy/routes. Avoid canvas/WebGL in Phase 1. Use accessible SVG for lines plus HTML links for nodes.

```jsx
export function KnowledgeMapPreview({ nodes }) {
  return (
    <section className="knowledge-map av-section" aria-labelledby="map-title">
      <div className="av-container knowledge-map__frame av-manuscript-frame">
        <div className="knowledge-map__copy">
          <p className="av-eyebrow">Knowledge Map</p>
          <h2 id="map-title" className="av-display">Trace how ideas meet.</h2>
          <p>Move between domains, traditions, places, and questions.</p>
          <a className="av-button av-button--secondary" href="/knowledge-map">Open the map</a>
        </div>
        <div className="knowledge-map__visual" aria-label="Knowledge domains">
          <svg className="knowledge-map__lines" aria-hidden="true" viewBox="0 0 600 400">...</svg>
          {nodes.map((node) => (
            <a className="knowledge-node" style={{ "--x": node.x, "--y": node.y }} href={node.href}>
              {node.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
```

If no real graph is available, omit the preview and link to a future roadmap from elsewhere. Do not fabricate activity metrics or node relationships.

---

# 17. NEWSLETTER SECTION

## 17.1 Form behavior

- Native `<form>` with email label, autocomplete, required validation, visible status.
- Submit to the current project’s real endpoint.
- Disable only during an active request.
- Preserve typed email on network failure.
- Announce success/error via `aria-live="polite"`.
- Link privacy policy near the field.

```jsx
export function NewsletterSection() {
  const [state, setState] = useState("idle");

  async function handleSubmit(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    setState("loading");
    try {
      await subscribeToNewsletter(email);
      setState("success");
      event.currentTarget.reset();
    } catch {
      setState("error");
    }
  }

  return (
    <section className="newsletter av-section" aria-labelledby="newsletter-title">
      <div className="newsletter__card av-container av-manuscript-frame">
        <div>
          <p className="av-eyebrow">Stay Connected</p>
          <h2 id="newsletter-title" className="av-display">Letters from the archive.</h2>
          <p>New essays, research notes, and curated reflections—delivered quietly.</p>
        </div>
        <form className="newsletter__form" onSubmit={handleSubmit}>
          <label htmlFor="newsletter-email">Email address</label>
          <div className="newsletter__control">
            <input id="newsletter-email" name="email" type="email" autoComplete="email" required />
            <button type="submit" disabled={state === "loading"}>
              <span className="sr-only">Subscribe</span><span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="newsletter__status" aria-live="polite">
            {state === "success" && "Welcome. Please check your inbox."}
            {state === "error" && "Subscription failed. Please try again."}
          </p>
        </form>
      </div>
    </section>
  );
}
```

Never imply “no spam” or other policy claims unless the actual privacy practice supports them.

---

# 18. PREMIUM FOOTER

Structure:

```text
footer.premium-footer
├── ornamental landscape edge (decorative)
├── brand statement
├── Explore navigation
├── Community navigation
├── legal navigation
└── copyright / preservation line
```

```css
.premium-footer {
  position: relative;
  padding: 5rem 0 2rem;
  color: var(--av-parchment-100);
  background: var(--av-olive-800);
}

.premium-footer a {
  color: inherit;
  text-underline-offset: 0.25em;
  text-decoration-color: rgb(244 234 214 / 35%);
}

.premium-footer a:hover {
  color: #fff9e9;
  text-decoration-color: currentColor;
}
```

Required footer links: Privacy, Terms, Submission Guidelines, Contact, Accessibility. Add Archive, Papers, Search, Themes, Collections, Submit, Community, Author Directory, Events, and About only when corresponding routes exist.

The copyright year should be generated at render time. Server and client must render the same year.

---

# 19. MOBILE RESPONSIVE SYSTEM

## 19.1 Breakpoint intent

- `0–479px`: compact mobile, two-column chips, one-column content cards.
- `480–767px`: large mobile, optional three-column chips if labels fit.
- `768–1023px`: tablet, two-column domain grid, simplified header.
- `1024–1439px`: standard desktop hero safe zone.
- `1440px+`: wide screens; architecture extension may appear.

## 19.2 Mobile-specific decisions

1. Use the mobile poster and no autoplay video by default.
2. Place hero copy in the upper 42% safe zone.
3. Keep the image world visible in the lower hero; do not turn the hero into a parchment text block.
4. Stack hero CTAs full width below 480px.
5. Remove leaves, detached animals, parallax, and blur.
6. Center-crop the glyph frieze.
7. Domain cards become one column, but chips stay two columns.
8. CTA bars retain icon/copy/arrow hierarchy and allow multiline copy.
9. Newsletter field and button may stack below 400px.
10. Footer link groups use accordions only if the existing app already has an accessible accordion primitive.

```css
@media (max-width: 29.999rem) {
  .hero-content__actions { display: grid; gap: 0.75rem; }
  .av-button { width: 100%; }
  .newsletter__control { display: grid; grid-template-columns: 1fr; }
  .newsletter__control button { width: 100%; }
}
```

Test at 320, 360, 390, 430, 768, 1024, 1280, 1440, and 1920 CSS pixels. Test with browser zoom at 200%.

---

# 20. ACCESSIBILITY SYSTEM

## 20.1 Requirements

- One `<h1>`, then logical `<h2>` sections and `<h3>` cards.
- Skip link is first focusable element.
- Decorative visuals use empty alt text and `aria-hidden`.
- Informative images receive concise alt text; the hero video is atmospheric and hidden.
- All domain cards and CTAs have descriptive accessible names.
- Visible focus is never removed.
- Text contrast targets WCAG AA: 4.5:1 normal, 3:1 large.
- Do not rely on domain icon color alone.
- Mobile drawer is a named dialog or navigation region with correct focus behavior.
- Form labels are visible, not placeholder-only.
- Status and errors are announced.
- Animation ceases under `prefers-reduced-motion`.
- `prefers-contrast: more` strengthens rules and removes textured text backgrounds.

```css
.skip-link {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: var(--av-z-skip);
  padding: 0.75rem 1rem;
  color: white;
  background: var(--av-ink-950);
  transform: translateY(-150%);
}
.skip-link:focus { transform: translateY(0); }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .anvikshiki-home *,
  .anvikshiki-home *::before,
  .anvikshiki-home *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 21. PERFORMANCE SYSTEM

## 21.1 Budgets

| Resource | Target |
|---|---|
| Initial HTML | < 50KB compressed |
| Route JavaScript added by homepage | < 80KB compressed |
| Hero poster desktop | < 250KB AVIF, < 400KB WebP |
| Hero poster mobile | < 160KB AVIF |
| Hero video desktop | ideally < 5MB, hard review at 8MB |
| Individual transparent animal | < 180KB each |
| Total domain SVGs | < 60KB |
| CLS | < 0.1 |
| LCP | < 2.5s on representative mobile |
| INP | < 200ms |

## 21.2 Delivery rules

- Preload one poster, never both posters and both videos.
- Use `fetchpriority="high"` on the poster `<img>`.
- Use `preload="metadata"` on video.
- Do not preload below-fold ornaments.
- Lazy-load below-fold images with dimensions.
- Serve immutable versioned static assets.
- Use `content-visibility: auto` on lower sections only after testing focus/search behavior.
- Use CSS transforms/opacity for motion.
- Avoid `filter: blur()` on large moving layers.
- Pause optional motion while the hero is offscreen or document is hidden.
- Do not ship source sheets if individual assets are exported.

```js
export function observeDocumentVisibility(video) {
  const sync = () => {
    if (document.hidden) video.pause();
    else video.play().catch(() => {});
  };
  document.addEventListener("visibilitychange", sync);
  return () => document.removeEventListener("visibilitychange", sync);
}
```

## 21.3 Image wrapper

```jsx
export function SmartImage({ src, alt = "", width, height, eager = false, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      {...props}
    />
  );
}
```

---

# 22. 100 CREATIVE CODE MODULES

The modules below are intentionally independent. Implement all **Essential** modules, select **Premium** modules only after core QA passes, and keep **Experimental** modules behind a feature flag. “Performance” estimates are relative to this page: **Low** means negligible, **Medium** means measurable but acceptable with guardrails, and **High** means opt-in only after profiling.

## A. Foundation modules

### 1. Design token variables

- **Purpose / use:** Establish the single visual vocabulary for every homepage component.
- **Code:** `:root { --av-ink-900:#2e231a; --av-parchment-100:#f4ead6; --av-ease-cinematic:cubic-bezier(.22,1,.36,1); }`
- **Classes:** Consumed by `.anvikshiki-home`, `.av-button`, `.domain-card`, `.premium-footer`.
- **Mobile:** Override spacing and header height only; do not fork colors.
- **Performance:** Low. **Tier:** Essential.

### 2. Parchment background system

- **Purpose / use:** Create depth without shipping a large repeating texture.
- **Code:** `.anvikshiki-home{background:radial-gradient(circle at 50% 0,#fff8,transparent 36rem),linear-gradient(90deg,#7a512b08 1px,transparent 1px),var(--av-parchment-100);background-size:auto,32px 32px,auto}`
- **Classes:** `.anvikshiki-home`, optional `.av-parchment-panel`.
- **Mobile:** Keep the flat color and radial light; remove fine grid if it aliases.
- **Performance:** Low. **Tier:** Essential.

### 3. Paper grain overlay

- **Purpose / use:** Add tactile cohesion to section backgrounds, never to video.
- **Code:** `.paper-grain::after{content:"";position:absolute;inset:0;background:url("/assets/.../paper-grain.webp") repeat;opacity:.045;pointer-events:none}`
- **Classes:** `.paper-grain`.
- **Mobile:** Reduce opacity to `.025`; omit on low-resolution displays if noisy.
- **Performance:** Low with a ≤32KB tile. **Tier:** Premium.

### 4. Serif typography scale

- **Purpose / use:** Keep display hierarchy consistent and fluid.
- **Code:** `.av-h1{font:500 var(--av-text-hero)/.92 var(--av-font-display)} .av-h2{font:500 var(--av-text-2xl)/1.05 var(--av-font-display)}`
- **Classes:** `.av-h1`, `.av-h2`, `.av-h3`, `.av-body`, `.av-eyebrow`.
- **Mobile:** `clamp()` handles scaling; test long localized labels.
- **Performance:** Low. **Tier:** Essential.

### 5. Layout container system

- **Purpose / use:** Align header, hero copy, sections, and footer to one grid.
- **Code:** `.av-container{width:min(100% - 2rem,75rem);margin-inline:auto}` and `.av-container--wide{width:min(100% - 2rem,90rem)}`
- **Classes:** `.av-container`, `.av-container--wide`, `.av-reading`.
- **Mobile:** Side gutter remains at least 16px.
- **Performance:** Low. **Tier:** Essential.

### 6. Section spacing system

- **Purpose / use:** Preserve editorial rhythm across variable viewport sizes.
- **Code:** `.av-section{padding-block:clamp(4.5rem,8vw,8rem)} .av-section + .av-section{border-top:1px solid var(--av-rule-soft)}`
- **Classes:** `.av-section`, `.av-section--compact`.
- **Mobile:** Minimum 72px vertical space; compact section minimum 48px.
- **Performance:** Low. **Tier:** Essential.

### 7. Border ornament system

- **Purpose / use:** Reproduce nested manuscript frames without extra images.
- **Code:** `.av-frame{border:1px solid var(--av-rule)} .av-frame::after{content:"";position:absolute;inset:.35rem;border:1px solid var(--av-rule-soft);pointer-events:none}`
- **Classes:** `.av-frame`, `.av-frame--corners`, `.av-manuscript-frame`.
- **Mobile:** Use one inner rule on cards narrower than 360px.
- **Performance:** Low. **Tier:** Essential.

### 8. Asset manifest loader

- **Purpose / use:** Centralize URLs, focal points, and optional-layer availability.
- **Code:** `const manifest = await fetch("/assets/anvikshiki/phase-1/manifest/assets-manifest.json",{signal}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()})`
- **Classes:** None; feeds `HeroVideo`, `DomainIcon`, and optional layers.
- **Mobile:** Reads `hero.focalPoint.mobile` and `poster.mobileAvif`.
- **Performance:** Low; cache permanently. **Tier:** Essential.

### 9. Reduced motion utility

- **Purpose / use:** Make preference available to React and stop ambient systems.
- **Code:** `const query=matchMedia("(prefers-reduced-motion: reduce)"); const [reduce,setReduce]=useState(query.matches);`
- **Classes:** Set `data-reduced-motion` on page root when useful.
- **Mobile:** Same behavior; poster-only is preferred even without the preference.
- **Performance:** Low. **Tier:** Essential.

### 10. Responsive breakpoint utility

- **Purpose / use:** Synchronize JS-only behavior with documented CSS ranges.
- **Code:** `export const mq={mobile:"(max-width: 767px)",desktop:"(min-width: 1024px)",wide:"(min-width: 1440px)"};`
- **Classes:** None; CSS remains primary.
- **Mobile:** Use only for source/behavior decisions, never ordinary layout.
- **Performance:** Low. **Tier:** Essential.

## B. Hero video modules

### 11. Hero video shell

- **Purpose / use:** Stack poster, video, scrim, and atmosphere safely.
- **Code:** `<div className="hero-media" data-video-status={status}><picture .../><video .../><div className="hero-media__local-scrim"/></div>`
- **Classes:** `.hero-media`, `.hero-media__video`, `.hero-media__poster`.
- **Mobile:** Render poster only.
- **Performance:** Medium because video decodes. **Tier:** Essential.

### 12. Poster fallback

- **Purpose / use:** Guarantee immediate and failure-safe hero imagery.
- **Code:** `<picture><source srcSet={posterAvif} type="image/avif"/><img src={posterWebp} width="1920" height="1080" fetchPriority="high" alt=""/></picture>`
- **Classes:** `.hero-media__poster`.
- **Mobile:** `<source media="(max-width:767px)" ...>` comes first.
- **Performance:** Low/Medium based on bytes. **Tier:** Essential.

### 13. Mobile video fallback

- **Purpose / use:** Avoid expensive autoplay and bad desktop crops on phones.
- **Code:** `const posterOnly = useMedia("(max-width: 767px)") || saveData || reduceMotion;`
- **Classes:** `.hero-media--poster-only` or conditional video render.
- **Mobile:** Mandatory default; an explicit play control can be tested later.
- **Performance:** Saves High cost. **Tier:** Essential.

### 14. Hero video loading state

- **Purpose / use:** Keep the poster stable until decoded frames can display.
- **Code:** `onCanPlay={()=>setStatus("ready")} onPlaying={()=>setStatus("playing")}` with `[data-video-status=playing] video{opacity:1}`.
- **Classes:** `[data-video-status]`, `.hero-media__video`.
- **Mobile:** Not invoked.
- **Performance:** Low. **Tier:** Essential.

### 15. Video reveal mask

- **Purpose / use:** Give the video a gentle ink-reveal entrance without obscuring it.
- **Code:** `@keyframes av-video-reveal{from{clip-path:inset(0 3% 0 3%)}to{clip-path:inset(0)}}`
- **Classes:** `.hero-media[data-video-status="playing"] .hero-media__video`.
- **Mobile:** Disabled; static poster.
- **Performance:** Medium; profile clip-path. **Tier:** Premium.

### 16. Edge vignette

- **Purpose / use:** Quiet only the outermost edge of the scene.
- **Code:** `.hero::after{background:radial-gradient(ellipse,transparent 64%,rgb(33 24 18/.2));pointer-events:none}`
- **Classes:** `.hero::after`.
- **Mobile:** Reduce to `.12` or remove.
- **Performance:** Low. **Tier:** Essential.

### 17. Local text readability gradient

- **Purpose / use:** Protect copy without washing out the video.
- **Code:** `.hero-media__local-scrim{width:min(54rem,52vw);background:linear-gradient(90deg,#f3e8d3f5,#f3e8d3a8 58%,transparent)}`
- **Classes:** `.hero-media__local-scrim`.
- **Mobile:** Vertical gradient limited to top 58%.
- **Performance:** Low. **Tier:** Essential.

### 18. Video error fallback

- **Purpose / use:** Preserve a complete hero on decode/network failure.
- **Code:** `onError={()=>setStatus("error")}`; CSS keeps poster visible and `video{display:none}` for `[data-video-status=error]`.
- **Classes:** `[data-video-status="error"]`.
- **Mobile:** Poster already active.
- **Performance:** Low. **Tier:** Essential.

### 19. Scroll-based video scale

- **Purpose / use:** Add barely perceptible depth during the first viewport.
- **Code:** `scale = 1 + Math.min(scrollY/heroHeight,1)*0.025; video.style.transform=\`scale(${scale})\`;`
- **Classes:** `.hero-media__video`.
- **Mobile:** Disabled. Use `requestAnimationFrame`, not raw scroll mutation.
- **Performance:** Medium. **Tier:** Experimental.

### 20. Reduced-motion static hero

- **Purpose / use:** Replace all hero motion with the matching poster.
- **Code:** `@media(prefers-reduced-motion:reduce){.hero-media__video,.wind-atmosphere{display:none}}`
- **Classes:** `.hero-media__video`, `.wind-atmosphere`, optional animals.
- **Mobile:** Same, though already poster-only.
- **Performance:** Saves Medium/High cost. **Tier:** Essential.

## C. Header modules

### 21. Header parchment bar

- **Purpose / use:** Keep navigation readable and visually tied to the manuscript.
- **Code:** `.site-header{position:sticky;top:0;background:rgb(248 240 224/.96);border-bottom:1px solid var(--av-rule-soft)}`
- **Classes:** `.site-header`, `.site-header__inner`.
- **Mobile:** 72px height; brand descriptor may hide.
- **Performance:** Low. **Tier:** Essential.

### 22. Logo lockup component

- **Purpose / use:** Combine mark, correct wordmark, and descriptor.
- **Code:** `<a className="brand-lockup" href="/"><img alt=""/><span><b>ĀNVĪKṢIKĪ</b><small>Journal & Research Platform</small></span></a>`
- **Classes:** `.brand-lockup`, `__mark`, `__name`, `__descriptor`.
- **Mobile:** Mark 40px; descriptor hidden below 480px.
- **Performance:** Low. **Tier:** Essential.

### 23. Nav underline ornament

- **Purpose / use:** Replace a generic underline with a restrained center-out rule.
- **Code:** `.desktop-nav a::after{content:"";position:absolute;inset:auto 50% -.45rem;height:1px;background:var(--av-terracotta-500);transition:inset .28s}.desktop-nav a:hover::after{inset-inline:0}`
- **Classes:** `.desktop-nav a`.
- **Mobile:** Not used in drawer.
- **Performance:** Low. **Tier:** Premium.

### 24. Search icon hover

- **Purpose / use:** Communicate interactivity without spinning or scaling excessively.
- **Code:** `.header-search svg{transition:transform .2s}.header-search:hover svg{transform:translateY(-1px) rotate(-6deg)}`
- **Classes:** `.header-search`.
- **Mobile:** Maintain 44px target; no rotation if distracting.
- **Performance:** Low. **Tier:** Premium.

### 25. Menu icon transition

- **Purpose / use:** Morph two lines into a close glyph with correct state semantics.
- **Code:** `.menu-toggle[aria-expanded=true] i:first-child{transform:translateY(4px) rotate(45deg)} ...`
- **Classes:** `.menu-toggle`, `.menu-toggle__line`.
- **Mobile:** Active only under desktop nav breakpoint.
- **Performance:** Low. **Tier:** Essential.

### 26. Account frame

- **Purpose / use:** Frame a real account avatar/action with manuscript geometry.
- **Code:** `.account-action{display:grid;width:2.75rem;aspect-ratio:1;place-items:center;border:1px double var(--av-rule);border-radius:50%}`
- **Classes:** `.account-action`.
- **Mobile:** Put in drawer if header space is tight.
- **Performance:** Low. **Tier:** Premium; omit if account is not functional.

### 27. Header scroll shrink

- **Purpose / use:** Recover vertical space after the first scroll.
- **Code:** `setScrolled(window.scrollY>24)`; `.site-header[data-scrolled]{--av-header-h:4.75rem}`.
- **Classes:** `[data-scrolled]`.
- **Mobile:** Shrink by at most 8px to avoid jumpiness.
- **Performance:** Low with passive/rAF listener. **Tier:** Premium.

### 28. Header blur fallback

- **Purpose / use:** Use blur only when supported and maintain opaque readability otherwise.
- **Code:** `@supports(backdrop-filter:blur(1px)){.site-header{background:#f8f0e0df;backdrop-filter:blur(12px)}}`
- **Classes:** `.site-header`.
- **Mobile:** Reduce blur to 8px or use opaque background.
- **Performance:** Medium on low-end devices. **Tier:** Premium.

### 29. Mobile drawer

- **Purpose / use:** Provide accessible navigation without compressing desktop links.
- **Code:** `<div id="mobile-nav" role="dialog" aria-modal="true" hidden={!open}>...</div>` plus focus trap, Escape, and focus restore.
- **Classes:** `.mobile-nav`, `__backdrop`, `__panel`.
- **Mobile:** Full-height panel; no ambient animation behind it.
- **Performance:** Low. **Tier:** Essential.

### 30. Header entrance animation

- **Purpose / use:** Settle the header once on initial load.
- **Code:** `@keyframes av-header-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}`
- **Classes:** `.site-header[data-enter]`.
- **Mobile:** 400ms maximum; disabled reduced motion.
- **Performance:** Low. **Tier:** Premium.

## D. Hero content modules

### 31. Eyebrow reveal

- **Purpose / use:** Introduce platform identity before the headline.
- **Code:** `.hero-content__eyebrow{animation:av-rise .7s .12s both}`.
- **Classes:** `.hero-content__eyebrow`.
- **Mobile:** Same duration, smaller travel (6px).
- **Performance:** Low. **Tier:** Premium.

### 32. Headline reveal

- **Purpose / use:** Give the main line a calm manuscript-opening entrance.
- **Code:** `.hero-content__title{animation:av-rise 1s .2s var(--av-ease-cinematic) both}` with `@keyframes av-rise{from{opacity:0;transform:translateY(14px)}}`.
- **Classes:** `.hero-content__title`.
- **Mobile:** 10px travel, 700ms.
- **Performance:** Low. **Tier:** Premium.

### 33. Paragraph reveal

- **Purpose / use:** Follow the title without a theatrical delay.
- **Code:** `.hero-content__lede{animation:av-rise .8s .35s both}`.
- **Classes:** `.hero-content__lede`.
- **Mobile:** Delay no more than 250ms.
- **Performance:** Low. **Tier:** Premium.

### 34. CTA stagger entrance

- **Purpose / use:** Establish primary/secondary action order.
- **Code:** `.hero-content__actions > *{animation:av-rise .65s both}.hero-content__actions>:nth-child(1){animation-delay:.46s}...`
- **Classes:** `.hero-content__actions`.
- **Mobile:** Shorten stagger to 60ms.
- **Performance:** Low. **Tier:** Premium.

### 35. Text panel parchment glass

- **Purpose / use:** Optional local backing if a particular video frame becomes too busy.
- **Code:** `.hero-content--panel{padding:clamp(1rem,2vw,2rem);background:rgb(244 234 214/.82);border:1px solid var(--av-rule-soft)}`
- **Classes:** `.hero-content--panel`.
- **Mobile:** Prefer gradient rather than a full panel.
- **Performance:** Low without blur. **Tier:** Premium.

### 36. Text panel no-white-overlay rule

- **Purpose / use:** Enforce the core visual constraint in CSS review.
- **Code:** `.hero-content--panel{max-width:44vw}.hero-content--panel::before{content:none}` and lint/review rule: reject `.hero > .overlay{inset:0;background:#fff...}`.
- **Classes:** `.hero-content--panel`.
- **Mobile:** Maximum block height 46% of hero.
- **Performance:** Low. **Tier:** Essential.

### 37. Hero safe-zone layout

- **Purpose / use:** Bind text placement to recorded manifest safe zones.
- **Code:** `.hero-content{width:min(41rem,44vw);margin-left:0}` with `object-position:var(--hero-focal,68% 48%)`.
- **Classes:** `.hero-content`, `.hero-media`.
- **Mobile:** Width 100%, max 33rem, subject below/aside.
- **Performance:** Low. **Tier:** Essential.

### 38. CTA grouping

- **Purpose / use:** Keep action hierarchy semantic and responsive.
- **Code:** `.hero-content__actions{display:flex;flex-wrap:wrap;gap:.875rem;margin-top:1.75rem}`.
- **Classes:** `.hero-content__actions`.
- **Mobile:** Grid; full width under 480px.
- **Performance:** Low. **Tier:** Essential.

### 39. Desktop hero split layout

- **Purpose / use:** Reserve left 44% for content and right side for the living world.
- **Code:** `.hero__inner{display:grid;grid-template-columns:minmax(0,44%) 1fr}`; content in column one.
- **Classes:** `.hero__inner`, `.hero-content`.
- **Mobile:** Switch to one column.
- **Performance:** Low. **Tier:** Essential.

### 40. Mobile hero stack layout

- **Purpose / use:** Preserve both readable copy and poster storytelling.
- **Code:** `@media(max-width:767px){.hero__inner{display:block;padding-top:3.5rem}.hero{min-height:47rem}}`
- **Classes:** `.hero`, `.hero__inner`.
- **Mobile:** This is the mobile behavior; validate 320px width.
- **Performance:** Low. **Tier:** Essential.

## E. Wind atmosphere modules

### 41. Wind particle layer 1

- **Purpose / use:** Add one broad translucent wind-line pass.
- **Code:** `.wind-layer--lines{background-image:url(...wind-lines.webp);opacity:.12;animation:av-wind-lines 30s linear infinite}`
- **Classes:** `.wind-layer--lines`.
- **Mobile:** Hidden.
- **Performance:** Low/Medium. **Tier:** Premium.

### 42. Wind particle layer 2

- **Purpose / use:** Add counter-moving fine lines for depth.
- **Code:** `.wind-layer--fine{opacity:.06;transform:scaleX(-1);animation:av-wind-fine 38s linear infinite reverse}`
- **Classes:** `.wind-layer--fine`.
- **Mobile:** Hidden; optional on tablet.
- **Performance:** Medium. **Tier:** Experimental.

### 43. Leaf drift layer

- **Purpose / use:** Move a very small number of peripheral leaves.
- **Code:** `.wind-layer--leaves{animation:av-leaves 22s linear infinite;opacity:.22}`.
- **Classes:** `.wind-layer--leaves`.
- **Mobile:** Hidden.
- **Performance:** Medium. **Tier:** Premium.

### 44. Paper fleck drift

- **Purpose / use:** Suggest page dust without a particle engine.
- **Code:** `.wind-layer--dust{background-image:url(...dust-flecks.webp);animation:av-dust 18s ease-in-out infinite alternate}`
- **Classes:** `.wind-layer--dust`.
- **Mobile:** Hidden below 768px.
- **Performance:** Low/Medium. **Tier:** Premium.

### 45. Gold mote shimmer

- **Purpose / use:** Add 3–5 tiny highlights near section dividers, not over text.
- **Code:** `.gold-mote{animation:av-mote 5s ease-in-out infinite}@keyframes av-mote{50%{opacity:.7;transform:translateY(-3px)}}`
- **Classes:** `.gold-mote`, nth-child delays.
- **Mobile:** Maximum three or hidden.
- **Performance:** Low. **Tier:** Experimental.

### 46. Wind line overlay

- **Purpose / use:** Mask atmosphere to the open sky and keep it off copy/animals.
- **Code:** `.wind-atmosphere{mask-image:linear-gradient(90deg,transparent 0 38%,#000 55% 100%)}`.
- **Classes:** `.wind-atmosphere`.
- **Mobile:** Hidden.
- **Performance:** Medium; test mask support. **Tier:** Premium.

### 47. Dust opacity control

- **Purpose / use:** Tune atmosphere per scene without editing core CSS.
- **Code:** `<HeroSection style={{"--dust-opacity":0.14}} />`; `.wind-layer--dust{opacity:var(--dust-opacity,.14)}`.
- **Classes:** `.wind-layer--dust`.
- **Mobile:** Variable resolves to zero.
- **Performance:** Low. **Tier:** Essential.

### 48. Mobile wind reduction

- **Purpose / use:** Remove nonessential composites on narrow/low-power screens.
- **Code:** `@media(max-width:767px){.wind-atmosphere{display:none}}`.
- **Classes:** `.wind-atmosphere`.
- **Mobile:** Complete removal.
- **Performance:** Saves Medium cost. **Tier:** Essential.

### 49. Reduced motion wind off

- **Purpose / use:** Honor user preference without retaining “subtle” loops.
- **Code:** `@media(prefers-reduced-motion:reduce){.wind-atmosphere{display:none}}`.
- **Classes:** `.wind-atmosphere`.
- **Mobile:** Same.
- **Performance:** Saves Medium cost. **Tier:** Essential.

### 50. Randomized particle delay utility

- **Purpose / use:** Assign stable delays to a tiny set of motes without hydration mismatch.
- **Code:** `const delayFor=(index)=>\`${-((index*2.37)%7).toFixed(2)}s\`;` then `style={{animationDelay:delayFor(i)}}`.
- **Classes:** `.gold-mote`, `.leaf`.
- **Mobile:** Do not create the particle elements.
- **Performance:** Low for ≤8 nodes. **Tier:** Experimental.

## F. Animal and glyph modules

### 51. Animal overlay container

- **Purpose / use:** Bound optional registered animal layers to the hero scene.
- **Code:** `<div className="hero-animals" aria-hidden="true"><img className="hero-animal animal--leopard" .../></div>`; `.hero-animals{position:absolute;inset:0;z-index:2;pointer-events:none}`.
- **Classes:** `.hero-animals`, `.hero-animal`.
- **Mobile:** Hide the container; mobile poster contains intentional composition.
- **Performance:** Medium based on image bytes. **Tier:** Premium.

### 52. Leopard breathing animation

- **Purpose / use:** Suggest life through a 1–2px chest/torso scale, only if the asset is anatomically isolated.
- **Code:** `@keyframes av-breathe{50%{transform:scale(1.006) translateY(-1px)}} .animal--leopard{transform-origin:55% 70%;animation:av-breathe 6s ease-in-out infinite}`
- **Classes:** `.animal--leopard`.
- **Mobile:** Disabled/hidden.
- **Performance:** Low after image decode. **Tier:** Premium.

### 53. Snake head sway

- **Purpose / use:** Add almost imperceptible foreground tension.
- **Code:** `@keyframes av-snake{50%{transform:rotate(.8deg) translateY(-1px)}} .animal--snake{transform-origin:72% 84%;animation:av-snake 8s ease-in-out infinite}`
- **Classes:** `.animal--snake`.
- **Mobile:** Hidden.
- **Performance:** Low. **Tier:** Experimental; reject if the crop looks hinged.

### 54. Falcon glide

- **Purpose / use:** Let a separate sky bird drift across a short range.
- **Code:** `@keyframes av-falcon{50%{transform:translate3d(8px,-4px,0) rotate(.4deg)}} .animal--falcon{animation:av-falcon 16s ease-in-out infinite}`
- **Classes:** `.animal--falcon`.
- **Mobile:** Hidden; do not cross headline safe zone.
- **Performance:** Low/Medium. **Tier:** Premium.

### 55. Deer idle float

- **Purpose / use:** Introduce a glyph-like deer at a transition, not a realistic animal floating in space.
- **Code:** `.glyph--deer{animation:av-idle 7s ease-in-out infinite}@keyframes av-idle{50%{transform:translateY(-2px)}}`
- **Classes:** `.glyph--deer`.
- **Mobile:** Static.
- **Performance:** Low. **Tier:** Premium.

### 56. Elephant glyph pulse

- **Purpose / use:** Give a domain icon one restrained hover response.
- **Code:** `.domain-card:hover .glyph--elephant{animation:av-glyph-pulse .45s}@keyframes av-glyph-pulse{50%{transform:scale(1.035)}}`
- **Classes:** `.glyph--elephant`.
- **Mobile:** Trigger on focus, not automatic loop.
- **Performance:** Low. **Tier:** Premium.

### 57. Animal frieze strip

- **Purpose / use:** Close the hero with a continuous symbolic register.
- **Code:** `<img className="glyph-frieze__image" src=".../animal-glyph-frieze.svg" alt="" width="1920" height="96"/>`.
- **Classes:** `.glyph-frieze`, `.glyph-frieze__image`.
- **Mobile:** Center crop at fixed 88px height.
- **Performance:** Low if SVG is optimized. **Tier:** Essential.

### 58. Frieze scroll reveal

- **Purpose / use:** Reveal the strip once as the hero boundary enters view.
- **Code:** `.glyph-frieze[data-revealed]{clip-path:inset(0)} .glyph-frieze{clip-path:inset(0 50%);transition:clip-path 1.1s var(--av-ease-cinematic)}`
- **Classes:** `.glyph-frieze[data-revealed]`.
- **Mobile:** 700ms; reduced motion starts revealed.
- **Performance:** Medium. **Tier:** Premium.

### 59. Glyph hover tint

- **Purpose / use:** Tint interactive domain glyphs to their semantic accent.
- **Code:** `.domain-card__icon{transition:filter .25s}.domain-card:hover .domain-card__icon{filter:var(--domain-hover-filter)}`.
- **Classes:** `.domain-card__icon`.
- **Mobile:** Focus-visible gets equivalent border/title treatment; avoid filter if blurry.
- **Performance:** Medium. **Tier:** Premium.

### 60. Animal asset crop positioning

- **Purpose / use:** Store placement as data rather than scattered pixel overrides.
- **Code:** `<img style={{"--x":"72%","--y":"64%","--w":"22%"}} ...>`; `.hero-animal{left:var(--x);top:var(--y);width:var(--w)}`.
- **Classes:** `.hero-animal`.
- **Mobile:** Container hidden; tablet may use alternate variables.
- **Performance:** Low. **Tier:** Essential for optional layers.

## G. CTA modules

### 61. Terracotta button

- **Purpose / use:** Primary action for Explore Journal or Submit Work.
- **Code:** `.av-button--primary{color:var(--av-parchment-50);background:var(--av-terracotta-500);border-color:var(--av-terracotta-700);box-shadow:0 4px 0 var(--av-terracotta-700)}`
- **Classes:** `.av-button`, `.av-button--primary`.
- **Mobile:** Full width under 480px.
- **Performance:** Low. **Tier:** Essential.

### 62. Ivory outline button

- **Purpose / use:** Secondary action that stays visually quieter.
- **Code:** `.av-button--secondary{color:var(--av-ink-900);background:#faf5e9d9;border:1px solid var(--av-sepia-400)}`
- **Classes:** `.av-button--secondary`.
- **Mobile:** Full width when stacked.
- **Performance:** Low. **Tier:** Essential.

### 63. Olive CTA bar

- **Purpose / use:** Give Explore Journal a deep editorial action row.
- **Code:** `.home-action--olive{color:var(--av-parchment-50);background:var(--av-olive-600) url(.../plate-olive.webp) center/cover}`
- **Classes:** `.home-action--olive`.
- **Mobile:** Use flat olive or lower texture opacity through a pseudo-element.
- **Performance:** Low/Medium. **Tier:** Essential.

### 64. Button light sweep

- **Purpose / use:** Add a single soft reflective sweep on hover.
- **Code:** `.av-button::before{content:"";position:absolute;inset:-20%;background:linear-gradient(105deg,transparent 40%,#fff3 50%,transparent 60%);transform:translateX(-120%)} .av-button:hover::before{transform:translateX(120%);transition:transform .7s}`
- **Classes:** `.av-button::before`.
- **Mobile:** Disable on coarse pointers.
- **Performance:** Low/Medium. **Tier:** Premium.

### 65. Arrow slide hover

- **Purpose / use:** Confirm directional affordance.
- **Code:** `.av-button [aria-hidden=true],.home-action__arrow{transition:transform .2s}.av-button:hover [aria-hidden=true]{transform:translateX(4px)}`
- **Classes:** `.home-action__arrow`.
- **Mobile:** Also active on keyboard focus; no persistent displacement.
- **Performance:** Low. **Tier:** Essential.

### 66. Button pressed state

- **Purpose / use:** Provide tactile feedback without shrinking text.
- **Code:** `.av-button:active{transform:translateY(1px);box-shadow:none}`.
- **Classes:** `.av-button`.
- **Mobile:** Same; ensure no 300ms click delay via normal viewport setup.
- **Performance:** Low. **Tier:** Essential.

### 67. Button focus state

- **Purpose / use:** Make keyboard focus unmistakable against every plate color.
- **Code:** `.av-button:focus-visible{outline:3px solid var(--av-focus);outline-offset:3px}`.
- **Classes:** `.av-button`.
- **Mobile:** Visible for external keyboard/switch input.
- **Performance:** Low. **Tier:** Essential.

### 68. CTA icon slot

- **Purpose / use:** Reserve consistent geometry for book, quill, and community glyphs.
- **Code:** `.home-action__icon{display:grid;width:5rem;aspect-ratio:1;place-items:center;border-right:1px solid currentColor}`.
- **Classes:** `.home-action__icon`.
- **Mobile:** Width 3.5rem; border may move to inset separator.
- **Performance:** Low. **Tier:** Essential.

### 69. CTA mobile full-width

- **Purpose / use:** Prevent narrow paired actions and tiny tap targets.
- **Code:** `@media(max-width:479px){.hero-content__actions{display:grid}.hero-content__actions .av-button{width:100%}}`
- **Classes:** `.hero-content__actions`, `.av-button`.
- **Mobile:** Core behavior.
- **Performance:** Low. **Tier:** Essential.

### 70. CTA disabled/loading state

- **Purpose / use:** Support real form actions without ambiguous double submission.
- **Code:** `.av-button[aria-busy=true],button:disabled{cursor:wait;opacity:.65}` and `<button aria-busy={loading} disabled={loading}>`.
- **Classes:** `[aria-busy]`.
- **Mobile:** Keep label width stable; replace icon, not whole text.
- **Performance:** Low. **Tier:** Essential where buttons submit.

## H. Domain modules

### 71. Domain chip component

- **Purpose / use:** Provide six compact hero entry points.
- **Code:** `<a className="domain-chip" href={href}><img src={icon} alt=""/><span>{label}</span></a>`.
- **Classes:** `.domain-chips`, `.domain-chip`.
- **Mobile:** Two columns at compact sizes.
- **Performance:** Low. **Tier:** Essential.

### 72. Chip icon hover lift

- **Purpose / use:** Give icons a lightweight response without moving the chip.
- **Code:** `.domain-chip img{transition:transform .2s}.domain-chip:hover img{transform:translateY(-2px)}`.
- **Classes:** `.domain-chip img`.
- **Mobile:** Apply on focus-visible; not automatic.
- **Performance:** Low. **Tier:** Premium.

### 73. Domain grid card

- **Purpose / use:** Build the primary Browse by Domain destination.
- **Code:** `.domain-card{display:flex;min-height:23rem;flex-direction:column;align-items:center;padding:2.5rem 1.75rem;text-align:center}`.
- **Classes:** `.domain-card`, `__icon`, `__hint`.
- **Mobile:** One column, minimum 18rem.
- **Performance:** Low. **Tier:** Essential.

### 74. Domain card hover frame

- **Purpose / use:** Emphasize the nested rule rather than applying a modern glow.
- **Code:** `.domain-card:hover::after{border-color:var(--av-gold-500);inset:.5rem}`.
- **Classes:** `.domain-card::after`.
- **Mobile:** Use focus-visible; no hover dependency.
- **Performance:** Low. **Tier:** Premium.

### 75. Domain animal icon placement

- **Purpose / use:** Keep all six symbolic animals optically aligned.
- **Code:** `.domain-card__icon-wrap{display:grid;width:7rem;height:7rem;place-items:center}.domain-card__icon{max-width:6rem;max-height:6rem}`
- **Classes:** `.domain-card__icon-wrap`, `__icon`.
- **Mobile:** 5.25rem icon box.
- **Performance:** Low. **Tier:** Essential.

### 76. Active domain state

- **Purpose / use:** Mark the current domain when the component is reused on category pages.
- **Code:** `<a aria-current={active ? "page" : undefined}>`; `.domain-chip[aria-current=page]{background:var(--av-terracotta-500);color:white}`.
- **Classes:** `[aria-current="page"]`.
- **Mobile:** Same semantics and contrast.
- **Performance:** Low. **Tier:** Essential.

### 77. Domain card responsive grid

- **Purpose / use:** Maintain appropriate card width across six items.
- **Code:** `.domain-grid{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:1023px){...repeat(2,...)}@media(max-width:639px){...1fr}`
- **Classes:** `.domain-grid`.
- **Mobile:** One column.
- **Performance:** Low. **Tier:** Essential.

### 78. Domain card background texture

- **Purpose / use:** Create very light tonal differentiation without reducing text contrast.
- **Code:** `.domain-card{background:radial-gradient(circle at 50% 12%,#fff9,transparent 42%),var(--av-parchment-100)}`.
- **Classes:** `.domain-card`.
- **Mobile:** Same or flat parchment.
- **Performance:** Low. **Tier:** Premium.

### 79. Domain click animation

- **Purpose / use:** Acknowledge activation before route navigation only if routing is not delayed.
- **Code:** `.domain-card:active{transform:translateY(-1px) scale(.995)}`.
- **Classes:** `.domain-card:active`.
- **Mobile:** 80ms visual response; never delay navigation programmatically.
- **Performance:** Low. **Tier:** Premium.

### 80. Domain keyboard focus

- **Purpose / use:** Keep entire-card links navigable and visible.
- **Code:** `.domain-card:focus-visible{outline:3px solid var(--av-focus);outline-offset:4px}`.
- **Classes:** `.domain-card:focus-visible`.
- **Mobile:** Works with keyboard/switch access.
- **Performance:** Low. **Tier:** Essential.

## I. Section transition modules

### 81. Lotus divider

- **Purpose / use:** Punctuate section titles with the brand motif.
- **Code:** `<div className="lotus-divider" aria-hidden="true"><span/><img src=".../lotus-divider.svg" alt=""/><span/></div>`.
- **Classes:** `.lotus-divider`.
- **Mobile:** Lines shorten; icon stays 32–40px.
- **Performance:** Low. **Tier:** Essential.

### 82. Divider center reveal

- **Purpose / use:** Draw divider lines outward from the lotus once.
- **Code:** `.lotus-divider span{transform:scaleX(0)} [data-revealed] .lotus-divider span{transform:scaleX(1);transition:transform .8s;transform-origin:center}`.
- **Classes:** `.lotus-divider`, `[data-revealed]`.
- **Mobile:** 500ms; static reduced motion.
- **Performance:** Low. **Tier:** Premium.

### 83. Architecture background parallax

- **Purpose / use:** Extend the world subtly on very wide screens.
- **Code:** `.architecture-extension{transform:translate3d(0,calc(var(--scroll-progress)*-12px),0)}`.
- **Classes:** `.architecture-extension`.
- **Mobile:** Hidden below 1440px and reduced motion.
- **Performance:** Medium. **Tier:** Experimental.

### 84. Section fade-up reveal

- **Purpose / use:** Reveal lower content when it first approaches the viewport.
- **Code:** `.reveal{opacity:0;transform:translateY(14px)}.reveal.is-visible{opacity:1;transform:none;transition:.7s var(--av-ease-cinematic)}`.
- **Classes:** `.reveal`, `.is-visible`.
- **Mobile:** Travel 8px; content remains visible if JS fails via `.js` scoping.
- **Performance:** Low. **Tier:** Premium.

### 85. Scroll-linked depth layer

- **Purpose / use:** Move a peripheral ornament by at most 10px.
- **Code:** `element.style.setProperty("--depth", Math.max(-1,Math.min(1,rect.top/innerHeight)))`.
- **Classes:** `.depth-layer`.
- **Mobile:** Disabled.
- **Performance:** Medium with one rAF loop. **Tier:** Experimental.

### 86. Knowledge map nodes

- **Purpose / use:** Render real linked taxonomy nodes as HTML anchors over an SVG field.
- **Code:** `<a className="knowledge-node" style={{"--x":`${x}%`,"--y":`${y}%`}} href={href}>{label}</a>`.
- **Classes:** `.knowledge-node`.
- **Mobile:** Replace freeform placement with a simple list/grid.
- **Performance:** Low for <20 nodes. **Tier:** Premium.

### 87. Knowledge map line draw

- **Purpose / use:** Reveal real relationships after the section enters view.
- **Code:** `.map-line{stroke-dasharray:var(--length);stroke-dashoffset:var(--length)}.is-visible .map-line{stroke-dashoffset:0;transition:1.2s}`
- **Classes:** `.map-line`.
- **Mobile:** Static lines or list; reduced motion static.
- **Performance:** Low/Medium. **Tier:** Premium.

### 88. Manuscript frame reveal

- **Purpose / use:** Draw a card frame without hiding content.
- **Code:** `.frame-reveal::after{clip-path:inset(0 50%)}.frame-reveal.is-visible::after{clip-path:inset(0);transition:.9s}`
- **Classes:** `.frame-reveal`.
- **Mobile:** Shorter duration.
- **Performance:** Medium. **Tier:** Premium.

### 89. Corner flourish reveal

- **Purpose / use:** Fade decorative corner SVGs after the frame settles.
- **Code:** `.corner-flourish{opacity:0;transform:scale(.92)}.is-visible .corner-flourish{opacity:.55;transform:none;transition:.6s .35s}`
- **Classes:** `.corner-flourish`.
- **Mobile:** Use only two corners or omit.
- **Performance:** Low. **Tier:** Premium.

### 90. Subtle border shimmer

- **Purpose / use:** Provide a rare hover highlight on large action plates.
- **Code:** `.home-action::after{background:linear-gradient(90deg,transparent,#c4a76b66,transparent);transform:translateX(-100%)}.home-action:hover::after{transform:translateX(100%);transition:.9s}`
- **Classes:** `.home-action::after`.
- **Mobile:** Disabled on coarse pointer.
- **Performance:** Low/Medium. **Tier:** Experimental.

## J. Footer and polish modules

### 91. Newsletter card

- **Purpose / use:** Present signup as a framed archival letter.
- **Code:** `.newsletter__card{display:grid;grid-template-columns:1fr 1.2fr;gap:3rem;padding:clamp(2rem,5vw,4rem);background:var(--av-parchment-50)}`
- **Classes:** `.newsletter__card`.
- **Mobile:** One column.
- **Performance:** Low. **Tier:** Essential.

### 92. Newsletter input focus glow

- **Purpose / use:** Make field focus obvious using a restrained gold/blue ring.
- **Code:** `.newsletter__control:focus-within{box-shadow:0 0 0 3px rgb(30 102 208/.28);border-color:var(--av-focus)}`.
- **Classes:** `.newsletter__control`.
- **Mobile:** Same; button may stack below 400px.
- **Performance:** Low. **Tier:** Essential.

### 93. Footer animal strip

- **Purpose / use:** Bridge parchment newsletter to olive footer with symbolic rhythm.
- **Code:** `<img className="footer-animal-strip" src=".../animal-glyph-frieze.svg" alt=""/>`.
- **Classes:** `.footer-animal-strip`.
- **Mobile:** Center crop; avoid horizontal scrolling.
- **Performance:** Low. **Tier:** Premium.

### 94. Footer link hover

- **Purpose / use:** Reveal a fine gold rule without shifting layout.
- **Code:** `.premium-footer a{text-decoration-color:#f4ead659}.premium-footer a:hover{color:#fff9e9;text-decoration-color:currentColor}`.
- **Classes:** `.premium-footer a`.
- **Mobile:** Same plus visible focus.
- **Performance:** Low. **Tier:** Essential.

### 95. Footer landscape panels

- **Purpose / use:** Add faint botanical/architecture corners to the olive field.
- **Code:** `.premium-footer::before{content:"";position:absolute;inset:auto 0 0;background:url(.../footer-landscape.webp) bottom/cover no-repeat;opacity:.14}`
- **Classes:** `.premium-footer::before`.
- **Mobile:** Use a smaller crop or remove.
- **Performance:** Low/Medium. **Tier:** Premium.

### 96. Loading emblem

- **Purpose / use:** Brand a true route-level loading state, not decorative video loading.
- **Code:** `<div role="status" className="loading-emblem"><img alt=""/><span className="sr-only">Loading</span></div>`.
- **Classes:** `.loading-emblem`.
- **Mobile:** 32px; static in reduced motion.
- **Performance:** Low. **Tier:** Premium.

### 97. Page transition fade

- **Purpose / use:** Smooth client-side route swaps if the existing router supports transitions.
- **Code:** `@view-transition{navigation:auto} ::view-transition-old(root){animation:fade-out .18s} ::view-transition-new(root){animation:fade-in .28s}`.
- **Classes:** Browser pseudo-elements.
- **Mobile:** Respect reduced motion; progressive enhancement only.
- **Performance:** Medium. **Tier:** Experimental.

### 98. Image lazy loader

- **Purpose / use:** Standardize dimensions, lazy loading, and decoding below fold.
- **Code:** `<img loading={eager?"eager":"lazy"} decoding="async" width={width} height={height} .../>`.
- **Classes:** `.smart-image`.
- **Mobile:** Select smaller `srcset` candidates.
- **Performance:** Saves Medium cost. **Tier:** Essential.

### 99. Final performance guard

- **Purpose / use:** Automatically disable premium layers under Save-Data or low device memory.
- **Code:** `const lite = navigator.connection?.saveData || navigator.deviceMemory <= 4; document.documentElement.dataset.avLite = lite;`
- **Classes:** `[data-av-lite=true] .wind-atmosphere,[data-av-lite=true] .hero-animals{display:none}`.
- **Mobile:** Frequently active; core experience remains complete.
- **Performance:** Saves High cost. **Tier:** Essential.

### 100. Final QA debug overlay

- **Purpose / use:** Show containers, safe zones, focal point, and tap targets during development.
- **Code:** `.av-debug *{outline:1px solid #f006}.av-debug .hero::before{content:"TEXT SAFE ZONE";position:absolute;left:5%;top:13%;width:39%;height:70%;border:2px dashed red;z-index:99}`.
- **Classes:** `.av-debug` on `<html>` toggled only by `?avDebug=1`.
- **Mobile:** Uses mobile safe-zone dimensions.
- **Performance:** Development only; strip/disable in production. **Tier:** Essential for QA.

---

# 23. FILE-BY-FILE IMPLEMENTATION BLUEPRINT

The paths below assume the provisional Vite + React track. Apply the path adaptation matrix from Section 1 if the audit identifies another stack. TypeScript projects should use `.tsx`/`.ts` and typed props.

## 23.1 Application and route files

### `src/pages/HomePage.jsx`

- **Purpose:** Own homepage section order and page-level imports.
- **Contains:** Skip link, `SiteHeader`, semantic `<main>`, `HeroSection`, `BrowseByDomain`, `HomeCTAStack`, conditional `KnowledgeMapPreview`, `NewsletterSection`, and `PremiumFooter`.
- **Dependencies:** Home components, layout components, `anvikshiki.home.css`.
- **Notes:** Remove the `FeaturedEssays` render/import from this file only. Do not delete a shared essay component used elsewhere.

### `src/App.jsx` or existing router file

- **Purpose:** Map `/` to `HomePage`.
- **Contains:** Existing router configuration only.
- **Dependencies:** Current routing library.
- **Notes:** Do not replace routing architecture. Verify all CTA destination routes.

## 23.2 Layout components

### `src/components/layout/SiteHeader.jsx`

- **Purpose:** Brand, primary navigation, utilities, and mobile menu trigger.
- **Contains:** Sticky header, actual route links, `MobileNav`, scroll-state enhancement.
- **Dependencies:** Existing router `Link`, `useHeaderScroll`, brand assets.
- **Notes:** Search/account/notification actions render only if functional.

### `src/components/layout/MobileNav.jsx`

- **Purpose:** Accessible small-screen navigation.
- **Contains:** Backdrop, dialog/panel, repeated navigation links, close button.
- **Dependencies:** Focus trap utility or existing accessible dialog primitive.
- **Notes:** Escape close, focus restore, scroll lock, route-change close.

### `src/components/layout/PremiumFooter.jsx`

- **Purpose:** Footer navigation, legal links, brand close, optional landscape.
- **Contains:** Explore/Community lists sourced from data, copyright, accessibility link.
- **Dependencies:** `footerLinks` data and ornament assets.
- **Notes:** Omit links without live routes.

## 23.3 Hero components

### `src/components/home/HeroSection.jsx`

- **Purpose:** Compose the full hero and glyph boundary.
- **Contains:** `HeroVideo`, `WindAtmosphere`, `HeroContent`, `AnimalLayers` if approved, `AnimalGlyphFrieze`.
- **Dependencies:** Child components and homepage content.
- **Notes:** Own `aria-labelledby`; no page-wide overlay.

### `src/components/home/HeroVideo.jsx`

- **Purpose:** Video/poster state machine and error-safe media.
- **Contains:** Responsive `<picture>`, conditional `<video>`, local scrim.
- **Dependencies:** `useReducedMotion`, `useSaveData`, asset constants.
- **Notes:** In Next.js, this is a client component; never access `navigator` during SSR render.

### `src/components/home/HeroContent.jsx`

- **Purpose:** Eyebrow, headline, description, CTAs, domain chips.
- **Contains:** Semantic copy and links.
- **Dependencies:** `DomainChips`, `homepageContent`.
- **Notes:** Keep copy out of important subject safe zones.

### `src/components/home/WindAtmosphere.jsx`

- **Purpose:** Three bounded decorative image layers.
- **Contains:** Lines, dust, leaves spans.
- **Dependencies:** Atmosphere assets and CSS.
- **Notes:** No generated DOM particle field in Phase 1.

### `src/components/home/AnimalLayers.jsx`

- **Purpose:** Optional registered animal/architecture overlays.
- **Contains:** Only assets that pass visual registration QA.
- **Dependencies:** Manifest crop metadata.
- **Notes:** Feature flag `VITE_ENABLE_HERO_LAYERS`; desktop only.

### `src/components/home/AnimalGlyphFrieze.jsx`

- **Purpose:** Hero boundary strip.
- **Contains:** One decorative SVG image with dimensions.
- **Dependencies:** Frieze asset.
- **Notes:** Eager load because it is in initial hero.

## 23.4 Homepage section components

### `src/components/home/DomainChips.jsx`

- **Purpose:** Six compact hero category links.
- **Contains:** Data-mapped icons and labels.
- **Dependencies:** `DOMAIN_CARDS`.
- **Notes:** Use the same canonical labels/routes as domain cards.

### `src/components/home/BrowseByDomain.jsx`

- **Purpose:** Six large editorial domain cards.
- **Contains:** Section heading and responsive grid.
- **Dependencies:** `DomainCard`, domain data.
- **Notes:** Entire card is one link; no nested links.

### `src/components/home/DomainCard.jsx`

- **Purpose:** Reusable framed category card.
- **Contains:** Icon, title, body, Explore hint.
- **Dependencies:** `SmartImage` or inline SVG asset.
- **Notes:** Empty alt for icon because visible title names the link.

### `src/components/home/HomeCTAStack.jsx`

- **Purpose:** Submit, Explore, and Join action bars.
- **Contains:** Data-driven action rows with icon/copy/arrow slots.
- **Dependencies:** `HOME_ACTIONS`.
- **Notes:** Use links, not click handlers, for navigation.

### `src/components/home/KnowledgeMapPreview.jsx`

- **Purpose:** Optional real taxonomy preview.
- **Contains:** Copy, CTA, SVG relationship lines, HTML node links.
- **Dependencies:** `knowledgeNodes`.
- **Notes:** Do not render until at least four real nodes and real routes exist.

### `src/components/home/NewsletterSection.jsx`

- **Purpose:** Accessible signup form in a framed letter card.
- **Contains:** Visible email label, submit state, live status, privacy link.
- **Dependencies:** Newsletter service function.
- **Notes:** Integrate the existing backend/API; do not hardcode fake success.

### `src/components/home/SectionHeading.jsx`

- **Purpose:** Consistent title plus lotus divider.
- **Contains:** `h2` with caller-provided ID and decorative divider.
- **Dependencies:** Lotus asset.
- **Notes:** Decorative marks stay outside accessible text.

### `src/components/home/index.js`

- **Purpose:** Stable exports for homepage composition.
- **Contains:** Named exports only.
- **Dependencies:** Home components.
- **Notes:** Avoid default-export ambiguity.

## 23.5 Data and utility files

### `src/data/homepageContent.js`

- **Purpose:** Canonical copy, domain records, actions, header/footer links.
- **Contains:** `DOMAIN_CARDS`, `HOME_ACTIONS`, hero text, optional knowledge nodes.
- **Dependencies:** None.
- **Notes:** Each record contains a stable key and real route.

### `src/data/anvikshikiAssets.js`

- **Purpose:** Base path constants, safe URL builder, manifest loader.
- **Contains:** Core fallbacks and validated manifest fetching.
- **Dependencies:** Public manifest.
- **Notes:** Core hero must not depend solely on network JSON.

### `src/hooks/useReducedMotion.js`

- **Purpose:** Subscribe to `prefers-reduced-motion`.
- **Contains:** `matchMedia` listener with cleanup.
- **Dependencies:** React.
- **Notes:** Support legacy `addListener` only if target browsers require it.

### `src/hooks/useMediaQuery.js`

- **Purpose:** Query behavior-only breakpoints.
- **Contains:** SSR-safe media query state.
- **Dependencies:** React.
- **Notes:** Layout remains CSS-driven.

### `src/hooks/useHeaderScroll.js`

- **Purpose:** Add scrolled state after 24px.
- **Contains:** Passive listener or `IntersectionObserver` sentinel.
- **Dependencies:** React.
- **Notes:** Sentinel is preferable to continuous scroll.

### `src/utils/intersectionReveal.js`

- **Purpose:** Add `.is-visible` once and disconnect.
- **Contains:**

```js
export function revealOnEnter(elements) {
  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return () => {};
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  elements.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}
```

- **Notes:** Without JS, content must remain visible. Add hidden initial states only after a `.js` class is set.

### `src/utils/videoPolicy.js`

- **Purpose:** Centralize reduced-motion, Save-Data, mobile, and visibility rules.
- **Contains:** `shouldUsePosterOnly()` and document visibility helper.
- **Dependencies:** Browser APIs.
- **Notes:** Must be SSR-safe.

### `src/services/newsletter.js`

- **Purpose:** Wrap the real subscription endpoint.
- **Contains:** Request, response validation, normalized errors, abort support.
- **Dependencies:** Existing API configuration.
- **Notes:** Never log email addresses.

## 23.6 Style files

### `src/styles/anvikshiki.tokens.css`

- **Purpose:** Colors, type, spacing, geometry, shadows, motion, z-index.
- **Dependencies:** None.
- **Notes:** Loaded once before component CSS.

### `src/styles/anvikshiki.base.css`

- **Purpose:** Scoped box sizing, media defaults, accessibility helpers.
- **Dependencies:** Tokens.
- **Notes:** Do not apply destructive global resets beyond `.anvikshiki-home`.

### `src/styles/anvikshiki.home.css`

- **Purpose:** Homepage layouts and components.
- **Dependencies:** Tokens/base and public assets.
- **Notes:** Organize in page order; include responsive rules beside each component or in one documented responsive section, not both.

### `src/styles/anvikshiki.motion.css`

- **Purpose:** Keyframes, reveal classes, reduced-motion override.
- **Dependencies:** Tokens.
- **Notes:** Optional split if the current project does not prefer one CSS file.

## 23.7 Assets and documentation

### `public/assets/anvikshiki/phase-1/manifest/assets-manifest.json`

- **Purpose:** Asset URLs, focal points, safe zones, crop metadata.
- **Dependencies:** Production files under the same root.
- **Notes:** Increment `version` when crop metadata changes.

### `docs/homepage-audit.md`

- **Purpose:** Record actual project findings and deviations from this provisional plan.
- **Dependencies:** None.
- **Notes:** Must be completed before edits.

### `docs/homepage-asset-register.md`

- **Purpose:** Record source, license, dimensions, byte size, alpha-edge QA, and approval for each asset.
- **Dependencies:** Asset exports.
- **Notes:** Especially important for AI-generated sheets and font licensing.

### `tests/homepage.spec.*`

- **Purpose:** Route, CTA, keyboard, newsletter, reduced-motion, and visual smoke tests.
- **Dependencies:** Existing test runner.
- **Notes:** Use the project’s current test tooling; do not install Playwright solely if an equivalent exists.

---

# 24. PHASE-BY-PHASE REPLIT BUILD PLAN

## Phase A — Safety and setup

**Files touched**

- `docs/homepage-audit.md`
- `docs/homepage-asset-register.md`
- token/base style files
- public Phase 1 directories

**Components added:** None required yet.

**CSS added:** Tokens, scoped base rules, accessibility helpers, reduced-motion baseline.

**Assets needed:** All ten Phase 1 families plus video formats.

**Actions**

1. Create a Replit checkpoint/branch.
2. Run the stack-detection gate and fill the audit.
3. Enumerate current homepage sections, routes, header/footer ownership, and current responsive rules.
4. Verify asset licenses and inspect alpha edges.
5. Transcode video and posters; record sizes.
6. Add the manifest and static fallback constants.
7. Add tokens without changing the visible page.

**Acceptance criteria**

- Build and existing tests remain green.
- Every new asset has dimensions, format, bytes, and usage.
- Actual file mapping replaces provisional assumptions.
- No visual page change yet except approved font loading diagnostics.

## Phase B — Hero rebuild

**Files touched**

- homepage route
- `HeroSection`, `HeroVideo`, `HeroContent`, `DomainChips`, frieze
- homepage CSS and hooks

**Components added:** Core hero component set.

**CSS added:** Hero stack, safe zones, local scrim, buttons, chips, poster/video state.

**Assets needed:** Hero videos, desktop/mobile posters, logo/header asset, domain icons, frieze.

**Actions**

1. Build semantic hero using poster only.
2. Place copy against recorded desktop and mobile safe zones.
3. Add video beneath the poster state system.
4. Add local scrim and inspect on multiple video frames.
5. Add real CTA links and domain chips.
6. Add glyph frieze.
7. Remove the Featured Essays call from the homepage.

**Acceptance criteria**

- Hero remains complete when video is deleted or blocked.
- Video autoplays muted, loops, plays inline, and has no controls.
- No page-wide white/milky overlay exists.
- Text does not cover the primary traveler/animal/architecture subjects.
- Mobile shows the mobile poster and core actions.
- Reduced motion shows a static poster.
- Featured Essays is absent from the homepage DOM.

## Phase C — Visual atmosphere

**Files touched**

- `WindAtmosphere`
- optional `AnimalLayers`
- motion CSS
- header component/CSS

**Components added:** Wind layers, approved optional animal layers.

**CSS added:** Sparse wind loops, header states, hover/focus polish.

**Assets needed:** Wind, dust, leaves, animal exports, architecture extension.

**Actions**

1. Add wind lines at ≤0.12 opacity.
2. Add dust and inspect against darkest/lightest frames.
3. Add leaves only if composition benefits.
4. Test optional animals one by one; reject any mismatched composite.
5. Add header ornament and scroll state.
6. Add CTA/chip hover and keyboard focus parity.

**Acceptance criteria**

- Atmosphere never crosses or reduces text readability.
- Mobile and reduced motion contain no ambient loops.
- No more than three atmosphere image layers.
- Every detached animal looks registered at 1024, 1280, 1440, and 1920px or is removed.
- Page remains usable with CSS animation disabled.

## Phase D — Middle homepage

**Files touched**

- `BrowseByDomain`
- `DomainCard`
- `HomeCTAStack`
- optional `KnowledgeMapPreview`
- data and CSS files

**Components added:** Domain grid, action stack, optional real map.

**CSS added:** Manuscript cards, responsive grid, action plates, section transitions.

**Assets needed:** Domain icons, CTA plates, lotus/corner ornaments.

**Actions**

1. Build domain cards with canonical data.
2. Add three action bars.
3. Verify every destination route.
4. Add map only if real taxonomy is ready.
5. Add one-time intersection reveals.

**Acceptance criteria**

- Six domain cards are keyboard reachable and have real destinations.
- Grid is 3/2/1 columns at desktop/tablet/mobile.
- Action bars wrap copy without clipping.
- Knowledge map, if present, is meaningful without animation and becomes a list on mobile.
- No placeholder essay content appears.

## Phase E — Footer

**Files touched**

- `NewsletterSection`
- newsletter service
- `PremiumFooter`
- footer data and CSS

**Components added:** Newsletter and footer.

**CSS added:** Framed letter card, form states, olive footer, optional landscape corners.

**Assets needed:** Footer glyph strip/landscape if approved.

**Actions**

1. Connect the existing real newsletter endpoint.
2. Implement loading, success, and failure states.
3. Add verified footer navigation and legal links.
4. Add restrained footer ornament.

**Acceptance criteria**

- Invalid email is rejected by native and server validation.
- Failure preserves the entered address.
- Success/error is announced.
- Footer contains no dead links.
- Text contrast passes on olive.

## Phase F — Responsive and performance

**Files touched**

- all responsive CSS
- video policy
- image wrapper
- build/static caching config if available

**Components added:** None unless a project-level image primitive is needed.

**CSS added:** Final mobile/tablet/wide overrides and lite mode.

**Assets needed:** Final compressed derivatives.

**Actions**

1. Test all listed viewport widths and 200% zoom.
2. Apply mobile poster-only policy.
3. Test Save-Data and reduced-motion.
4. Remove unused sheet files and oversized exports.
5. Run Lighthouse/Web Vitals on production build.
6. Inspect CLS and LCP element attribution.

**Acceptance criteria**

- LCP target <2.5s on representative mobile test.
- CLS <0.1 and INP <200ms.
- No horizontal overflow at 320px.
- Initial poster is correctly sized and prioritized.
- Below-fold assets are lazy.
- Core page works with JavaScript disabled, except form enhancement.

## Phase G — Final polish

**Files touched:** Only files associated with verified defects.

**Components added:** None without explicit approval.

**CSS added:** Small measured refinements only.

**Assets needed:** Final approved production exports.

**Actions**

1. Typography and line-break review.
2. Scene safe-zone review across video timeline.
3. Keyboard, screen reader, contrast, and touch review.
4. Route/action review.
5. Motion review at normal and reduced settings.
6. Delete debug flags and console output.

**Acceptance criteria**

- All criteria in Section 25 pass.
- No unresolved high/critical accessibility or performance findings.
- Stakeholder approves desktop and mobile poster crop.
- The page reads as one illustrated world, not a collection of generated assets.

---

# 25. FINAL QA CHECKLIST

## 25.1 Project integrity

- [ ] Actual framework, homepage file, router, styles, and asset path are recorded.
- [ ] Existing build and test commands pass.
- [ ] No unrelated files were replaced.
- [ ] No new framework or animation dependency was added without need.
- [ ] No console errors, hydration errors, or missing assets.

## 25.2 Hero and visual hierarchy

- [ ] Hero video is clearly visible and is the dominant visual.
- [ ] Video autoplays muted, loops, uses `playsInline`, and shows no controls.
- [ ] Desktop WebM and MP4 sources are supplied.
- [ ] Desktop and mobile posters have correct dimensions and focal points.
- [ ] Poster remains visible during loading and on error.
- [ ] There is no full-hero white, ivory, blur, or milky overlay.
- [ ] Local readability treatment fades out before the subject zone.
- [ ] Hero text never blocks the primary traveler, animal, or architecture details.
- [ ] Header remains readable over every state.
- [ ] Primary and secondary CTAs are immediately identifiable.
- [ ] Six domain chips are visible and usable.
- [ ] Glyph frieze closes the hero without becoming a marquee.

## 25.3 Content and routes

- [ ] Featured Essays is not rendered or merely CSS-hidden.
- [ ] Explore Journal route works.
- [ ] Submit Work route works.
- [ ] All six domain routes work.
- [ ] Join Community route works.
- [ ] Archive/Library route works if shown.
- [ ] Knowledge Map is real and routed, or entirely omitted.
- [ ] No fabricated authors, metrics, essays, or relationships.
- [ ] Footer contains only live links.

## 25.4 Asset quality

- [ ] Transparent assets pass 200% edge inspection.
- [ ] No matte halos or baked background rectangles.
- [ ] Grain scale and palette are consistent.
- [ ] Animal scale and lighting are coherent.
- [ ] No asset looks like an oversized sticker.
- [ ] Optional animal layers are removed if registration is imperfect.
- [ ] Domain icons share viewBox, optical size, and stroke/detail density.
- [ ] Source/license records exist for every production asset.

## 25.5 Motion

- [ ] Video supplies primary motion; secondary motion remains sparse.
- [ ] Wind opacity is subtle over both dark and light frames.
- [ ] No more than three atmosphere image layers.
- [ ] Animations use transform/opacity where possible.
- [ ] Scroll work is scheduled with IntersectionObserver or rAF.
- [ ] Offscreen/document-hidden video and optional motion pause where appropriate.
- [ ] Reduced motion removes video and ambient loops.
- [ ] Mobile removes wind, leaves, detached animals, and parallax.

## 25.6 Responsive behavior

- [ ] 320, 360, 390, 430, 768, 1024, 1280, 1440, and 1920px reviewed.
- [ ] 200% zoom produces no loss of content or controls.
- [ ] No horizontal scrolling.
- [ ] Hero copy stays inside its safe zone.
- [ ] CTAs are full width on compact mobile.
- [ ] Domain grid follows 3/2/1 columns.
- [ ] Action bars allow multiline titles and descriptions.
- [ ] Newsletter controls stack cleanly when needed.
- [ ] Footer remains readable without hidden navigation.

## 25.7 Accessibility

- [ ] Skip link works.
- [ ] Heading order is logical with one `<h1>`.
- [ ] Decorative media has empty alt/`aria-hidden`.
- [ ] Every interactive target is at least 44×44px.
- [ ] Keyboard order follows visual order.
- [ ] Focus indication is visible on all tones.
- [ ] Mobile drawer traps/restores focus and closes on Escape.
- [ ] Text and UI contrast meet WCAG AA.
- [ ] Newsletter has a visible label, validation, and live status.
- [ ] Page remains understandable without color and without animation.

## 25.8 Performance

- [ ] Desktop poster ≤250KB AVIF target.
- [ ] Mobile poster ≤160KB AVIF target.
- [ ] Desktop video ideally ≤5MB; any file >8MB blocks release review.
- [ ] Hero dimensions prevent layout shift.
- [ ] One poster only is preloaded/prioritized.
- [ ] Video uses metadata preload.
- [ ] Below-fold media is lazy-loaded.
- [ ] No source asset sheets ship unnecessarily.
- [ ] LCP <2.5s, CLS <0.1, INP <200ms on representative tests.
- [ ] Save-Data/lite mode produces a complete static experience.

## 25.9 Final acceptance statement

The homepage is acceptable when it feels like a coherent digital manuscript: the video remains vivid, the text inhabits a protected editorial zone, ornament reinforces hierarchy, symbolic animals belong to the same illustrated world, all core routes and forms work, and mobile/reduced-motion users receive an equally intentional static composition. If any decorative layer weakens that coherence, remove it. Restraint is part of the art direction.

---

## Appendix A — Recommended implementation order inside a single Replit session

```text
1. Audit and checkpoint
2. Add/verify assets and manifest
3. Add tokens and base CSS
4. Build poster-only hero
5. Place content against safe zones
6. Add video state machine
7. Add header and frieze
8. Remove homepage Featured Essays render
9. Build domains and action stack
10. Add newsletter and footer
11. Add optional knowledge map
12. Add essential accessibility behavior
13. Compress/profile
14. Add selected premium motion
15. Run final QA and remove rejected layers
```

## Appendix B — Visual review script

During review, capture:

1. first paint before video;
2. video at 10%, 50%, and 90% of its loop;
3. video-error state;
4. reduced-motion state;
5. Save-Data/lite state;
6. 390×844 mobile hero;
7. 768×1024 tablet;
8. 1440×900 desktop;
9. 1920×1080 wide desktop;
10. full-page desktop and mobile.

Compare these captures side by side. The text safe zone must remain stable while the video changes. Approve the hero only after its weakest frame—not merely its poster frame—passes readability and composition review.

