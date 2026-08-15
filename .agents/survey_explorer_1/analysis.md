# Submissions & Uploads Pipeline Audit (Requirement R1)

## Executive Summary
This report provides a comprehensive technical audit of the Submissions & Uploads Pipeline across the Ānvīkṣikī platform as specified in **Requirement R1** of `ORIGINAL_REQUEST.md`.

The pipeline consists of:
1. **Multi-Step Submission Flows**: `/submit` entry point, `/submit/details` metadata collection, `/submit/upload` file-based manuscript attachment, `/submit/write` in-browser rich text drafting & editing, `/submit/preview` draft previewing, and `/submit/success` confirmation & reference tracking.
2. **Document Import & Parsing Pipelines**: Server-side Word/DOCX parsing with embedded image extraction via `mammoth`, client-side PDF text extraction via `pdfjs-dist`, remote webpage & Google Docs semantic conversion via `POST /api/extract-url`, and plain text parser.
3. **File Upload & Storage Subsystems**: `POST /api/media/upload`, `POST /api/submissions/upload`, `POST /api/submissions/write`, `POST /api/uploads/cloudinary-signature`, and `GET /api/uploads/:filename`, supporting a multi-tier fallback hierarchy (Vercel Blob → Cloudinary → Local Disk/TMP → In-Memory Base64 fallback).
4. **Resilience, Validation & Error Handling**: Magic number byte validation (`hasExpectedFileSignature`), size limit enforcement (10MB image, 30MB audio, 50MB manuscript/PDF), HTML entity decoding, sanitization (`sanitizeArticleBody`), SSRF mitigation, and structured JSON error responses.
5. **Desk & Queue Synchronization**: Immediate visibility and lifecycle progression in author dashboard (`/account`) and editorial queue (`/admin/submissions`).

---

## 1. Codebase Architecture & File Mapping (Requirement R1)

| Area / Component | File Path | Key Responsibilities |
| :--- | :--- | :--- |
| **Submission Portal Landing** | `artifacts/anvikshiki/src/app/submit/page.tsx` | Submission type selection (Essay, Paper, Review, Translation), routing to Write vs Upload flows. |
| **Metadata Details Page** | `artifacts/anvikshiki/src/app/submit/details/page.tsx` | Submitter identity, title, domain, keywords, abstract, language, and audience metadata intake into `sessionStorage`. |
| **Upload Manuscript Flow** | `artifacts/anvikshiki/src/app/submit/upload/page.tsx` | File drag-and-drop, PDF parsing, DOCX/TXT extraction into inline editor, cover image, voice notes, declaration, direct Cloudinary/multipart submission. |
| **In-Browser Writer & Editor** | `artifacts/anvikshiki/src/app/submit/write/page.tsx` | Rich text manuscript composition, inline image paste/upload, voice note recording/upload, DOCX/TXT/Google Docs import, local & server draft saving, final submission. |
| **Submission Preview** | `artifacts/anvikshiki/src/app/submit/preview/page.tsx` | Read-only styled preview of server-saved drafts before final submission. |
| **Submission Confirmation** | `artifacts/anvikshiki/src/app/submit/success/page.tsx` | Reference ID presentation, status explanation, expediting email notification link. |
| **User Dashboard** | `artifacts/anvikshiki/src/app/account/page.tsx` | Active submissions tracking (`RECEIVED`, `UNDER_REVIEW`, `ACCEPTED`, `PUBLISHED`), draft resuming, work soft-deletion/restoration, reading history. |
| **Admin Submissions Queue** | `artifacts/anvikshiki/src/app/admin/submissions/page.tsx` | Status filter tabs, embedded PDF viewer, document/image asset inspector, editorial notes, review status transitions, and public article publishing. |
| **Submission API Routes** | `artifacts/api-server/src/routes/submissions.ts` | `POST /api/submissions`, `POST /api/submissions/upload`, `POST /api/submissions/write`, `GET /api/submissions`, `PUT /api/submissions/:id`, `DELETE /api/submissions/:id`, `POST /api/submissions/:id/restore`, `DELETE /api/submissions/:id/permanent`. |
| **Media & Doc Extract Routes** | `artifacts/api-server/src/routes/media.ts` | `POST /api/media/upload` (avatar, submission_cover, article_inline, paper_pdf, voice_note), `POST /api/media/extract-doc` (mammoth DOCX/TXT extraction). |
| **URL & Google Docs Extraction** | `artifacts/api-server/src/routes/extract-url.ts` | SSRF-safe remote HTML/Google Docs parser, style & structure normalization, embedded image persistence. |
| **Static Uploads Route** | `artifacts/api-server/src/routes/uploads.ts` | `GET /api/uploads/:filename` with path traversal defense and inline headers. |
| **Binary Validation** | `artifacts/api-server/src/lib/file-validation.ts` | File signature (magic bytes) verification for JPG, PNG, GIF, WEBP, PDF, DOCX, DOC, TXT, OGG, WAV, WEBM, MP3, M4A. |
| **Publication Synchronization** | `artifacts/api-server/src/lib/publication-sync.ts` | Publication state reconciliation (`ensurePublicPublicationForSubmission`), category normalization, slug generation. |
| **Content Sanitization** | `artifacts/api-server/src/lib/content.ts` | HTML sanitization (`sanitizeArticleBody`), unresolved embedded image counting. |
| **Database Schema** | `lib/db/src/schema/index.ts` | `submissionsTable`, `articlesTable`, `papersTable`, `mediaAssetsTable`, `usersTable`, `notificationsTable`. |

---

## 2. Multi-Step Submission Flow Deep Dive

### 2.1 Flow State Machine & Storage Keys
- **Landing (`/submit`)**:
  - Sets `sessionStorage.getItem("anvikshiki_submit_type")` (values: `"essay"`, `"paper"`, `"review"`, `"translation"`, `"book-review"`).
  - "Write Here" routes directly to `/submit/write`.
  - "Upload a File" routes to `/submit/details`.
- **Details (`/submit/details`)**:
  - Manages `FormData` state in `sessionStorage.getItem("anvikshiki_submit_details")`:
    - `fullName`, `email`, `institution`, `title`, `domain`, `length`, `abstract`, `keywords`, `notes`, `audience`, `language`.
  - On validation pass, routes to `/submit/upload`.
- **Upload (`/submit/upload`)**:
  - Reads `anvikshiki_submit_details` and `anvikshiki_submit_type`.
  - Allows two submission methods:
    1. **Direct File Submission (`submit()`)**:
       - Cloudinary Direct: Generates upload signature via `/api/uploads/cloudinary-signature`, uploads manuscript and cover to Cloudinary, sends JSON payload with URLs to `POST /api/submissions/upload`.
       - Local Fallback: Sends multipart `FormData` (`manuscript`, `coverImage`) to `POST /api/submissions/upload`.
    2. **Extracted Editor Submission (`submitEdited()`)**:
       - Extracts document content into inline rich text editor (`extractAndWrite()`), allows user review and modification, uploads cover image via `/api/media/upload` or Cloudinary, and submits JSON payload to `POST /api/submissions/write`.
  - Stores created submission ID in `sessionStorage.setItem("anvikshiki_submit_id", id)` and routes to `/submit/success`.
- **Writer (`/submit/write`)**:
  - Manages browser-persisted draft state in `sessionStorage.getItem("anvikshiki_write_draft")`.
  - Supports server draft persistence (`saveDraftToServer()`) via `POST /api/submissions/write` (`status: "DRAFT"`) or `PUT /api/submissions/:id`.
  - Full submission (`submit()`) validates declaration and required fields, uploads cover and audio voice notes, sends `status: "RECEIVED"` to `POST /api/submissions/write` or `PUT /api/submissions/:serverDraftId`, sets `anvikshiki_submit_id`, and navigates to `/submit/success`.

---

## 3. Document Import & Conversion Pipeline Deep Dive

### 3.1 DOCX / Word Document Conversion (`mammoth`)
- **Backend Route**: `POST /api/media/extract-doc` (`artifacts/api-server/src/routes/media.ts:273-298`).
- **Parsing Architecture**:
  - Accepts multipart form with `.docx` or `.txt`.
  - Re-validates file signature (`0x50, 0x4b, 0x03, 0x04` for DOCX; no NUL bytes for TXT).
  - Uses `mammoth.convertToHtml({ buffer }, { convertImage: mammoth.images.imgElement(imageHandler) })`.
- **Embedded Image Handling & Resilience**:
  - Intercepts embedded image buffers via `imageHandler`.
  - Enforces MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) and 10MB limit.
  - Multi-tier persistence:
    1. Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
    2. Cloudinary (`CLOUDINARY_URL`)
    3. Local disk fallback in development/test (`UPLOADS_DIR`)
  - **Zero Image Loss Guarantee**: If any embedded image fails to store, `imageImportErrors` triggers a clean HTTP 502 with code `DOCUMENT_IMAGE_UPLOAD_FAILED` to prevent silently stripped images.
  - Output is sanitized via `sanitizeArticleBody()`.

### 3.2 PDF Extraction (`pdfjs-dist`)
- **Client-Side Implementation**: `artifacts/anvikshiki/src/app/submit/upload/page.tsx:49-82`.
- **Parsing Mechanism**:
  - Dynamically imports `pdfjs-dist` and configures `GlobalWorkerOptions.workerSrc`.
  - Iterates through PDF pages extracting `textContent.items`.
  - Reconstructs semantic paragraphs using Y-axis offset deltas (`Math.abs(y - lastY) > 20`).
  - Converts text blocks to HTML paragraphs.
- **Handling of Scanned / Binary PDFs**:
  - PDFs with selectable text layers extract seamlessly into the rich text editor.
  - Formatted scholarly papers (multi-column, complex mathematical formulas) can be submitted directly as PDF files without forcing extraction, preserving their layout for the embedded PDF viewer.

### 3.3 Remote Webpage & Google Docs Extraction (`POST /api/extract-url`)
- **Route**: `artifacts/api-server/src/routes/extract-url.ts`.
- **Security & SSRF Hardening**:
  - DNS resolution with `dns.lookup({ all: true })`.
  - IP filter (`isPrivateOrReservedIp`) blocking IPv4/IPv6 private ranges, loopback, link-local (169.254.169.254), CGNAT (100.64.0.0/10), and IPv4-mapped IPv6.
  - Manual 3-hop redirect inspection (`fetchWithSsrfGuard`).
- **Google Docs Transformation**:
  - Normalizes `/document/d/{id}/edit` → `/document/d/{id}/export?format=html`.
  - Normalizes `/document/d/e/{id}/pub` → public canonical endpoint.
  - Detects Google private permission shells (`isGoogleDocumentAccessPage`) → returns HTTP 422 with clear sharing instructions.
  - Parses inline and style block CSS rules (`.title`, `.heading-1`, `.quote`, `font-weight`, `font-style`, `text-decoration`, `margin-left`).
  - Persists embedded base64 images to Blob / Cloudinary.
  - Extracts suggested title (`extractDocumentTitle`), lead excerpt (`extractLeadExcerpt`), and candidate cover image.

---

## 4. File Upload APIs & Multi-Backend Storage Integrations

### 4.1 Storage Provider Tiering & Failover

```
                      ┌────────────────────────────┐
                      │    Uploaded File Buffer    │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                ┌───────────────────────────────────────┐
                │ 1. Vercel Blob (BLOB_READ_WRITE_TOKEN)│
                └───────────────┬───────────────────────┘
                                │ (fails or not set)
                                ▼
                ┌───────────────────────────────────────┐
                │ 2. Cloudinary (CLOUDINARY_URL)        │
                └───────────────┬───────────────────────┘
                                │ (fails or not set)
                                ▼
                ┌───────────────────────────────────────┐
                │ 3. Local Disk / Serverless Temp Disk  │
                │    (UPLOADS_DIR / /tmp/anvikshiki)    │
                └───────────────┬───────────────────────┘
                                │ (fails or not applicable)
                                ▼
                ┌───────────────────────────────────────┐
                │ 4. In-Memory Base64 Data URI Fallback │
                │    (Images <= 5 MB only)              │
                └───────────────┬───────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────────────┐
                │ 5. Structured Error (STORAGE_FAILED)  │
                └───────────────────────────────────────┘
```

### 4.2 Endpoint Specifications

| Endpoint | Method | Expected Payload | Size Limits | Success Status | Failover / Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/media/upload` | POST | Multipart form: `file`, `context` (`article_inline`, `avatar`, `paper_pdf`, `submission_cover`, `voice_note`) | Image: 10MB<br>Audio: 30MB<br>PDF: 50MB | 201 Created (`{ success: true, url, mediaAsset }`) | Blob → Cloudinary → Local Disk → Base64. Returns 400/401/413/500 with structured JSON. |
| `/api/media/extract-doc` | POST | Multipart form: `file` (.docx or .txt) | 50MB | 200 OK (`{ html }`) | Extracted HTML with persisted images. Returns 400/401/413/502. |
| `/api/submissions/upload` | POST | Multipart form OR JSON: `manuscript`, `coverImage`, `audio`, `submitterName`, `submitterEmail`, `title`, `abstract`, `type`, `consent` | Manuscript: 50MB<br>Cover: 10MB<br>Audio: 30MB | 201 Created (`{ success: true, submission, files }`) | Saves all attached files, validates signature & size, inserts into `submissionsTable`. |
| `/api/submissions/write` | POST | JSON: `title`, `body`, `abstract`, `submitterName`, `submitterEmail`, `domain`, `notes`, `consent`, `status` (`DRAFT`/`RECEIVED`), `audioUrl` | Body: 500KB JSON limit: 2MB | 201 Created (`{ success: true, submission }`) | Unresolved embedded images rejected before insert. Sanitizes body HTML. |
| `/api/submissions` | POST | JSON: `type`, `submitterName`, `submitterEmail`, `title`, `abstract`, `notes`, `consent`, `domain`, `audioUrl` | JSON limit: 2MB | 201 Created (`{ success: true, submission }`) | Standard programmatic submission endpoint. |
| `/api/uploads/cloudinary-signature` | POST | JSON: `folder` | N/A | 200 OK (`{ cloudName, apiKey, timestamp, signature, folder }`) | Generates signed token for direct client-to-Cloudinary uploads. |
| `/api/uploads/:filename` | GET | URL Param: `filename` | N/A | 200 OK (File stream) | Path traversal protection (`path.basename`), sets `Content-Type` and `Content-Disposition: inline`. |

---

## 5. Immediate Reflection in Dashboard & Admin Queue

### 5.1 User Account Dashboard (`/account`)
- **Query Endpoint**: `GET /api/submissions` (active) and `GET /api/submissions?deleted=true` (trash).
- **Identity Resolution**: `resolveViewer(req)` identifies the user by `auth.userId`, `auth.email`, or name/email-prefix attribution keys.
- **Immediate Reflection**:
  - `POST /api/submissions`, `POST /api/submissions/upload`, `POST /api/submissions/write`, and `PUT /api/submissions/:id` insert/update `submissionsTable` directly with `userId` and `submitterEmail`.
  - When returning to `/account`, `loadSubmissions()` fetches the updated list immediately.
  - Dispatches `anv:content-changed` window event on delete/restore.
- **Status Segmentation**:
  - `status === "DRAFT"`: Surfaces under "Your Drafts" with a "Resume" button linking to `/submit/write?draftId=:id`.
  - `status !== "DRAFT"`: Surfaces under "Editorial Status" with a visual 4-step progress tracker (`RECEIVED` → `UNDER_REVIEW` → `ACCEPTED` → `PUBLISHED`).
  - Trashed items: Listed under "Submission Trash" with "Restore" (`POST /api/submissions/:id/restore`) and "Delete Forever" (`DELETE /api/submissions/:id/permanent`).

### 5.2 Admin Submissions Queue (`/admin/submissions`)
- **Query Endpoint**: `GET /api/admin/submissions` (with status and trashed filters).
- **Exclusion of Drafts**: Queries `where(ne(submissionsTable.status, "DRAFT"))` to ensure private drafts remain strictly confidential to the author.
- **Immediate Reflection & Live Review**:
  - New submissions appear at the top of the queue (`orderBy(desc(submissionsTable.createdAt))`).
  - Visual asset badges (`Document`, `Link`, `Images`) indicate attached media.
  - Detail panel renders embedded PDF viewer, cover image preview, full sanitized body preview, author notes, and all downloadable assets.
- **Editorial Lifecycle & Publication**:
  - `Approve` (`ACCEPTED`)
  - `Under Review` (`UNDER_REVIEW`)
  - `Request Revision` (`REVISION_REQUESTED`)
  - `Reject` (`REJECTED`)
  - `Publish as Article` (`PUBLISHED`): Calls `ensurePublicPublicationForSubmission(submission, { allowCreate: true, categorySlug })` which creates or links the public record in `articlesTable` and sends an in-app notification to the author.
  - If public article creation fails, the submission status is rolled back and an error is reported (atomic publication guarantee).

---

## 6. Identified Vulnerabilities, Gaps & Edge Cases

### 6.1 State Management & Cross-Page Navigation Gaps
1. **Details vs Writer Session Storage Disconnection**:
   - `details/page.tsx` saves to `anvikshiki_submit_details`.
   - `write/page.tsx` only loads `anvikshiki_write_draft`.
   - If a user fills in `/submit/details`, then decides to click "Write", their details (author name, email, institution, title, domain) are not transferred to `write/page.tsx`.
   - *Fix*: In `write/page.tsx`, initialize `draft` by merging `anvikshiki_submit_details` if `anvikshiki_write_draft` is empty.

2. **Abstract Requirement Discrepancy in Manual Submissions**:
   - In `details/page.tsx`, the abstract field is labeled "Abstract (Optional)".
   - In `POST /api/submissions` (JSON endpoint), `abstract` has `z.string().trim().min(1).max(5000)`, causing 400 Bad Request if an empty abstract is submitted.
   - *Fix*: In `POST /api/submissions`, permit empty abstract with a default fallback (e.g. `.default("Submitted manuscript.")`) or make client details form require abstract when required by backend.

3. **Type Lowercase/Uppercase Enum Mismatch**:
   - Client pages often store lowercase types (`"essay"`, `"paper"`, `"review"`, `"commentary"`).
   - In `POST /api/submissions`, `type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"])` does not preprocess lowercase values, causing schema rejection if lowercase is sent directly.
   - In `POST /api/submissions/upload`, `type` is normalized via `String(req.body.type || "ESSAY").toUpperCase()`.
   - *Fix*: Use `z.preprocess()` or `.transform()` on `POST /api/submissions` `type` field to accept case-insensitive types.

### 6.2 Upload Storage & File Handling Edge Cases
4. **Direct Cloudinary Upload Failure Handling**:
   - In `upload/page.tsx:566-685` and `write/page.tsx:724-789`, the client calls `GET /api/health` to check if `storageProvider === "cloudinary"`.
   - If Cloudinary credentials in `.env` are invalid or missing at runtime, the client falls back to multipart form `/api/submissions/upload` or local `/api/media/upload`.
   - However, in `write/page.tsx:914-944`, `uploadCoverIfNeeded()` and `uploadAudioIfNeeded()` do not pass the full progress bar callbacks, so large audio files may appear stuck during upload.
   - *Fix*: Provide upload progress feedback in `write/page.tsx` for media attachments.

5. **DOC (Binary .doc) vs DOCX Handling**:
   - `file-validation.ts` detects `.doc` (OLE compound `0xd0 0xcf 0x11 0xe0...`) and accepts it for file upload.
   - However, `mammoth` only supports `.docx` (XML/ZIP). When a user attempts to extract a legacy `.doc` file into the editor, `upload/page.tsx` displays: `"DOC files can be submitted, but only DOCX and TXT files can be imported into the editor."`
   - *Recommendation*: Keep this explicit user guidance clear so authors know to either submit the file directly or convert to `.docx`.

6. **Unresolved Image Interception in Drafts**:
   - If an author copies & pastes an image from a third-party webpage or local clipboard into the rich text editor, `write/page.tsx` attempts to upload each clipboard image to `/api/media/upload`.
   - If the clipboard only contains a temporary `data:` or `blob:` URI without image bytes, the backend `countUnresolvedArticleImages` blocks saving with HTTP 400 (`UNRESOLVED_ARTICLE_IMAGES`) to prevent dead image references.
   - *Status*: Working as designed, with clear error messages instructing the author to re-insert the image.

---

## 7. Recommended Fix Strategies

1. **State Normalization Helper**:
   - Create a unified `getSubmitState()` and `saveSubmitState()` utility in `artifacts/anvikshiki/src/lib/` to seamlessly bridge `anvikshiki_submit_details` and `anvikshiki_write_draft`.
2. **Schema Hardening & Type Coercion**:
   - Update `submissionSchema` in `artifacts/api-server/src/routes/submissions.ts` to transform lowercase `type` strings (`"essay"` → `"ESSAY"`, etc.) and default empty abstracts to `"Manuscript submission"`.
3. **Multi-Step Stepper & Preview Connection**:
   - Connect the "Preview" button on `/submit/write` to automatically save a server draft if signed in and navigate to `/submit/preview?id=${draftId}`.
4. **Enhanced Error Boundary on Uploads**:
   - Add graceful inline retry buttons in `UploadZone` and the editor toolbar if network disconnect occurs during file upload.

---

## 8. Verification Matrix & Commands

| Verification Step | Command / Method | Expected Outcome |
| :--- | :--- | :--- |
| **Typecheck** | `pnpm run typecheck` | All 4 workspace packages typecheck cleanly with 0 errors. |
| **API Server Unit Tests** | `pnpm --filter @workspace/api-server run test` | All 7 test suites (43 tests) pass including `file-validation`, `publication-sync`, `extract-url`, `request`, `content`, and `app`. |
| **Frontend Production Build** | `pnpm --filter @workspace/anvikshiki run build` | Vite build succeeds without bundle or chunking errors. |
| **API Server Build** | `pnpm --filter @workspace/api-server run build` | ESBuild bundles `index.mjs` and `vercel-handler.mjs` cleanly. |
