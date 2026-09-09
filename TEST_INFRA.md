# Ānvīkṣikī Technical SEO, SSR/Crawler Rendering, and Metadata Engine — Test Infrastructure (TEST_INFRA)

## 1. Executive Summary & Mission
This document outlines the testing architecture, fixture design, test tiers, and execution harness for the **Ānvīkṣikī Technical SEO, SSR/Crawler Rendering, Scholarly Metadata, and Contributor Engine** (Requirements R1 through R7 defined in `ORIGINAL_REQUEST.md`).

The test suite is structured as an **opaque-box end-to-end (E2E) verification suite**. It exercises the public HTTP boundary of the Ānvīkṣikī Express application (`@workspace/api-server`) using `supertest` and `vitest`, treating the application as a black box and validating:
1. Exact HTTP status codes (200, 301, 404, 410) and redirects.
2. Initial server-rendered HTML payloads before client-side hydration (ensuring zero dependency on client JavaScript).
3. Semantic document fidelity (page title, headings, author bylines, visible abstract, body content, and internal links).
4. Metadata integrity (Open Graph, Twitter Cards, Google Scholar Highwire bibliographic tags, canonical URLs, robots directives).
5. Schema.org JSON-LD structured data (`Article`, `ScholarlyArticle`, `Person`, `CollectionPage`, `ItemList`, `BreadcrumbList`).
6. Discovery feeds and crawl control (`/sitemap.xml`, `/robots.txt`, `/api/rss`, IndexNow notifications).
7. Contributor acquisition CTAs and academic citation formatting (APA, MLA, Chicago, BibTeX).

---

## 2. Testing Principles & Integrity Standards
- **Opaque-Box Architecture**: Tests make real HTTP requests via `supertest(app)` and evaluate the raw HTTP headers, status codes, and response text. No internal private functions or hidden state are bypassed.
- **Progressive Testability**: Tests are self-contained and run hermetically in CI and local development without requiring a live PostgreSQL instance. The test harness provides an in-memory query engine mocking `@workspace/db` that evaluates Drizzle ORM query chains against realistic Indic publication datasets while preserving native Drizzle schema tables.
- **Authoritative Expected Output Derivation**:
  - `ORIGINAL_REQUEST.md` (Dated 2026-09-08T06:31:58Z): Primary specification for R1-R7.
  - Highwire Press Tagging Specifications: Authoritative rules for Google Scholar tags (`citation_*`).
  - The Open Graph Protocol (`og:*`, `article:*`): Official specifications for social card preview tags.
  - Schema.org Vocabulary: Official schemas for `ScholarlyArticle`, `Person`, `BreadcrumbList`, and `CollectionPage`.
  - Sitemaps XML Protocol (sitemaps.org 0.9) & RSS 2.0 Specification.
- **Test Integrity**: Zero facade tests. Every test executes genuine assertions against live HTTP output and validates real logic. All implementation defects and gaps are flagged explicitly.

---

## 3. Directory Layout & File Organization
```
csduo-indic/
├── vitest.config.e2e.ts                  # Root Vitest runner configuration for E2E SEO suite
├── test/
│   └── e2e-seo/
│       ├── helpers/
│       │   ├── setup.ts                 # Global test environment setup (DB mock, env vars)
│       │   ├── db-mock.ts               # In-memory Drizzle query builder engine
│       │   ├── mock-db.ts               # Canonical fixture dataset (articles, papers, authors, categories)
│       │   └── html-parser.ts           # Opaque-box HTML/XML extraction and JSON-LD parser
│       ├── tier1-features/
│       │   ├── initial-html-delivery.test.ts   # F1: SSR / Prerender document delivery (R1)
│       │   ├── canonical-urls.test.ts          # F2: Canonical URLs & Route Hygiene (R2)
│       │   ├── opengraph-twitter.test.ts       # F3: Open Graph & Twitter Cards (R3)
│       │   ├── google-scholar.test.ts          # F4: Highwire bibliographic meta tags (R3)
│       │   ├── structured-data.test.ts         # F5: Schema.org JSON-LD structured data (R4)
│       │   ├── sitemap-robots.test.ts          # F6: /sitemap.xml and /robots.txt (R6)
│       │   ├── rss-feed.test.ts                # F7: /api/rss feed generation (R6)
│       │   ├── indexnow.test.ts                # F8: IndexNow URL submission protocol (R6)
│       │   ├── author-hubs.test.ts             # F9: Author Authority Hubs & Linking (R5)
│       │   ├── domain-hubs.test.ts             # F10: Domain Authority Hubs & Linking (R5)
│       │   ├── contributor-ctas.test.ts        # F11: Contributor acquisition CTAs (R7)
│       │   └── citation-generator.test.ts      # F12: Post-publication citations & promotion (R7)
│       ├── tier2-boundaries/
│       │   └── boundary-corner-cases.test.ts   # Empty content, soft-404 prevention, Indic unicode, missing images
│       ├── tier3-cross-feature/
│       │   └── cross-feature-flows.test.ts     # Author -> Publication -> Related -> Citations, publish -> IndexNow -> sitemap
│       └── tier4-crawlers/
│           └── crawler-emulation.test.ts       # Googlebot, Bingbot, Scholar, Twitterbot, Facebook, WhatsApp, LinkedIn
```

---

## 4. Test Tiers & Requirements Mapping

| Tier | Focus | Requirement Target | Minimum Test Cases |
|---|---|---|---|
| **Tier 1** | **Feature Coverage** | R1–R7 (12 Features: HTML delivery, Canonical URLs, OG/Twitter, Scholar tags, JSON-LD, Sitemap, Robots, RSS, IndexNow, Author hubs, Domain hubs, Contributor CTAs, Citation generator) | >=5 test cases per feature (>=60 tests) |
| **Tier 2** | **Boundary & Corner Cases** | Edge cases: empty content, non-existent slugs (soft 404 prevention), malformed parameters, missing hero images (1200x630 fallback), unicode Indic characters (Devanagari/Sanskrit), multiple authors | >=12 comprehensive tests |
| **Tier 3** | **Cross-Feature Interactions** | End-to-end user journeys: author hub -> publication -> related content -> citation generator; publishing event -> IndexNow -> sitemap lastmod -> RSS sync; query stripping while preserving canonicals | >=6 workflow tests |
| **Tier 4** | **Real-world Crawler Emulation** | Bot emulation: Googlebot, Bingbot, Google Scholar scraper, Twitterbot, Facebook scraper, WhatsApp previewer, LinkedInBot | >=7 bot emulation tests |

---

## 5. Execution Commands

### Run Full E2E SEO Test Suite
```bash
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts
```

### Run Specific Test Tier
```bash
# Tier 1 Features
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier1-features/

# Tier 2 Boundary Cases
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier2-boundaries/

# Tier 3 Cross-Feature Interactions
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier3-cross-feature/

# Tier 4 Crawler Emulation
pnpm --filter @workspace/api-server exec vitest run --config ../../vitest.config.e2e.ts test/e2e-seo/tier4-crawlers/
```

### Run with Watch Mode (during development)
```bash
pnpm --filter @workspace/api-server exec vitest --config ../../vitest.config.e2e.ts
```

---

## 6. Fixtures Specification
The test suite utilizes a deterministic, culturally and academically authentic Indic dataset in `test/e2e-seo/helpers/mock-db.ts`:
- **Article 1 (`nyaya-epistemology-pramana-theory`)**: Standard published article with hero image, tags, custom SEO title/description, reading time.
- **Article 2 (`samkhya-purusa-prakrti-सङ्ख्य-दर्शने`)**: Article with complex Devanagari script, Indic diacritics, and missing hero image (evaluating 1200x630 fallback social share cards).
- **Article 3 (`draft-kashmir-shaivism-pratyabhijna`)**: Draft article (evaluating crawl protection, 404/noindex enforcement).
- **Article 4 (`withdrawn-article-on-astronomy`)**: Soft-deleted article (`deletedAt` populated, evaluating 404/410 status).
- **Paper 1 (`kavya-alamkara-computational-poetics`)**: Scholarly research paper with multiple authors (`Dr. Ananya Sharma`, `Prof. Raghavan Sastri`), DOI, PDF manuscript URL, peer-reviewed flag, abstract, and highwire citation metadata.
- **Paper 2 (`sulba-sutras-geometric-algebra`)**: Scholarly paper without cover image, testing fallback card and single author.
- **Authors (`arya-ambadi`, `ananya-sharma`)**: Author profiles with academic affiliation, bio, avatar, and linked publications.
- **Domains (`philosophy`, `darshana`, `linguistics`, `mathematics`)**: Categories with curated descriptions, icons, and publication indices.
