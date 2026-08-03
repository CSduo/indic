import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const [articles, papers] = await Promise.all([
      db.select({ slug: articlesTable.slug, updatedAt: articlesTable.updatedAt })
        .from(articlesTable)
        .where(eq(articlesTable.status, "PUBLISHED")),
      db.select({ slug: papersTable.slug, updatedAt: papersTable.updatedAt })
        .from(papersTable)
        .where(eq(papersTable.status, "PUBLISHED"))
    ]);

    const baseUrl = process.env.FRONTEND_URL || 'https://anvikshiki.com';
    const staticPages = ['', '/about', '/contact', '/privacy', '/terms', '/browse', '/domains', '/archive'];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>\n`;
    }

    // Add articles
    for (const article of articles) {
      xml += `  <url>
    <loc>${baseUrl}/article/${article.slug}</loc>
    <lastmod>${new Date(article.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }

    // Add papers
    for (const paper of papers) {
      xml += `  <url>
    <loc>${baseUrl}/paper/${paper.slug}</loc>
    <lastmod>${new Date(paper.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (err) {
    req.log.error(err);
    return res.status(500).send("Failed to generate sitemap");
  }
});

export default router;
