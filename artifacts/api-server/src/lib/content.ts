import sanitizeHtml from "sanitize-html";

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
  allowedSchemesByTag: {
    img: ["http", "https"],
    audio: ["http", "https"],
    source: ["http", "https"],
  },
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  exclusiveFilter: frame => frame.tag === "img" && !frame.attribs.src,
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

const SAFE_PERSISTED_IMAGE_SOURCE = /^(?:https?:\/\/|\/(?!\/))/i;

export function countUnresolvedArticleImages(value: unknown): number {
  if (typeof value !== "string") return 0;
  const tags = value.match(/<img\b[^>]*>/gi) || [];
  return tags.filter(tag => {
    const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const source = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
    return !SAFE_PERSISTED_IMAGE_SOURCE.test(source.trim());
  }).length;
}
