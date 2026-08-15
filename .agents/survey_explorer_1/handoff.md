# Handoff Report — Submissions & Uploads Pipeline Explorer (Requirement R1)

## 1. Observation

### 1.1 Multi-Step Submission & State Flow
- **Client Route Components**:
  - `/submit` (`artifacts/anvikshiki/src/app/submit/page.tsx:33-36`): sets `sessionStorage.setItem("anvikshiki_submit_type", selectedType)` and branches to `/submit/write` or `/submit/details`.
  - `/submit/details` (`artifacts/anvikshiki/src/app/submit/details/page.tsx:61-80`): manages `sessionStorage.getItem("anvikshiki_submit_details")` containing `fullName`, `email`, `institution`, `title`, `domain`, `length`, `abstract`, `keywords`, `notes`, `audience`, `language`.
  - `/submit/upload` (`artifacts/anvikshiki/src/app/submit/upload/page.tsx:543-690`): parses `anvikshiki_submit_details`, handles direct file submission (`submit()`) and extracted document submission (`submitEdited()`).
  - `/submit/write` (`artifacts/anvikshiki/src/app/submit/write/page.tsx:91-105`): manages `sessionStorage.getItem("anvikshiki_write_draft")`, handles draft persistence (`saveDraftToServer()`) and final submission (`submit()`).
  - `/submit/preview` (`artifacts/anvikshiki/src/app/submit/preview/page.tsx:27-33`): fetches server draft via `GET /api/submissions/:id`.
  - `/submit/success` (`artifacts/anvikshiki/src/app/submit/success/page.tsx:14-18`): reads `anvikshiki_submit_id` from `sessionStorage` and presents confirmation & reference ID.

### 1.2 Document Import & Conversion Pipeline
- **DOCX / TXT Extraction**:
  - Backend route: `POST /api/media/extract-doc` (`artifacts/api-server/src/routes/media.ts:273-298`).
  - Uses `mammoth.convertToHtml` with custom image handler (`convertImage: mammoth.images.imgElement(imageHandler)`).
  - Persists embedded images to Vercel Blob (`BLOB_READ_WRITE_TOKEN`), Cloudinary (`CLOUDINARY_URL`), or disk in dev (`UPLOADS_DIR`).
  - Returns HTTP 502 with code `DOCUMENT_IMAGE_UPLOAD_FAILED` if any embedded image fails to store (`artifacts/api-server/src/routes/media.ts:286-290`).
  - Sanitizes output via `sanitizeArticleBody()`.
- **PDF Extraction**:
  - Client component `artifacts/anvikshiki/src/app/submit/upload/page.tsx:49-82` imports `pdfjs-dist` dynamically, extracts page text grouped by Y-axis deltas (`Math.abs(y - lastY) > 20`), and formats into HTML paragraphs.
- **Google Docs / Web URL Extraction**:
  - Backend route: `POST /api/extract-url` (`artifacts/api-server/src/routes/extract-url.ts`).
  - SSRF protection via `assertUrlIsSafe`, `fetchWithSsrfGuard`, and IP filter (`isPrivateOrReservedIp`).
  - Normalizes Google Docs URLs (`getGoogleDocumentImport`), checks permission shells (`isGoogleDocumentAccessPage`), extracts CSS rules and styles (`extractSemanticHtml`), stores images, and extracts title & lead excerpt.

### 1.3 Upload Endpoints & Storage Fallbacks
- **Storage Hierarchy in `saveFile` and `POST /api/media/upload`**:
  1. Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
  2. Cloudinary (`CLOUDINARY_URL`)
  3. Local disk (`UPLOADS_DIR` e.g. `/tmp/anvikshiki-uploads`)
  4. In-memory Base64 Data URI fallback for images <= 5MB (`data:${file.mimetype};base64,...`)
  5. Structured error response with `STORAGE_FAILED` code.
- **Binary Signature Verification**:
  - `hasExpectedFileSignature` in `artifacts/api-server/src/lib/file-validation.ts` enforces magic number bytes for JPG, PNG, GIF, WEBP, PDF, DOCX, DOC, TXT, OGG, WAV, WEBM, MP3, M4A.
- **Size Limits**:
  - Images: 10 MB (`MAX_IMAGE_BYTES`)
  - Audio / Voice Notes: 30 MB (`MAX_AUDIO_BYTES`)
  - PDF / Manuscripts: 50 MB (`MAX_MANUSCRIPT_BYTES` / `MAX_PDF_BYTES`)
  - JSON Body limit: 2 MB (`artifacts/api-server/src/app.ts:129`)

### 1.4 Immediate Reflection in Desk & Admin Queue
- **User Dashboard (`/account`)**:
  - `GET /api/submissions` (`artifacts/api-server/src/routes/submissions.ts:634-785`) resolves viewer by ID/email/attribution keys, separates drafts (`status === "DRAFT"`) and active submissions (`status !== "DRAFT"`), matches published slugs from `articlesTable`/`papersTable`, and displays the 4-step progress tracker.
- **Admin Queue (`/admin/submissions`)**:
  - `GET /api/admin/submissions` (`artifacts/api-server/src/routes/admin.ts:463-491`) filters out `DRAFT` items, displays pending/received/under review items with asset badges, embedded PDF/document viewer, and publishing workflow (`ensurePublicPublicationForSubmission`).

### 1.5 Typecheck & Automated Test Results
- `pnpm run typecheck`: Passed with exit code 0 across all 4 projects (`artifacts/anvikshiki`, `artifacts/api-server`, `artifacts/mockup-sandbox`, `scripts`).
- `pnpm --filter @workspace/api-server run test`: All 7 test suites (43 tests) passed cleanly in 2.55s.

---

## 2. Logic Chain

1. **State Continuity**: Inspection of `sessionStorage` keys revealed that `/submit/details` and `/submit/write` use separate keys (`anvikshiki_submit_details` vs `anvikshiki_write_draft`). Users transitioning between metadata input and rich text editing do not have their metadata bridged automatically unless a unified state sync helper is used.
2. **Schema Uniformity**: `POST /api/submissions/upload` normalizes `type` to uppercase via `String(req.body.type || "ESSAY").toUpperCase()`, whereas `POST /api/submissions` expects strict `z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"])`. A case-insensitive transform ensures programmatic callers and client forms never fail validation due to casing.
3. **Storage Resilience**: The storage failover mechanism (Blob → Cloudinary → Local Disk → Base64) provides robust fallback when external cloud tokens are not set in local development or ephemeral serverless environments.
4. **Immediate Visibility**: `POST /api/submissions`, `POST /api/submissions/upload`, and `POST /api/submissions/write` insert directly into `submissionsTable` with the submitter's identity. `GET /api/submissions` and `GET /api/admin/submissions` read directly from the database, ensuring zero lag for user and admin visibility.

---

## 3. Caveats

- In production serverless deployments (e.g. Vercel Lambdas), the local filesystem `/tmp` is ephemeral per execution container. Permanent document and image persistence in production requires `BLOB_READ_WRITE_TOKEN` or `CLOUDINARY_URL`.
- Client-side PDF text extraction via `pdfjs-dist` extracts text layers; scanned documents without embedded text layers require direct PDF file submission (which is fully supported via `manuscriptUrl`).

---

## 4. Conclusion

The Submissions & Uploads Pipeline architecture satisfies Requirement R1:
- Multi-step client navigation covers all manuscript types and entry methods.
- Document import and conversion pipelines handle DOCX (with full embedded image extraction via `mammoth`), PDF (via `pdfjs-dist`), Google Docs, and plain text.
- Upload endpoints handle multipart forms, large files up to 50MB, magic number validation, and storage failovers.
- Submissions reflect immediately in `/account` and `/admin/submissions`.
- Comprehensive analysis report has been documented in `.agents/survey_explorer_1/analysis.md`.

---

## 5. Verification Method

To independently verify the pipeline:
1. Run workspace typecheck:
   ```powershell
   pnpm run typecheck
   ```
2. Run API server test suite:
   ```powershell
   pnpm --filter @workspace/api-server run test
   ```
3. Verify production frontend build:
   ```powershell
   pnpm --filter @workspace/anvikshiki run build
   ```
4. Verify backend build:
   ```powershell
   pnpm --filter @workspace/api-server run build
   ```
