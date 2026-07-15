import { Router } from 'express';
import { z } from 'zod';
import dns from 'dns/promises';
import net from 'net';
import { v2 as cloudinary } from 'cloudinary';
import { getUserAuth } from '../lib/auth';
import { sanitizeArticleBody } from '../lib/content';

const router = Router();

const schema = z.object({ url: z.string().url('Valid URL required').max(2_048) });

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
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
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
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
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

/** Try to upload an image src to Cloudinary and return the CDN URL */
async function uploadImageToCloudinary(
  imgSrc: string,
  baseUrl: string
): Promise<string | null> {
  if (!process.env.CLOUDINARY_URL) return null;
  try {
    // Build absolute URL
    const absoluteUrl = imgSrc.startsWith('http')
      ? imgSrc
      : new URL(imgSrc, baseUrl).toString();

    // Guard against SSRF for image fetch
    await assertUrlIsSafe(absoluteUrl);

    const imgRes = await fetch(absoluteUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    if (!imgRes.ok) return null;

    const contentType = imgRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await readLimitedBody(imgRes, 10 * 1024 * 1024);

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'anvikshiki/url_imports', resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    return result?.secure_url || null;
  } catch {
    return null;
  }
}

/** Allowed block-level and inline HTML tags to preserve */
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'figure', 'figcaption', 'section', 'div', 'article', 'main', 'header', 'pre', 'code']);
const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'u', 'span', 'a', 'br', 'mark', 'sup', 'sub', 'abbr']);
const SKIP_TAGS = new Set(['script', 'style', 'nav', 'footer', 'aside', 'iframe', 'noscript', 'form', 'button', 'input', 'select', 'option', 'meta', 'link', 'head', 'html', 'body', 'svg', 'path', 'template']);

/**
 * Lightweight HTML-to-structured-HTML converter.
 * Extracts semantic content preserving paragraphs, headings, blockquotes,
 * lists, inline formatting and images.
 */
async function extractSemanticHtml(rawHtml: string, finalUrl: string): Promise<string> {
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

  for (const match of imgMatches) {
    const src = match[1];
    if (!imgMap.has(src)) {
      imgPromises.push(
        uploadImageToCloudinary(src, finalUrl).then(cdnUrl => {
          if (cdnUrl) imgMap.set(src, cdnUrl);
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
        const cdnSrc = imgMap.get(src) || src;
        result.push(`<figure><img src="${cdnSrc}" alt="${alt}" style="max-width:100%;height:auto;margin:1.5rem auto;display:block;border-radius:8px;" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`);
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

  return finalHtml;
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

    const googleDocRegex = /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i;
    const googleMatch = url.match(googleDocRegex);
    const fetchUrl = googleMatch
      ? `https://docs.google.com/document/d/${googleMatch[1]}/export?format=html`
      : url;

    const { response, finalUrl } = await fetchWithSsrfGuard(fetchUrl);

    if (!response.ok) {
      return res.status(422).json({ error: `Remote server returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
      return res.status(415).json({ error: 'The remote URL did not return HTML or plain text' });
    }
    const rawText = (await readLimitedBody(response, 2 * 1024 * 1024)).toString('utf-8');

    let html: string;

    if (contentType.includes('text/plain')) {
      // Plain text — convert to paragraphs
      html = rawText
        .split(/\n{2,}/)
        .filter(p => p.trim())
        .map(p => `<p>${decodeEntities(p.trim().replace(/\n/g, '<br>'))}</p>`)
        .join('\n');
    } else {
      // HTML — extract semantic content
      html = await extractSemanticHtml(rawText, finalUrl);
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

    return res.json({ html: sanitizeArticleBody(html), url: googleMatch ? url : finalUrl });
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
