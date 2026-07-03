import { Router } from 'express';
import { z } from 'zod';
import dns from 'dns/promises';
import net from 'net';

const router = Router();

const schema = z.object({ url: z.string().url('Valid URL required') });

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

/**
 * POST /api/extract-url
 * Fetches a public webpage and returns its plain text, stripped of HTML.
 */
router.post('/extract-url', async (req, res) => {
  try {
    const { url } = schema.parse(req.body);

    const { response, finalUrl } = await fetchWithSsrfGuard(url);

    if (!response.ok) {
      return res.status(422).json({ error: `Remote server returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    let text: string;

    if (contentType.includes('text/plain')) {
      text = rawText;
    } else {
      // Strip HTML tags, collapse whitespace, and remove scripts/styles
      text = rawText
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+/g, ' ')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n');
    }

    // Trim to 200 000 chars to avoid huge payloads
    if (text.length > 200_000) text = text.slice(0, 200_000) + '\n\n[Content truncated at 200 000 characters]';

    return res.json({ text, url: finalUrl });
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
    return res.status(500).json({ error: err.message || 'Failed to fetch URL' });
  }
});

export default router;
