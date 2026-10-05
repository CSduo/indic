/**
 * HTML primitives shared by every server-rendered page: the canonical origin,
 * escaping, the SPA template, the SSR stylesheet, structured-data helpers and
 * the document wrappers. Moved out of app.ts unchanged so page modules can use
 * them without importing the Express app.
 */
import fs from "fs";
import path from "path";
import { sanitizeArticleBody } from "./content";
import { slugify } from "./slug";

export const CANONICAL_DOMAIN = "https://anvikshikijournal.in";

export const SITE_NAME = "Ānvīkṣikī Journal";
export const ORGANIZATION_ID = `${CANONICAL_DOMAIN}/#organization`;
export const PERIODICAL_ID = `${CANONICAL_DOMAIN}/#periodical`;
// Must match the Periodical node in artifacts/anvikshiki/index.html.
export const PERIODICAL_NAME = "Ānvīkṣikī: Indic Philosophy, History & Civilizational Thought";

/** The publisher, as referenced from every page's structured data. */
export function publisherNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    "name": SITE_NAME,
    "url": CANONICAL_DOMAIN,
    // A real 512x512 PNG (public/brand-emblem.png); the old favicon.svg URL
    // did not exist and returned the HTML app shell.
    "logo": {
      "@type": "ImageObject",
      "url": `${CANONICAL_DOMAIN}/brand-emblem.png`,
      "width": 512,
      "height": 512,
    },
  };
}

export interface SocialImage {
  url: string;
  width?: number;
  height?: number;
}

/** 1200x630 card derived from opengraph.jpg (public/og-default.jpg). */
export const DEFAULT_SOCIAL_IMAGE: SocialImage = {
  url: `${CANONICAL_DOMAIN}/og-default.jpg`,
  width: 1200,
  height: 630,
};

/**
 * The image for og:image / twitter:image, with dimensions only when they are
 * known to be true. Cloudinary images are requested as an exact 1200x630 crop;
 * any other image is used as-is without claimed dimensions; no image falls back
 * to the default card. (The old fallback, /api/og/*, was never implemented and
 * returned 404.)
 */
export function socialImage(rawUrl: unknown): SocialImage {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return DEFAULT_SOCIAL_IMAGE;
  const url = rawUrl.trim().startsWith("/") ? `${CANONICAL_DOMAIN}${rawUrl.trim()}` : rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) return DEFAULT_SOCIAL_IMAGE;

  const cloudinary = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i);
  if (cloudinary) {
    return { url: `${cloudinary[1]}c_fill,w_1200,h_630,q_auto/${cloudinary[2]}`, width: 1200, height: 630 };
  }
  return { url };
}

export function socialImageMetaTags(image: SocialImage, alt: string): string {
  const url = escapeHtml(image.url);
  const dims = image.width && image.height
    ? `\n    <meta property="og:image:width" content="${image.width}" />\n    <meta property="og:image:height" content="${image.height}" />`
    : "";
  return `<meta property="og:image" content="${url}" />
    <meta property="og:image:secure_url" content="${url}" />${dims}
    <meta property="og:image:alt" content="${escapeHtml(alt)}" />
    <meta name="twitter:image" content="${url}" />`;
}

/** One <script type="application/ld+json"> holding a single @graph. */
export function jsonLdGraphScript(nodes: Array<Record<string, unknown>>): string {
  const graph = { "@context": "https://schema.org", "@graph": nodes };
  return `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2).replace(/</g, "\\u003c")}\n    </script>`;
}

export function buildCanonicalUrl(pathname: string, query?: Record<string, any> | string): string {
  let cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.replace(/\/+$/, "");
  }

  // Publication pages, author hubs, and domain hubs have clean entity URLs without query params
  const isEntityRoute = /^\/(articles|papers|authors|domains|essays|categories)\/[^/?#]+/i.test(cleanPath);
  if (isEntityRoute) {
    return `${CANONICAL_DOMAIN}${cleanPath}`;
  }

  // For general pages, strip marketing/tracking parameters
  let searchParams: URLSearchParams;
  if (typeof query === "string") {
    searchParams = new URLSearchParams(query);
  } else if (query && typeof query === "object") {
    searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) {
          v.forEach(item => searchParams.append(k, String(item)));
        } else {
          searchParams.append(k, String(v));
        }
      }
    }
  } else {
    searchParams = new URLSearchParams();
  }

  const trackingKeys = new Set(["ref", "fbclid", "gclid", "msclkid", "mc_eid", "_ga", "campaign"]);
  const toDelete: string[] = [];
  searchParams.forEach((_, key) => {
    const lower = key.toLowerCase();
    if (trackingKeys.has(lower) || lower.startsWith("utm_")) {
      toDelete.push(key);
    }
  });
  toDelete.forEach(key => searchParams.delete(key));

  const qs = searchParams.toString();
  return qs ? `${CANONICAL_DOMAIN}${cleanPath}?${qs}` : `${CANONICAL_DOMAIN}${cleanPath}`;
}

let cachedHtmlTemplate: string | null = null;

export function getHtmlTemplate(): string {
  if (cachedHtmlTemplate) return cachedHtmlTemplate;

  const possiblePaths = [
    path.join(process.cwd(), "artifacts", "anvikshiki", "dist", "public", "index.html"),
    path.join(process.cwd(), "dist", "public", "index.html"),
    path.join(__dirname, "..", "..", "anvikshiki", "dist", "public", "index.html"),
    path.join(process.cwd(), "artifacts", "anvikshiki", "index.html"),
    path.join(__dirname, "..", "..", "anvikshiki", "index.html"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      cachedHtmlTemplate = fs.readFileSync(p, "utf-8");
      return cachedHtmlTemplate;
    }
  }

  return "";
}

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str
    .replace(/&(?!amp;|lt;|gt;|quot;|#39;|#x27;|#x2F;|#\d+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeUrl(url: unknown): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^(?:https?:\/\/|\/|mailto:)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return "";
}

export function stripHtml(html: unknown): string {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "")
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatIsoDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function formatScholarDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `<meta name="citation_publication_date" content="${yyyy}/${mm}/${dd}" />`;
}

export { slugify };

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function renderBreadcrumbs(items: BreadcrumbItem[]): string {
  const listItems = items.map((item, index) => {
    const position = index + 1;
    const isLast = index === items.length - 1 || !item.url;
    const nameEscaped = escapeHtml(item.name);

    if (isLast) {
      return `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <span itemprop="name">${nameEscaped}</span>
        <meta itemprop="position" content="${position}" />
      </li>`;
    }

    return `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="${safeUrl(item.url)}">
        <span itemprop="name">${nameEscaped}</span>
      </a>
      <meta itemprop="position" content="${position}" />
    </li>`;
  }).join('<li class="ssr-sep" aria-hidden="true">/</li>\n');

  return `<nav aria-label="Breadcrumb" class="ssr-breadcrumbs">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      ${listItems}
    </ol>
  </nav>`;
}

export function renderReferences(rawRefs: unknown): string {
  if (!Array.isArray(rawRefs) || rawRefs.length === 0) return "";

  const items = rawRefs.map((ref, idx) => {
    const indexNum = idx + 1;

    if (typeof ref === "string") {
      return `<li>
        <span class="ssr-ref-num">${indexNum}.</span>
        <span class="ssr-ref-text"><em>${escapeHtml(ref)}</em></span>
      </li>`;
    }

    if (ref && typeof ref === "object") {
      const title = (ref as any).title || (ref as any).name || (ref as any).text || String(ref);
      const url = (ref as any).url || (ref as any).href || (ref as any).link || null;
      const author = (ref as any).authors || (ref as any).author || null;
      const year = (ref as any).year || (ref as any).date || null;
      const publication = (ref as any).publication || (ref as any).journal || (ref as any).publisher || null;

      let authorSnippet = "";
      if (author) {
        authorSnippet = `<span class="ssr-ref-author">${escapeHtml(author)}${year ? ` (${escapeHtml(year)})` : ""}. </span>`;
      }

      let titleSnippet = "";
      if (url) {
        titleSnippet = `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" class="ssr-ref-link">${escapeHtml(title)}</a>`;
      } else {
        titleSnippet = `<em>${escapeHtml(title)}</em>`;
      }

      const pubSnippet = publication ? `<span class="ssr-ref-pub"> — ${escapeHtml(publication)}</span>` : "";

      return `<li>
        <span class="ssr-ref-num">${indexNum}.</span>
        <span class="ssr-ref-text">${authorSnippet}${titleSnippet}${pubSnippet}</span>
      </li>`;
    }

    return `<li>
      <span class="ssr-ref-num">${indexNum}.</span>
      <span class="ssr-ref-text">${escapeHtml(String(ref))}</span>
    </li>`;
  }).join("\n");

  return `<section class="ssr-section ssr-references" id="references">
    <h2>Sources &amp; References</h2>
    <ol class="ssr-reference-list">
      ${items}
    </ol>
  </section>`;
}

export function renderTags(tags: unknown, label = "Topics & Tags"): string {
  const tagList = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags.split(",").map(t => t.trim())
      : [];

  const validTags = tagList.filter(t => typeof t === "string" && t.trim().length > 0);
  if (validTags.length === 0) return "";

  const items = validTags.map(tag => {
    const cleanTag = tag.trim();
    return `<li><a href="/search?q=${encodeURIComponent(cleanTag)}">${escapeHtml(cleanTag)}</a></li>`;
  }).join("\n");

  return `<section class="ssr-section ssr-tags">
    <h2>${escapeHtml(label)}</h2>
    <ul class="ssr-tag-list">
      ${items}
    </ul>
  </section>`;
}

export function renderBodyHtml(body: unknown, fallbackExcerpt?: string): string {
  if (typeof body === "string" && body.trim().length > 0) {
    const raw = body.trim();
    const isHtml = /<[a-z][\s\S]*>/i.test(raw);
    const contentToSanitize = isHtml
      ? raw
      : raw.split(/\n{2,}/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join("\n");
    const sanitized = sanitizeArticleBody(contentToSanitize);
    return sanitized.replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"');
  }

  if (fallbackExcerpt && fallbackExcerpt.trim().length > 0) {
    return `<div class="ssr-prose-fallback">
      <p>${escapeHtml(fallbackExcerpt)}</p>
    </div>`;
  }

  return `<p class="ssr-note"><em>Full text coming soon.</em></p>`;
}

export function sanitizeTemplateHead(html: string): string {
  return html
    .replace(/<title>.*?<\/title>/gis, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']keywords["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']news_keywords["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']author["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']article:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']citation_[^"']*["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gis, "");
}

export const SSR_CSS_STYLES = `<style id="anvikshiki-ssr-styles">
  :root {
    --ssr-bg: #faf7f2;
    --ssr-ink: #1a1612;
    --ssr-ink-soft: #4a433a;
    --ssr-ink-faint: #8c8273;
    --ssr-gold: #c9944a;
    --ssr-border: #e8e0d2;
    --ssr-surface: #fbf8f2;
    --ssr-surface-alt: #f4eee3;
  }
  html.dark {
    --ssr-bg: #0e0d0b;
    --ssr-ink: #f5f0e8;
    --ssr-ink-soft: #ded8ce;
    --ssr-ink-faint: #a69e90;
    --ssr-gold: #e8b066;
    --ssr-border: #2b2721;
    --ssr-surface: #171512;
    --ssr-surface-alt: #1a1815;
  }
  body {
    margin: 0;
    background-color: var(--ssr-bg);
    color: var(--ssr-ink);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .ssr-content {
    max-width: 860px;
    margin: 0 auto;
    padding: 2.5rem 1.25rem;
    box-sizing: border-box;
  }
  .ssr-domain-hub, .ssr-author-hub {
    max-width: 1080px;
  }
  .ssr-breadcrumbs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    margin: 0 0 1.5rem 0;
    list-style: none;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ssr-ink-faint);
  }
  .ssr-breadcrumbs a {
    color: var(--ssr-ink-faint);
    text-decoration: none;
    transition: color 0.15s;
  }
  .ssr-breadcrumbs a:hover {
    color: var(--ssr-ink);
    text-decoration: underline;
  }
  .ssr-breadcrumbs li:not(:last-child)::after {
    content: "/";
    margin-left: 0.5rem;
    color: var(--ssr-border);
  }
  .ssr-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: #eedfc8;
    color: #8c5324;
    text-decoration: none;
  }
  html.dark .ssr-badge {
    background: #2a2218;
    color: #e8b066;
  }
  .ssr-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(2.1rem, 4.5vw, 3.5rem);
    line-height: 1.12;
    font-weight: 700;
    color: var(--ssr-ink);
    margin: 0.75rem 0;
  }
  .ssr-subtitle {
    font-size: 1.25rem;
    line-height: 1.4;
    font-style: italic;
    color: var(--ssr-ink-soft);
    margin: 0 0 1.5rem 0;
  }
  .ssr-byline-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ssr-ink-faint);
    border-top: 1px solid var(--ssr-border);
    border-bottom: 1px solid var(--ssr-border);
    padding: 0.85rem 0;
    margin: 1.75rem 0;
  }
  .ssr-author-link {
    color: var(--ssr-ink);
    font-weight: 600;
    text-decoration: none;
  }
  .ssr-author-link:hover {
    text-decoration: underline;
  }
  .ssr-hero-figure {
    margin: 2rem 0;
    text-align: center;
  }
  .ssr-hero-figure img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid var(--ssr-border);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .ssr-hero-figure figcaption {
    font-size: 0.8rem;
    color: var(--ssr-ink-faint);
    margin-top: 0.5rem;
    font-style: italic;
  }
  .ssr-abstract-box {
    background: var(--ssr-surface-alt);
    border-left: 4px solid var(--ssr-gold);
    padding: 1.25rem 1.5rem;
    border-radius: 4px;
    margin: 2rem 0;
    text-align: left;
  }
  .ssr-section-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--ssr-gold);
    margin: 0 0 0.5rem 0;
  }
  .ssr-abstract-text {
    font-style: italic;
    font-size: 1.05rem;
    line-height: 1.6;
    color: var(--ssr-ink-soft);
    margin: 0;
  }
  .ssr-body {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.25rem;
    line-height: 1.85;
    color: var(--ssr-ink);
    margin: 2.5rem 0;
  }
  .ssr-body p {
    margin-bottom: 1.75rem;
  }
  .ssr-body h2, .ssr-body h3, .ssr-body h4 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 700;
    color: var(--ssr-ink);
    margin-top: 2.25rem;
    margin-bottom: 1rem;
    line-height: 1.25;
  }
  .ssr-body blockquote {
    border-left: 3px solid var(--ssr-gold);
    padding-left: 1.25rem;
    margin: 1.75rem 0;
    font-style: italic;
    color: var(--ssr-ink-soft);
  }
  .ssr-tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0;
    list-style: none;
    margin: 1rem 0;
  }
  .ssr-tag-list a {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid var(--ssr-border);
    color: var(--ssr-ink-soft);
    text-decoration: none;
    background: var(--ssr-surface);
  }
  .ssr-author-bio-card {
    background: var(--ssr-surface);
    border: 1px solid var(--ssr-border);
    border-left: 4px solid var(--ssr-gold);
    padding: 1.5rem;
    border-radius: 6px;
    margin: 2.5rem 0;
    text-align: left;
  }
  .ssr-author-bio-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--ssr-ink);
  }
  .ssr-author-bio-card p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--ssr-ink-soft);
  }
  .ssr-citation-note {
    background: var(--ssr-surface);
    border: 1px dashed var(--ssr-border);
    padding: 1rem 1.25rem;
    border-radius: 6px;
    font-size: 0.85rem;
    color: var(--ssr-ink-faint);
    margin: 1.5rem 0;
    word-break: break-all;
    text-align: left;
  }
  .ssr-contributor-cta {
    background: var(--ssr-surface-alt);
    border: 1px solid var(--ssr-border);
    padding: 1.25rem 1.5rem;
    border-radius: 6px;
    margin: 2rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    text-align: left;
  }
  .ssr-contributor-cta a {
    display: inline-block;
    background: #8c5324;
    color: #ffffff;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ssr-author-header {
    display: flex;
    gap: 2rem;
    align-items: center;
    background: var(--ssr-surface);
    border: 1px solid var(--ssr-border);
    padding: 2rem;
    border-radius: 8px;
    margin-bottom: 2.5rem;
    flex-wrap: wrap;
  }
  .ssr-avatar-container {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--ssr-gold);
    box-shadow: 0 0 0 4px var(--ssr-bg);
    flex-shrink: 0;
  }
  .ssr-author-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .ssr-author-avatar-placeholder {
    width: 100%;
    height: 100%;
    background: #eedfc8;
    color: #8c5324;
    font-weight: 700;
    font-size: 2rem;
    display: grid;
    place-items: center;
  }
  .ssr-author-details {
    flex: 1;
    min-width: 260px;
    text-align: left;
  }
  .ssr-handle {
    font-size: 0.85rem;
    color: var(--ssr-ink-faint);
    margin: -0.25rem 0 0.5rem 0;
  }
  .ssr-institution {
    font-size: 0.9rem;
    color: var(--ssr-ink-soft);
    margin: 0.25rem 0;
  }
  .ssr-author-counts {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  .ssr-count-badge {
    font-size: 0.8rem;
    padding: 0.25rem 0.65rem;
    border-radius: 4px;
    background: var(--ssr-surface-alt);
    border: 1px solid var(--ssr-border);
    color: var(--ssr-ink-soft);
  }
  .ssr-work-list {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0;
    display: grid;
    gap: 1.25rem;
  }
  .ssr-work-item {
    background: var(--ssr-surface);
    border: 1px solid var(--ssr-border);
    border-radius: 6px;
    padding: 1.25rem 1.5rem;
    text-align: left;
    transition: border-color 0.15s;
  }
  .ssr-work-item h3, .ssr-work-item h4 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.35rem;
    margin: 0 0 0.5rem 0;
    line-height: 1.25;
  }
  .ssr-work-item a {
    color: var(--ssr-ink);
    text-decoration: none;
  }
  .ssr-work-item a:hover {
    color: var(--ssr-gold);
    text-decoration: underline;
  }
  .ssr-work-excerpt {
    font-size: 0.9rem;
    color: var(--ssr-ink-soft);
    line-height: 1.6;
    margin: 0.5rem 0;
  }
  .ssr-work-meta {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ssr-ink-faint);
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
  }
  .ssr-columns-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
    margin-top: 1.5rem;
  }
</style>`;

/** The owner's own Search Console meta token, when one is configured. */
function googleSiteVerificationMeta(): string {
  const token = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return token
    ? `\n    <meta name="google-site-verification" content="${escapeHtml(token)}" />`
    : "";
}

export function injectSsrHtml(template: string, metaTags: string, ssrBody: string, initialData?: unknown): string {
  const cleanTemplate = sanitizeTemplateHead(template);
  const dataScript = initialData !== undefined
    ? `\n<script id="__ANVIKSHIKI_DATA__" type="application/json">${JSON.stringify(initialData).replace(/</g, "\\u003c")}</script>`
    : "";
  const googleVerificationMeta = googleSiteVerificationMeta();
  const withMeta = cleanTemplate.replace(/<\/head>/i, `${SSR_CSS_STYLES}${googleVerificationMeta}\n${metaTags}${dataScript}\n</head>`);
  if (withMeta.includes('<div id="root"></div>')) {
    return withMeta.replace('<div id="root"></div>', `<div id="root">${ssrBody}</div>`);
  }
  return withMeta.replace(/<div id=["']root["']>[\s\S]*?<\/div>/i, `<div id="root">${ssrBody}</div>`);
}

export function buildFallbackHtml(metaTags: string, ssrBody: string, initialData?: unknown): string {
  const dataScript = initialData !== undefined
    ? `\n<script id="__ANVIKSHIKI_DATA__" type="application/json">${JSON.stringify(initialData).replace(/</g, "\\u003c")}</script>`
    : "";
  const googleVerificationMeta = googleSiteVerificationMeta();
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${googleVerificationMeta}
    ${SSR_CSS_STYLES}
    ${metaTags}
    ${dataScript}
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <script src="/theme-init.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root">${ssrBody}</div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}
