# Ānvīkṣikī Technical SEO, SSR/Crawler Rendering, and Metadata Engine — Test Suite Ready (TEST_READY)

## 1. Test Suite Status: READY & OPERATIONAL
The opaque-box E2E testing infrastructure and test suite for the Ānvīkṣikī Technical SEO, SSR/Crawler Rendering, Scholarly Metadata, and Contributor Growth Engine (Requirements R1 through R7 in `ORIGINAL_REQUEST.md`) is fully authored, configured, and verified.

The test suite runs via Vitest and Supertest directly against the Express application (`@workspace/api-server`), executing real HTTP requests through the middleware and rendering pipeline.

---

## 2. Test Suite Architecture & Catalog

### Test Infrastructure & Configuration
- **Runner Config**: `vitest.config.e2e.ts` (configured at repository root with path aliases and global setup)
- **Architecture Documentation**: `TEST_INFRA.md`
- **Global Harness Setup**: `test/e2e-seo/helpers/setup.ts`
- **In-Memory Query Engine Mock**: `test/e2e-seo/helpers/db-mock.ts` (evaluates Drizzle ORM query chains hermetically)
- **Canonical Indic Dataset**: `test/e2e-seo/helpers/mock-db.ts` (authentic Sanskrit/Indic articles, papers, authors, categories, drafts, deleted records)
- **Opaque-Box Parser**: `test/e2e-seo/helpers/html-parser.ts` (extracts title, canonical, OpenGraph, Twitter, Scholar tags, JSON-LD, visible text, sitemap, RSS)

### Test Suites by Tier (15 Test Files, 98 Test Cases)

#### Tier 1: Feature Coverage (72 Test Cases across 12 Features, >=5 tests/feature)
1. `test/e2e-seo/tier1-features/initial-html-delivery.test.ts` (6 tests) — R1: SSR document delivery for articles, papers, authors, domains before hydration.
2. `test/e2e-seo/tier1-features/canonical-urls.test.ts` (6 tests) — R2: Strict canonical URLs, query parameter canonicalization, 301 redirects, noindex on private routes.
3. `test/e2e-seo/tier1-features/opengraph-twitter.test.ts` (6 tests) — R3: Open Graph (`og:*`, `article:*`), Twitter Cards (`summary_large_image`), 1200x630 fallback branded cards.
4. `test/e2e-seo/tier1-features/google-scholar.test.ts` (6 tests) — R3: Highwire bibliographic tags (`citation_title`, `citation_author`, `citation_publication_date`, `citation_journal_title`, `citation_pdf_url`).
5. `test/e2e-seo/tier1-features/structured-data.test.ts` (6 tests) — R4: Schema.org JSON-LD (`ScholarlyArticle`, `Article`, `Person`, `BreadcrumbList`).
6. `test/e2e-seo/tier1-features/sitemap-robots.test.ts` (6 tests) — R6: `/sitemap.xml` validity, lastmod timestamps, exclusion of drafts/admin, `/robots.txt` rules.
7. `test/e2e-seo/tier1-features/rss-feed.test.ts` (6 tests) — R6: `/api/rss` validity, canonical links, pubDate sorting, CDATA/escaping.
8. `test/e2e-seo/tier1-features/indexnow.test.ts` (5 tests) — R6: IndexNow protocol, host restriction, URL batching, secret protection, key verification file.
9. `test/e2e-seo/tier1-features/author-hubs.test.ts` (6 tests) — R5: Indexable author hubs (`/authors/:slug`), bio, credentials, works listing, bidirectional linking.
10. `test/e2e-seo/tier1-features/domain-hubs.test.ts` (6 tests) — R5: Topical domain hubs (`/domains/:slug`), overview, publication listing, internal links.
11. `test/e2e-seo/tier1-features/contributor-ctas.test.ts` (5 tests) — R7: Contextual reader-to-contributor acquisition CTAs across articles, papers, author hubs, and domains.
12. `test/e2e-seo/tier1-features/citation-generator.test.ts` (6 tests) — R7: Post-publication citation generator (APA, MLA, Chicago, BibTeX) and author promotion tools.

#### Tier 2: Boundary & Corner Cases (12 Test Cases)
13. `test/e2e-seo/tier2-boundaries/boundary-corner-cases.test.ts` (12 tests) — Soft-404 prevention (404 status for non-existent slugs), deleted record protection (404/410), draft crawl suppression, Devanagari script preservation, IAST diacritics, double-escaping prevention, fallback cards for missing hero images, multiple co-authors, XSS injection sanitization, malformed percent-encoded slugs, ultra-long parameters.

#### Tier 3: Cross-Feature Interactions (6 Test Cases)
14. `test/e2e-seo/tier3-cross-feature/cross-feature-flows.test.ts` (6 tests) — Author Hub -> Publication -> Related Content -> Citation flow; DB updatedAt -> sitemap lastmod -> RSS sync; canonical URL preservation across campaign tracking query strings; Domain Hub -> Paper -> Author Hub closed authority loop; Scholar tags consistency with citation text.

#### Tier 4: Real-world Workloads & Crawler Emulation (9 Test Cases)
15. `test/e2e-seo/tier4-crawlers/crawler-emulation.test.ts` (9 tests) — Emulation of Googlebot Desktop, Googlebot Mobile, Bingbot, Google Scholar scraper, Twitterbot, Facebook External Hit, WhatsApp previewer, LinkedInBot, Applebot.

---

## 3. How to Run the Tests

### Full Suite Run
```powershell
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts
```

### Run by Tier
```powershell
# Tier 1: Feature Suites
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier1-features/

# Tier 2: Boundaries
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier2-boundaries/

# Tier 3: Cross-Feature Interactions
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier3-cross-feature/

# Tier 4: Crawler Emulation
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier4-crawlers/
```

---

## 4. Baseline Test Run Results

```
Test Files:  15 total (4 passed, 11 failed)
Tests:       98 total (66 passed, 32 failed)
Duration:    ~40s
```

### Passing Capabilities (66 Tests)
- Initial Open Graph titles, types, URLs, and image tags.
- Fallback social card generation when custom cover image is missing.
- Twitter card `summary_large_image` tags.
- Dynamic `/api/sitemap.xml` XML structure and canonical URL listings.
- Dynamic `/api/rss` XML structure, channel metadata, item timestamps, and CDATA escaping.
- XSS injection resistance and payload sanitization in URL parameters.
- IAST Unicode diacritic preservation.

### Discovered Implementation Gaps (32 Tests to Escalate for Milestones M1–M5)
The 32 failing tests accurately identify the exact un-implemented requirements in the current codebase, providing milestone implementers with direct TDD targets:

1. **R1: Pre-Hydration Visible Content Delivery** (`artifacts/api-server/src/app.ts:408`):
   - Currently, the server injects `<div id="root"></div>` with empty body. Bot crawlers (Googlebot, Bingbot) receive 0 visible words.
   - *Fix needed in Milestone 1*: Inject semantically rich `<article>` body, `<h1>` heading, author bylines, and abstract into the initial HTML response.
2. **R2: Soft 404 Prevention** (`artifacts/api-server/src/app.ts:282-388`):
   - When a slug does not exist or is deleted, `app.ts` falls back to default title and returns HTTP 200 instead of HTTP 404/410.
   - *Fix needed in Milestone 1*: If article/paper record is not found in DB or `deletedAt` is non-null, return `res.status(404)` (or 410).
3. **R2: Legacy `/essays/:slug` 301 Redirect** (`artifacts/api-server/src/app.ts:276`):
   - Currently, `/essays/:slug` serves 200 directly instead of redirecting.
   - *Fix needed in Milestone 1*: Issue 301 permanent redirect from `/essays/:slug` to `/articles/:slug`.
4. **R3: Google Scholar Highwire Bibliographic Tags** (`artifacts/api-server/src/app.ts:342-360`):
   - `citation_title`, `citation_author`, `citation_publication_date`, `citation_journal_title`, `citation_pdf_url` are not yet emitted in the HTML `<head>`.
   - *Fix needed in Milestone 2*: Inject Highwire Press tags on paper routes.
5. **R4: Schema.org JSON-LD Structured Data** (`artifacts/api-server/src/app.ts:342-360`):
   - `<script type="application/ld+json">` with `ScholarlyArticle`, `Article`, `Person`, and `BreadcrumbList` is not yet injected.
   - *Fix needed in Milestone 2*: Inject Schema.org JSON-LD structured data blocks.
6. **R5: Author & Domain Hub SSR Routes** (`artifacts/api-server/src/app.ts`):
   - `/authors/:slug` and `/domains/:slug` are not routed through the Express SSR renderer (returns 404 on API server).
   - *Fix needed in Milestone 3*: Add SSR route handlers for `/authors/:slug` and `/domains/:slug`.
7. **R6: IndexNow Notification Endpoints** (`artifacts/api-server/src/routes/`):
   - Server-side IndexNow notification endpoint (`/api/indexnow/notify`) and verification file (`/indexnow-key.txt`) are not yet implemented.
   - *Fix needed in Milestone 4*: Implement IndexNow service and route.
8. **R7: Contributor CTAs & Citation Generator DOM Elements**:
   - Pre-rendered HTML does not yet include server-rendered contributor CTAs and APA/MLA/BibTeX citation blocks.
   - *Fix needed in Milestone 5*: Include CTAs and citation snippets in rendered SSR output.
