/**
 * Text helpers for titles, meta descriptions and article bodies.
 *
 * The SPA keeps an identical copy in artifacts/anvikshiki/src/lib/seoText.ts so
 * that client-side navigation produces the same values the server rendered; a
 * test runs both on the same inputs.
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

/**
 * HTML to plain text, without the "===== Page N =====" markers of PDF imports.
 * Inline formatting tags are removed without a space, so a drop cap such as
 * "<strong>I</strong>n 1918" reads "In 1918"; block tags separate words.
 */
export function plainTextFromHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(?:strong|b|em|i|u|s|span|a|sup|sub|mark|small|abbr|cite|code|del|ins|font)\b[^>]*>/gi, "")
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
  /**
   * The work's title, or several (the title and the SEO title). The <title>
   * already says it, so the description never starts by repeating one.
   */
  title?: unknown;
}

/** For comparing text: diacritics folded, punctuation dropped, lower case. */
function comparable(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * The text without a leading copy of the title: "The Arithmetic of Betrayal:
 * How Mandal Reshaped India" becomes "How Mandal Reshaped India". Text that is
 * only the title becomes "".
 */
function withoutLeadingTitle(text: string, title: string): string {
  const titleWords = comparable(title).split(" ").filter(Boolean);
  if (!titleWords.length || !text) return text;
  const word = /[\p{L}\p{M}\p{N}]+/gu;
  let matched = 0;
  let cut = 0;
  let match: RegExpExecArray | null;
  while (matched < titleWords.length && (match = word.exec(text)) !== null) {
    if (comparable(match[0]) !== titleWords[matched]) return text;
    matched++;
    cut = match.index + match[0].length;
  }
  if (matched < titleWords.length) return text;
  const rest = text.slice(cut).replace(/^[\s:;,.|\-–—"'“”‘’)\]]+/u, "").trim();
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : "";
}

/** The text with every leading copy of any of the titles removed. */
function withoutLeadingTitles(text: string, titles: string[]): string {
  let current = text;
  for (let pass = 0; pass < 3; pass++) {
    const before = current;
    for (const title of titles) current = withoutLeadingTitle(current, title);
    if (current === before) break;
  }
  return current;
}

/**
 * The body's running text. Section headings, short label lines without
 * closing punctuation (a repeated title or subtitle, "THE ARITHMETIC OF
 * ANXIETY"), figure captions, page markers and lines that repeat the title or
 * summary would read as part of the first sentence, so they are left out.
 */
function runningText(body: unknown, repeats: string[]): string {
  const html = String(body ?? "").replace(/<h([1-6])[^>]*>[\s\S]*?<\/h\1\s*>/gi, "\n");
  const skip = new Set(repeats.map(comparable).filter(Boolean));
  const kept = html
    .split(/<\/?(?:p|div|li|ul|ol|blockquote|figure|figcaption|table|tbody|thead|tr|td|th|section|br|hr)\b[^>]*>/i)
    .map(plainTextFromHtml)
    .filter(block => {
      if (!block || skip.has(comparable(block))) return false;
      if (/^(?:fig(?:ure)?|table|chart|plate|image|photo|map)\.?\s*\d+/i.test(block)) return false;
      if (/[.!?…]["'”’)\]]*$/u.test(block)) return true;
      const words = block.split(" ");
      if (words.length <= 12) return false;
      // A long line in Title Case without closing punctuation is a subtitle.
      const long = words.filter(w => w.length > 3);
      return long.filter(w => /^\p{Lu}/u.test(w)).length / Math.max(long.length, 1) < 0.6;
    });
  return kept.join(" ");
}

/**
 * The page description: the editor's seoDescription when it is filled in,
 * otherwise a sentence-aware 120–160 character description from the first
 * non-empty summary, continued from the body's running text when the summary
 * is short. A derived description never starts with a copy of the title.
 */
export function deriveDescription({ seoDescription, summaries = [], body, title }: DescriptionSource): string {
  const own = plainTextFromHtml(seoDescription);
  if (own) return own.length > 300 ? truncateAtWord(own, 299) : own;

  const titles = (Array.isArray(title) ? title : [title])
    .map(value => cleanTitle(plainTextFromHtml(value)))
    .filter(Boolean);
  const firstSummary = summaries.map(plainTextFromHtml).find(Boolean) || "";
  const summary = withoutLeadingTitles(firstSummary, titles);
  const bodyText = withoutLeadingTitles(
    runningText(body, [...titles, firstSummary, summary])
      || plainTextFromHtml(String(body ?? "").replace(/<h([1-6])[^>]*>[\s\S]*?<\/h\1\s*>/gi, " ")),
    titles,
  );

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
