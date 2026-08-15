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
