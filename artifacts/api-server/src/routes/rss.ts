import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { CANONICAL_DOMAIN, SITE_NAME, escapeHtml } from "../lib/ssr-html";
import { PAGE_META } from "../lib/page-meta";
import { cleanTitle, plainTextFromHtml } from "../lib/seo-text";

const router = Router();

/** The one feed URL (the footer links to it); /rss and /feed serve the same feed. */
export const RSS_SELF_URL = `${CANONICAL_DOMAIN}/rss.xml`;

/** Feed readers and CDNs may reuse the feed for 5 minutes, the CDN for 10. */
export const RSS_CACHE_CONTROL = "public, max-age=300, s-maxage=600, stale-while-revalidate=300";

const FEED_LIMIT = 50;

export interface RssItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  /** Milliseconds since the epoch. */
  timestamp: number;
  creators: string[];
  category: string | null;
}

/** Text inside CDATA, with any "]]>" split so it cannot end the section early. */
function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/**
 * The feed document. Title and description match the home page, the language
 * matches the pages' <html lang>, and each item names its authors with
 * dc:creator (RSS's own <author> element must be an e-mail address).
 */
export function buildRssXml(items: RssItem[], now: Date = new Date()): string {
  const lastBuild = items.length > 0 ? new Date(Math.max(...items.map((item) => item.timestamp))) : now;
  const itemXml = items.map((item) => {
    const creators = item.creators.map((name) => `    <dc:creator>${cdata(name)}</dc:creator>\n`).join("");
    const category = item.category ? `    <category>${escapeHtml(item.category)}</category>\n` : "";
    return `  <item>
    <title>${cdata(item.title)}</title>
    <link>${escapeHtml(item.link)}</link>
    <guid isPermaLink="false">${escapeHtml(item.guid)}</guid>
    <pubDate>${new Date(item.timestamp).toUTCString()}</pubDate>
${creators}${category}    <description>${cdata(item.description)}</description>
  </item>
`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>${escapeHtml(SITE_NAME)}</title>
  <link>${CANONICAL_DOMAIN}/</link>
  <atom:link href="${RSS_SELF_URL}" rel="self" type="application/rss+xml" />
  <description>${escapeHtml(PAGE_META.home.description)}</description>
  <language>en</language>
  <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
${itemXml}</channel>
</rss>
`;
}

function timestampOf(row: { publishedAt?: Date | string | null; createdAt?: Date | string | null }): number {
  const value = row.publishedAt ?? row.createdAt;
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

router.get(["/rss", "/rss.xml", "/feed"], async (req, res) => {
  try {
    const [articles, papers] = await Promise.all([
      db.select()
        .from(articlesTable)
        .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)))
        .orderBy(desc(articlesTable.publishedAt))
        .limit(FEED_LIMIT),
      db.select()
        .from(papersTable)
        .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt)))
        .orderBy(desc(papersTable.publishedAt))
        .limit(FEED_LIMIT),
    ]);

    const items: RssItem[] = [
      ...articles.map((a): RssItem => ({
        title: cleanTitle(a.title),
        description: plainTextFromHtml(a.excerpt || a.subtitle || ""),
        link: `${CANONICAL_DOMAIN}/articles/${encodeURIComponent(a.slug)}`,
        guid: `article-${a.id}`,
        timestamp: timestampOf(a),
        creators: [(a.authorName || "").trim() || SITE_NAME],
        category: a.categorySlug || null,
      })),
      ...papers.map((p): RssItem => ({
        title: cleanTitle(p.title),
        description: plainTextFromHtml(p.abstract || ""),
        link: `${CANONICAL_DOMAIN}/papers/${encodeURIComponent(p.slug)}`,
        guid: `paper-${p.id}`,
        timestamp: timestampOf(p),
        creators: (p.authorName || "").split(/,\s*/).map((name) => name.trim()).filter(Boolean),
        category: p.categorySlug || null,
      })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, FEED_LIMIT);

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", RSS_CACHE_CONTROL);
    return res.send(buildRssXml(items));
  } catch (err) {
    req.log?.error({ err }, "RSS feed error");
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "The feed is temporarily unavailable." });
  }
});

export default router;
