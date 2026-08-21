import { Router } from 'express';
import { z } from 'zod';
import dns from 'dns/promises';
import net from 'net';
import { v2 as cloudinary } from 'cloudinary';
import { put } from '@vercel/blob';
import { decode as decodeHtmlEntities } from 'html-entities';
import { db } from '@workspace/db';
import { articlesTable, papersTable } from '@workspace/db';
import { eq, and, isNull } from 'drizzle-orm';
import { getUserAuth } from '../lib/auth';
import { sanitizeArticleBody } from '../lib/content';
import { hasExpectedFileSignature } from '../lib/file-validation';

const router = Router();

const schema = z.object({ url: z.string().url('Valid URL required').max(2_048) });
const MAX_IMPORT_IMAGE_BYTES = 10 * 1024 * 1024;
// Google Docs exports embed images as base64 in the HTML. Keep ordinary web
// imports conservative, while allowing a reasonably sized document with its
// embedded images to be read and persisted below.
const MAX_GOOGLE_DOC_HTML_BYTES = 25 * 1024 * 1024;
const IMAGE_EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

type GoogleDocumentImport = {
  fetchUrl: string;
  kind: 'shared' | 'published';
};

type ImportedImage = {
  buffer: Buffer;
  contentType: keyof typeof IMAGE_EXTENSION_BY_MIME;
  extension: string;
};

export type SemanticExtraction = {
  failedEmbeddedImages: number;
  html: string;
  /**
   * First image of the document that was successfully stored in the journal's
   * own media store, in document order. Offered to the author as a cover.
   * Empty when nothing could be stored — a third-party URL is never offered.
   */
  firstImageUrl: string;
};

/**
 * Normalize share links (including /u/0/d/) to the documented HTML export
 * endpoint. Published-to-web documents use a different /d/e/.../pub format
 * and must be fetched from that canonical public page instead.
 */
export function getGoogleDocumentImport(rawUrl: string): GoogleDocumentImport | null {
  const parsed = new URL(rawUrl);
  if (parsed.hostname.toLowerCase() !== 'docs.google.com') return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'document') return null;

  const documentIdIndex = segments.indexOf('d', 1);
  if (documentIdIndex === -1) return null;

  if (segments[documentIdIndex + 1] === 'e') {
    const publishedId = segments[documentIdIndex + 2] || '';
    const publicRoute = segments[documentIdIndex + 3];
    if (!/^[a-zA-Z0-9_-]+$/.test(publishedId) || !['pub', 'embed'].includes(publicRoute || '')) {
      return null;
    }
    return {
      fetchUrl: `https://docs.google.com/document/d/e/${publishedId}/pub`,
      kind: 'published',
    };
  }

  const documentId = segments[documentIdIndex + 1] || '';
  if (!/^[a-zA-Z0-9_-]+$/.test(documentId)) return null;
  return {
    fetchUrl: `https://docs.google.com/document/d/${documentId}/export?format=html`,
    kind: 'shared',
  };
}

/**
 * Google returns a normal 200 HTML document for some private and sign-in
 * pages. Detect those shells before semantic extraction so authors receive a
 * useful access instruction rather than a misleading partial import.
 */
export function isGoogleDocumentAccessPage(rawHtml: string): boolean {
  const html = rawHtml.toLowerCase();
  const looksLikeGoogleShell =
    html.includes('accounts.google.com') ||
    html.includes('servicelogin') ||
    /<title[^>]*>\s*sign in\b/i.test(rawHtml) ||
    html.includes('google drive') ||
    html.includes('google docs');
  const hasAccessMessage = [
    'you need access',
    'you need permission',
    'request access',
    'access denied',
    'sign in to continue',
    'sorry, unable to open the file',
  ].some(message => html.includes(message));
  return looksLikeGoogleShell && hasAccessMessage;
}

const GOOGLE_DOC_TITLE_SUFFIX = /\s*[-–—|]\s*Google\s+(?:Docs?|Drive)\s*$/i;
const MAX_IMPORTED_TITLE_LENGTH = 300;
const MAX_IMPORTED_EXCERPT_LENGTH = 400;

/**
 * Best-effort document name, used to prefill the submission title so an author
 * importing a Google Doc does not have to retype it. Google Docs exports carry
 * the document name in <title>; ordinary pages are more reliable through
 * OpenGraph. Returns "" when nothing trustworthy is present, which leaves the
 * author's own field untouched.
 */
export function extractDocumentTitle(rawHtml: string): string {
  const candidates = [
    rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1],
    rawHtml.match(/<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i)?.[1],
    rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1],
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const text = decodeEntities(candidate.replace(/<[^>]*>/g, ' '))
      .replace(GOOGLE_DOC_TITLE_SUFFIX, '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Google names an unsaved document "Untitled document" — not worth copying.
    if (!text || /^untitled\s+document$/i.test(text)) continue;
    return text.slice(0, MAX_IMPORTED_TITLE_LENGTH).trim();
  }

  return '';
}

/**
 * Opening prose of the imported document, used to prefill the abstract. Cut at
 * a sentence boundary where one is close to the limit so the suggestion reads
 * as a finished thought rather than a severed clause.
 */
export function extractLeadExcerpt(html: string): string {
  const firstParagraph = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? html;
  const text = decodeEntities(firstParagraph.replace(/<[^>]*>/g, ' '))
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= MAX_IMPORTED_EXCERPT_LENGTH) return text;

  const clipped = text.slice(0, MAX_IMPORTED_EXCERPT_LENGTH);
  const lastSentenceEnd = Math.max(
    clipped.lastIndexOf('. '),
    clipped.lastIndexOf('! '),
    clipped.lastIndexOf('? '),
  );
  if (lastSentenceEnd > MAX_IMPORTED_EXCERPT_LENGTH / 2) {
    return clipped.slice(0, lastSentenceEnd + 1).trim();
  }
  return `${clipped.trimEnd()}…`;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Buffer> {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) {
    throw Object.assign(new Error('Remote response is too large'), { statusCode: 413 });
  }
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error('Remote response is too large'), { statusCode: 413 });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

/**
 * Returns true if the given IP address is within a private, loopback,
 * link-local, or otherwise non-public range that must not be reachable
 * via server-side requests (SSRF protection).
 */
function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    const firstHextet = Number.parseInt(lower.split(':')[0] || '', 16);
    if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true; // link-local fe80::/10
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('ff')) return true; // multicast/reserved
    if (/^::(?:\d{1,3}\.){3}\d{1,3}$/.test(lower)) {
      return isPrivateOrReservedIp(lower.slice(2)); // IPv4-compatible IPv6
    }
    const mappedV4 = lower.match(/(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedV4) {
      // IPv4-mapped IPv6 can use hexadecimal rather than dotted-quad notation.
      const high = Number.parseInt(mappedV4[1], 16);
      const low = Number.parseInt(mappedV4[2], 16);
      return isPrivateOrReservedIp([high >> 8, high & 0xff, low >> 8, low & 0xff].join('.'));
    }
    if (lower.startsWith('::ffff:')) {
      // IPv4-mapped IPv6 address — validate the embedded IPv4 part
      const v4 = lower.split(':').pop() || '';
      if (net.isIPv4(v4)) return isPrivateOrReservedIp(v4);
    }
    return false;
  }
  if (!net.isIPv4(ip)) return true; // unknown format — reject to be safe
  const parts = ip.split('.').map(Number);
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 0) return true; // "this network"
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 2) return true; // documentation
  if (a === 192 && b === 88 && parts[2] === 99) return true; // deprecated 6to4 relay anycast
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && parts[2] === 100) return true; // documentation
  if (a === 203 && b === 0 && parts[2] === 113) return true; // documentation
  if (a >= 224) return true; // multicast/reserved/broadcast
  return false;
}

async function assertUrlIsSafe(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw Object.assign(new Error('Only http/https URLs are supported'), { statusCode: 400 });
  }
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error('URLs with embedded credentials are not supported'), { statusCode: 400 });
  }

  const hostname = parsed.hostname;
  if (hostname.toLowerCase() === 'localhost') {
    throw Object.assign(new Error('Requests to localhost are not allowed'), { statusCode: 400 });
  }

  let addresses: string[];
  if (net.isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      const results = await dns.lookup(hostname, { all: true });
      addresses = results.map((r) => r.address);
    } catch {
      throw Object.assign(new Error('Could not resolve host'), { statusCode: 400 });
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateOrReservedIp)) {
    throw Object.assign(new Error('Requests to private, internal, or reserved network addresses are not allowed'), { statusCode: 400 });
  }

  return parsed;
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Anvikshiki/1.0; +https://anvikshiki.in)',
  'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
};

const MAX_REDIRECTS = 3;

async function fetchWithSsrfGuard(startUrl: string): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertUrlIsSafe(currentUrl);
    const response = await fetch(currentUrl, {
      headers: FETCH_HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw Object.assign(new Error('Remote server returned a redirect without a location'), { statusCode: 422 });
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return { response, finalUrl: currentUrl };
  }
  throw Object.assign(new Error('Too many redirects'), { statusCode: 422 });
}

/** Decode all HTML entities (named, numeric decimal, and hex) */
function decodeEntities(str: string): string {
  if (!str) return '';
  return decodeHtmlEntities(str);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

/** Escapes only characters that could form HTML tags or corrupt text nodes */
function escapeTextForHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function validateImportedImage(
  buffer: Buffer,
  contentType: string,
): ImportedImage | null {
  const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();
  const extension = IMAGE_EXTENSION_BY_MIME[normalizedContentType];
  if (!extension || !buffer.length || buffer.length > MAX_IMPORT_IMAGE_BYTES) return null;
  if (!hasExpectedFileSignature({ originalname: `imported.${extension}`, buffer })) return null;
  return {
    buffer,
    contentType: normalizedContentType as keyof typeof IMAGE_EXTENSION_BY_MIME,
    extension,
  };
}

function decodeEmbeddedImage(imgSrc: string): ImportedImage | null {
  const match = imgSrc.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;

  const encoded = match[2].replace(/\s/g, '');
  // Buffer.from is permissive about malformed base64, so validate the input
  // before decoding. The length check avoids allocating a huge buffer first.
  if (
    !encoded ||
    encoded.length > Math.ceil((MAX_IMPORT_IMAGE_BYTES * 4) / 3) + 4 ||
    !/^[a-z0-9+/]*={0,2}$/i.test(encoded)
  ) {
    return null;
  }

  return validateImportedImage(Buffer.from(encoded, 'base64'), match[1]);
}

async function readImportedImage(imgSrc: string, baseUrl: string): Promise<ImportedImage | null> {
  if (/^data:/i.test(imgSrc)) return decodeEmbeddedImage(imgSrc);

  try {
    const absoluteUrl = new URL(imgSrc, baseUrl).toString();

    // Follow redirects manually and re-check every destination. A normal
    // fetch() here would allow a public image URL to redirect into a private
    // network address after the initial URL had passed validation.
    const { response: imgRes } = await fetchWithSsrfGuard(absoluteUrl);
    if (!imgRes.ok) return null;

    const contentType = imgRes.headers.get('content-type') || '';
    return validateImportedImage(
      await readLimitedBody(imgRes, MAX_IMPORT_IMAGE_BYTES),
      contentType,
    );
  } catch {
    return null;
  }
}

/**
 * Persist imported images rather than returning base64 or third-party image
 * URLs. Google Docs exports embed images as data URLs, which sanitization
 * correctly rejects; moving them into the configured journal store preserves
 * accessible images without allowing the source document to inject a URL.
 */
async function persistImportedImage(imgSrc: string, baseUrl: string): Promise<string | null> {
  const image = await readImportedImage(imgSrc, baseUrl);
  if (!image) return null;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`anvikshiki/url_imports/${crypto.randomUUID()}.${image.extension}`, image.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: image.contentType,
      });
      return typeof blob.url === 'string' && blob.url ? blob.url : null;
    }

    if (process.env.CLOUDINARY_URL) {
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'anvikshiki/url_imports', resource_type: 'image' },
          (err, res) => (err ? reject(err) : resolve(res)),
        );
        stream.end(image.buffer);
      });
      return typeof result?.secure_url === 'string' && result.secure_url ? result.secure_url : null;
    }
  } catch {
    return null;
  }

  return null;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'figure', 'figcaption', 'section', 'div', 'article', 'main', 'header', 'pre', 'code', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'hr']);
const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'mark', 'small', 'span', 'a', 'sup', 'sub', 'abbr', 'code', 'cite', 'q']);

type ParsedClassStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  isSuper?: boolean;
  isSub?: boolean;
  isQuote?: boolean;
  isTitle?: boolean;
  isHeading1?: boolean;
  isHeading2?: boolean;
  isSubtitle?: boolean;
};

function parseCssRules(cssText: string): Map<string, ParsedClassStyle> {
  const classStyles = new Map<string, ParsedClassStyle>();
  if (!cssText) return classStyles;
  const cleanCss = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(cleanCss)) !== null) {
    const selectors = match[1].split(',');
    const decls = match[2];
    const props: Record<string, string> = {};
    const declPairs = decls.split(';');
    for (const pair of declPairs) {
      const idx = pair.indexOf(':');
      if (idx !== -1) {
        const prop = pair.slice(0, idx).trim().toLowerCase();
        const val = pair.slice(idx + 1).trim().toLowerCase();
        props[prop] = val;
      }
    }

    const isBold = !!(props['font-weight'] && (
      props['font-weight'] === 'bold' ||
      props['font-weight'] === '700' ||
      props['font-weight'] === '800' ||
      props['font-weight'] === '900' ||
      props['font-weight'] === 'bolder' ||
      parseInt(props['font-weight'], 10) >= 600
    ));
    const isItalic = !!(props['font-style'] && (props['font-style'] === 'italic' || props['font-style'] === 'oblique'));
    const isUnderline = !!(props['text-decoration']?.includes('underline') || props['text-decoration-line']?.includes('underline'));
    const isStrike = !!(props['text-decoration']?.includes('line-through') || props['text-decoration-line']?.includes('line-through'));
    const isSuper = props['vertical-align'] === 'super';
    const isSub = props['vertical-align'] === 'sub';

    const marginLeft = parseFloat(props['margin-left'] || '0');
    const paddingLeft = parseFloat(props['padding-left'] || '0');
    const isQuote = !!(
      (props['margin-left'] && marginLeft >= 25) ||
      (props['padding-left'] && paddingLeft >= 25) ||
      (props['border-left'] && props['border-left'] !== 'none')
    );

    const fontSize = parseFloat(props['font-size'] || '0');
    const isLarge = fontSize >= 15;

    for (let sel of selectors) {
      sel = sel.trim();
      const classMatch = sel.match(/\.([a-zA-Z0-9_-]+)/);
      if (classMatch) {
        const className = classMatch[1];
        const lowerName = className.toLowerCase();
        const isTitle = !!(lowerName.includes('title') || (isLarge && isBold && fontSize >= 22));
        const isHeading1 = !!(lowerName.includes('heading-1') || lowerName.includes('heading_1') || (isLarge && isBold && fontSize >= 18));
        const isHeading2 = !!(lowerName.includes('heading-2') || lowerName.includes('heading_2') || (isLarge && fontSize >= 15));
        const isSubtitle = !!lowerName.includes('subtitle');

        const existing = classStyles.get(className) || {};
        classStyles.set(className, {
          bold: Boolean(existing.bold || isBold),
          italic: Boolean(existing.italic || isItalic),
          underline: Boolean(existing.underline || isUnderline),
          strike: Boolean(existing.strike || isStrike),
          isSuper: Boolean(existing.isSuper || isSuper),
          isSub: Boolean(existing.isSub || isSub),
          isQuote: Boolean(existing.isQuote || isQuote),
          isTitle: Boolean(existing.isTitle || isTitle),
          isHeading1: Boolean(existing.isHeading1 || isHeading1),
          isHeading2: Boolean(existing.isHeading2 || isHeading2),
          isSubtitle: Boolean(existing.isSubtitle || isSubtitle),
        });
      }
    }
  }
  return classStyles;
}

/**
 * Lightweight HTML-to-structured-HTML converter.
 * Extracts semantic content preserving paragraphs, headings, blockquotes,
 * lists, inline formatting and images.
 */
export async function extractSemanticHtml(rawHtml: string, finalUrl: string): Promise<SemanticExtraction> {
  // ── 1. Extract CSS rules from <style> before stripping ──
  let allCss = '';
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(rawHtml)) !== null) {
    allCss += ' ' + styleMatch[1];
  }
  const classStyles = parseCssRules(allCss);

  // ── 2. Strip non-content blocks upfront ──
  let cleaned = rawHtml
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // ── 3. Process images: upload to Cloudinary/Blob, replace src ──
  const imgPromises: Array<Promise<void>> = [];
  const imgMap = new Map<string, string>(); // original src → persisted cdn url
  const imgMatches = [...cleaned.matchAll(/<img\b([^>]*)>/gi)];
  let failedEmbeddedImages = 0;
  const processedImageSources = new Set<string>();
  // Document order is lost once the uploads resolve, so remember it here — the
  // cover offered to the author must be the document's first image.
  const orderedImageSources: string[] = [];
  const storedImageSources = new Set<string>();

  for (const match of imgMatches) {
    const srcMatch = match[1].match(/src=["']([^"']+)["']/i);
    const src = srcMatch ? srcMatch[1] : '';
    if (src && !processedImageSources.has(src)) {
      processedImageSources.add(src);
      orderedImageSources.push(src);
      imgPromises.push(
        persistImportedImage(src, finalUrl).then(cdnUrl => {
          if (cdnUrl) {
            imgMap.set(src, cdnUrl);
            storedImageSources.add(src);
          } else if (/^data:/i.test(src)) {
            failedEmbeddedImages += 1;
          } else if (/^https?:\/\//i.test(src)) {
            // Keep the original remote image URL if storage upload is unavailable
            imgMap.set(src, src);
          }
        })
      );
    }
  }
  await Promise.allSettled(imgPromises);

  const firstStoredSource = orderedImageSources.find(source => storedImageSources.has(source));
  const firstImageUrl = firstStoredSource ? imgMap.get(firstStoredSource) || '' : '';

  // ── 4. Build output HTML tag by tag ──
  const result: string[] = [];
  const tokenRegex = /<(\/?)([\w-]+)([^>]*)>|([^<]+)/g;
  let currentBlockType = 'p';
  let currentBlockContent = '';
  let activeStyles: Array<{
    tag: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    isSuper?: boolean;
    isSub?: boolean;
  }> = [];

  const flushBlock = () => {
    const trimmed = currentBlockContent.trim();
    if (trimmed && trimmed !== '<br>' && trimmed !== '<br/>') {
      if (currentBlockType === 'blockquote') {
        result.push(`<blockquote><p>${trimmed}</p></blockquote>`);
      } else if (currentBlockType === 'li') {
        result.push(`<li>${trimmed}</li>`);
      } else if (currentBlockType === 'div') {
        result.push(`<p>${trimmed}</p>`);
      } else {
        result.push(`<${currentBlockType}>${trimmed}</${currentBlockType}>`);
      }
    }
    currentBlockContent = '';
    currentBlockType = 'p';
  };

  let token: RegExpExecArray | null;
  while ((token = tokenRegex.exec(cleaned)) !== null) {
    const [full, slash, tagName, attrs, text] = token;
    const isClose = slash === '/';
    const tag = (tagName || '').toLowerCase();

    if (text !== undefined) {
      const decoded = decodeEntities(text);
      if (decoded) {
        let styledText = escapeTextForHtml(decoded);
        let prefix = '';
        let suffix = '';
        for (const s of activeStyles) {
          if (s.bold) { prefix += '<strong>'; suffix = '</strong>' + suffix; }
          if (s.italic) { prefix += '<em>'; suffix = '</em>' + suffix; }
          if (s.underline) { prefix += '<u>'; suffix = '</u>' + suffix; }
          if (s.strike) { prefix += '<s>'; suffix = '</s>' + suffix; }
          if (s.isSuper) { prefix += '<sup>'; suffix = '</sup>' + suffix; }
          if (s.isSub) { prefix += '<sub>'; suffix = '</sub>' + suffix; }
        }
        currentBlockContent += prefix + styledText + suffix;
      }
      continue;
    }

    if (VOID_TAGS.has(tag)) {
      if (tag === 'br') {
        currentBlockContent += '<br>';
      } else if (tag === 'img') {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
        const src = srcMatch ? srcMatch[1] : '';
        const alt = altMatch ? decodeEntities(altMatch[1]) : '';
        if (src) {
          flushBlock();
          const persistedSrc = imgMap.get(src) || (/^data:/i.test(src) ? '' : src);
          if (persistedSrc) {
            const safeSrc = escapeHtml(persistedSrc);
            const safeAlt = escapeHtml(alt);
            result.push(`<figure><img src="${safeSrc}" alt="${safeAlt}" style="max-width:100%;height:auto;margin:1.5rem auto;display:block;border-radius:8px;" />${safeAlt ? `<figcaption>${safeAlt}</figcaption>` : ''}</figure>`);
          }
        }
      } else if (tag === 'hr') {
        flushBlock();
        result.push('<hr>');
      }
      continue;
    }

    const classAttrMatch = attrs ? attrs.match(/class=["']([^"']+)["']/i) : null;
    const classList = classAttrMatch ? classAttrMatch[1].split(/\s+/) : [];
    const styleAttrMatch = attrs ? attrs.match(/style=["']([^"']+)["']/i) : null;
    const inlineStyleText = styleAttrMatch ? styleAttrMatch[1] : '';

    let isBold = tag === 'b' || tag === 'strong' || /font-weight\s*:\s*(bold|[6-9]00)/i.test(inlineStyleText);
    let isItalic = tag === 'i' || tag === 'em' || /font-style\s*:\s*italic/i.test(inlineStyleText);
    let isUnderline = tag === 'u' || /text-decoration\s*:\s*underline/i.test(inlineStyleText);
    let isStrike = tag === 's' || tag === 'strike' || /text-decoration\s*:\s*line-through/i.test(inlineStyleText);
    let isSuper = tag === 'sup';
    let isSub = tag === 'sub';

    for (const cls of classList) {
      const cs = classStyles.get(cls);
      if (cs) {
        if (cs.bold) isBold = true;
        if (cs.italic) isItalic = true;
        if (cs.underline) isUnderline = true;
        if (cs.strike) isStrike = true;
        if (cs.isSuper) isSuper = true;
        if (cs.isSub) isSub = true;
      }
    }

    if (tag === 'span' || ['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sup', 'sub'].includes(tag)) {
      if (!isClose) {
        activeStyles.push({ tag, bold: isBold, italic: isItalic, underline: isUnderline, strike: isStrike, isSuper, isSub });
      } else {
        activeStyles.pop();
      }
      continue;
    }

    if (tag === 'a') {
      if (!isClose) {
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
        const href = hrefMatch ? escapeHtml(hrefMatch[1]) : '#';
        currentBlockContent += `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
      } else {
        currentBlockContent += '</a>';
      }
      continue;
    }

    if (tag === 'ul') {
      if (!isClose) {
        flushBlock();
        result.push('<ul>');
      } else {
        flushBlock();
        result.push('</ul>');
      }
      continue;
    }

    if (tag === 'ol') {
      if (!isClose) {
        flushBlock();
        result.push('<ol>');
      } else {
        flushBlock();
        result.push('</ol>');
      }
      continue;
    }

    if (BLOCK_TAGS.has(tag)) {
      if (!isClose) {
        flushBlock();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          currentBlockType = tag;
        } else if (tag === 'blockquote') {
          currentBlockType = 'blockquote';
        } else if (tag === 'li') {
          currentBlockType = 'li';
        } else if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main') {
          let blockType = 'p';
          for (const cls of classList) {
            const cs = classStyles.get(cls);
            if (cs?.isTitle) { blockType = 'h1'; break; }
            else if (cs?.isHeading1) { blockType = 'h2'; break; }
            else if (cs?.isHeading2) { blockType = 'h3'; break; }
            else if (cs?.isSubtitle) { blockType = 'h3'; break; }
            else if (cs?.isQuote && blockType === 'p') blockType = 'blockquote';
          }
          if (blockType === 'p' && /margin-left\s*:\s*([3-9]\d|\d{3,})pt/i.test(inlineStyleText)) {
            blockType = 'blockquote';
          }
          currentBlockType = blockType;
        }
      } else {
        flushBlock();
      }
      continue;
    }
  }

  // Flush any remaining block content
  flushBlock();

  // ── 5. Merge result, clean empty tags, limit size ──
  let finalHtml = result
    .filter(line => {
      const stripped = line.replace(/<[^>]*>/g, '').trim();
      return (
        stripped.length > 0 ||
        line.includes('<img') ||
        line.includes('<figure') ||
        line.includes('<hr') ||
        line.includes('<ul') ||
        line.includes('</ul') ||
        line.includes('<ol') ||
        line.includes('</ol') ||
        line.includes('<table') ||
        line.includes('</table')
      );
    })
    .join('\n');

  // Limit to ~200k chars
  if (finalHtml.length > 200_000) {
    finalHtml = finalHtml.slice(0, 200_000) + '<p><em>[Content truncated]</em></p>';
  }

  return { html: finalHtml, failedEmbeddedImages, firstImageUrl };
}

/**
 * POST /api/extract-url
 * Fetches a public webpage and returns structured HTML preserving
 * paragraphs, headings, blockquotes, lists, inline formatting and images.
 */
router.post('/extract-url', async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const { url } = schema.parse(req.body);

    // ── 0. Fast local resolution for own website links (/articles/:slug, /papers/:slug, /essays/:slug) ──
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.toLowerCase();
      if (host.includes('anvikshiki') || host === 'localhost' || host === '127.0.0.1') {
        const match = parsedUrl.pathname.match(/\/(?:articles|papers|essays)\/([^/?#]+)/i);
        if (match) {
          const slug = decodeURIComponent(match[1]);
          const [article] = await db
            .select()
            .from(articlesTable)
            .where(and(eq(articlesTable.slug, slug), isNull(articlesTable.deletedAt)))
            .limit(1);
          if (article && article.body) {
            return res.json({
              html: sanitizeArticleBody(article.body),
              url,
              title: article.title || '',
              excerpt: article.excerpt || '',
              coverImageUrl: article.heroImageUrl || '',
            });
          }
          const [paper] = await db
            .select()
            .from(papersTable)
            .where(and(eq(papersTable.slug, slug), isNull(papersTable.deletedAt)))
            .limit(1);
          if (paper && (paper.body || paper.abstract)) {
            return res.json({
              html: sanitizeArticleBody(paper.body || paper.abstract || ''),
              url,
              title: paper.title || '',
              excerpt: paper.abstract || '',
              coverImageUrl: paper.coverImageUrl || '',
            });
          }
        }
      }
    } catch {
      // Continue with normal fetch
    }

    const googleDocument = getGoogleDocumentImport(url);
    const fetchUrl = googleDocument?.fetchUrl || url;

    const { response, finalUrl } = await fetchWithSsrfGuard(fetchUrl);

    if (!response.ok) {
      return res.status(422).json({ error: `Remote server returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
      return res.status(415).json({ error: 'The remote URL did not return HTML or plain text' });
    }
    const rawText = (await readLimitedBody(
      response,
      googleDocument ? MAX_GOOGLE_DOC_HTML_BYTES : 2 * 1024 * 1024,
    )).toString('utf-8');

    if (googleDocument && isGoogleDocumentAccessPage(rawText)) {
      return res.status(422).json({
        error: 'Google Docs could not be imported. Set sharing to "Anyone with the link" and permission to "Viewer", then try again.',
      });
    }

    let html: string;
    let failedEmbeddedImages = 0;
    let firstImageUrl = '';

    if (contentType.includes('text/plain')) {
      // Plain text — convert to paragraphs
      html = rawText
        .split(/\n{2,}/)
        .filter(p => p.trim())
        .map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('\n');
    } else {
      // HTML — extract semantic content
      const extraction = await extractSemanticHtml(rawText, finalUrl);
      html = extraction.html;
      failedEmbeddedImages = extraction.failedEmbeddedImages;
      firstImageUrl = extraction.firstImageUrl;
    }

    if (googleDocument && failedEmbeddedImages > 0) {
      req.log?.warn?.({ failedEmbeddedImages }, 'Google Docs imported with some failed embedded images');
    }

    // Fallback: only if extraction yielded virtually nothing
    const textLen = html.replace(/<[^>]*>/g, '').trim().length;
    if (textLen < 20) {
      const stripped = rawText
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      html = stripped
        .split(/\n{2,}|\.\s{2,}/)
        .filter(p => p.trim().length > 10)
        .map(p => `<p>${decodeEntities(p.trim())}</p>`)
        .join('\n');
    }

    if (html.length > 200_000) html = html.slice(0, 200_000) + '<p><em>[Content truncated at 200 000 characters]</em></p>';

    const sanitizedHtml = sanitizeArticleBody(html);
    if (!sanitizedHtml.replace(/<[^>]*>/g, '').trim()) {
      return res.status(422).json({ error: 'No readable article content was found at this URL' });
    }

    // Metadata the author would otherwise retype. Each field is a suggestion —
    // the client only applies one to a field the author has left empty. The
    // cover is restricted to a stored image, never a third-party URL.
    return res.json({
      html: sanitizedHtml,
      url: googleDocument ? url : finalUrl,
      title: extractDocumentTitle(rawText),
      excerpt: extractLeadExcerpt(sanitizedHtml),
      coverImageUrl: /^https?:\/\//i.test(firstImageUrl) ? firstImageUrl : '',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid input' });
    }
    if (err.name === 'TimeoutError' || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return res.status(408).json({ error: 'Request timed out — the remote URL took too long to respond.' });
    }
    if (typeof err.statusCode === 'number') {
      return res.status(err.statusCode).json({ error: err.message || 'Invalid request' });
    }
    req.log?.error({ err }, 'Failed to import remote URL');
    return res.status(500).json({ error: 'Failed to fetch URL' });
  }
});

export default router;
