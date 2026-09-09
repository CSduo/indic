# Ānvīkṣikī — Scholarly Discovery, Technical SEO & Growth Architecture

This document serves as the architectural reference and operational manual for search engine discoverability, scholarly citation harvesting, crawler rendering, structured data, and reader-to-contributor acquisition on **Ānvīkṣikī** (https://anvikshikijournal.in/).

---

## 1. Architectural Overview

Ānvīkṣikī is an open-access journal and research platform dedicated to Indic philosophy, Sanskrit studies, civilizational thought, and related intellectual fields. Because academic search engines (Google Scholar, Microsoft Academic), general crawlers (Googlebot, Bingbot), and social indexing engines (LinkedIn, X, WhatsApp, Facebook) require immediate, semantically rich responses without executing complex client-side JavaScript applications, Ānvīkṣikī deploys a **Hybrid Edge-SSR and SPA Architecture**:

- **Initial HTTP GET**: Express API server (`artifacts/api-server`) intercepts public document requests (`/articles/:slug`, `/papers/:slug`, `/authors/:slug`, `/domains/:slug`) and injects server-rendered semantic HTML, Highwire Press bibliographic meta tags, Open Graph cards, and Schema.org JSON-LD directly into the HTML payload before client-side hydration.
- **Client Hydration**: Once delivered, the React SPA (`artifacts/anvikshiki`) mounts into `#root` cleanly, preserving full interactivity for readers, citations tools, and account flows.
- **Bot vs. Human Parity**: Crawlers and users receive identical canonical metadata, titles, and body content, completely avoiding cloaking penalties while securing instant indexability.

---

## 2. Crawler & Search Engine SSR Rendering

### Public Routes Rendered on Initial Response
1. **/articles/:slug**: Full article content with title, subtitle, author byline, publication date, reading time, hero image, abstract, sanitized article body, topics/tags, references, author bio card, and citation block.
2. **/papers/:slug**: Academic research paper with title, author list, publication year, DOI, abstract, peer-review badge, discipline badge, citation export, and PDF download link.
3. **/authors/:slug**: Dedicated scholar authority hub featuring author bio, affiliated institution, location, avatar, full bibliography of published articles and research papers, and bidirectional entity linking.
4. **/domains/:slug**: Topical domain archives (e.g., Philosophy, Linguistics, Darśana) acting as indexable thematic anchors with curated overviews and publication catalogs.

### Security & Sanitization
All server-rendered content passes through strict security controls:
- HTML entities are escaped (`escapeHtml`) to prevent XSS injection.
- User-submitted article prose is sanitized via `sanitizeArticleBody` (stripping dangerous scripts, malformed frames, and insecure inline styles).
- Images rendered during SSR automatically receive `loading="lazy"` and `decoding="async"`.

---

## 3. Canonical URL & Routing Hygiene

### Strict Canonical Enforcement
- Every article, paper, author hub, and domain hub outputs a `<link rel="canonical" href="https://anvikshikijournal.in/..." />`.
- All URLs are canonicalized to lowercase, non-trailing-slash forms with percent-encoding safety.

### 301 Permanent Redirects
Legacy and alias paths are permanently redirected using HTTP 301 to preserve PageRank and eliminate duplicate content:
- `/essays/:slug` -> 301 Moved Permanently to `/articles/:slug`
- `/categories/:slug` -> 301 Moved Permanently to `/domains/:slug`

### Real HTTP Status Codes (Soft-404 Prevention)
- Non-existent articles, papers, authors, or domains immediately return **HTTP 404 Not Found** with a crawler-safe `<meta name="robots" content="noindex, nofollow" />` and semantic explanation.
- Soft-404s (where a 200 OK is returned for missing items) are strictly prohibited.
- Withdrawn or retracted publications with a recorded `deletedAt` timestamp return **HTTP 410 Gone** with permanent caching (`Cache-Control: public, max-age=86400`) and `noindex, nofollow` headers to instruct search engines to purge the URL from their index.

### Private & Administrative Surface Protection
All administrative, user account, and search query endpoints are marked non-indexable via:
- HTTP Response Header: `X-Robots-Tag: noindex, nofollow`
- HTML Meta Directive: `<meta name="robots" content="noindex, nofollow" />`
- Protected prefixes: `/admin`, `/account`, `/api/private`, `/messages`, `/saved`.

---

## 4. Google Scholar Highwire Press Bibliographic Tags

Google Scholar relies on Highwire Press meta tags in the `<head>` of scholarly articles to index research, extract citations, and link academic works. Ānvīkṣikī dynamically serves these tags on all research papers (`/papers/:slug`):

```html
<!-- Google Scholar Highwire Metadata -->
<meta name="citation_title" content="Computational Analysis of Alaṅkāra: Metric Modeling in Sanskrit Poetics" />
<meta name="citation_author" content="Dr. Ananya Sharma" />
<meta name="citation_author" content="Prof. V. S. Raghavan" />
<meta name="citation_publication_date" content="2026/02/20" />
<meta name="citation_journal_title" content="Ānvīkṣikī: An Open Journal of Indic Philosophy &amp; Intellectual Traditions" />
<meta name="citation_pdf_url" content="https://anvikshikijournal.in/uploads/papers/kavya-computational-poetics.pdf" />
<meta name="citation_abstract_html_url" content="https://anvikshikijournal.in/papers/kavya-alamkara-computational-poetics" />
<meta name="citation_doi" content="10.5281/zenodo.anvikshiki.2026.04" />
```

### Critical Highwire Guidelines
1. **Multi-Author Expansion**: Authors formatted as comma-separated strings are split and rendered as multiple distinct `<meta name="citation_author">` tags.
2. **Date Format**: Formatted strictly as `YYYY/MM/DD` or `YYYY/MM` or `YYYY` (ISO standard required by Scholar).
3. **Journal Title Consistency**: Identical across all publications to consolidate journal-level indexing and h-index aggregation.
4. **PDF and Abstract Linking**: Points directly to accessible PDF artifacts and canonical landing pages.

---

## 5. Schema.org Structured Data (JSON-LD)

Every server-rendered document includes validated JSON-LD scripts conforming to Schema.org standards:

### 1. ScholarlyArticle / Article
- Identifies the publication with persistent `@id` anchored to the canonical URL (`#scholarlyarticle` or `#article`).
- References the publication's parent `Periodical` (`https://anvikshikijournal.in/#periodical`).
- Establishes publisher authority linked to `Ānvīkṣikī Journal` (`https://anvikshikijournal.in/#organization`).
- Associates authors as `Person` entities with institutional affiliations (`worksFor`) where available.

### 2. Person & ProfilePage
- Rendered on author hubs (`/authors/:slug`).
- Includes name, biography, affiliated institution, location, avatar, and canonical profile URL.

### 3. CollectionPage & ItemList
- Rendered on domain hubs (`/domains/:slug`).
- Enumerates ordered `ListItem` elements pointing to all published essays and research papers within that discipline.

### 4. BreadcrumbList
- Rendered on all publication and domain pages, generating rich breadcrumb trails in Google SERPs (`Home` > `Journal` > `Discipline` > `Article`).

---

## 6. Social Sharing & Open Graph Cards

Every publication dynamically outputs Open Graph and Twitter Card tags:
- `og:type`: `article` for articles/papers, `profile` for author hubs, `website` for domain hubs.
- `og:title`, `og:description`, `og:url`, `og:site_name`.
- `twitter:card`: `summary_large_image` (with `summary` for authors).
- **Dynamic 1200x630 Branded Card Fallback**: If an author does not provide a custom hero image, Ānvīkṣikī serves an auto-generated SVG/PNG branded fallback card from `/api/og/:type/:slug` ensuring social embeds on X, WhatsApp, LinkedIn, and Telegram always present a crisp 1.91:1 banner.

---

## 7. Sitemaps, Robots.txt & RSS Feeds

### Dynamic /sitemap.xml
- Endpoint: `https://anvikshikijournal.in/sitemap.xml` (backed by `/api/sitemap.xml`).
- Contains **only HTTP 200 canonical URLs** for published articles, published papers, active authors, and active domains.
- Excludes drafts, deleted items, private routes, and query parameters.
- Provides real `lastmod` timestamps in ISO 8601 format.

### Robots.txt Configuration
- Location: `https://anvikshikijournal.in/robots.txt`
- Explicitly permits search engines to index:
  - `/`
  - `/articles/`
  - `/papers/`
  - `/authors/`
  - `/domains/`
  - `/browse`
  - `/about`
  - `/submit`
- Explicitly disallows private paths:
  - `/admin`
  - `/account`
  - `/api/private`
  - `/messages`
- References the primary sitemap index: `Sitemap: https://anvikshikijournal.in/sitemap.xml`.

### RSS 2.0 Syndication Feed
- Endpoint: `https://anvikshikijournal.in/api/rss`
- Valid XML with `Content-Type: application/rss+xml; charset=utf-8`.
- Contains RFC-822 formatted `pubDate` timestamps, full article descriptions, categories, author credits, and GUIDs.

---

## 8. IndexNow Instant Search Engine Notification

Ānvīkṣikī integrates the **IndexNow Protocol**, enabling real-time indexing notifications to Microsoft Bing, Yandex, Naver, and Seznam immediately when:
1. A new article or paper is published (`POST /api/submissions/:id/accept`).
2. An existing article or paper is updated (`PATCH /api/articles/:slug`).
3. A publication is archived or removed.

### Configuration
- Host: `https://anvikshikijournal.in`
- Key Location: Configured via `INDEXNOW_KEY` environment variable.
- Verification File: Served at `https://anvikshikijournal.in/{INDEXNOW_KEY}.txt`.
- Multi-engine dispatch: Submits payloads to `https://api.indexnow.org/indexnow`.

---

## 9. Contributor Acquisition & Growth Flywheel

To convert readers into contributing scholars and expand the author pool:
1. **Contextual Submission CTAs**: Server-rendered at the conclusion of every article and paper, prompting scholars working in that domain to submit their manuscript to Ānvīkṣikī.
2. **Author Promotion & Citation Kit**:
   - One-click copyable formatted citations in **APA (7th ed.)**, **MLA (9th ed.)**, **Chicago (17th ed.)**, and **BibTeX**.
   - Native Web Share API integration with pre-composed sharing links for X (Twitter), LinkedIn, and WhatsApp.
   - Author profile links encouraging discovery of other works by the same scholar.

---

## 10. Webmaster Operational Checklists

### Google Search Console Setup Checklist
- [ ] Log in to Google Search Console (https://search.google.com/search-console).
- [ ] Add Property: `URL prefix: https://anvikshikijournal.in/` (or Domain verification via DNS TXT record).
- [ ] Submit Sitemap: Navigate to **Sitemaps** > Enter `sitemap.xml` > Click **Submit**.
- [ ] Perform URL Inspection: Test `https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory` to confirm Googlebot receives full SSR HTML and valid `Article` structured data.
- [ ] Monitor **Page Indexing** reports for any 404/soft-404 alerts (verify all legacy URLs redirect with 301).

### Bing Webmaster Tools Setup Checklist
- [ ] Log in to Bing Webmaster Tools (https://www.bing.com/webmasters).
- [ ] Import property from Google Search Console or verify via `<meta name="msvalidate.01">`.
- [ ] Submit Sitemap: `https://anvikshikijournal.in/sitemap.xml`.
- [ ] Verify **IndexNow**: Under **Configure My Site** > **IndexNow**, ensure API submissions are being received.

### Google Scholar Indexing Verification
- [ ] Ensure journal landing page and all `/papers/:slug` URLs are accessible without login or paywalls.
- [ ] Validate that research papers provide PDF links (`citation_pdf_url`) or readable full text.
- [ ] Search `site:anvikshikijournal.in` on Google Scholar (https://scholar.google.com/) after crawl cycle (typically 2-4 weeks for academic harvesters).

---

## 11. Verification & Automated Test Suite

Ānvīkṣikī's discoverability architecture is backed by an automated 4-tier E2E SEO test suite (`test/e2e-seo/`):

- **Tier 1 (Feature Coverage - 70 tests)**:
  - Initial HTTP HTML Delivery (`initial-html-delivery.test.ts`)
  - Canonical URL Routing & 301 Redirects (`canonical-urls.test.ts`)
  - Social & Open Graph Metadata (`open-graph-metadata.test.ts`)
  - Google Scholar Highwire Tags (`google-scholar.test.ts`)
  - Schema.org Structured Data (`schema-org.test.ts`)
  - Author Authority Hubs (`author-hub.test.ts`)
  - Domain Discipline Hubs (`domain-hub.test.ts`)
  - Dynamic Sitemaps & Robots.txt (`sitemap-robots.test.ts`)
  - RSS 2.0 Syndication (`rss-feed.test.ts`)
  - IndexNow Service (`indexnow.test.ts`)
  - Contributor CTAs & Citation Kits (`contributor-ctas.test.ts`)
  - 404/410 Status Codes (`status-codes.test.ts`)
- **Tier 2 (Boundaries & Edge Cases - 13 tests)**:
  - Unicode/Sanskrit slugs, percent-encoding boundaries, malicious HTML injection, missing author fields.
- **Tier 3 (Cross-Feature Workflows - 6 tests)**:
  - End-to-end publishing-to-sitemap-to-indexnow pipeline.
- **Tier 4 (Crawler Emulation - 9 tests)**:
  - Emulates Googlebot, Bingbot, Google Scholar, Twitterbot, and WhatsApp user-agents.

**Test Run Command**:
```bash
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts
```
Total: **98 / 98 tests passing**.
