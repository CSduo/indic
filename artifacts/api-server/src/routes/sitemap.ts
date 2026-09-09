import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, categoriesTable, usersTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { slugify } from "../app";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const [articles, papers, categories, users] = await Promise.all([
      db.select({ slug: articlesTable.slug, updatedAt: articlesTable.updatedAt, authorName: articlesTable.authorName })
        .from(articlesTable)
        .where(and(eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt))),
      db.select({ slug: papersTable.slug, updatedAt: papersTable.updatedAt, authorName: papersTable.authorName })
        .from(papersTable)
        .where(and(eq(papersTable.status, "PUBLISHED"), isNull(papersTable.deletedAt))),
      db.select({ slug: categoriesTable.slug, updatedAt: categoriesTable.updatedAt })
        .from(categoriesTable)
        .where(eq(categoriesTable.visible, true)),
      db.select({ handle: usersTable.handle, name: usersTable.name, updatedAt: usersTable.updatedAt })
        .from(usersTable)
        .where(isNull(usersTable.deletionRequestedAt)),
    ]);

    const baseUrl = 'https://anvikshikijournal.in';
    const staticPages = [
      '', '/about', '/contact', '/privacy', '/terms',
      '/browse', '/domains', '/archive', '/papers',
      '/community', '/submit',
    ];

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
    <loc>${baseUrl}/articles/${article.slug}</loc>
    <lastmod>${new Date(article.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }

    // Add papers
    for (const paper of papers) {
      xml += `  <url>
    <loc>${baseUrl}/papers/${paper.slug}</loc>
    <lastmod>${new Date(paper.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }

    // Add domain hubs
    for (const cat of categories) {
      xml += `  <url>
    <loc>${baseUrl}/domains/${encodeURIComponent(cat.slug)}</loc>
    <lastmod>${new Date(cat.updatedAt || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }

    // Add author hubs
    const authorMap = new Map<string, Date>();
    for (const u of users) {
      if (u.handle) {
        authorMap.set(u.handle, u.updatedAt || new Date());
      } else if (u.name) {
        const s = slugify(u.name);
        if (s) authorMap.set(s, u.updatedAt || new Date());
      }
    }
    for (const a of articles) {
      if (a.authorName) {
        const s = slugify(a.authorName);
        if (s && !authorMap.has(s)) {
          authorMap.set(s, a.updatedAt ? new Date(a.updatedAt) : new Date());
        }
      }
    }
    for (const p of papers) {
      if (p.authorName) {
        const authors = p.authorName.split(/,\s*/);
        for (const auth of authors) {
          const s = slugify(auth);
          if (s && !authorMap.has(s)) {
            authorMap.set(s, p.updatedAt ? new Date(p.updatedAt) : new Date());
          }
        }
      }
    }

    for (const [authorSlug, updatedAt] of authorMap.entries()) {
      xml += `  <url>
    <loc>${baseUrl}/authors/${encodeURIComponent(authorSlug)}</loc>
    <lastmod>${updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
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
