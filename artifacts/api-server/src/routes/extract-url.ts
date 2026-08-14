import { Router } from 'express';
import { z } from 'zod';
import dns from 'dns/promises';
import net from 'net';
import { v2 as cloudinary } from 'cloudinary';
import { put } from '@vercel/blob';
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

/** Decode common HTML entities */
function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
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

/** Allowed block-level and inline HTML tags to preserve */
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'figure', 'figcaption', 'section', 'div', 'article', 'main', 'header', 'pre', 'code']);
const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'u', 'span', 'a', 'br', 'mark', 'sup', 'sub', 'abbr']);
const SKIP_TAGS = new Set(['script', 'style', 'nav', 'footer', 'aside', 'iframe', 'noscript', 'form', 'button', 'input', 'select', 'option', 'meta', 'link', 'head', 'svg', 'path', 'template']);

/**
 * Lightweight HTML-to-structured-HTML converter.
 * Extracts semantic content preserving paragraphs, headings, blockquotes,
 * lists, inline formatting and images.
 */
export async function extractSemanticHtml(rawHtml: string, finalUrl: string): Promise<SemanticExtraction> {
  // ── 1. Strip <script>, <style>, <nav>, <footer>, <header>, <aside>, <noscript> blocks ──
  let cleaned = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // ── 2. Try to isolate the main content area ──
  const mainPatterns = [
    /<article[\s\S]*?>([\s\S]*?)<\/article>/gi,
    /<main[\s\S]*?>([\s\S]*?)<\/main>/gi,
    /<div[^>]*(?:class|id)="[^"]*(?:article|content|post|entry|story|body|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pat of mainPatterns) {
    pat.lastIndex = 0;
    const m = pat.exec(cleaned);
    if (m && m[1] && m[1].length > 300) {
      cleaned = m[1];
      break;
    }
  }

  // ── 3. Process images: upload to Cloudinary, replace src ──
  const imgPromises: Array<Promise<void>> = [];
  const imgMap = new Map<string, string>(); // original src → cloudinary url
  const imgMatches = [...cleaned.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)];
  let failedEmbeddedImages = 0;
  const processedImageSources = new Set<string>();

  for (const match of imgMatches) {
    const src = match[1];
    if (!processedImageSources.has(src)) {
      processedImageSources.add(src);
      imgPromises.push(
        persistImportedImage(src, finalUrl).then(cdnUrl => {
          if (cdnUrl) imgMap.set(src, cdnUrl);
          else if (/^data:/i.test(src)) failedEmbeddedImages += 1;
        })
      );
    }
  }
  await Promise.allSettled(imgPromises);

  // ── 4. Build output HTML tag by tag ──
  const result: string[] = [];
  // Process the cleaned HTML with a simple tag-walk
  const tokenRegex = /<(\/?)([\w-]+)([^>]*)>|([^<]+)/g;
  const tagStack: string[] = [];
  let skipDepth = 0;
  let currentBlock = '';

  const flushBlock = () => {
    const trimmed = currentBlock.trim();
    if (trimmed && trimmed !== '<br>' && trimmed !== '<br/>') {
      result.push(`<p>${trimmed}</p>`);
    }
    currentBlock = '';
  };

  let token: RegExpExecArray | null;
  while ((token = tokenRegex.exec(cleaned)) !== null) {
    const [full, slash, tagName, attrs, text] = token;
    const isClose = slash === '/';
    const tag = (tagName || '').toLowerCase();

    if (text !== undefined) {
      // Text node
      if (skipDepth > 0) continue;
      const decoded = decodeEntities(text);
      if (decoded.trim()) currentBlock += decoded;
      continue;
    }

    // Tag node
    if (skipDepth > 0) {
      if (!isClose && SKIP_TAGS.has(tag)) skipDepth++;
      else if (isClose && SKIP_TAGS.has(tag)) skipDepth--;
      continue;
    }

    if (SKIP_TAGS.has(tag) && !isClose) {
      skipDepth++;
      continue;
    }
    if (SKIP_TAGS.has(tag) && isClose) continue;

    if (tag === 'img') {
      // Image — extract src and alt
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
      continue;
    }

    if (tag === 'br') {
      currentBlock += '<br>';
      continue;
    }

    if (tag === 'a' && !isClose) {
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
      const href = hrefMatch ? hrefMatch[1] : '#';
      currentBlock += `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
      tagStack.push('a');
      continue;
    }
    if (tag === 'a' && isClose) {
      currentBlock += '</a>';
      tagStack.pop();
      continue;
    }

    if (INLINE_TAGS.has(tag)) {
      if (!isClose) {
        const openTag = tag === 'span' ? '' : `<${tag}>`;
        currentBlock += openTag;
        if (tag !== 'span') tagStack.push(tag);
      } else {
        const closeTag = tag === 'span' ? '' : `</${tag}>`;
        currentBlock += closeTag;
        if (tag !== 'span') tagStack.pop();
      }
      continue;
    }

    // Block-level tags
    if (BLOCK_TAGS.has(tag)) {
      if (!isClose) {
        flushBlock();
        if (tag === 'p') {
          // Will accumulate content
        } else if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
          tagStack.push(tag);
          result.push(`<${tag}>`);
        } else if (tag === 'blockquote') {
          tagStack.push('blockquote');
          result.push('<blockquote>');
        } else if (tag === 'ul') {
          tagStack.push('ul');
          result.push('<ul>');
        } else if (tag === 'ol') {
          tagStack.push('ol');
          result.push('<ol>');
        } else if (tag === 'li') {
          tagStack.push('li');
          result.push('<li>');
        } else if (tag === 'figure') {
          tagStack.push('figure');
          result.push('<figure>');
        } else if (tag === 'figcaption') {
          tagStack.push('figcaption');
          result.push('<figcaption>');
        }
      } else {
        // Closing block tag
        if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
          const txt = currentBlock.trim();
          if (txt) result.push(`${txt}</${tag}>`);
          else if (result.length && result[result.length - 1].startsWith(`<${tag}>`)) result.pop();
          currentBlock = '';
          tagStack.pop();
        } else if (tag === 'blockquote') {
          const txt = currentBlock.trim();
          if (txt) result.push(`${txt}</blockquote>`);
          else result.push('</blockquote>');
          currentBlock = '';
          tagStack.pop();
        } else if (tag === 'ul') {
          result.push('</ul>');
          tagStack.pop();
        } else if (tag === 'ol') {
          result.push('</ol>');
          tagStack.pop();
        } else if (tag === 'li') {
          const txt = currentBlock.trim();
          if (txt) result.push(`${txt}</li>`);
          else result.push('</li>');
          currentBlock = '';
          tagStack.pop();
        } else if (tag === 'figure') {
          result.push('</figure>');
          tagStack.pop();
        } else if (tag === 'figcaption') {
          const txt = currentBlock.trim();
          if (txt) result.push(`${txt}</figcaption>`);
          currentBlock = '';
          tagStack.pop();
        } else if (tag === 'p') {
          flushBlock();
        }
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
      return stripped.length > 0 || line.includes('<img') || line.includes('<figure');
    })
    .join('\n');

  // Limit to ~200k chars
  if (finalHtml.length > 200_000) {
    finalHtml = finalHtml.slice(0, 200_000) + '<p><em>[Content truncated]</em></p>';
  }

  return { html: finalHtml, failedEmbeddedImages };
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
    }

    if (googleDocument && failedEmbeddedImages > 0) {
      return res.status(502).json({
        error: 'Google Docs text was read, but one or more embedded images could not be stored. Nothing was imported; please retry after checking image size and storage configuration.',
      });
    }

    // Fallback: if extraction yielded almost nothing, return a plain-text conversion
    const textLen = html.replace(/<[^>]*>/g, '').trim().length;
    if (textLen < 100) {
      const stripped = rawText
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      html = stripped
        .split(/\s{3,}/)
        .filter(p => p.trim().length > 40)
        .map(p => `<p>${decodeEntities(p.trim())}</p>`)
        .join('\n');
    }

    if (html.length > 200_000) html = html.slice(0, 200_000) + '<p><em>[Content truncated at 200 000 characters]</em></p>';

    const sanitizedHtml = sanitizeArticleBody(html);
    if (!sanitizedHtml.replace(/<[^>]*>/g, '').trim()) {
      return res.status(422).json({ error: 'No readable article content was found at this URL' });
    }

    return res.json({ html: sanitizedHtml, url: googleDocument ? url : finalUrl });
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
