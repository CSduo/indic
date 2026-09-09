# Original User Request

## 2026-08-15T06:48:25Z

Comprehensive audit and end-to-end fix of all submission, upload, article/paper editing, manual entry, and API connectivity error paths across Ānvīkṣikī.

Working directory: C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo
Integrity mode: development

## Requirements

### R1. Comprehensive Submission Pipeline Audit & Resilience
Audit and harden all submission flows: manual multi-step submission (/submit), Word/DOCX import, PDF upload/conversion, and document parsing across client and backend. Ensure all upload endpoints handle large files, multipart forms, storage connectivity failovers, and return clean structured JSON with descriptive error messages.

### R2. End-to-End Article & Paper Editing Flow
Audit and verify the full editing pipeline (/account/edit/:slug, /account, /articles/:slug), ensuring article and paper updates (title, author, category, excerpt, hero image, rich text body with inline images/audio, and tags) persist accurately to the database without schema mismatches, missing fields, or network disconnects.

### R3. API Connectivity & Database Error Handling
Audit all API routes (/api/submissions, /api/articles, /api/papers, /api/upload, /api/auth) for connection timeouts, connection pooling exhaustion, transaction rollbacks, CORS/credential failures, and unhandled promise rejections. Add robust retry mechanisms, edge error boundaries, and defensive fallbacks.

### R4. Zero Visual Degradation & Complete Verification
Fix all identified bugs and connectivity errors without altering the visual design, theme, or intended UX of the platform. Validate all fixes with programmatic typecheck, build, and end-to-end API test scripts.

## Acceptance Criteria

### Submission & Uploads
- [ ] Manual article/paper submissions (POST /api/submissions) succeed reliably with valid payload and return HTTP 201 with created record.
- [ ] Word document / PDF file uploads succeed without hanging, payload size rejections, or unhandled 500 errors.
- [ ] Submissions appear immediately in user dashboard (/account) and admin queue (/admin/submissions).

### Editing & Updating
- [ ] Editing any published or accepted article via /account/edit/:slug saves all modified fields (title, excerpt, author, body, cover image, category) and updates the live article view immediately.
- [ ] Editing papers updates all metadata, abstract, and references without data loss.

### Connectivity & Resilience
- [ ] Database queries and updates handle network blips and reconnection gracefully without crashing serverless lambdas.
- [ ] Typecheck passes across all workspace packages (pnpm run typecheck).
- [ ] Production build succeeds without errors.

## 2026-09-08T06:31:58Z

Build and deploy a comprehensive, high-quality technical SEO, crawler discoverability, scholarly metadata, SSR/crawler-rendering, and contributor growth engine for Ānvīkṣikī (CSduo/indic), an open journal and research platform focused on Indic philosophy and intellectual traditions.

Working directory: C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo
Integrity mode: development

## Scope & Operational Context
- Target Repository: `CSduo/indic` (at `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo`)
- Live Publication: `https://anvikshikijournal.in/`
- Stack: Monorepo containing `@workspace/anvikshiki` (Vite + React frontend SPA with SSR/prerender capabilities), `@workspace/api-server` (Express API + Vercel serverless functions), `@workspace/db` (Drizzle ORM + Postgres/Neon), with deployment on Vercel.
- Strictly isolated to `CSduo/indic`: no unrelated repositories or products.

## Requirements

### R1. Crawler & Search Engine Rendering (SSR / Prerender / Bot Document Delivery)
- Ensure that public articles (`/articles/:slug`), research papers (`/papers/:slug`), author hubs (`/authors/:slug`), and domain hubs (`/domains/:slug`) deliver semantically rich, fully formed HTML on initial response before client-side hydration.
- Crawlers (Googlebot, Bingbot, Google Scholar crawler, social media user-agents) must receive the article title, author, dates, abstract, canonical URL, visible text/content, and structured data in the initial HTTP response without relying on client-side API requests.

### R2. Canonical URL & Route Hygiene
- Enforce strict canonical URLs across all public resources (`https://anvikshikijournal.in/articles/:slug`, `/papers/:slug`, `/authors/:slug`, `/domains/:slug`).
- Eliminate crawl waste and duplicate content: canonicalize query strings, ensure non-canonical variants (e.g. legacy `/essays/:slug`) issue 301 redirects, ensure search/filter parameters are `noindex, follow`, and ensure drafts and account/admin/private pages are strictly non-indexable (`noindex, nofollow`).

### R3. Comprehensive Scholarly & Social Metadata
- Implement complete Open Graph (`og:title`, `og:description`, `og:type=article`, `og:url`, `og:image`, `article:published_time`, `article:modified_time`, `article:author`, `article:section`) and Twitter (`twitter:card=summary_large_image`, title, description, image) tags.
- Provide auto-generated dynamic fallback branded social share cards (1200×630) for publications lacking custom hero images.
- Implement Google Scholar highwire / bibliographic meta tags (`citation_title`, `citation_author`, `citation_publication_date`, `citation_journal_title`, `citation_pdf_url`, `citation_abstract_html_url`, `citation_keywords`) with strict accuracy and zero fabricated values.

### R4. Schema.org Structured Data
- Expose fully validated JSON-LD `ScholarlyArticle` (and `Article` where appropriate) on publication pages, referencing a stable `@id` for publisher (`Ānvīkṣikī Journal`) and author profiles (`Person`).
- Expose `BreadcrumbList` on articles, papers, author, and domain pages.
- Expose `Person` schema on author profiles and `CollectionPage` / `ItemList` on domain hubs.

### R5. Authority Hubs & Internal Linking
- Build permanent, indexable author authority hubs (`/authors/:slug`) with bidirectional entity linking to their publications.
- Strengthen topical domain hubs (`/domains/:slug`) as indexable authority anchors with curated overviews and publication listings.
- Enhance internal linking on publication pages with semantic related-content recommendations based on shared domain, topics, and authors.

### R6. Sitemap, Robots, RSS & IndexNow
- Generate dynamic, standards-compliant `/sitemap.xml` (or sitemap index) containing only HTTP 200 published, canonical URLs with accurate `lastmod` dates.
- Configure `/robots.txt` to allow public content while explicitly disallowing private routes (`/admin/`, `/account/`, `/api/private/`, drafts).
- Ensure `/api/rss` produces valid, well-escaped XML feeds with canonical links and real publication dates.
- Integrate server-side IndexNow notifications on publication, update, or unpublishing events, restricted strictly to `https://anvikshikijournal.in/`.

### R7. Contributor Acquisition & Author Promotion Kit
- Enhance reader-to-contributor conversion with tasteful, context-sensitive CTAs on publication pages, author profiles, and domain hubs.
- Provide post-publication author promotion tools (copy link, native share, WhatsApp/LinkedIn/X copy, formatted citations in APA, MLA, Chicago, BibTeX).

## Acceptance Criteria

### Crawlability & Rendering
- [ ] Initial HTTP GET for published `/articles/:slug` and `/papers/:slug` returns valid HTML containing title, author, dates, abstract, visible content, and metadata before JavaScript execution.
- [ ] Initial HTTP GET for `/authors/:slug` and `/domains/:slug` returns indexable content and internal links.
- [ ] Soft 404s are prevented: deleted or nonexistent documents return HTTP 404/410 status codes.

### Metadata & Structured Data
- [ ] Article and paper pages dynamically output distinct, content-specific meta description, canonical URL, and Open Graph / Twitter tags.
- [ ] Fallback 1200×630 branded social card is served for publications without custom hero images.
- [ ] Validated JSON-LD `ScholarlyArticle` / `Article` schema is present on every published piece without syntax errors or undefined properties.
- [ ] Google Scholar citation meta tags (`citation_title`, `citation_author`, `citation_publication_date`, `citation_journal_title`) are present on qualified scholarly papers.
- [ ] Author profiles output valid `Person` JSON-LD schema with links to authored works.
- [ ] Domain hub pages output valid `BreadcrumbList` and collection structured data.

### Sitemaps, Robots & IndexNow
- [ ] `/robots.txt` allows public pages (`/articles/`, `/papers/`, `/authors/`, `/domains/`, `/sitemap.xml`) and disallows private routes.
- [ ] `/sitemap.xml` contains only 200 OK published canonical URLs with accurate `lastmod` timestamps.
- [ ] Drafts, admin screens, user account pages, and search query URLs are completely excluded from sitemaps and tagged `noindex`.
- [ ] Server-side IndexNow service submits only valid `https://anvikshikijournal.in/` URLs on publication events without leaking API keys.
- [ ] `/api/rss` produces valid XML with correct MIME type, escaped entities, and real publication timestamps.

### Authority Hubs & Growth Flywheel
- [ ] Author pages (`/authors/:slug`) link bidirectionally to published articles and papers.
- [ ] Publication pages feature semantic related-content recommendations.
- [ ] Contributor acquisition CTAs are present on articles, author pages, and domain hubs.
- [ ] Author share/promotion tools provide copy-ready links, social copy, and citations (APA, MLA, Chicago, BibTeX).

### Code Quality & Deployment Readiness
- [ ] Full workspace typecheck passes (`pnpm run typecheck:libs && pnpm -r run typecheck`) with 0 errors.
- [ ] Vitest test suite passes (`pnpm run test`) with all tests green.
- [ ] Production build succeeds (`pnpm run build`).
- [ ] Documentation provided in `docs/DISCOVERY_AND_GROWTH.md`.

## Verification Resources
- Vitest test suite: `pnpm --filter @workspace/api-server run test`
- Typecheck: `pnpm run typecheck`
- Production build: `pnpm run build`
- Live HTTP validation: `Invoke-RestMethod` / `curl` against endpoints
