# Project: Ānvīkṣikī Comprehensive Audit & Resilience

## Architecture
- **Monorepo Structure**:
  - `@workspace/anvikshiki` (`artifacts/anvikshiki`): Next.js/React + Vite frontend web application. Routes: `/submit`, `/submit/upload`, `/submit/write`, `/submit/preview`, `/account`, `/account/edit/:slug`, `/articles/:slug`, `/papers/:slug`, `/admin/*`.
  - `@workspace/api-server` (`artifacts/api-server`): Express.js / Node.js backend API server. Routes: `/api/submissions`, `/api/articles`, `/api/papers`, `/api/media`, `/api/auth`, `/api/admin`, `/api/extract-url`.
  - `@workspace/db` (`lib/db`): Drizzle ORM + PostgreSQL database layer and schemas (`articlesTable`, `papersTable`, `submissionsTable`, `usersTable`, `categoriesTable`, `auditLogsTable`, `submissionMediaTable`).
  - `@workspace/api-zod` (`lib/api-zod`): Shared schema validation.
  - `@workspace/api-client-react` (`lib/api-client-react`): Shared React query hooks and client API wrapper.
  - `@workspace/mockup-sandbox` (`artifacts/mockup-sandbox`): UI component testing sandbox.
  - `@workspace/scripts` (`scripts`): Database seed and migration scripts.
  - Vercel Serverless Entry: `api/index.js` exporting the Express app as a serverless handler.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Multi-step Submission Pipeline | `/submit`, `/submit/details`, `/submit/upload`, `/submit/write`, `/submit/preview`, `/submit/success` with unified state management and form validation | M1 | Survey E1 |
| F2 | Document Import & Extraction | DOCX parsing with embedded image extraction via `mammoth`, PDF text layer parsing via `pdfjs-dist`, and SSRF-safe Google Docs / URL extraction | M1 | Survey E1 |
| F3 | File Upload APIs & Multi-Tier Storage | Multi-part uploads, binary magic number verification, size limits (10MB image, 30MB audio, 50MB PDF), and 4-tier storage fallback (Vercel Blob -> Cloudinary -> Local /tmp -> Base64) | M1 | Survey E1 |
| F4 | Structured JSON Error Responses | Standardized HTTP status codes (201, 400, 401, 408, 413, 415, 422, 500, 502) and JSON error envelopes | M1 | Survey E1 |
| F5 | Immediate User & Admin Reflection | Submissions immediately reflect in `/account` user dashboard and `/admin/submissions` editorial queue without caching lag | M1 | Survey E1 |
| F6 | Syntax & Compiler Blocker Fix | Fix missing closing brace `}` in `artifacts/api-server/src/routes/media.ts:169` to restore clean workspace compilation | M1 | Survey E3 |
| F7 | Paper Edit API Endpoint | Implement `PATCH /api/papers/:slug/edit` in `artifacts/api-server/src/routes/papers.ts` with full metadata persistence (abstract, references, tags, category, author, institution) | M2 | Survey E2, E3 |
| F8 | Complete Article Edit API Schema | Expand `PATCH /api/articles/:slug/edit` to persist all fields: `title`, `authorName`, `categorySlug`, `excerpt`, `body`, `heroImageUrl`, `heroImageAlt`, `subtitle`, `audioUrl`, `tags`, `references`, `keyTakeaways`, `seoTitle`, `seoDescription` | M2 | Survey E2 |
| F9 | Author Ownership Authorization | Enforce `ownsAuthoredWork` authorization check on both article and paper edit endpoints so only the author (or admin) can modify records | M2 | Survey E2, E3 |
| F10 | Polymorphic Edit Page (`/account/edit/:slug`) | Support editing both articles and papers dynamically in `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx`, displaying and saving all relevant fields | M2 | Survey E2 |
| F11 | Bidirectional Submission Sync | When an article or paper linked to a `sourceSubmissionId` is edited, update the parent record in `submissionsTable` to prevent re-sync overwrite | M2 | Survey E2 |
| F12 | Live View Cache Invalidation | Invalidate `sessionStorage` (`anv_article_*`, `anv_paper_*`), React Query cache, and broadcast `"anv:content-changed"` event upon saving edits | M2 | Survey E2 |
| F13 | Preview HTML Escaping Fix | Remove double-escaping in `artifacts/anvikshiki/src/app/submit/preview/page.tsx` so rich text markup renders with proper typography | M2 | Survey E2 |
| F14 | Synthetic Submission ID Routing | Enable `PUT /api/submissions/:id` in `routes/submissions.ts` to resolve `art-` and `paper-` prefixed synthetic IDs | M2 | Survey E3 |
| F15 | Bearer Token Auth Fallback | In `artifacts/api-server/src/lib/auth.ts`, check `Authorization: Bearer <token>` in addition to cookie inspection for API/script compatibility | M3 | Survey E3 |
| F16 | Database Transient Retry & Resilience | In `lib/db/src/index.ts`, add retry logic with exponential backoff for transient PostgreSQL errors (`40001`, `40P01`, `08006`, `57P01`) and ensure graceful connection pool teardown | M3 | Survey E3 |
| F17 | Transaction Rollbacks & Error Boundaries | Wrap multi-table mutation operations in database transactions with automatic rollbacks and provide defensive fallbacks | M3 | Survey E3 |
| F18 | Monorepo Typecheck Verification | Verify `pnpm run typecheck` across all workspace packages (`@workspace/anvikshiki`, `@workspace/api-server`, `@workspace/mockup-sandbox`, `lib/db`, `scripts`) passes with 0 errors | M4 | Survey E3 |
| F19 | Production Build Verification | Verify `pnpm run build` succeeds cleanly for all packages without errors or bundle warnings | M4 | Survey E3 |
| F20 | Opaque-Box E2E Test Suite | Pass 100% of Tiers 1-4 E2E tests covering all submission, upload, editing, and API error resilience paths | M5 | E2E Track |
| F21 | Adversarial Coverage Hardening | Run Tier 5 Challenger stress tests and Forensic Integrity Audit to ensure zero regressions and authentic implementations | M5 | E2E Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Submission Pipeline & Upload Hardening | F1, F2, F3, F4, F5, F6 (Media syntax fix, upload failover hierarchy, DOCX/PDF parsing, /submit flow) | none | PLANNED |
| M2 | Article & Paper Editing Flow | F7, F8, F9, F10, F11, F12, F13, F14 (Paper edit API, expanded article edit schema, author auth, polymorphic UI, bidirectional sync, cache clearing) | M1 | PLANNED |
| M3 | API Connectivity & Database Resilience | F15, F16, F17 (Bearer token auth, transient DB retries, connection pooling, transaction rollbacks) | M1 | PLANNED |
| M4 | Workspace Typecheck & Production Build | F18, F19 (Zero compiler errors, full typecheck pass, clean production build across all packages) | M2, M3 | PLANNED |
| M5 | 100% E2E Test Pass & Adversarial Hardening | F20, F21 (Pass Tiers 1-4 E2E test suite, Tier 5 Challenger adversarial hardening, Forensic Audit) | M4 | PLANNED |

## Interface Contracts

### 1. Media & Uploads (`artifacts/api-server/src/routes/media.ts`)
- `POST /api/media/upload`: Multipart form data `file`, optional `category`, `authorName`, `context`.
  - Allowed types: images (<=10MB), audio (<=30MB), PDF (<=50MB), documents (<=50MB).
  - Magic number validation via `hasExpectedFileSignature`.
  - Response: `{ url: string, originalName: string, size: number, mimeType: string, storageProvider: string }`.
- `POST /api/media/extract-doc`: Multipart form data `file` (.docx or .txt).
  - Uses `mammoth.convertToHtml` with custom image saving to storage backend.
  - Response: `{ title: string, bodyHtml: string, wordCount: number, imageCount: number }`.

### 2. Article Editing (`artifacts/api-server/src/routes/articles.ts`)
- `PATCH /api/articles/:slug/edit`:
  - Auth: Authenticated user who is author or admin (`ownsAuthoredWork`).
  - Payload:
    ```ts
    {
      title?: string;
      subtitle?: string;
      authorName?: string;
      categorySlug?: string;
      excerpt?: string;
      body?: string;
      heroImageUrl?: string | null;
      heroImageAlt?: string | null;
      audioUrl?: string | null;
      tags?: string[];
      references?: Array<{ id?: string; title: string; url?: string; citation?: string }>;
      keyTakeaways?: string[];
      seoTitle?: string;
      seoDescription?: string;
    }
    ```
  - Response: `{ success: true, article: ArticleRecord }`.
  - Side-effect: Updates `submissionsTable` if linked via `sourceSubmissionId`.

### 3. Paper Editing (`artifacts/api-server/src/routes/papers.ts`)
- `PATCH /api/papers/:slug/edit`:
  - Auth: Authenticated user who is author or admin (`ownsAuthoredWork`).
  - Payload:
    ```ts
    {
      title?: string;
      abstract?: string;
      authorName?: string;
      institution?: string;
      categorySlug?: string;
      body?: string;
      manuscriptUrl?: string | null;
      pdfUrl?: string | null;
      tags?: string[];
      references?: Array<{ id?: string; title: string; url?: string; citation?: string }>;
      keyTakeaways?: string[];
      doi?: string;
    }
    ```
  - Response: `{ success: true, paper: PaperRecord }`.
  - Side-effect: Updates `submissionsTable` if linked via `sourceSubmissionId`.

### 4. Submissions Synthetic Routing (`artifacts/api-server/src/routes/submissions.ts`)
- `PUT /api/submissions/:id`:
  - If `id` starts with `art-`: routes update to `articlesTable` (and syncs).
  - If `id` starts with `paper-`: routes update to `papersTable` (and syncs).
  - If standard UUID/ID: updates `submissionsTable`.

### 5. Authentication (`artifacts/api-server/src/lib/auth.ts`)
- `getUserTokenFromRequest(req)` / `getAdminTokenFromRequest(req)`:
  - First checks cookies (`user_session`, `admin_session`).
  - Falls back to `Authorization: Bearer <token>` header.

### 6. Database Client (`lib/db/src/index.ts`)
- `withDbRetry<T>(operation: (db: DbClient) => Promise<T>, maxRetries?: number): Promise<T>`:
  - Catches transient Postgres error codes (`40001`, `40P01`, `08006`, `57P01`) and retries with exponential jittered backoff (up to 3 retries).

## Code Layout & Write Ownership
| Subsystem / File | Milestone Owner | Allowed Changes |
|------------------|-----------------|-----------------|
| `artifacts/api-server/src/routes/media.ts` | M1 | Fix syntax error, file validation, storage fallbacks |
| `artifacts/api-server/src/routes/submissions.ts` | M1 & M2 | Upload handling, synthetic ID routing |
| `artifacts/anvikshiki/src/app/submit/*` | M1 | Client submission flow & state sync |
| `artifacts/api-server/src/routes/articles.ts` | M2 | Expanded edit schema, author ownership validation |
| `artifacts/api-server/src/routes/papers.ts` | M2 | `PATCH /api/papers/:slug/edit` route implementation |
| `artifacts/api-server/src/lib/publication-sync.ts` | M2 | Bidirectional submission synchronization |
| `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx` | M2 | Polymorphic article/paper editing UI |
| `artifacts/anvikshiki/src/app/articles/[slug]/page.tsx` | M2 | Cache invalidation listener |
| `artifacts/anvikshiki/src/app/papers/[slug]/page.tsx` | M2 | Cache invalidation listener |
| `artifacts/anvikshiki/src/app/submit/preview/page.tsx` | M2 | Fix HTML double-escaping |
| `artifacts/api-server/src/lib/auth.ts` | M3 | Bearer token authorization header fallback |
| `lib/db/src/index.ts` | M3 | Transient database retry wrapper & connection resilience |
| `test/*`, `scripts/e2e-*` | E2E Track (M5) | Test runners, harness, test suites |
