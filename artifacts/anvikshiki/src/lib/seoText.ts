/**
 * Text helpers for titles, meta descriptions and article bodies.
 *
 * A copy of the server's artifacts/api-server/src/lib/seo-text.ts, so that
 * client-side navigation produces the same values the server rendered. Edit
 * both together; a server test runs both on the same inputs.
 */

/**
 * A trailing " — Ānvīkṣikī" (or " | Anvikshiki Journal", ...): the name after a
 * spaced separator. "Nyāya-Ānvīkṣikī" or "Inquiry: Ānvīkṣikī" are left alone.
 */
const SITE_NAME_SUFFIX = /\s+[|\-–—]\s*(?:ānvīkṣikī|anvikshiki|anviksiki)(?:\s+journal)?\s*$/iu;

/**
 * A title as used in <title>, og:title and structured data: trailing ":", "-",
 * "–" or "—" (left behind when a subtitle was split off) are removed, and so is
 * a site-name suffix an editor typed into an SEO title, because the page
 * template appends " — Ānvīkṣikī" itself. A title made only of those
 * characters is returned unchanged.
 */
export function cleanTitle(value: unknown): string {
  const raw = String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  const cleaned = raw.replace(SITE_NAME_SUFFIX, "").replace(/[\s:\-–—]+$/u, "").trim();
  return cleaned || raw;
}

/** HTML to plain text, without the "===== Page N =====" markers of PDF imports. */
export function plainTextFromHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|br)\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/=+\s*Page\s+\d+\s*=+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 160;

/** Sentences end at ".", "!", "?" or "…" (plus closing quotes) followed by a capital or digit. */
function splitSentences(text: string): string[] {
  const boundary = /[.!?…]+["'”’)\]]*\s+(?=["'“‘(\[]?[\p{Lu}\p{N}])/gu;
  const sentences: string[] = [];
  let start = 0;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text)) !== null) {
    const end = match.index + match[0].trimEnd().length;
    sentences.push(text.slice(start, end).trim());
    start = match.index + match[0].length;
  }
  sentences.push(text.slice(start).trim());
  return sentences.filter(Boolean);
}

/** Cut at the last word boundary at or before `max` characters and add "…". */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:.\-–—]+$/u, "")}…`;
}

/**
 * A meta description of roughly 120–160 characters built from whole sentences
 * of the source text. When the sentences that fit stay under 120 characters,
 * the next sentence is cut at a word boundary (with "…") to reach the range.
 * Text shorter than 120 characters is returned whole.
 */
export function sentenceDescription(text: string): string {
  const source = text.replace(/\s+/g, " ").trim();
  if (source.length <= DESCRIPTION_MAX) return source;

  let out = "";
  for (const sentence of splitSentences(source)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length <= DESCRIPTION_MAX) {
      out = next;
      if (out.length >= DESCRIPTION_MIN) return out;
      continue;
    }
    return truncateAtWord(next, DESCRIPTION_MAX - 1);
  }
  return out || truncateAtWord(source, DESCRIPTION_MAX - 1);
}

export interface DescriptionSource {
  /** The editor's own meta description; used as written when present. */
  seoDescription?: unknown;
  /** Excerpt, abstract or subtitle, in order of preference. */
  summaries?: unknown[];
  /** The full body (HTML or text). */
  body?: unknown;
}

/**
 * The page description: the editor's seoDescription when it is filled in,
 * otherwise a sentence-aware 120–160 character description from the first
 * non-empty summary, continued from the body's running text (headings left
 * out) when the summary is short.
 */
export function deriveDescription({ seoDescription, summaries = [], body }: DescriptionSource): string {
  const own = plainTextFromHtml(seoDescription);
  if (own) return own.length > 300 ? truncateAtWord(own, 299) : own;

  const summary = summaries.map(plainTextFromHtml).find(Boolean) || "";
  // Section headings ("Introduction", "1. Sources") would read as part of the
  // first sentence, so only the body's running text is used.
  const bodyText = plainTextFromHtml(String(body ?? "").replace(/<h([1-6])[^>]*>[\s\S]*?<\/h\1\s*>/gi, " "));

  let text = summary;
  if (summary.length < DESCRIPTION_MIN && bodyText) {
    const startsBody = bodyText.toLowerCase().startsWith(summary.toLowerCase());
    if (!summary || startsBody) {
      text = bodyText;
    } else {
      const joiner = /[.!?…]["'”’)\]]*$/u.test(summary) ? " " : ". ";
      text = `${summary}${joiner}${bodyText}`;
    }
  }
  return sentenceDescription(text);
}

/**
 * The page title is the only H1. When an article body contains H1 elements
 * (imported manuscripts often mark section headings that way), every heading
 * in the body moves down one level, so H1 becomes H2, H2 becomes H3 and so on
 * (H6 stays H6) and the body's own hierarchy is kept. Bodies without an H1 are
 * returned unchanged.
 */
export function demoteBodyHeadings(html: string): string {
  if (!/<h1(?=[\s>])/i.test(html)) return html;
  const shift = (level: string) => Math.min(Number(level) + 1, 6);
  return html
    .replace(/<h([1-6])(?=[\s>])/gi, (_match, level: string) => `<h${shift(level)}`)
    .replace(/<\/h([1-6])\s*>/gi, (_match, level: string) => `</h${shift(level)}>`);
}
