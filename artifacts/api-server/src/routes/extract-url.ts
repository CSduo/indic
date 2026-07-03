import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const schema = z.object({ url: z.string().url('Valid URL required') });

/**
 * POST /api/extract-url
 * Fetches a public webpage and returns its plain text, stripped of HTML.
 */
router.post('/extract-url', async (req, res) => {
  try {
    const { url } = schema.parse(req.body);

    // Only allow http/https
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http/https URLs are supported' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Anvikshiki/1.0; +https://anvikshiki.in)',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    });

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

    return res.json({ text, url });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid input' });
    }
    if (err.name === 'TimeoutError' || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return res.status(408).json({ error: 'Request timed out — the remote URL took too long to respond.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch URL' });
  }
});

export default router;
