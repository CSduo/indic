# API Connectivity, DB Resilience & Workspace Build Analysis

**Workspace**: `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo`  
**Explorer Role**: survey_explorer_3 (API Connectivity, DB Resilience & Workspace Build Explorer)  
**Date**: 2026-08-15  

---

## 1. Executive Summary & Monorepo Overview

The **Ānvīkṣikī** platform is structured as a **pnpm monorepo** with 9 workspace projects divided across `artifacts/`, `lib/`, and `scripts/`:

| Package Path | Package Name | Purpose / Type |
|---|---|---|
| `artifacts/anvikshiki` | `@workspace/anvikshiki` | Main React 19 + Vite frontend SPA with client-side routing (wouter) |
| `artifacts/api-server` | `@workspace/api-server` | Express 5 ESM backend bundle serving REST API routes and Vercel handler |
| `artifacts/mockup-sandbox` | `@workspace/mockup-sandbox` | Component preview and UI sandbox application |
| `lib/db` | `@workspace/db` | Drizzle ORM schema, PostgreSQL connection pool (`pg`), and migration scripts |
| `lib/api-spec` | `@workspace/api-spec` | OpenAPI 3.0 specification and Orval React Query codegen config |
| `lib/api-zod` | `@workspace/api-zod` | Shared Zod schemas generated from OpenAPI spec |
| `lib/api-client-react` | `@workspace/api-client-react` | Custom fetch client (`customFetch`) and React Query hooks |
| `scripts` | `@workspace/scripts` | Development utilities and tsx runner scripts |
| `api/` (Root) | Serverless Entrypoint | Vercel serverless function entrypoint (`api/index.js`) importing `vercel-handler.mjs` |

---

## 2. Compiler, Typecheck & Build Pipeline Diagnostics

### 2.1 Diagnostic Execution Results

Diagnostic commands were executed across all workspace packages:

1. **`pnpm run typecheck:libs` (`tsc --build`)**:
   - Status: **PASSED (Exit code 0)**
   - Verified clean type definitions for `lib/db`, `lib/api-client-react`, and `lib/api-zod`.

2. **`pnpm --filter @workspace/anvikshiki typecheck` (`tsc -p tsconfig.json --noEmit`)**:
   - Status: **PASSED (Exit code 0)**

3. **`pnpm --filter @workspace/anvikshiki build` (`vite build --config vite.config.ts`)**:
   - Status: **PASSED (Exit code 0)** — 2209 modules transformed, full production static assets generated into `artifacts/anvikshiki/dist/public`.

4. **`pnpm --filter @workspace/mockup-sandbox typecheck`**:
   - Status: **PASSED (Exit code 0)**

5. **`pnpm --filter @workspace/scripts typecheck`**:
   - Status: **PASSED (Exit code 0)**

6. **`pnpm --filter @workspace/api-server run test` (`vitest run`)**:
   - Status: **PASSED (Exit code 0)** — 7 test files passed (43/43 unit tests).

7. **`pnpm run typecheck` (`@workspace/api-server typecheck`)**:
   - Status: **FAILED (Exit code 2)**
   - **Exact Error**:
     ```
     artifacts/api-server/src/routes/media.ts(172,6): error TS1472: 'catch' or 'finally' expected.
     artifacts/api-server/src/routes/media.ts(173,3): error TS1128: Declaration or statement expected.
     artifacts/api-server/src/routes/media.ts(173,5): error TS1005: 'try' expected.
     artifacts/api-server/src/routes/media.ts(177,1): error TS1128: Declaration or statement expected.
     artifacts/api-server/src/routes/media.ts(177,2): error TS1128: Declaration or statement expected.
     ```

### 2.2 Root Cause of Typecheck Failure in `artifacts/api-server/src/routes/media.ts`

- **File**: `artifacts/api-server/src/routes/media.ts` (lines 168–173)
- **Defect**: In `router.post("/media/upload", ...)`, the `if (context === "paper_pdf" && !isPdf)` statement is missing a closing curly brace `}`:
  ```ts
  168: if (context === "paper_pdf" && !isPdf) {
  169:   return res.status(400).json({ error: "Paper uploads must be PDF files" });
  170: let url: string | null = null;
  171: let storageKey: string = `${context}-${crypto.randomUUID()}${extension}`;
  ```
- **Consequence**: The entire remainder of the route handler was enclosed inside the `if` block, resulting in mismatched braces and TypeScript syntax errors at line 172.
- **Fix**: Add `}` after line 169.

---

## 3. Comprehensive API Routes Audit & Error Paths Mapping

### 3.1 Submissions API (`artifacts/api-server/src/routes/submissions.ts`)

| Route | Method | Auth | Body / Params | Expected Response | Observed Error Path / Defect |
|---|---|---|---|---|---|
| `/api/submissions` | `POST` | Optional (User) | JSON: `type`, `submitterName`, `submitterEmail`, `title`, `domain`, `abstract`, `notes`, `consent`, `audioUrl`, `audioPublicId` | `201 Created` (`{ success: true, submission, publication: null }`) | Returns `400` if `consent` is false or missing. Correctly resolves user name/email if user logged in. |
| `/api/submissions/upload` | `POST` | Optional (User) | JSON or `multipart/form-data`: `manuscript`, `coverImage`, `audio` + metadata | `201 Created` (`{ success: true, submission, publication: null, files }`) | Handles Cloudinary direct signatures OR multipart fallback. File size limits: 10MB cover, 50MB manuscript, 30MB audio. Throws 500 `BLOB_STORAGE_MISSING` if Vercel Blob is chosen but token missing. |
| `/api/submissions/write` | `POST` | Optional (User for submitted, Required for Draft) | JSON: `type`, `submitterName`, `submitterEmail`, `title`, `domain`, `abstract`, `body`, `notes`, `consent`, `status` (`DRAFT`/`RECEIVED`), `audioUrl` | `201 Created` (`{ success: true, submission, publication: null }`) | Validates unresolved base64 images via `countUnresolvedArticleImages`. Rejects drafts with `401` if not signed in. |
| `/api/submissions` | `GET` | Required (User) | Query: `?trashed=true` or `?deleted=true` | `200 OK` (`{ submissions: enriched }`) | Enriches user's submissions with matching published articles/papers using `sourceSubmissionId` and fuzzy title/author matching. |
| `/api/submissions/:id` | `GET` | Required (Owner/Admin) | Param: `id` (e.g. `sub-xxx`, `art-xxx`, `paper-xxx`) | `200 OK` (`{ submission }`) | Handles synthetic IDs `art-` and `paper-` to allow authors to retrieve their published works from the desk. |
| `/api/submissions/:id` | `PUT` | Required (Owner/Admin) | Param: `id`, JSON body with fields to update, `status` (`DRAFT`/`RECEIVED`) | `200 OK` (`{ success: true, submission, publication: null }`) | **DEFECT**: Does NOT handle `art-` or `paper-` prefixes. Queries `submissionsTable` directly. When an author attempts to update an article/paper from `/account/edit/:slug` or via `/api/submissions/art-:id`, it returns `404 Submission not found`. |
| `/api/submissions/:id` | `DELETE` | Required (Owner/Admin) | Param: `id` | `200 OK` (`{ success: true, submission }`) | Handles `art-`, `paper-`, and `sub-`. Sets `deletedAt: now`. Soft-deletes linked article/paper. |
| `/api/submissions/:id/restore` | `POST` | Required (Owner/Admin) | Param: `id` | `200 OK` (`{ success: true, submission }`) | Restores soft-deleted submission and linked article/paper. |
| `/api/submissions/:id/permanent` | `DELETE` | Required (Owner/Admin) | Param: `id` | `200 OK` (`{ success: true }`) | Permanently deletes row and linked article/paper from DB. Must already be in Trash (`deletedAt IS NOT NULL`). |

### 3.2 Articles API (`artifacts/api-server/src/routes/articles.ts`)

| Route | Method | Auth | Body / Params | Expected Response | Observed Error Path / Defect |
|---|---|---|---|---|---|
| `/api/articles` | `GET` | Public | Query: `category`, `featured`, `q`, `limit`, `offset`, `includeBody` | `200 OK` (`{ articles, total, limit, offset }`) | Supports pagination, search across title/subtitle/excerpt, category normalization. Cached (`Cache-Control: public, max-age=60`). |
| `/api/articles/:slug` | `GET` | Public | Param: `slug` | `200 OK` (`{ article: { ...article, category, authorId, avatarUrl } }`) | Matches by exact slug, clean slug (without hex suffix), or ID. Injects sanitized body and legacy inline image recovery. |
| `/api/articles/:slug/edit` | `PATCH` | Required (User) | Param: `slug`, JSON: `title`, `authorName`, `categorySlug`, `excerpt`, `body`, `heroImageUrl` | `200 OK` (`{ success: true, article }`) | **DEFECTS**: <br>1. Missing authorization check (`ownsAuthoredWork`). Any logged-in user can patch any article.<br>2. Schema only accepts 6 fields. Ignores `subtitle`, `tags`, `audioUrl`, `keyTakeaways`, `references`, `seoTitle`, `seoDescription`.<br>3. Exact slug query only: fails if slug has been modified or passed by UUID. |
| `/api/sync-live-publications` | `GET` | Public / System | None | `200 OK` (`{ success: true, count, articles }`) | Triggers publication synchronization for live submissions. |

### 3.3 Papers API (`artifacts/api-server/src/routes/papers.ts`)

| Route | Method | Auth | Body / Params | Expected Response | Observed Error Path / Defect |
|---|---|---|---|---|---|
| `/api/papers` | `GET` | Public | Query: `category`, `peerReviewed`, `q`, `limit`, `offset`, `includeBody` | `200 OK` (`{ papers, total, limit, offset }`) | Filters by category, peer review, search query. Caching enabled. |
| `/api/papers/:slug` | `GET` | Public | Param: `slug` | `200 OK` (`{ paper: { ...paper, category } }`) | Fetches published paper by slug. |
| `/api/papers/:slug/edit` | `PATCH` | N/A | N/A | N/A | **DEFECT**: Route is completely **MISSING**. When an author tries to edit a paper from `/account/edit/:slug`, the client requests `/api/articles/:slug` and `/api/articles/:slug/edit`, which both fail with 404 for papers. |

### 3.4 Uploads & Media API (`artifacts/api-server/src/routes/media.ts`, `uploads.ts`, `extract-url.ts`)

| Route | Method | Auth | Body / Params | Expected Response | Observed Error Path / Defect |
|---|---|---|---|---|---|
| `/api/media/upload` | `POST` | Required (User/Admin) | `multipart/form-data`: `file`, `context` (`article_inline`, `avatar`, `paper_pdf`, `submission_cover`, `voice_note`) | `201 Created` (`{ success: true, url, mediaAsset }`) | Multi-tier fallback: Vercel Blob -> Cloudinary -> Local `/tmp` disk -> Base64 data URI (images <= 5MB).<br>**DEFECT**: Syntax error at line 168 breaks compilation. |
| `/api/media/extract-doc` | `POST` | Required (User/Admin) | `multipart/form-data`: `file` (DOCX / TXT) | `200 OK` (`{ html }`) | Extracts DOCX via mammoth or TXT. Embedded images are uploaded to media storage and replaced with persistent URLs. |
| `/api/extract-url` | `POST` | Required (User) | JSON: `url` (Google Docs share link or web article) | `200 OK` (`{ html, url, title, excerpt, coverImageUrl }`) | Robust SSRF protection (`isPrivateOrReservedIp`), redirects checked, HTML cleaned, embedded images persisted. |
| `/api/uploads/:filename` | `GET` | Public | Param: `filename` | Raw file stream | Directory traversal protection (`path.basename`). Inline headers for PDF, images, and audio. |

### 3.5 Auth API (`artifacts/api-server/src/routes/auth.ts`)

| Route | Method | Auth | Body / Params | Expected Response | Observed Error Path / Defect |
|---|---|---|---|---|---|
| `/api/auth/login` | `POST` | Public (Rate Limited) | JSON: `email`, `password` | `200 OK` (`{ success: true, user }`) + `user_session` cookie | Rate limited to 10 req/15min. Constant-time dummy hash compare on missing user to prevent timing attacks. |
| `/api/auth/signup` | `POST` | Public (Rate Limited) | JSON: `name`, `email`, `password` (min 12 chars) | `201 Created` (`{ success: true, user }`) + cookie | Auto-enrolls in newsletter. Structured error parser (`parseAuthError`) for DB connection/unique violations. |
| `/api/auth/register` | `POST` | Public (Rate Limited) | JSON: `name`, `email`, `password` | `201 Created` (`{ success: true, user }`) | Alias for `/auth/signup` for frontend compatibility. |
| `/api/auth/me` | `GET` | Required (User/Admin) | Cookie or Header | `200 OK` (`{ user }`) | Checks `usersTable`, falls back to `adminsTable`. |
| `/api/auth/logout` | `POST` | Public | None | `200 OK` (`{ success: true }`) | Clears `user_session` cookie. |
| `/api/auth/change-password` | `POST` | Required (User) | JSON: `currentPassword`, `newPassword` (min 12) | `200 OK` (`{ success: true }`) | Verifies current password before updating hash. |
| `/api/auth/profile` | `PUT` | Required (User) | JSON: `name`, `bio`, `institution`, `avatarUrl` | `200 OK` (`{ success: true, user }`) | Updates profile fields. |
| `/api/users/:userId/profile` | `GET` | Public | Param: `userId` | `200 OK` (`{ user, articles, papers }`) | Fetches public author profile and published bibliography. |
| `/api/auth/google` | `POST` | Public (Rate Limited) | JSON: `credential` (Google ID Token) | `200 OK` (`{ success: true, user }`) + cookie | Verifies token against `oauth2.googleapis.com/tokeninfo`. Validates `aud` vs `GOOGLE_CLIENT_ID`. Auto-registers new user or updates avatar. |

### 3.6 Admin API (`artifacts/api-server/src/routes/admin.ts`, `backup.ts`)

| Route | Method | Auth | Body / Params | Expected Response | Observed Error Path / Defect |
|---|---|---|---|---|---|
| `/api/admin/login` | `POST` | Public (Rate Limited) | JSON: `email`, `password` | `200 OK` (`{ success: true, admin }`) + `admin_session` cookie | Supports `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` env fallback or `adminsTable`. |
| `/api/admin/logout` | `POST` | Public | None | `200 OK` (`{ success: true }`) | Clears `admin_session` cookie. |
| `/api/admin/me` | `GET` | Required (Admin) | Cookie or Header | `200 OK` (`{ admin }`) | Returns current admin profile. |
| `/api/admin/stats` | `GET` | Required (Admin) | None | `200 OK` (`{ articles, papers, submissions, trash, newsletter, recentSubmissions }`) | Aggregates DB counts in parallel via `Promise.all`. |
| `/api/admin/articles` | `GET` / `POST` | Required (Admin/Editor) | Query: `status`, `trashed`; Body: article schema | `200 OK` / `201 Created` | Creates/lists articles with slug deduplication and sanitization. |
| `/api/admin/articles/:id` | `PATCH` / `DELETE` | Required (Admin/Editor) | Param: `id`; Body: article partial | `200 OK` | Updates or soft-deletes article. |
| `/api/admin/articles/:id/restore` | `POST` | Required (Admin/Editor) | Param: `id` | `200 OK` | Restores trashed article. |
| `/api/admin/articles/:id/permanent` | `DELETE` | Required (Admin/Editor) | Param: `id` | `200 OK` | Permanently deletes article from DB. |
| `/api/admin/papers` | `GET` / `POST` | Required (Admin/Editor) | Query: `status`, `trashed`; Body: paper schema | `200 OK` / `201 Created` | Creates/lists papers with slug deduplication and sanitization. |
| `/api/admin/papers/:id` | `PATCH` / `DELETE` | Required (Admin/Editor) | Param: `id`; Body: paper partial | `200 OK` | Updates or soft-deletes paper. |
| `/api/admin/papers/:id/restore` | `POST` | Required (Admin/Editor) | Param: `id` | `200 OK` | Restores trashed paper. |
| `/api/admin/papers/:id/permanent` | `DELETE` | Required (Admin/Editor) | Param: `id` | `200 OK` | Permanently deletes paper from DB. |
| `/api/admin/submissions` | `GET` | Required (Admin) | Query: `status`, `trashed` | `200 OK` (`{ submissions, total }`) | Filters out private `DRAFT` submissions. |
| `/api/admin/submissions/:id` | `PATCH` | Required (Admin) | Param: `id`, JSON: `status`, `editorNotes`, `priority`, `categorySlug`, `domain` | `200 OK` (`{ submission, publication }`) | Publishing is idempotent. Creates or links `articlesTable` or `papersTable` record. Rolls back submission status if public publication creation fails. |
| `/api/admin/submissions/:id` | `DELETE` | Required (Admin/Editor) | Param: `id` | `200 OK` | Soft-deletes submission. Enforces that linked public article/paper must be trashed first. |
| `/api/admin/submissions/:id/restore` | `POST` | Required (Admin/Editor) | Param: `id` | `200 OK` | Restores submission and linked publications. |
| `/api/admin/submissions/:id/permanent` | `DELETE` | Required (Admin/Editor) | Param: `id` | `200 OK` | Permanently deletes submission. Enforces foreign key order. |
| `/api/admin/trigger-backup` | `GET` (Cron) / `POST` (Admin) | `CRON_SECRET` Bearer or Admin Cookie | None | `200 OK` (`{ success: true, branchName }`) | Calls Neon REST API to create a database snapshot branch. |
| `/api/admin/backups` | `GET` | Required (Admin) | None | `200 OK` (`{ branches }`) | Lists Neon DB snapshot branches. |

---

## 4. Database Architecture & Resilience Audit

### 4.1 Connection Pool & Serverless Lambda Lifecycle (`lib/db/src/index.ts`)

```ts
const configuredMaxConnections = Number(
  process.env.PG_POOL_MAX || (isVercel ? 1 : isProduction ? 5 : 20)
);
const maxConnections = Number.isInteger(configuredMaxConnections) && configuredMaxConnections > 0
  ? Math.min(configuredMaxConnections, 50)
  : (isVercel ? 1 : isProduction ? 5 : 20);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/placeholder",
  max: maxConnections,
  ssl: sslConfig,
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s on connect
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database client:", err.message);
});
```

#### Key Observations:
1. **Serverless Concurrency Safety**: On Vercel (`isVercel = true`), the pool restricts connections to `1` connection per lambda instance by default (configurable via `PG_POOL_MAX`). This prevents pool exhaustion across hundreds of concurrent lambda executions.
2. **Idle Client Error Handler**: `pool.on("error", ...)` catches unexpected socket drops or backend restarts without crashing the Node.js process.
3. **Timeout Protection**: `connectionTimeoutMillis: 10000` prevents indefinite hanging on network partitions or unreachable database hosts.
4. **Resilient Initialization**: `verifyDatabaseConnection` provides retrying verification on startup without blocking the process.

### 4.2 Database Gaps & Vulnerabilities Identified

1. **Lack of Transaction Rollback Wrappers on Multi-Query Operations**:
   - In `artifacts/api-server/src/routes/admin.ts` (`PATCH /admin/submissions/:id` when publishing):
     - It updates `submissionsTable`, then attempts `ensurePublicPublicationForSubmission`. If that fails, it executes another `db.update` to rollback status.
     - While defensive, if the Node process dies or network drops between updates, state is inconsistent.
   - In `artifacts/api-server/src/routes/submissions.ts` (`DELETE /submissions/:id/permanent`):
     - Executes sequential `db.delete(articlesTable)`, `db.delete(papersTable)`, `db.delete(submissionsTable)` without wrapping them inside a `db.transaction(async (tx) => ...)`.
2. **Missing Retry Helper for Transient Errors**:
   - PostgreSQL error codes `40001` (serialization failure), `40P01` (deadlock), `08006` (connection failure), `57P01` (admin shutdown) are not automatically retried with exponential backoff on query execution.
3. **Missing Foreign Key Indexes**:
   - `commentsTable.userId` and `submissionsTable.userId` lack explicit indexes, which can cause sequential table scans on frequent user queries.

---

## 5. CORS, Security & Credential Handling

### 5.1 CORS & CSRF Defense (`artifacts/api-server/src/app.ts`)

1. **Origin Resolution**:
   - Dynamically checks `FRONTEND_URL` (comma-separated for multi-domain setups) and allows `localhost` / `127.0.0.1` in non-production.
   - Sets `credentials: true`.
2. **CSRF Origin Verification**:
   - All state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`) are inspected against `req.get("origin")` and `sec-fetch-site`. Cross-site requests lacking matching origin or configured origin are rejected with `403 Forbidden`.
3. **Security Headers**:
   - Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`.
   - Content Security Policy (CSP) is customized to allow Google OAuth, Google Fonts, and media streaming.

### 5.2 Credential & Auth Handling Gap (`lib/auth.ts`)

- In `getUserTokenFromRequest` and `getAdminTokenFromRequest`, authentication tokens are ONLY read from cookies (`req.cookies?.user_session` or `req.headers.cookie`).
- **Gap**: There is no fallback to read `Authorization: Bearer <token>`.
- **Impact**: API clients, automated test scripts (e.g. `curl`, Supertest, Postman), mobile apps, or cross-origin requests cannot authenticate via standard `Bearer` headers.

---

## 6. Client-Side API Connectivity & Error Boundaries

### 6.1 `customFetch` in `lib/api-client-react/src/custom-fetch.ts`

- Wraps native `fetch` with `ApiError` and `ResponseParseError` classification.
- Detects empty responses (`NO_BODY_STATUS = 204, 205, 304`).
- Strips Byte Order Marks (BOM) before JSON parsing.
- Truncates raw HTML error bodies to 300 characters to prevent huge error strings in UI toast notifications.
- Supports `setBaseUrl` and `setAuthTokenGetter`.

### 6.2 React Error Boundaries & Fallback UI

- `artifacts/anvikshiki/src/App.tsx` and route components use `@tanstack/react-query` with toast notifications (`sonner`).
- Error states in account, submit, and browse pages display dedicated `EmptyState` and retry buttons rather than blank screens or crashed UI trees.

---

## 7. Summary of Defects & Root Causes

| ID | Location | Defect Description | Root Cause | Impact |
|---|---|---|---|---|
| **BUG-1** | `artifacts/api-server/src/routes/media.ts:168-173` | Syntax error: missing `}` in `if (context === "paper_pdf" && !isPdf)` | Truncated conditional block | Breaks `pnpm run typecheck` across monorepo |
| **BUG-2** | `artifacts/api-server/src/routes/submissions.ts:870` | `PUT /api/submissions/:id` fails with 404 for `art-` and `paper-` IDs | Only queries `submissionsTable.id = req.params.id` without checking `art-` or `paper-` prefixes | Authors editing published works through this endpoint receive 404 |
| **BUG-3** | `artifacts/api-server/src/routes/articles.ts:240` | `PATCH /api/articles/:slug/edit` lacks ownership check & strips metadata | No `ownsAuthoredWork` check; Zod schema omits `subtitle`, `tags`, `audioUrl`, etc. | Potential unauthorized edits; loss of article metadata upon update |
| **BUG-4** | `artifacts/api-server/src/routes/papers.ts` | Missing `PATCH /api/papers/:slug/edit` route | Endpoint was never implemented in `papers.ts` | Paper editing fails with 404 on backend |
| **BUG-5** | `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx` | Edit page exclusively calls `/api/articles/${slug}` | Hardcoded article endpoints for both articles and papers | Editing papers from `/account` fails to load or save |
| **BUG-6** | `artifacts/api-server/src/lib/auth.ts:103-121` | `getUserTokenFromRequest` ignores `Authorization: Bearer` header | Only inspects cookies | Prevents header-based API authorization in automated testing and external clients |
| **BUG-7** | `lib/db/src/index.ts` | Missing automatic transient error retry wrapper | No retry logic for connection blips/deadlocks | Serverless lambdas fail immediately on momentary DB connectivity hiccups |

---

## 8. Recommended Implementation & Fix Strategy

### Step 1: Fix Media Route Syntax Error
- In `artifacts/api-server/src/routes/media.ts`, insert the closing `}` at line 169.
- Verify `pnpm run typecheck` passes across all packages.

### Step 2: Implement Paper Editing & Unify Article/Paper Update Routes
1. In `artifacts/api-server/src/routes/papers.ts`, implement `PATCH /papers/:slug/edit` with full metadata fields (`title`, `authorName`, `categorySlug`, `abstract`, `body`, `coverImageUrl`, `pdfUrl`, `citationText`, `tags`, `peerReviewed`, `paperType`, `doi`, `year`).
2. Add authorization validation (`resolveViewer` + `ownsAuthoredWork`) to both `PATCH /api/articles/:slug/edit` and `PATCH /api/papers/:slug/edit`.
3. In `artifacts/api-server/src/routes/articles.ts`, expand `PATCH /api/articles/:slug/edit` Zod schema to allow `subtitle`, `tags`, `audioUrl`, `keyTakeaways`, `references`, `seoTitle`, `seoDescription`.
4. In `artifacts/api-server/src/routes/submissions.ts`, update `PUT /api/submissions/:id` to handle `art-` and `paper-` prefixed IDs by routing updates to the corresponding `articlesTable` or `papersTable` record.

### Step 3: Enable Header-Based Bearer Token Auth
- In `artifacts/api-server/src/lib/auth.ts`, update `getUserTokenFromRequest` and `getAdminTokenFromRequest` to extract the bearer token from `req.headers.authorization` when no cookie is present.

### Step 4: Add DB Transaction & Retry Wrappers
- In `lib/db/src/index.ts`, add a `withDbRetry<T>(fn: () => Promise<T>, retries = 3)` wrapper that intercepts transient PostgreSQL error codes (`ECONNRESET`, `57P01`, `40001`, `40P01`, `08006`) with exponential jitter backoff.
- Wrap multi-table deletion and publishing routines in `db.transaction(...)`.

### Step 5: Update Frontend Edit Flow for Papers
- In `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx`, check if the item is a paper (fallback query to `/api/papers/:slug` if `/api/articles/:slug` returns 404), display paper-appropriate metadata fields (PDF URL, citation, abstract), and submit to `PATCH /api/papers/:slug/edit` or `PATCH /api/articles/:slug/edit` accordingly.

### Step 6: Full Verification
- Run `pnpm run typecheck` (must pass with 0 errors).
- Run `pnpm run build` (must pass with 0 errors).
- Run `pnpm --filter @workspace/api-server run test` (all tests passing).
- Run end-to-end API test scripts verifying submission creation, document uploads, article editing, paper editing, and account list synchronization.
