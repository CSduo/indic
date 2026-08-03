import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/rss", async (req, res) => {
  try {
    const limit = 50;
    const [articles, papers] = await Promise.all([
      db.select()
        .from(articlesTable)
        .where(eq(articlesTable.status, "PUBLISHED"))
        .orderBy(desc(articlesTable.publishedAt))
        .limit(limit),
      db.select()
        .from(papersTable)
        .where(eq(papersTable.status, "PUBLISHED"))
        .orderBy(desc(papersTable.publishedAt))
        .limit(limit)
    ]);

    const items = [
      ...articles.map(a => ({
        title: a.title,
        description: a.excerpt || a.subtitle || "",
        link: `${process.env.FRONTEND_URL || 'https://anvikshiki.com'}/article/${a.slug}`,
        pubDate: a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date(a.createdAt).toUTCString(),
        author: a.authorName || 'Ānvīkṣikī',
        category: a.categorySlug,
        guid: `article-${a.id}`,
        timestamp: a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.createdAt).getTime(),
      })),
      ...papers.map(p => ({
        title: p.title,
        description: p.abstract || "",
        link: `${process.env.FRONTEND_URL || 'https://anvikshiki.com'}/paper/${p.slug}`,
        pubDate: p.publishedAt ? new Date(p.publishedAt).toUTCString() : new Date(p.createdAt).toUTCString(),
        author: p.authorName || 'Ānvīkṣikī',
        category: p.categorySlug,
        guid: `paper-${p.id}`,
        timestamp: p.publishedAt ? new Date(p.publishedAt).getTime() : new Date(p.createdAt).getTime(),
      }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Ānvīkṣikī - Journal of Encyclopaedic Inquiry</title>
  <description>Latest articles and research papers from Ānvīkṣikī</description>
  <link>${process.env.FRONTEND_URL || 'https://anvikshiki.com'}</link>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
`;

    for (const item of items) {
      rss += `  <item>
    <title><![CDATA[${item.title}]]></title>
    <description><![CDATA[${item.description}]]></description>
    <link>${item.link}</link>
    <guid isPermaLink="false">${item.guid}</guid>
    <pubDate>${item.pubDate}</pubDate>
    <author>${item.author}</author>
    <category>${item.category}</category>
  </item>\n`;
    }

    rss += `</channel>\n</rss>`;

    res.header('Content-Type', 'application/rss+xml');
    return res.send(rss);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to generate RSS feed" });
  }
});

export default router;
