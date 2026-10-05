/**
 * robots.txt for anvikshikijournal.in.
 *
 * On Vercel the static copy in artifacts/anvikshiki/public/robots.txt is served
 * (static files win over vercel.json rewrites); the Express route serves this
 * constant everywhere else. robots.test.ts keeps the two identical.
 *
 * - Account, admin, messaging and drafting screens are not crawled. They also
 *   send `X-Robots-Tag: noindex` (vercel.json headers), because a robots.txt
 *   Disallow alone does not keep an already-linked URL out of the index.
 * - /api/ stays closed except for the public, read-only GET endpoints the SPA
 *   calls to render public pages (home, article, paper, author, domain,
 *   papers index). Without them Google's renderer saw "No publications yet"
 *   and "Author Not Found" in place of the real content. Google applies the
 *   longest matching rule, so each Allow below beats `Disallow: /api/`.
 * - One Sitemap line: /api/sitemap.xml only redirects to /sitemap.xml.
 */
export const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /messages
Disallow: /notifications
Disallow: /saved
Disallow: /login
Disallow: /submit/
Disallow: /api/
Allow: /api/articles
Allow: /api/papers
Allow: /api/categories
Allow: /api/rss
Allow: /api/users/*/profile
Allow: /api/users/profile/

Sitemap: https://anvikshikijournal.in/sitemap.xml
`;
