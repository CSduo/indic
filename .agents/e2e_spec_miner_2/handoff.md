# Handoff Report: E2E Specification Mining for Requirement 2 (Article & Paper Editing Flow)

**Author Agent**: `e2e_spec_miner_2`  
**Recipient**: `e2e_test_orch` (parent conversation `045df525-5a67-48dc-9335-2d1d7e75b1f9`)  
**Timestamp**: 2026-08-15T06:58:00Z  
**Type**: Hard Handoff (Task Complete)  

---

## 1. Observation

1. **User Article Editing Route (`artifacts/api-server/src/routes/articles.ts:240`)**:
   - `PATCH /api/articles/:slug/edit`: Author/user updates their published article.
   - Requires user authentication (`getUserAuth(req)`), matching `articlesTable.slug` with `status = 'PUBLISHED'` and `isNull(articlesTable.deletedAt)`.
   - Accepts Zod payload: `title` (1-500 chars), `authorName` (1-160 chars), `categorySlug` (1-100 chars), `excerpt` (max 5,000 chars), `body` (max 500,000 chars sanitized via `sanitizeArticleBody`), `heroImageUrl` (max 2,000 chars, empty string or null).
   - Writes directly to database returning updated article fields and sets `updatedAt = new Date()`.

2. **Public Article and Paper Query Routes (`artifacts/api-server/src/routes/articles.ts:147`, `papers.ts:118`)**:
   - `GET /api/articles/:slug`: Queries article by ID, slug, or cleanSlug prefix; computes `readingMinutes`, `wordCount`, `lineCount`; retrieves author profile from `usersTable`; sanitizes HTML body and recovers legacy images. Returns 404 if missing, draft, or trashed (`deletedAt IS NOT NULL`).
   - `GET /api/papers/:slug`: Queries paper by slug; returns sanitized body, DOI, PDF URL, citation text, and discipline category.

3. **User Draft & Submission Editing Route (`artifacts/api-server/src/routes/submissions.ts:870`)**:
   - `PUT /api/submissions/:id`: Updates drafts (`status = 'DRAFT'`) or resubmits for review (`status = 'RECEIVED'`).
   - Restricts editing to editable statuses (`DRAFT`, `RECEIVED`, `REVISION_REQUESTED`) and owner/admin identities.
   - Enforces `countUnresolvedArticleImages(data.body) === 0`, preventing unsaved base64 data URIs from corrupting the database.

4. **Admin Article and Paper Editing Routes (`artifacts/api-server/src/routes/admin.ts:258`, `admin.ts:394`, `admin.ts:505`)**:
   - `PATCH /api/admin/articles/:id`: Full administrative editing of articles (slug, title, subtitle, tags, takeaways, SEO, hero image, audio URL, status, publishedAt).
   - `PATCH /api/admin/papers/:id`: Full administrative editing of papers (slug, title, abstract, body, tags, PDF URL, cover, citation, peerReviewed, paperType, year, DOI, status).
   - `PATCH /api/admin/submissions/:id`: Status change to `PUBLISHED` triggers `ensurePublicPublicationForSubmission`, creating/updating linked public articles or papers with foreign key `sourceSubmissionId` and automated rollback on failure (`502 Bad Gateway`).

5. **Media Asset Handling (`artifacts/api-server/src/routes/media.ts:121`, `media.ts:273`)**:
   - `POST /api/media/upload`: Validates MIME types, magic file signatures, and payload size bounds (images <= 10MB, audio <= 30MB, PDF <= 50MB) with multi-tier storage fallback (Vercel Blob -> Cloudinary -> Local disk -> Base64 data URI).
   - `POST /api/media/extract-doc`: Extracts DOCX/TXT document text and embedded images into sanitized HTML.

6. **Frontend UI Editing Interfaces (`artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx`, `account/page.tsx`, `articles/[slug]/page.tsx`, `papers/[slug]/page.tsx`)**:
   - `EditArticlePage` at `/account/edit/:slug` loads article, provides full rich-text toolbar (formatting, headings, font family, inline image upload, voice note recording), and dispatches `anv:content-changed` event upon saving.
   - `ArticlePage` at `/articles/:slug` immediately refreshes data via `GET /api/articles/:slug` on route entry.

---

## 2. Logic Chain

1. **Opaque-Box E2E Test Strategy**:
   - An opaque-box test treats the running system as a black box, verifying only external HTTP requests, status codes, payload shapes, database persistence, and UI reflections.
2. **Identification of Testing Personas**:
   - **Regular User (Scholar / Author)**: Interacts with `/api/auth/login`, `GET /api/submissions`, `GET /account/edit/:slug`, `PATCH /api/articles/:slug/edit`, `PUT /api/submissions/:id`, `POST /api/media/upload`, `GET /articles/:slug`.
   - **Administrator / Editor**: Interacts with `/api/admin/login`, `GET /api/admin/articles`, `PATCH /api/admin/articles/:id`, `GET /api/admin/papers`, `PATCH /api/admin/papers/:id`, `PATCH /api/admin/submissions/:id`.
   - **Public Visitor**: Interacts with `GET /api/articles`, `GET /api/articles/:slug`, `GET /api/papers`, `GET /api/papers/:slug`.
3. **Traceability from Requirements to Endpoints**:
   - R2 requires auditing the full editing pipeline (`/account/edit/:slug`, `/account`, `/articles/:slug`), ensuring article updates (title, author, category, excerpt, hero image, rich text body with inline images/audio, and tags) and paper updates (metadata, abstract, references, citations) persist accurately and update live views immediately.
   - Each field, validation constraint, error code, and live update mechanism was traced directly to authoritative server route code, database schema definitions, and frontend components.

---

## 3. Caveats

1. **User Article Edit Scope**: The user-facing article editing endpoint (`PATCH /api/articles/:slug/edit`) allows authors to edit `title`, `authorName`, `categorySlug`, `excerpt`, `body`, and `heroImageUrl`. Secondary fields such as `tags`, `keyTakeaways`, `seoTitle`, and `paperType` are managed administratively via `PATCH /api/admin/articles/:id` and `PATCH /api/admin/papers/:id`.
2. **Paper User Editing**: End-users submit research papers via `/submit` or `/submit/write?draftId=...` (`PUT /api/submissions/:id`), while live published paper editing is managed via the administrative pipeline (`PATCH /api/admin/papers/:id`) or editorial desk reconciliation.

---

## 4. Conclusion

The specification mining for Requirement 2 is complete and exhaustively documented in `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo\.agents\e2e_spec_miner_2\report.md`.

All 20 discovered API routes, field schemas, HTML sanitization policies, immediate live update mechanisms, and 25 edge cases have been identified and tabulated for immediate conversion into automated E2E test scripts.

---

## 5. Verification Method

To independently verify all findings and test specifications:

1. Inspect the detailed report:
   `view_file` on `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo\.agents\e2e_spec_miner_2\report.md`
2. Run existing unit and publication reconciliation tests:
   `pnpm --filter @workspace/api-server test`
3. Verify workspace typecheck passes without errors:
   `pnpm run typecheck`
