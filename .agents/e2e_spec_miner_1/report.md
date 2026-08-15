# E2E Test Specification Report: Requirement 1 (R1: Submission Pipeline & Uploads)

**Project:** Ānvīkṣikī Open Journal & Research Platform  
**Integrity Mode:** Development  
**Target Requirement:** R1 — Comprehensive Submission Pipeline Audit & Resilience  
**Author:** `e2e_spec_miner_1` (E2E Test Specification Track)  
**Date:** 2026-08-15  

---

## Executive Summary & Scope

This specification mining report documents the complete, precise, opaque-box and grey-box end-to-end (E2E) testing requirements for **Requirement 1 (R1: Submission Pipeline & Uploads)**. It encompasses all submission routes, file upload pipelines, document ingestion mechanics (Word/DOCX, PDF, Google Docs, plain text), media processing (images, audio voice notes), tiered storage failover systems, strict validation & error topologies, and immediate reflection across user dashboards (`/account`) and the admin review queue (`/admin/submissions`).

---

## 1. Complete API Route & Endpoint Specifications

### 1.1 `POST /api/submissions` (Manual Submission JSON)
- **Purpose:** Primary JSON route for manual submission of manuscripts, essays, papers, reviews, and commentaries.
- **HTTP Method:** `POST`
- **Content-Type:** `application/json`
- **Authentication / Identity Resolution:**
  - Authenticated via `Cookie: user_session=<jwt>` (resolves `userId`, authenticated `name`, and `email` from database).
  - Also accepts anonymous submissions if valid `submitterName` and `submitterEmail` are supplied in payload.
  - Fallback submitter name: `"Anonymous Scholar"`.
- **Security Headers & CSRF Guard:**
  - Rejects cross-origin POST writes with HTTP `403 Forbidden` (`{"error": "Origin not allowed"}` or `{"error": "Cross-site request blocked"}`).
  - Content Security Policy: `default-src 'none'; frame-ancestors 'none'; base-uri 'none'`.
  - Rate limited to 20 writes/hour per IP (`publicWriteLimiter`).
- **Request Body Schema (`Zod`):**
  ```json
  {
    "type": "ESSAY" | "PAPER" | "REVIEW" | "COMMENTARY",
    "submitterName": "string (1-160 chars, trimmed, required)",
    "submitterEmail": "string (valid email, trimmed, lowercased, required)",
    "title": "string (1-500 chars, trimmed, required)",
    "domain": "string (max 160 chars, optional, normalized to category slug)",
    "abstract": "string (1-5000 chars, trimmed, required)",
    "notes": "string (max 2000 chars, optional)",
    "consent": true,
    "audioUrl": "string | null (optional)",
    "audioPublicId": "string | null (optional)"
  }
  ```
  *Note:* `consent` accepts boolean `true` or string `"true"`. If `false` or missing, rejected with 400.
- **Success Response:**
  - **Status Code:** `201 Created`
  - **Response Payload:**
    ```json
    {
      "success": true,
      "submission": {
        "id": "uuid",
        "userId": "uuid | null",
        "submitterName": "string",
        "submitterEmail": "string",
        "type": "ESSAY" | "PAPER" | "REVIEW" | "COMMENTARY",
        "title": "string",
        "domain": "string | null",
        "abstract": "string",
        "notes": "string | null",
        "audioUrl": "string | null",
        "audioPublicId": "string | null",
        "consent": true,
        "status": "RECEIVED",
        "priority": "NORMAL",
        "createdAt": "ISO-8601 timestamp",
        "updatedAt": "ISO-8601 timestamp"
      },
      "publication": null
    }
    ```
- **Error Status Codes & Payloads:**
  - `400 Bad Request`: `{"error": "Invalid input", "details": {...}}` or `{"error": "Consent is required"}`.
  - `403 Forbidden`: `{"error": "Origin not allowed"}` or `{"error": "Cross-site request blocked"}`.
  - `429 Too Many Requests`: `{"error": "Too many requests from this address. Please try again later."}`.
  - `500 Internal Server Error`: `{"error": "Failed"}`.
  - `503 Service Unavailable`: `{"error": "Service database is not configured."}`.

---

### 1.2 `POST /api/submissions/upload` (Multipart File Upload & Direct CDN Ingestion)
- **Purpose:** Ingests file-based manuscripts (DOCX, PDF, DOC, TXT), cover images, and voice notes. Supports dual modes: direct multipart form upload OR JSON metadata with pre-uploaded Cloudinary/Blob URLs.
- **HTTP Method:** `POST`
- **Content-Type:** `multipart/form-data` OR `application/json`
- **Rate Limit:** 20 writes/hour per IP.
- **Multipart Form Fields:**
  - `manuscript` (Binary file, maxCount: 1): PDF, DOC, DOCX, TXT, or Image (max 50 MB for docs, max 10 MB for images).
  - `coverImage` (Binary file, maxCount: 1): JPEG, PNG, WEBP, GIF (max 10 MB).
  - `audio` (Binary file, maxCount: 1): WebM, OGG, WAV, MP3, MPEG, MP4, M4A (max 30 MB).
  - Form text fields: `submitterName`, `submitterEmail`, `title`, `domain`, `abstract`, `type`, `consent`, `keywords`, `notes`.
- **JSON Payload Fields (when pre-uploaded):**
  - `manuscriptUrl`, `manuscriptPublicId`, `manuscriptResourceType`
  - `coverUrl` / `coverImageUrl`, `coverPublicId` / `coverImagePublicId`, `coverResourceType` / `coverImageResourceType`
  - `audioUrl`, `audioPublicId`
  - `submitterName`, `submitterEmail`, `title`, `domain`, `abstract`, `type`, `consent`, `keywords`, `notes`
- **Storage Tiering & Failover Execution:**
  1. **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`): Stores to `anvikshiki/<subFolder>-<uuid>.<ext>`.
  2. **Cloudinary** (`CLOUDINARY_URL`): Uploads stream to folder `anvikshiki/<subFolder>`.
  3. **Local / Serverless Disk** (`/tmp/anvikshiki-uploads` or `UPLOADS_DIR`): Saves to filesystem, served via `/api/uploads/<filename>`.
  4. **Base64 Data URI Fallback**: For images $\le$ 5 MB (`data:image/...;base64,...`).
- **Success Response:**
  - **Status Code:** `201 Created`
  - **Response Payload:**
    ```json
    {
      "success": true,
      "submission": { "id": "uuid", "title": "...", "status": "RECEIVED", ... },
      "publication": null,
      "files": {
        "manuscriptUrl": "https://... | /api/uploads/...",
        "coverUrl": "https://... | /api/uploads/... | null",
        "audioUrl": "https://... | /api/uploads/... | null"
      }
    }
    ```
- **Error Status Codes & Payloads:**
  - `400 Bad Request`: `{"error": "Invalid submission", "details": {...}}` or `{"error": "File type not allowed"}` or `{"error": "Uploaded file content does not match its extension"}`.
  - `413 Payload Too Large`:
    - `{"error": "Cover images must be 10 MB or smaller"}` (when cover > 10MB)
    - `{"error": "The uploaded manuscript exceeds the allowed file size"}` (when doc > 50MB or img > 10MB)
    - `{"error": "Audio files must be 30 MB or smaller"}` (when audio > 30MB)
  - `500 Internal Server Error`: `{"error": "Upload failed"}` or `{"error": "Upload storage is not configured...", "code": "BLOB_STORAGE_MISSING"}`.

---

### 1.3 `POST /api/submissions/write` (In-Browser Rich Essay & Draft Pipeline)
- **Purpose:** Saves drafts or submits full in-browser rich-text manuscripts with embedded HTML, inline images, and voice notes.
- **HTTP Method:** `POST`
- **Content-Type:** `application/json`
- **Authentication:**
  - `status: "DRAFT"`: **Requires signed-in user** (`401 Unauthorized` if unauthenticated). Drafts must be resumable and owned.
  - `status: "RECEIVED"`: Publicly available or authenticated.
- **Request Body Schema (`Zod`):**
  ```json
  {
    "type": "ESSAY" | "PAPER" | "REVIEW" | "COMMENTARY",
    "submitterName": "string (optional, max 160 chars)",
    "submitterEmail": "string (optional, valid email)",
    "title": "string (optional, max 500 chars, defaults to 'Untitled draft')",
    "domain": "string (optional, max 160 chars)",
    "abstract": "string (optional, max 10000 chars)",
    "body": "string (max 500000 chars HTML)",
    "notes": "string (optional, max 5000 chars)",
    "consent": boolean | "true" | "false" (optional for drafts, required for submission),
    "status": "DRAFT" | "RECEIVED" (default: "RECEIVED"),
    "audioUrl": "string | null (optional)",
    "audioPublicId": "string | null (optional)"
  }
  ```
- **Validation Rules & Boundary Checks:**
  - **Unresolved Image Guard (`countUnresolvedArticleImages`):** Body is checked for `<img src="...">` tags that contain local `blob:`, `data:` or non-persisted image URLs. If any are found, rejected with HTTP `400`:
    ```json
    {
      "error": "1 embedded image is not stored. Import the DOCX or upload the images before saving.",
      "code": "UNRESOLVED_ARTICLE_IMAGES"
    }
    ```
  - **Sanitization Boundary (`sanitizeArticleBody`):** Sanitizes HTML preserving allowed tags (`p`, `h1`-`h6`, `blockquote`, `ul`, `ol`, `li`, `strong`, `em`, `u`, `s`, `figure`, `figcaption`, `img`, `audio`, `source`, `table`, `sup`, `sub`) while stripping malicious scripts, event handlers, and protocol-relative links.
  - If `status === "RECEIVED"`:
    - `consent` must be `true` (coerced).
    - `abstract` must not be whitespace-only.
    - `body` must not be empty.
- **Success Response:** `201 Created` with `{ "success": true, "submission": {...}, "publication": null }`.

---

### 1.4 `POST /api/media/upload` (General Media Upload Endpoint)
- **Purpose:** Uploads images, avatar pictures, audio voice notes, and paper PDFs with context-aware validation.
- **HTTP Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Authentication:** `getUserAuth(req)` OR `getAdminAuth(req)` required (`401 Unauthorized` if unauthenticated).
- **Multipart Field:** `file` (single file).
- **Form Field:** `context` (allowed values: `"article_inline"`, `"avatar"`, `"paper_pdf"`, `"submission_cover"`, `"voice_note"`, default: `"article_inline"`).
- **Context Constraints & Limits:**
  - `context: "paper_pdf"` $\rightarrow$ Must have MIME `application/pdf` and extension `.pdf`. Limit: 50 MB.
  - If file is PDF and context is NOT `"paper_pdf"` $\rightarrow$ HTTP `400 Bad Request` (`{"error": "PDF uploads are only supported for paper files"}`).
  - `context: "voice_note"` $\rightarrow$ Audio MIME types only (WebM, OGG, WAV, MP3, M4A). Limit: 30 MB.
  - `context: "submission_cover"` / `"avatar"` / `"article_inline"` $\rightarrow$ Image MIME types only (JPEG, PNG, WEBP, GIF). Limit: 10 MB.
- **Magic Bytes Signature Check (`hasExpectedFileSignature`):** Enforces that buffer matches the declared extension.
- **Storage Tiering:** Vercel Blob $\rightarrow$ Cloudinary $\rightarrow$ Local Disk $\rightarrow$ Base64 ($\le$ 5MB images).
- **Database Entry:** Inserts record into `media_assets` table.
- **Success Response:**
  - **Status Code:** `201 Created`
  - **Response Payload:**
    ```json
    {
      "success": true,
      "url": "https://... | /api/uploads/...",
      "mediaAsset": {
        "id": "uuid",
        "url": "...",
        "storageKey": "...",
        "mimeType": "...",
        "extension": ".png",
        "sizeBytes": 12345,
        "context": "submission_cover",
        "createdAt": "..."
      }
    }
    ```
- **Error Codes:** `400 Bad Request` (invalid context, signature mismatch), `401 Unauthorized`, `413 Payload Too Large` (`{"error": "Image files must be 10 MB or smaller"}` etc.), `429`, `500`.

---

### 1.5 `POST /api/media/extract-doc` (DOCX & Plain Text Document Extraction)
- **Purpose:** Parses uploaded `.docx` and `.txt` files into sanitized HTML for live insertion into the browser editor.
- **HTTP Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Authentication:** `getUserAuth(req)` OR `getAdminAuth(req)` required (`401 Unauthorized` if unauthenticated).
- **Multipart Field:** `file` (single file, limit: 50 MB, allowed extensions: `.docx`, `.txt`).
- **Processing Logic:**
  - **Plain Text (`.txt`):**
    - Checks for binary zero bytes (`file.buffer.includes(0)`). If found, returns `400` (`{"error": "The text file contains binary data"}`).
    - Splits text on double newlines (`\n{2,}`), escapes HTML characters, formats as `<p>...</p>`, runs through `sanitizeArticleBody`.
  - **Word DOCX (`.docx`):**
    - Verifies PK ZIP header `[0x50, 0x4b, 0x03, 0x04]`.
    - Parses document structure with `mammoth.convertToHtml`.
    - **Embedded Image Extraction:** Uses custom `mammoth.images.imgElement` handler. For every embedded image in the DOCX:
      - Validates image MIME type and $\le 10\text{ MB}$ limit.
      - Streams and stores image into Vercel Blob / Cloudinary / Local disk.
      - Replaces embedded `<img>` tag `src` with the persisted CDN URL.
      - If any embedded image upload fails: returns HTTP `502 Bad Gateway`:
        ```json
        {
          "error": "The document text was read, but one or more embedded images could not be stored. Nothing was imported; please retry.",
          "code": "DOCUMENT_IMAGE_UPLOAD_FAILED"
        }
        ```
- **Success Response:** `200 OK` with `{ "html": "<p>Formatted article text...</p>" }`.

---

### 1.6 `POST /api/extract-url` (Google Docs & Web URL Semantic Ingestion)
- **Purpose:** Safely extracts structured semantic HTML, metadata, and embedded images from public Google Docs or web URLs.
- **HTTP Method:** `POST`
- **Content-Type:** `application/json`
- **Authentication:** User authentication required (`401 Unauthorized`).
- **Request Body:** `{ "url": "https://docs.google.com/document/d/... | https://example.com/article" }`
- **Security & SSRF Protections:**
  - Verifies URL protocol is `http:` or `https:`. Rejects embedded credentials.
  - Rejects `localhost` and performs DNS resolution on hostname.
  - Blocks all private/reserved IPv4 and IPv6 ranges (loopback `127.0.0.0/8`, `::1`, private `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local `169.254.0.0/16` metadata, carrier-grade NAT `100.64.0.0/10`, IPv4-mapped IPv6).
  - Enforces manual redirection limit (maximum 3 hops), re-checking SSRF safety on each hop.
- **Google Docs Import Specialization:**
  - Detects `docs.google.com/document/d/<id>` and converts automatically to `/export?format=html`.
  - Detects published docs `docs.google.com/document/d/e/<id>/pub`.
  - Inspects document body for Google sign-in / permission lock screens (`isGoogleDocumentAccessPage`). If private, returns `422 Unprocessable Entity`:
    ```json
    {
      "error": "Google Docs could not be imported. Set sharing to \"Anyone with the link\" and permission to \"Viewer\", then try again."
    }
    ```
  - Parses CSS styles from `<style>` tags to preserve semantic block types (`h1`, `h2`, `h3`, `blockquote`, `ul`, `ol`, `strong`, `em`, `u`, `s`, `sup`, `sub`).
  - Automatically persists embedded Google Doc base64 images to CDN. If storage fails on Google Docs embedded images, returns `502 Bad Gateway`.
  - Extracts title (`extractDocumentTitle`), lead excerpt (`extractLeadExcerpt`), and `firstImageUrl` (only if stored in journal's own CDN).
- **Success Response:**
  - **Status Code:** `200 OK`
  - **Payload:**
    ```json
    {
      "html": "<p>Extracted and sanitized HTML...</p>",
      "url": "https://docs.google.com/document/d/...",
      "title": "Document Title",
      "excerpt": "Lead excerpt sentence...",
      "coverImageUrl": "https://... | ''"
    }
    ```
- **Error Codes:** `400` (invalid URL/SSRF violation), `401`, `408` (timeout), `415` (non-HTML response), `422` (access denied or empty content), `502` (embedded image persistence failure).

---

### 1.7 `POST /api/uploads/cloudinary-signature` (Direct Browser CDN Upload Signature)
- **Purpose:** Generates secure HMAC-SHA1 upload signatures for direct client-to-Cloudinary uploads.
- **HTTP Method:** `POST`
- **Authentication:** `getUserAuth(req)` required (`401 Unauthorized`).
- **Response:** `200 OK` with `{ cloudName, apiKey, timestamp, signature, folder: "anvikshiki/submissions/<userId>" }`.
- **Error Behavior:** If Cloudinary is unconfigured or invalid, returns `500` (`CLOUDINARY_NOT_CONFIGURED` / `CLOUDINARY_CONFIG_INVALID`).

---

### 1.8 `GET /api/uploads/:filename` (Static File Delivery)
- **Purpose:** Serves local uploads from `/tmp/anvikshiki-uploads` or `UPLOADS_DIR`.
- **Security:** Path traversal prevention via `path.basename(filename)`.
- **Headers:** Sets `Content-Type: application/pdf` for `.pdf`, `nosniff`, `Content-Disposition: inline` (for PDF/images/audio) or `attachment`.
- **Status Codes:** `200 OK` with binary stream; `404 Not Found` if file does not exist.

---

## 2. File Upload Limits, Supported MIME Types & Magic Bytes Signatures

| File Category | Max Size Limit | Supported MIME Types | Allowed Extensions | Magic Bytes Signature Check |
| :--- | :--- | :--- | :--- | :--- |
| **Cover Images** | **10 MB** (`MAX_IMAGE_BYTES`) | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` | JPG: `FF D8 FF`<br>PNG: `89 50 4E 47 0D 0A 1A 0A`<br>GIF: `GIF87a` / `GIF89a`<br>WEBP: `RIFF....WEBP` |
| **Audio / Voice Notes** | **30 MB** (`MAX_AUDIO_BYTES`) | `audio/webm`, `audio/ogg`, `audio/wav`, `audio/mp3`, `audio/mpeg`, `audio/mp4`, `audio/m4a`, `audio/x-m4a` | `.webm`, `.ogg`, `.wav`, `.mp3`, `.m4a` | WEBM: `1A 45 DF A3`<br>OGG: `OggS`<br>WAV: `RIFF....WAVE`<br>MP3: `ID3` or `FF Ex`<br>M4A/MP4: `....ftyp` |
| **Manuscript Documents & Papers** | **50 MB** (`MAX_MANUSCRIPT_BYTES` / `MAX_PDF_BYTES`) | `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword`, `text/plain` | `.pdf`, `.docx`, `.doc`, `.txt` | PDF: `%PDF-`<br>DOCX: `50 4B 03 04` (PK Zip)<br>DOC: `D0 CF 11 E0 A1 B1 1A E1`<br>TXT: Non-zero bytes (`!b.includes(0)`) |

---

## 3. User Dashboard & Admin Queue Reflection Endpoints

### 3.1 User Account Desk (`/account`)
- **Query Endpoint:** `GET /api/submissions` (and `GET /api/submissions?deleted=true` for Trash)
- **Headers:** `Cookie: user_session=<jwt>`
- **Query Behavior:**
  - Queries active user submissions matching `userId` OR author email.
  - Queries published articles and papers attributed to the user's name or email prefix.
  - Links corresponding public slugs (`/articles/:slug` or `/papers/:slug`).
  - Separates works into **Drafts** (`status: "DRAFT"`) and **Editorial Submissions** (`status: "RECEIVED"`, `"UNDER_REVIEW"`, `"ACCEPTED"`, `"PUBLISHED"`).
  - Displays 4-step progress tracker: `Received` $\rightarrow$ `Under Review` $\rightarrow$ `Accepted` $\rightarrow$ `Published`.
  - Supports actions:
    - `Resume` / `Edit`: Links to `/submit/write?draftId=<id>` for drafts, or `/account/edit/<slug>` for published works.
    - `Hide / Trash`: Calls `DELETE /api/submissions/:id` (moves active submission and linked public article/paper to Trash).
    - `Restore`: Calls `POST /api/submissions/:id/restore`.
    - `Delete Forever`: Calls `DELETE /api/submissions/:id/permanent`.

### 3.2 Admin Editorial Queue (`/admin/submissions`)
- **Query Endpoint:** `GET /api/admin/submissions` (and `GET /api/admin/submissions?trashed=true`)
- **Headers:** `Cookie: admin_session=<jwt>`
- **Filter Tabs:** `all`, `received`, `under_review`, `revision_requested`, `accepted`, `rejected`, `published`, `trash`.
- **Critical Isolation Rule:** Private drafts (`status === "DRAFT"`) are **strictly filtered out** and never surface in the admin editorial queue.
- **Admin Review & Publication Operations:**
  - **Approve:** `PATCH /api/admin/submissions/:id` with `{ status: "ACCEPTED", editorNotes }`.
  - **Under Review:** `PATCH /api/admin/submissions/:id` with `{ status: "UNDER_REVIEW", editorNotes }`.
  - **Request Revision:** `PATCH /api/admin/submissions/:id` with `{ status: "REVISION_REQUESTED", editorNotes }`.
  - **Reject:** `PATCH /api/admin/submissions/:id` with `{ status: "REJECTED", editorNotes }`.
  - **Publish to Public Site:** `PATCH /api/admin/submissions/:id` with `{ status: "PUBLISHED", categorySlug }`.
    - Automatically invokes `ensurePublicPublicationForSubmission()`.
    - Creates or updates live public record in `articlesTable` or `papersTable`.
    - If publication creation fails, **automatically rolls back submission status** to previous and returns HTTP `502 Bad Gateway` (`PUBLICATION_FAILED`).
    - Compulsory check: requires cover image before publishing as an article.
  - **Unpublish:** `PATCH /api/admin/submissions/:id` with `{ status: "ACCEPTED" }` (sets linked public article/paper to `ARCHIVED`).
  - **Reconcile Publications:** `POST /api/admin/submissions/sync-public-archives` (reconciles linked public articles and papers).

---

## 4. Discovered Features & Full Interface Inventory

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Submissions | Manual JSON Submission | Submits essay/paper metadata and text via JSON | JSON payload: `title`, `submitterName`, `submitterEmail`, `type`, `abstract`, `consent: true`, `domain`, `notes` | `201 Created` with created submission object | `400` on validation failure or missing consent; `403` on CSRF failure; `429` on rate limit | `artifacts/api-server/src/routes/submissions.ts:170` |
| 2 | Submissions | Multipart File Submission | Ingests file manuscripts (PDF/DOCX/TXT), cover images, voice notes | `multipart/form-data` with fields `manuscript`, `coverImage`, `audio`, plus metadata | `201 Created` with submission & file URLs | `400` on mime mismatch; `413` on size limit; `500` on storage fail | `artifacts/api-server/src/routes/submissions.ts:260` |
| 3 | Submissions | In-Browser Rich Draft Save | Allows authenticated users to save in-progress browser drafts | JSON payload with `status: "DRAFT"`, `body`, `title`, `type` | `201 Created` with saved draft object | `401` if not authenticated; `400` if unresolved inline images present | `artifacts/api-server/src/routes/submissions.ts:558` |
| 4 | Submissions | In-Browser Full Submission | Submits completed browser-composed essay for editorial review | JSON payload with `status: "RECEIVED"`, `body`, `abstract`, `consent: true` | `201 Created` with submission record | `400` on missing required fields or unresolved images | `artifacts/api-server/src/routes/submissions.ts:595` |
| 5 | Uploads | General Media Upload | Uploads inline images, cover images, PDFs, and audio voice notes | `multipart/form-data` with `file` and `context` (`article_inline`, `avatar`, `paper_pdf`, `submission_cover`, `voice_note`) | `201 Created` with public URL and media asset record | `400` on signature/context mismatch; `401` if unauthenticated; `413` if size exceeded | `artifacts/api-server/src/routes/media.ts:121` |
| 6 | Document Import | Word DOCX Extraction | Converts `.docx` file to HTML and auto-uploads embedded images | `multipart/form-data` with `.docx` file | `200 OK` with sanitized `{ html }` | `400` on invalid DOCX; `502` if embedded images fail to store | `artifacts/api-server/src/routes/media.ts:273` |
| 7 | Document Import | Plain Text Ingestion | Converts `.txt` file into structured `<p>` paragraphs | `multipart/form-data` with `.txt` file | `200 OK` with sanitized `{ html }` | `400` if file contains binary/null bytes | `artifacts/api-server/src/routes/media.ts:295` |
| 8 | Document Import | Google Docs Import | Ingests public Google Docs URL with SSRF guards & embedded images | JSON `{ url: "https://docs.google.com/document/d/..." }` | `200 OK` with `{ html, title, excerpt, coverImageUrl }` | `400` on private IP; `422` if doc is private; `502` if images fail | `artifacts/api-server/src/routes/extract-url.ts:794` |
| 9 | Uploads | Cloudinary Upload Signature | Issues HMAC-SHA1 signature for direct client-to-CDN upload | JSON `{ folder }` with user auth cookie | `200 OK` with `{ cloudName, apiKey, timestamp, signature, folder }` | `401` if unauthenticated; `500` if Cloudinary unconfigured | `artifacts/api-server/src/routes/submissions.ts:209` |
| 10 | User Desk | User Submissions Listing | Retrieves author's active submissions and published works | `GET /api/submissions` with user auth cookie | `200 OK` with `{ submissions: [...] }` | `401` if unauthenticated; `500` on DB error | `artifacts/api-server/src/routes/submissions.ts:634` |
| 11 | User Desk | User Trashed Listing | Retrieves soft-deleted submissions in trash | `GET /api/submissions?trashed=true` | `200 OK` with `{ submissions: [...] }` | `401` if unauthenticated | `artifacts/api-server/src/routes/submissions.ts:640` |
| 12 | User Desk | Single Submission View | Fetches details and content of a submission or draft | `GET /api/submissions/:id` | `200 OK` with `{ submission: {...} }` | `401` unauth; `403` forbidden; `404` not found | `artifacts/api-server/src/routes/submissions.ts:788` |
| 13 | User Desk | Draft Update & Promotion | Updates draft or submits draft for review (`status: RECEIVED`) | `PUT /api/submissions/:id` with JSON body | `200 OK` with updated submission | `400` on validation; `403` if immutable; `409` if in trash | `artifacts/api-server/src/routes/submissions.ts:870` |
| 14 | User Desk | Submission Soft Deletion | Moves active submission and linked public article to Trash | `DELETE /api/submissions/:id` | `200 OK` with `{ success: true, submission }` | `401` unauth; `403` forbidden; `404` not found; `409` in trash | `artifacts/api-server/src/routes/submissions.ts:970` |
| 15 | User Desk | Submission Restore | Restores soft-deleted submission and linked article | `POST /api/submissions/:id/restore` | `200 OK` with `{ success: true, submission }` | `401` unauth; `403` forbidden; `409` not in trash | `artifacts/api-server/src/routes/submissions.ts:1047` |
| 16 | User Desk | Permanent Deletion | Permanently deletes submission (only if already in Trash) | `DELETE /api/submissions/:id/permanent` | `200 OK` with `{ success: true }` | `409` if not in trash first | `artifacts/api-server/src/routes/submissions.ts:1121` |
| 17 | Admin Queue | Admin Submissions Listing | Lists submissions for editorial review (DRAFTs hidden) | `GET /api/admin/submissions` with admin auth | `200 OK` with `{ submissions, total }` | `401` unauth; `403` forbidden | `artifacts/api-server/src/routes/admin.ts:466` |
| 18 | Admin Queue | Admin Status & Notes Update | Updates submission review status (`ACCEPTED`, `REJECTED`, etc.) | `PATCH /api/admin/submissions/:id` with `{ status, editorNotes }` | `200 OK` with updated submission | `400` invalid status; `401` unauth; `404` not found | `artifacts/api-server/src/routes/admin.ts:506` |
| 19 | Admin Queue | Admin Publish with Rollback | Publishes submission as live article/paper; rolls back on error | `PATCH /api/admin/submissions/:id` with `{ status: "PUBLISHED", categorySlug }` | `200 OK` with `{ submission, publication }` | `502` if live article creation fails (rolls back status) | `artifacts/api-server/src/routes/admin.ts:556` |
| 20 | Admin Queue | Admin Unpublish | Unpublishes live article/paper and sets status to ARCHIVED | `PATCH /api/admin/submissions/:id` with `{ status: "ACCEPTED" }` | `200 OK` with updated submission | `401` unauth; `404` not found | `artifacts/api-server/src/routes/admin.ts:619` |
| 21 | Admin Queue | Admin Soft & Hard Deletion | Admin soft delete and permanent purge with relation guards | `DELETE /api/admin/submissions/:id` & `.../permanent` | `200 OK` with `{ success: true }` | `409` if linked article/paper not trashed/deleted first | `artifacts/api-server/src/routes/admin.ts:642` |
| 22 | Admin Queue | Public Archive Reconciliation | Reconciles all linked public articles and papers with submissions | `POST /api/admin/submissions/sync-public-archives` | `200 OK` with `{ success: true, message }` | `401` unauth; `403` forbidden | `artifacts/api-server/src/routes/admin.ts:866` |

---

## 5. Edge Cases & Boundary Behaviors

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---|---|---|
| 1 | POST /api/submissions | Consent field is boolean `false` or missing | Rejection with HTTP `400 Bad Request` (`{"error": "Consent is required"}`). |
| 2 | POST /api/submissions | Cross-origin request with disallowed `Origin` header | Rejection with HTTP `403 Forbidden` (`{"error": "Origin not allowed"}`). |
| 3 | POST /api/submissions/upload | Cover image file size = 10.5 MB (exceeds 10 MB limit) | Rejection with HTTP `413 Payload Too Large` (`{"error": "Cover images must be 10 MB or smaller"}`). |
| 4 | POST /api/submissions/upload | PDF file uploaded with image extension (`fake.png` containing `%PDF-`) | Rejection with HTTP `400 Bad Request` (`{"error": "Uploaded file content does not match its extension"}`). |
| 5 | POST /api/submissions/upload | File upload when Vercel Blob and Cloudinary are both offline | Automatic graceful failover to local disk (`/tmp/anvikshiki-uploads`), returning `/api/uploads/<filename>`. |
| 6 | POST /api/submissions/upload | Image file upload $\le$ 5 MB when all storage providers fail | Final failover to in-memory Base64 Data URI (`data:image/png;base64,...`). |
| 7 | POST /api/submissions/write | `status: "DRAFT"` without authentication cookie | Rejection with HTTP `401 Unauthorized` (`{"error": "Sign in to save a draft"}`). |
| 8 | POST /api/submissions/write | Body contains raw `data:image/...` or `blob:...` inline image URLs | Rejection with HTTP `400 Bad Request` (`{"error": "...embedded images are not stored...", "code": "UNRESOLVED_ARTICLE_IMAGES"}`). |
| 9 | POST /api/submissions/write | Body contains `<script>alert(1)</script>` or `onload=...` handlers | Sanitizer removes `<script>` and event attributes while preserving safe article structure. |
| 10 | POST /api/media/upload | PDF uploaded with `context: "submission_cover"` | Rejection with HTTP `400 Bad Request` (`{"error": "PDF uploads are only supported for paper files"}`). |
| 11 | POST /api/media/extract-doc | Plain text file containing binary zero byte (`\0`) | Rejection with HTTP `400 Bad Request` (`{"error": "The text file contains binary data"}`). |
| 12 | POST /api/media/extract-doc | Word DOCX with corrupted or missing embedded image stream | Returns HTTP `502 Bad Gateway` (`{"error": "...embedded images could not be stored...", "code": "DOCUMENT_IMAGE_UPLOAD_FAILED"}`). |
| 13 | POST /api/extract-url | Requesting `http://169.254.169.254/latest/meta-data` (Cloud metadata SSRF) | Blocked by SSRF guard with HTTP `400 Bad Request` (`{"error": "Requests to private, internal, or reserved network addresses are not allowed"}`). |
| 14 | POST /api/extract-url | Requesting private Google Doc requiring login credentials | Detected as Google login shell, returns HTTP `422 Unprocessable Entity` (`{"error": "...Set sharing to 'Anyone with the link' and permission to 'Viewer'..."}`). |
| 15 | GET /api/admin/submissions | Database contains user drafts with `status: "DRAFT"` | Drafts are excluded from admin queue results via `ne(submissionsTable.status, "DRAFT")`. |
| 16 | PATCH /api/admin/submissions/:id | Publishing submission when public article creation throws an unhandled error | Rollback: status is immediately reverted to previous status (`ACCEPTED`) and returns HTTP `502 Bad Gateway` (`{"error": "...", "code": "PUBLICATION_FAILED"}`). |
| 17 | DELETE /api/submissions/:id | Deleting a live published article from User Desk | Atomically soft-deletes both submission and linked public article (`deletedAt = now`), unpublishing from live site. |
| 18 | DELETE /api/submissions/:id/permanent | Permanent deletion attempt on an active submission (not in Trash) | Rejection with HTTP `409 Conflict` (`{"error": "Move the submission to Trash before permanently deleting it"}`). |
| 19 | DELETE /api/admin/submissions/:id | Admin deleting a submission that still has an active linked public article | Rejection with HTTP `409 Conflict` (`{"error": "Move the linked public article or paper to Trash before deleting this submission"}`). |

---

## 6. E2E Verification & Test Strategy Plan

To verify Requirement 1 E2E compliance without visual degradation:
1. **Automated API Integration Tests (Vitest + Supertest):**
   - Execute test cases covering every status code (`201`, `400`, `401`, `403`, `409`, `413`, `415`, `422`, `502`).
   - Test multipart uploads with valid and invalid magic bytes.
   - Test rate-limiting enforcement on writes.
   - Test draft lifecycle: Create draft $\rightarrow$ Update draft $\rightarrow$ Promote to submission $\rightarrow$ Verify appearance in `/account` and `/admin/submissions`.
   - Test editorial lifecycle: Admin approves submission $\rightarrow$ Admin publishes submission $\rightarrow$ Verify live article created $\rightarrow$ Admin unpublishes $\rightarrow$ Verify soft delete / trash isolation.
2. **Typecheck & Build Checks:**
   - `pnpm run typecheck` across all workspace packages (`@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`, `@workspace/api-server`, `artifacts/anvikshiki`).
   - `pnpm run build` production build validation.
