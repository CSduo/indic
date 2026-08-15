# E2E Test Specification Report: Requirement 2 (Article & Paper Editing Flow)

**Track**: E2E Testing Track — Requirement 2 (R2)  
**Target System**: Ānvīkṣikī Open Journal & Research Platform  
**Mining Agent**: `e2e_spec_miner_2`  
**Date**: 2026-08-15  
**Working Directory**: `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo\.agents\e2e_spec_miner_2`

---

## 1. Executive Summary & Scope

Requirement 2 mandates an audit and end-to-end specification for the complete article and paper editing pipeline across Ānvīkṣikī (`/account/edit/:slug`, `/account`, `/articles/:slug`, `/papers/:slug`, `/submit/write?draftId=:id`, `/admin/articles`, `/admin/papers`).

The system supports two distinct editing personas and pathways:
1. **Author / User Editing Pathway**:
   - **Published Article Editing**: Authors modify their published articles directly via UI route `/account/edit/:slug` and API `PATCH /api/articles/:slug/edit`.
   - **Draft & Revision Editing**: Authors edit drafts and revision requests via UI `/submit/write?draftId=:id` and API `PUT /api/submissions/:id`.
   - **Trash & Lifecycle Management**: Authors manage publication visibility (soft-delete / hide from journal, restore from trash, permanently erase) via `/api/submissions/:id`.
   - **Rich Media Insertion**: Inline image and voice note recording/upload via `POST /api/media/upload`, DOCX/TXT document import via `POST /api/media/extract-doc`, and Google Docs extraction via `POST /api/extract-url`.
2. **Editorial / Admin Pathway**:
   - **Admin Article Update**: `PATCH /api/admin/articles/:id` allows Editors/Admins to update all article metadata, status, SEO, tags, and takeaways.
   - **Admin Paper Update**: `PATCH /api/admin/papers/:id` allows Editors/Admins to update research paper metadata, DOI, peer-review flag, citation text, and PDF attachments.
   - **Editorial Status & Publishing**: `PATCH /api/admin/submissions/:id` links submissions to public journal articles/papers with atomic rollback safety.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Article Edit (User) | `PATCH /api/articles/:slug/edit` | Author updates title, authorName, category, excerpt, body, and hero image for published article | URL param `slug`, JSON `{ title?, authorName?, categorySlug?, excerpt?, body?, heroImageUrl? }`, `user_session` cookie | `200 OK` `{ success: true, article: { ... } }` | `401 Unauthorized` (no auth), `404 Not found` (slug/status invalid), `400 Bad Request` (Zod validation fail) | `artifacts/api-server/src/routes/articles.ts:240` |
| 2 | Article Query (Public) | `GET /api/articles/:slug` | Fetches live published article by slug or ID with author metadata, calculated stats, and sanitized body | URL param `slug` | `200 OK` `{ article: { id, slug, title, body, authorName, readingMinutes, wordCount, lineCount, authorAvatarUrl, ... }, category: { ... } }` | `404 Article not found` (missing, trashed, or draft) | `artifacts/api-server/src/routes/articles.ts:147` |
| 3 | Paper Query (Public) | `GET /api/papers/:slug` | Fetches live published paper by slug with metadata, PDF URL, and sanitized body | URL param `slug` | `200 OK` `{ paper: { id, slug, title, abstract, body, categorySlug, tags, authorName, pdfUrl, coverImageUrl, citationText, peerReviewed, paperType, year, doi, ... }, category: { ... } }` | `404 Paper not found` (missing, trashed, or draft) | `artifacts/api-server/src/routes/papers.ts:118` |
| 4 | Article List (Public) | `GET /api/articles` | Lists published articles with search and category filtering | Query params: `category`, `featured`, `q`, `limit`, `offset`, `includeBody` | `200 OK` `{ articles: [...], total, limit, offset }` + Cache-Control headers | `500 Failed to fetch articles` | `artifacts/api-server/src/routes/articles.ts:32` |
| 5 | Paper List (Public) | `GET /api/papers` | Lists published papers with filtering and pagination | Query params: `category`, `peerReviewed`, `q`, `limit`, `offset`, `includeBody` | `200 OK` `{ papers: [...], total, limit, offset }` + Cache-Control headers | `500 Failed` | `artifacts/api-server/src/routes/papers.ts:12` |
| 6 | Draft Edit (User) | `PUT /api/submissions/:id` | Author updates a draft submission or submits a saved draft for review | URL param `id`, JSON `{ type?, submitterName?, submitterEmail?, title?, domain?, abstract?, body?, notes?, consent?, status?, audioUrl?, coverImageUrl? }`, `user_session` cookie | `200 OK` `{ success: true, submission: { ... }, publication: null }` | `401 Unauthorized`, `403 Forbidden` (not owner/admin or non-editable status), `404 Not found`, `409 Conflict` (trashed), `400 Bad Request` (missing submit fields / unresolved images) | `artifacts/api-server/src/routes/submissions.ts:870` |
| 7 | User Works Query | `GET /api/submissions` | Returns author's active submissions + authored articles/papers enriched with live slugs | Query param: `?trashed=true` (optional), `user_session` cookie | `200 OK` `{ submissions: [ { id, title, slug, type, itemType, status, ... } ] }` | `401 Unauthorized` | `artifacts/api-server/src/routes/submissions.ts:634` |
| 8 | Submission Query by ID | `GET /api/submissions/:id` | Fetches single submission, or virtual article `art-:id`, or virtual paper `paper-:id` | URL param `id`, `user_session` cookie | `200 OK` `{ submission: { id, title, body, status, slug, ... } }` | `401 Unauthorized`, `403 Forbidden` (not owner/admin), `404 Not found` | `artifacts/api-server/src/routes/submissions.ts:788` |
| 9 | Soft-Delete / Trash | `DELETE /api/submissions/:id` | Moves active submission, published article (`art-:id`), or published paper (`paper-:id`) to Trash | URL param `id`, `user_session` cookie | `200 OK` `{ success: true, submission: { ... } }` | `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `409 Conflict` (already in Trash) | `artifacts/api-server/src/routes/submissions.ts:969` |
| 10 | Restore from Trash | `POST /api/submissions/:id/restore` | Restores soft-deleted item from Trash back to active/published status | URL param `id`, `user_session` cookie | `200 OK` `{ success: true, submission: { ... } }` | `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `409 Conflict` (not in Trash) | `artifacts/api-server/src/routes/submissions.ts:1046` |
| 11 | Permanent Delete | `DELETE /api/submissions/:id/permanent` | Permanently deletes item from DB (requires item to be in Trash first) | URL param `id`, `user_session` cookie | `200 OK` `{ success: true }` | `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `409 Conflict` (must be in Trash first or linked items exist) | `artifacts/api-server/src/routes/submissions.ts:1120` |
| 12 | Media Upload | `POST /api/media/upload` | Uploads cover image, inline image, voice note, or PDF with signature validation & multi-tier storage fallback | Multipart form: `file`, `context` (`"article_inline" \| "submission_cover" \| "voice_note" \| "paper_pdf" \| "avatar"`), cookie | `201 Created` `{ success: true, url, mediaAsset: { ... } }` | `401 Unauthorized`, `400 Bad Request` (invalid context/signature/MIME), `413 Payload Too Large` (>10MB image, >30MB audio, >50MB PDF) | `artifacts/api-server/src/routes/media.ts:121` |
| 13 | Document Extraction | `POST /api/media/extract-doc` | Extracts text and embedded images from DOCX or plain TXT into clean sanitized HTML | Multipart form: `file` (.docx or .txt up to 50MB), cookie | `200 OK` `{ html: string }` | `401 Unauthorized`, `400 Bad Request` (invalid signature/binary TXT), `502 Bad Gateway` (embedded image failure) | `artifacts/api-server/src/routes/media.ts:273` |
| 14 | Google Doc Import | `POST /api/extract-url` | Extracts semantic HTML, headings, styling, and embedded images from public Google Docs link | JSON `{ url: string }`, cookie | `200 OK` `{ html, title?, excerpt?, coverImageUrl? }` | `400 Bad Request` (invalid URL/private doc), `502 Bad Gateway` | `artifacts/api-server/src/routes/extract-url.ts` |
| 15 | Admin Article Edit | `PATCH /api/admin/articles/:id` | Admin/Editor updates any field on an article (slug, title, subtitle, excerpt, body, tags, takeaways, SEO, audio, hero image, status) | URL param `id`, JSON with partial Article schema, `admin_session` cookie | `200 OK` `{ article: { ... } }` | `401 Unauthorized`, `403 Forbidden` (non-admin role), `404 Not found`, `400 Bad Request` | `artifacts/api-server/src/routes/admin.ts:258` |
| 16 | Admin Paper Edit | `PATCH /api/admin/papers/:id` | Admin/Editor updates any field on a paper (slug, title, abstract, body, discipline, tags, PDF URL, cover, citation, peer-reviewed, year, DOI, status) | URL param `id`, JSON with partial Paper schema, `admin_session` cookie | `200 OK` `{ paper: { ... } }` | `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `400 Bad Request` | `artifacts/api-server/src/routes/admin.ts:394` |
| 17 | Admin Submission Status & Publish | `PATCH /api/admin/submissions/:id` | Admin changes submission editorial status; setting `PUBLISHED` triggers atomic public publication link | URL param `id`, JSON `{ status, editorNotes?, priority?, categorySlug?, domain? }`, `admin_session` cookie | `200 OK` `{ submission: { ... }, publication?: { ... } }` | `401 Unauthorized`, `404 Not found`, `409 Conflict` (trashed), `502 Bad Gateway` (publication creation failed -> automatic rollback) | `artifacts/api-server/src/routes/admin.ts:505` |
| 18 | Admin Trash & Restore | `DELETE /api/admin/articles/:id`, `POST /api/admin/articles/:id/restore`, `DELETE /api/admin/articles/:id/permanent` | Admin soft-deletes, restores, or permanently destroys article records | URL param `id`, `admin_session` cookie | `200 OK` `{ success: true, article?: { ... } }` | `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `409 Conflict` | `artifacts/api-server/src/routes/admin.ts:281` |
| 19 | Admin Paper Trash & Restore | `DELETE /api/admin/papers/:id`, `POST /api/admin/papers/:id/restore`, `DELETE /api/admin/papers/:id/permanent` | Admin soft-deletes, restores, or permanently destroys paper records | URL param `id`, `admin_session` cookie | `200 OK` `{ success: true, paper?: { ... } }` | `401 Unauthorized`, `403 Forbidden`, `404 Not found`, `409 Conflict` | `artifacts/api-server/src/routes/admin.ts:417` |
| 20 | Synchronize Live Submissions | `GET /api/sync-live-publications` | Reconciles all live accepted/published submissions and ensures public article/paper existence | None | `200 OK` `{ success: true, count, articles: [...] }` | `500 Server error` | `artifacts/api-server/src/routes/articles.ts:13` |

---

## 3. Detailed Field Schemas & Persistence Specifications

### 3.1 Article Schema (User Edit vs Admin Edit vs Database Model)

| Field Name | User Edit (`PATCH /api/articles/:slug/edit`) | Admin Edit (`PATCH /api/admin/articles/:id`) | DB Column (`articles`) | Validation & Constraints | Notes |
|---|---|---|---|---|---|
| `id` | Read-only | Read-only | `id` (text UUID PK) | UUID v4 | Primary Key |
| `slug` | Fixed (in URL) | Editable | `slug` (varchar 500 unique) | Max 500 chars, alphanumeric with dashes | Unique index |
| `title` | Editable (optional in PATCH) | Editable | `title` (text) | Min 1, Max 500 chars (trimmed) | Required non-empty |
| `subtitle` | Not exposed in user form | Editable | `subtitle` (text) | Max 1,000 chars | Displayed below title |
| `excerpt` | Editable | Editable | `excerpt` (text) | Max 5,000 chars | Used as Abstract summary |
| `body` | Editable | Editable | `body` (text) | Max 500,000 chars, sanitized via `sanitizeArticleBody` | Full HTML rich text |
| `categorySlug` | Editable | Editable | `category_slug` (varchar 100 FK) | Min 1, Max 100 chars, references `categories.slug` | Normalized via `normalizeCategorySlug` |
| `tags` | Not in user form | Editable | `tags` (text[]) | Max 30 strings, each 1-80 chars | Text array |
| `authorName` | Editable | Editable | `author_name` (text) | Min 1, Max 160 chars (user) / 200 (admin) | Resolves to User profile |
| `heroImageUrl` | Editable | Editable | `hero_image_url` (text) | Max 2,000 chars, URL or null | Compulsory in frontend form |
| `heroImageAlt` | Not in user form | Editable | `hero_image_alt` (text) | Max 500 chars | Accessibility alt text |
| `keyTakeaways` | Not in user form | Editable | `key_takeaways` (text[]) | Max 20 strings, each max 1,000 chars | Array of highlights |
| `references` | Read-only JSON | Read-only JSON | `references` (jsonb) | Valid JSON array | Default `[]` |
| `seoTitle` | Not in user form | Editable | `seo_title` (text) | Max 200 chars | SEO meta tag |
| `seoDescription` | Not in user form | Editable | `seo_description` (text) | Max 500 chars | SEO meta description |
| `audioUrl` | Preserved if untouched | Editable | `audio_url` (text) | Max 2,000 chars, URL or null | Embedded audio voice note player |
| `status` | Fixed `PUBLISHED` | Editable | `status` (content_status enum) | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Indexed |
| `featured` | Not in user form | Editable | `featured` (boolean) | `true` or `false` | Featured on homepage |
| `publishedAt` | Preserved | Editable | `published_at` (timestamp) | ISO 8601 string -> Timestamp | Indexed |
| `deletedAt` | Managed by DELETE | Managed by DELETE | `deleted_at` (timestamp) | Nullable timestamp | Soft-delete marker |
| `sourceSubmissionId`| Internal link | Internal link | `source_submission_id` (text FK) | References `submissions.id` | Unique index |
| `updatedAt` | Auto-set to `now()` | Auto-set to `now()` | `updated_at` (timestamp) | Timestamp | Updated on every edit |

### 3.2 Paper Schema (Admin Edit vs Database Model)

| Field Name | Admin Edit (`PATCH /api/admin/papers/:id`) | DB Column (`papers`) | Validation & Constraints | Notes |
|---|---|---|---|---|
| `id` | Read-only | `id` (text UUID PK) | UUID v4 | Primary Key |
| `slug` | Editable | `slug` (varchar 500 unique) | Max 500 chars, slug format | Unique index |
| `title` | Editable | `title` (text) | Min 1, Max 500 chars | Paper headline |
| `abstract` | Editable | `abstract` (text) | Max 10,000 chars | Research abstract |
| `body` | Editable | `body` (text) | Max 500,000 chars, sanitized | Optional full text |
| `categorySlug` | Editable | `category_slug` (varchar 100 FK) | Min 1, Max 100 chars, references `categories.slug` | Discipline slug |
| `tags` | Editable | `tags` (text[]) | Max 30 strings, each 1-80 chars | Keyword tags |
| `authorName` | Editable | `author_name` (text) | Max 200 chars | Authors & affiliations |
| `readingMinutes` | Computed | `reading_minutes` (integer) | Integer >= 1 | Computed from word count |
| `pdfUrl` | Editable | `pdf_url` (text) | Max 2,000 chars, URL or null | Attached PDF download / viewer |
| `coverImageUrl` | Editable | `cover_image_url` (text) | Max 2,000 chars, URL or null | Paper header card image |
| `citationText` | Editable | `citation_text` (text) | Max 5,000 chars | Formatted citation / BibTeX source |
| `references` | Read-only JSON | `references` (jsonb) | Valid JSON array | Default `[]` |
| `peerReviewed` | Editable | `peer_reviewed` (boolean) | `true` or `false` | Peer review badge |
| `paperType` | Editable | `paper_type` (paper_type enum) | `"RESEARCH_PAPER" \| "WORKING_PAPER" \| "REVIEW_ESSAY" \| "MONOGRAPH" \| "TRANSLATION" \| "ARCHIVAL_NOTE"` | Paper classification |
| `year` | Editable | `year` (integer) | 1900 - 2100 | Publication year |
| `doi` | Editable | `doi` (text) | Max 255 chars | Digital Object Identifier |
| `seoTitle` | Editable | `seo_title` (text) | Max 200 chars | SEO meta title |
| `seoDescription` | Editable | `seo_description` (text) | Max 500 chars | SEO meta description |
| `status` | Editable | `status` (content_status enum) | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Indexed |
| `publishedAt` | Editable | `published_at` (timestamp) | ISO string -> Timestamp | Public display timestamp |
| `deletedAt` | Managed by DELETE | `deleted_at` (timestamp) | Nullable timestamp | Soft-delete marker |
| `sourceSubmissionId`| Internal link | `source_submission_id` (text FK) | References `submissions.id` | Unique index |
| `updatedAt` | Auto-set to `now()` | `updated_at` (timestamp) | Timestamp | Updated on every edit |

---

## 4. Immediate Live Update & Cache Invalidation Specifications

1. **Transactional Database Write**:
   - `PATCH /api/articles/:slug/edit` and `PATCH /api/admin/articles/:id` write directly to PostgreSQL with `RETURNING ...`.
   - `updatedAt` is updated synchronously on the DB record.
2. **Frontend Cache Synchronization**:
   - `EditArticlePage` triggers `window.dispatchEvent(new Event("anv:content-changed"))` upon HTTP 200.
   - User is redirected to `/articles/:slug`.
   - `ArticlePage` runs a fresh `fetch(`${base()}/api/articles/${slug}`, { signal })`, replaces `sessionStorage.getItem('anv_article_' + slug)` and updates the React state.
3. **Public Route Cache Headers**:
   - Public GET endpoints (`/api/articles` and `/api/papers`) send `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`.
   - Direct slug lookups (`/api/articles/:slug` and `/api/papers/:slug`) return fresh database state without aggressive caching headers.
4. **Slug Matching Resilience**:
   - `/api/articles/:slug` handles exact slug, exact UUID `id`, clean base slug (stripped of `-[a-f0-9]{4,8}` hash), and prefix match `cleanSlug%`.
5. **OpenGraph SSR Social Previews**:
   - Direct server route `GET /articles/:slug` and `GET /papers/:slug` queries DB on the fly and injects dynamic OpenGraph meta tags (`og:title`, `og:description`, `og:image`, `canonicalUrl`) directly into HTML before sending to social crawlers (WhatsApp, X/Twitter, LinkedIn, Telegram).

---

## 5. Rich Text & Serialization Specifications

1. **HTML Sanitization Whitelist (`sanitizeArticleBody`)**:
   - **Allowed Tags**: `p`, `br`, `hr`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `strong`, `b`, `em`, `i`, `u`, `s`, `mark`, `small`, `span`, `blockquote`, `ul`, `ol`, `li`, `a`, `img`, `figure`, `figcaption`, `pre`, `code`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `audio`, `source`, `sup`, `sub`.
   - **Disallowed & Stripped Tags**: `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<meta>`, `<link>`, `<form>`, `<input>`, `<button>`.
   - **Stripped Attributes**: All `on*` event handlers (`onclick`, `onerror`, `onload`), `style` attributes on unwhitelisted tags.
   - **Allowed Protocols**: `http`, `https`, `mailto`, `tel` only (`javascript:` and `vbscript:` are strictly blocked).
2. **Automatic Tag Transformations**:
   - `<a>`: External links get `target="_blank"` and `rel="noopener noreferrer"`.
   - `<img>`: Injected with `loading="lazy"` and `decoding="async"`. Images missing `src` attribute are dropped.
   - `<audio>`: Injected with `controls="controls"` and `preload="metadata"`.
3. **Inline Image Format & Storage**:
   - Rendered as `<figure style="..."><img src="https://..." alt="..." /></figure><p><br></p>`.
   - Image source MUST be an absolute HTTPS URL (from Vercel Blob or Cloudinary) or relative `/api/uploads/...` URL. Raw Base64 data URIs or temporary blob URLs are rejected before database save (`code: "UNRESOLVED_ARTICLE_IMAGES"`).
4. **Inline Audio / Voice Notes**:
   - Rendered as `<audio src="https://..." controls class="article-body-audio" style="..." data-vn-id="..."></audio><p><br></p>`.

---

## 6. Edge Cases & Validation Matrix

| # | Scenario / Feature | Input Condition | Expected Status Code | Expected Response / Behavior |
|---|---|---|---|---|
| 1 | Article Edit without Auth | `PATCH /api/articles/my-slug/edit` without `user_session` cookie | `401 Unauthorized` | `{ error: "You must be logged in to edit" }` |
| 2 | Article Edit Non-Existent Slug | `PATCH /api/articles/non-existent-slug-xyz/edit` with valid auth | `404 Not Found` | `{ error: "Article not found" }` |
| 3 | Article Edit Trashed Record | `PATCH /api/articles/trashed-slug/edit` (where `deletedAt IS NOT NULL`) | `404 Not Found` | Trashed articles are hidden from user edit |
| 4 | Article Edit Empty Title | `PATCH /api/articles/my-slug/edit` with `{ "title": "   " }` | `400 Bad Request` | `{ error: "Invalid input", details: { fieldErrors: { title: [...] } } }` |
| 5 | Article Edit Oversized Title | `PATCH /api/articles/my-slug/edit` with `title` > 500 characters | `400 Bad Request` | Zod validation error on max length |
| 6 | Article Edit Oversized Body | `PATCH /api/articles/my-slug/edit` with `body` > 500,000 characters | `400 Bad Request` | Zod validation error on max length |
| 7 | Article Edit XSS Injection | `PATCH /api/articles/my-slug/edit` with `body: "<script>alert(1)</script><p>Clean text</p><img src=x onerror=alert(2)>"` | `200 OK` | Body is sanitized to `<p>Clean text</p>` without scripts or onerror attributes |
| 8 | Article Edit Hero Image Nulling | `PATCH /api/articles/my-slug/edit` with `{ "heroImageUrl": "" }` | `200 OK` | `heroImageUrl` is persisted as `null` in DB |
| 9 | Draft Edit Non-Owner | `PUT /api/submissions/:id` where `existing.userId != auth.userId` and user is not admin | `403 Forbidden` | `{ error: "Forbidden" }` |
| 10 | Draft Edit Locked Status | `PUT /api/submissions/:id` on submission with status `ACCEPTED` or `UNDER_REVIEW` | `403 Forbidden` | `{ error: "This submission can no longer be edited" }` |
| 11 | Draft Edit Trashed Submission | `PUT /api/submissions/:id` where `deletedAt IS NOT NULL` | `409 Conflict` | `{ error: "Restore this submission before editing it" }` |
| 12 | Draft Edit Unresolved Images | `PUT /api/submissions/:id` with `body` containing unpersisted `data:image/...` | `400 Bad Request` | `{ error: "... embedded images are not stored...", code: "UNRESOLVED_ARTICLE_IMAGES" }` |
| 13 | Draft Submission Missing Fields | `PUT /api/submissions/:id` with `status: "RECEIVED"` but missing `abstract` or `body` | `400 Bad Request` | `{ error: "Abstract is required to submit" }` or `{ error: "Essay body is required to submit" }` |
| 14 | Media Upload Invalid File Type | `POST /api/media/upload` with `.exe` or `.bat` file | `400 Bad Request` | `{ error: "Unsupported file type..." }` |
| 15 | Media Upload Spoofed Mime/Ext | `POST /api/media/upload` with text file renamed to `.jpg` (fails signature check) | `400 Bad Request` | `{ error: "Uploaded file content does not match its extension" }` |
| 16 | Media Upload Oversized Image | `POST /api/media/upload` with image > 10 MB | `413 Payload Too Large` | `{ error: "Image files must be 10 MB or smaller" }` |
| 17 | Media Upload Oversized Audio | `POST /api/media/upload` with audio file > 30 MB | `413 Payload Too Large` | `{ error: "Audio files must be 30 MB or smaller" }` |
| 18 | Media Upload Oversized PDF | `POST /api/media/upload` with PDF file > 50 MB | `413 Payload Too Large` | `{ error: "PDF files must be 50 MB or smaller" }` |
| 19 | Admin Edit without Admin Role | `PATCH /api/admin/articles/:id` with standard user cookie | `401 Unauthorized` / `403 Forbidden` | `{ error: "Unauthorized" }` or `{ error: "Insufficient permissions" }` |
| 20 | Admin Paper Edit Invalid Discipline | `PATCH /api/admin/papers/:id` with `categorySlug: ""` | `400 Bad Request` | `{ error: "Invalid input" }` |
| 21 | Admin Paper Edit Year Bounds | `PATCH /api/admin/papers/:id` with `year: 2026` | `200 OK` | `year` persisted as integer 2026 |
| 22 | Admin Paper Edit DOI | `PATCH /api/admin/papers/:id` with `doi: "10.1000/182"` | `200 OK` | `doi` persisted and rendered as DOI badge link |
| 23 | Permanent Delete Active Item | `DELETE /api/submissions/:id/permanent` without moving to Trash first | `409 Conflict` | `{ error: "Move this work to Trash before permanently deleting it" }` |
| 24 | Soft Delete with Linked Article | `DELETE /api/admin/submissions/:id` while linked active article exists | `409 Conflict` | `{ error: "Move the linked public article or paper to Trash before deleting this submission" }` |
| 25 | Publishing Failure Rollback | `PATCH /api/admin/submissions/:id` with `status: "PUBLISHED"` when DB publication fails | `502 Bad Gateway` | `{ error: "... could not be published...", code: "PUBLICATION_FAILED" }` (Submission status rolled back to previous state) |

---

## 7. Concrete Verification Methods & Test Plans

### 7.1 Automated End-to-End Verification Test Script

A full test suite verifying R2 must execute the following sequential scenarios:

```typescript
// Scenario 1: User Edit of Published Article
// 1. Authenticate as author (POST /api/auth/login -> get user_session)
// 2. Fetch existing published article (GET /api/articles/:slug)
// 3. Edit title, authorName, excerpt, and rich text body (PATCH /api/articles/:slug/edit)
// 4. Verify HTTP 200 and updated fields returned
// 5. Query live view (GET /api/articles/:slug) and verify updated title, body, and excerpt appear immediately

// Scenario 2: Inline Media & Rich Text Handling
// 1. Upload inline image (POST /api/media/upload with context="article_inline") -> get URL
// 2. Upload voice note (POST /api/media/upload with context="voice_note") -> get URL
// 3. Update article body with embedded <figure><img src="..."> and <audio src="...">
// 4. Verify XSS injection attempt (<script>alert(1)</script>) is stripped by sanitizer
// 5. Verify live GET /api/articles/:slug renders <img loading="lazy"> and <audio controls>

// Scenario 3: Draft Editing & State Transitions
// 1. Create a draft submission (POST /api/submissions/write with status="DRAFT") -> get submission ID
// 2. Update draft fields (PUT /api/submissions/:id with updated body and abstract) -> verify HTTP 200
// 3. Attempt update with unpersisted base64 image -> verify HTTP 400 (UNRESOLVED_ARTICLE_IMAGES)
// 4. Submit draft for review (PUT /api/submissions/:id with status="RECEIVED", consent=true) -> verify HTTP 200

// Scenario 4: Admin Paper Editing Flow
// 1. Authenticate as admin (POST /api/admin/login -> get admin_session)
// 2. Update research paper (PATCH /api/admin/papers/:id with DOI, peerReviewed=true, year=2026, abstract, citationText)
// 3. Query public paper (GET /api/papers/:slug) and verify all metadata fields reflect accurately

// Scenario 5: Trash Lifecycle & Invalidation
// 1. Move article/submission to Trash (DELETE /api/submissions/:id)
// 2. Verify GET /api/articles/:slug returns HTTP 404 (immediately hidden from live site)
// 3. Restore article from Trash (POST /api/submissions/:id/restore)
// 4. Verify GET /api/articles/:slug returns HTTP 200 (immediately restored on live site)
```

### 7.2 Independent Verification Commands
- Run project typecheck: `pnpm run typecheck`
- Run API unit & security tests: `pnpm --filter @workspace/api-server test`
- Build workspace: `pnpm run build`
