import sanitizeHtml from "sanitize-html";

/**
 * Upper bound on a stored rich-text body, in characters.
 *
 * The previous 500,000 cap was below the size of a single ordinary submission:
 * when no blob or CDN provider is configured the upload pipeline inlines images
 * as base64, and one 400 KB photograph alone encodes to roughly 550,000
 * characters. Authors hit "Invalid input" on a normal essay with two figures.
 */
export const MAX_BODY_CHARS = Number(process.env.MAX_BODY_CHARS || 8_000_000);

/** Raster image and audio payloads only — never `image/svg+xml`, which can script. */
const SAFE_DATA_URI = /^data:(image\/(jpeg|png|webp|gif)|audio\/(webm|ogg|wav|mpeg|mp3|mp4|m4a|x-m4a));base64,/i;

const CONTENT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "mark", "small", "span",
    "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption",
    "pre", "code", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "audio", "source",
    "sup", "sub",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    "h1": ["id"],
    "h2": ["id"],
    "h3": ["id"],
    "h4": ["id"],
    "h5": ["id"],
    "h6": ["id"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    ol: ["start", "type"],
    audio: ["src", "controls", "preload"],
    source: ["src", "type"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // `data:` is permitted on media tags only. The upload pipeline falls back to
  // an inline base64 data URI when no blob/CDN provider is configured, so
  // rejecting the scheme here silently deleted every image in the body.
  // Scripts still cannot run: `data:` is not allowed on <a> or any other tag.
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
    audio: ["http", "https", "data"],
    source: ["http", "https", "data"],
  },
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  exclusiveFilter: frame => {
    const src = frame.attribs?.src?.trim() || "";
    if (frame.tag === "img" && !src) return true;
    // A `data:` URI is only ever allowed to carry a raster image or audio
    // payload. `data:image/svg+xml` is excluded because SVG can embed script.
    if (src.toLowerCase().startsWith("data:") && !SAFE_DATA_URI.test(src)) return true;
    return false;
  },
  transformTags: {
    a: (_tagName, attribs) => {
      const target = attribs.target === "_blank" ? "_blank" : undefined;
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          ...(target ? { target, rel: "noopener noreferrer" } : {}),
        },
      };
    },
    img: (_tagName, attribs) => ({
      tagName: "img",
      attribs: {
        ...attribs,
        loading: "lazy",
        decoding: "async",
        alt: attribs.alt || "",
      },
    }),
    audio: (_tagName, attribs) => ({
      tagName: "audio",
      attribs: {
        ...attribs,
        controls: "controls",
        preload: "metadata",
      },
    }),
  },
};

/**
 * Sanitize rich article HTML at trust boundaries. This is intentionally shared
 * by imports, submissions, editor updates, and legacy-content responses so old
 * records become safe without a destructive rewrite of the stored source.
 */
export function sanitizeArticleBody(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitizeHtml(value, CONTENT_OPTIONS).trim();
}

export function sanitizeOptionalArticleBody(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return sanitizeArticleBody(value);
}

// An image counts as "stored" when its source survives a round trip through the
// database: an absolute URL, a site-relative path, or an inline base64 payload
// (what the upload pipeline produces when no blob/CDN provider is configured).
// Blob/object URLs are browser-local and would 404 for every other reader.
const SAFE_PERSISTED_IMAGE_SOURCE = /^(?:https?:\/\/|\/(?!\/)|data:image\/(?:jpeg|png|webp|gif);base64,)/i;

export function countUnresolvedArticleImages(value: unknown): number {
  if (typeof value !== "string") return 0;
  const tags = value.match(/<img\b[^>]*>/gi) || [];
  return tags.filter(tag => {
    const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const source = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
    const trimmed = source.trim();
    if (!trimmed) return false; // Ignore empty src (legacy placeholders)
    return !SAFE_PERSISTED_IMAGE_SOURCE.test(trimmed);
  }).length;
}
