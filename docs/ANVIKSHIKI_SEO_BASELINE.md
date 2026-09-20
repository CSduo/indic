# Ānvīkṣikī — Google Search Console Baseline & SEO Audit Record

- **Date Recorded**: September 18, 2026
- **GSC Property**: `sc-domain:anvikshikijournal.in`
- **Primary Production Host**: `https://anvikshikijournal.in/`
- **Framework & Deployment**: React (Vite) SPA + SSR Prerenderer on Vercel Node.js Functions (`sin1`)
- **Master Strategy Document**: `ANVIKSHIKI_SEO_SCHOLAR_DISCOVERY_MASTER.md`

---

## 1. 28-Day Search Performance Baseline

### Current Finalized Window (2026-08-19 to 2026-09-15)
- **Total Clicks**: 7
- **Total Impressions**: 99
- **Average CTR**: ~7.07%
- **Average Position**: ~19.57

### Previous Comparison Window (2026-07-22 to 2026-08-18)
- **Total Clicks**: 7
- **Total Impressions**: 111
- **Average CTR**: ~6.31%
- **Average Position**: ~13.65

---

## 2. Live Query Signals & Demand Analysis

| Query Phrase | Impressions | Clicks | Avg. Position | Trend & Strategic Intent |
| :--- | :--- | :--- | :--- | :--- |
| `anvikshiki` | 9 | 4 | ~17.2 | Core Brand / Journal entity recognition |
| `anvikshiki meaning` | 9 | 2 | ~35.9 | **Rising 3x (from 3 to 9)**. Primary etymology & philosophy query |
| `anvikshiki meaning in english`| 2 | 0 | ~42.1 | Rising transliteration / definition intent |
| `anvikshiki publishers` | 1 | 0 | ~24.0 | Publishing / institution discovery |
| `ānvīkṣikī` (IAST) | 1 | 1 | ~9.0 | High-intent scholarly Sanskrit search |
| Spelling variants (`aanvikshiki`, `anvikshi`, `anvikshaya`) | 3 | 0 | ~31.0 | Unnormalized brand discovery |

---

## 3. Top Pages Performance & Cannibalization Analysis

| Destination URL | Impressions | Clicks | CTR | Avg. Position | Intent Alignment / Issue |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `https://anvikshikijournal.in/` (Homepage) | 77 | 7 | 9.1% | ~15.2 | Captures brand entity queries; healthy CTR |
| `https://anvikshikijournal.in/browse` | 51 | 2 | 3.9% | ~19.2 | **Cannibalizing homepage & meaning queries** (`anvikshiki`, `anvikshiki meaning`) |
| `/articles/beyond-angkor-why-is-vietnam-frequently-excluded` | 3 | 0 | 0.0% | ~27.3 | Individual scholarly article beginning discovery; needs topical keyword alignment |

### Critical Diagnosis: Semantic Cannibalization & Structural Gaps
1. **Browse vs Homepage Cannibalization**: `/browse` was ranking for general journal name and meaning queries because its copy previously included generic definitions of Ānvīkṣikī. `/browse` must be refocused purely on **publication discovery, archive browsing, disciplines, and author archives**.
2. **Missing Canonical Meaning Destination**: Despite rising demand for `anvikshiki meaning` and `anvikshiki meaning in english`, the platform had no dedicated canonical URL answering this inquiry. A dedicated canonical hub `/about/anvikshiki` is required to claim rank #1 for these searches.
3. **Article Discovery Deficit**: Individual articles had impressions but low click-through because:
   - Articles lacked Highwire-style Google Scholar citation tags (`citation_title`, `citation_author`, `citation_publication_date`, `citation_journal_title`).
   - Articles lacked article-specific `<meta name="keywords">`.
   - Googlebot relied on two-hop sitemap index crawling rather than direct canonical `<urlset>` access.

---

## 4. Remediation Architecture & Target Milestones

| Architecture Layer | Current State | Target State |
| :--- | :--- | :--- |
| **Meaning Intent** | Generic mentions on Home & Browse | Dedicated canonical `/about/anvikshiki` with DefinedTerm JSON-LD & full Sanskrit etymology |
| **Browse Intent** | Competes for brand queries | Refocused on publication index, filtering, author directory, and disciplinary archives |
| **Google Scholar** | Only papers emitted `citation_*` (articles emitted 0 tags) | Both articles and papers emit complete RFC-compliant Highwire citation tags |
| **Article SEO** | Generic fallback keywords | Enriched topical keywords per publication (e.g. Champa, Mỹ Sơn, SE Asian Hinduism) |
| **Sitemap** | Two-hop `<sitemapindex>` showing 0 discovered pages in GSC | Direct dynamic `<urlset>` serving 52+ canonical URLs directly at `/sitemap.xml` |
| **Feeds** | `/rss.xml` returned 404 | Dedicated `/rss.xml`, `/feed`, and `/api/rss` returning valid RSS 2.0 with full CDATA |
| **IndexNow** | Unimplemented | Secure host-restricted endpoint (`/api/indexnow/notify`) & verification file (`/indexnow-key.txt`) |
| **Citation Tools** | Plain text copy only | Multi-format academic generator (APA, MLA, Chicago, BibTeX, Harvard) |
