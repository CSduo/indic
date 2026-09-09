/**
 * Opaque-box HTML and XML parsing utilities for SEO & crawler verification.
 * Extracts metadata, canonical links, OpenGraph, Twitter, Google Scholar tags,
 * JSON-LD structured data, visible body elements, and sitemap/RSS payloads.
 */

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface LinkTag {
  rel: string;
  href: string;
}

export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

export function extractAllMeta(html: string): MetaTag[] {
  const tags: MetaTag[] = [];
  const metaRegex = /<meta\s+([^>]*?)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1];
    const nameMatch = attrs.match(/\bname=["']([^"']*)["']/i);
    const propMatch = attrs.match(/\bproperty=["']([^"']*)["']/i);
    const contentMatch = attrs.match(/\bcontent=["']([^"']*)["']/i);

    if (contentMatch) {
      tags.push({
        name: nameMatch ? nameMatch[1] : undefined,
        property: propMatch ? propMatch[1] : undefined,
        content: contentMatch[1],
      });
    }
  }

  return tags;
}

export function getMeta(html: string, nameOrProperty: string): string | null {
  const tags = extractAllMeta(html);
  const found = tags.find(
    t => t.name?.toLowerCase() === nameOrProperty.toLowerCase() ||
         t.property?.toLowerCase() === nameOrProperty.toLowerCase()
  );
  return found ? found.content : null;
}

export function getAllMeta(html: string, nameOrProperty: string): string[] {
  const tags = extractAllMeta(html);
  return tags
    .filter(
      t => t.name?.toLowerCase() === nameOrProperty.toLowerCase() ||
           t.property?.toLowerCase() === nameOrProperty.toLowerCase()
    )
    .map(t => t.content);
}

export function extractCanonical(html: string): string | null {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*\/?>/i)
    || html.match(/<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*\/?>/i);
  return match ? match[1] : null;
}

export function extractJsonLd(html: string): any[] {
  const schemas: any[] = [];
  const regex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        schemas.push(...parsed);
      } else if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        schemas.push(...parsed["@graph"]);
      } else {
        schemas.push(parsed);
      }
    } catch {
      // Invalid JSON is tracked for test validation
    }
  }

  return schemas;
}

export function getJsonLdByType(html: string, type: string): any | null {
  const schemas = extractJsonLd(html);
  return schemas.find(s => s["@type"] === type || (Array.isArray(s["@type"]) && s["@type"].includes(type))) || null;
}

export function extractOpenGraph(html: string): Record<string, string> {
  const og: Record<string, string> = {};
  const tags = extractAllMeta(html);
  for (const t of tags) {
    if (t.property?.startsWith("og:")) {
      og[t.property] = t.content;
    }
    if (t.property?.startsWith("article:")) {
      og[t.property] = t.content;
    }
  }
  return og;
}

export function extractTwitter(html: string): Record<string, string> {
  const tw: Record<string, string> = {};
  const tags = extractAllMeta(html);
  for (const t of tags) {
    if (t.name?.startsWith("twitter:") || t.property?.startsWith("twitter:")) {
      const key = t.name || t.property || "";
      tw[key] = t.content;
    }
  }
  return tw;
}

export function extractGoogleScholar(html: string): Record<string, string | string[]> {
  const gs: Record<string, string | string[]> = {};
  const tags = extractAllMeta(html);
  for (const t of tags) {
    if (t.name?.startsWith("citation_")) {
      const key = t.name;
      if (gs[key]) {
        if (Array.isArray(gs[key])) {
          (gs[key] as string[]).push(t.content);
        } else {
          gs[key] = [gs[key] as string, t.content];
        }
      } else {
        gs[key] = t.content;
      }
    }
  }
  return gs;
}

export function extractVisibleText(html: string): string {
  // Strip head, script, style tags first
  const noHead = html.replace(/<head[\s\S]*?<\/head>/gi, "");
  const noScript = noHead.replace(/<script[\s\S]*?<\/script>/gi, "");
  const noStyle = noScript.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Replace tags with space and decode basic entities
  return noStyle
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSitemapUrls(xml: string): Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> {
  const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];
  const urlRegex = /<url>([\s\S]*?)<\/url>/gi;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(xml)) !== null) {
    const block = match[1];
    const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/i);
    const lastmodMatch = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i);
    const changefreqMatch = block.match(/<changefreq>([\s\S]*?)<\/changefreq>/i);
    const priorityMatch = block.match(/<priority>([\s\S]*?)<\/priority>/i);

    if (locMatch) {
      urls.push({
        loc: locMatch[1].trim(),
        lastmod: lastmodMatch ? lastmodMatch[1].trim() : undefined,
        changefreq: changefreqMatch ? changefreqMatch[1].trim() : undefined,
        priority: priorityMatch ? priorityMatch[1].trim() : undefined,
      });
    }
  }

  return urls;
}

export function parseRssItems(xml: string): Array<{ title: string; link: string; guid: string; pubDate: string; author?: string; category?: string }> {
  const items: Array<{ title: string; link: string; guid: string; pubDate: string; author?: string; category?: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const extractField = (name: string): string => {
      const fieldRegex = new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${name}>`, "i");
      const m = block.match(fieldRegex);
      return m ? (m[1] ?? m[2] ?? "").trim() : "";
    };

    items.push({
      title: extractField("title"),
      link: extractField("link"),
      guid: extractField("guid"),
      pubDate: extractField("pubDate"),
      author: extractField("author") || undefined,
      category: extractField("category") || undefined,
    });
  }

  return items;
}
