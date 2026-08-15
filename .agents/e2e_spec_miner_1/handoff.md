# Handoff Report: R1 Specification Mining

**Agent:** `e2e_spec_miner_1`  
**Recipient:** `parent` (`045df525-5a67-48dc-9335-2d1d7e75b1f9`)  
**Mission:** Extract complete, precise opaque-box E2E test specifications for Requirement 1 (R1: Submission Pipeline & Uploads).  
**Handoff Type:** Hard  

---

## 1. Observation

1. **Submission Endpoints & Controllers:**
   - `artifacts/api-server/src/routes/submissions.ts`:
     - Line 170: `POST /api/submissions` — Manual JSON submission with `submissionSchema` and consent validation.
     - Line 209: `POST /api/uploads/cloudinary-signature` — User-authenticated upload signature provider.
     - Line 261: `POST /api/submissions/upload` — Dual-mode ingestion handling multipart form data (manuscript $\le 50\text{MB}$, cover $\le 10\text{MB}$, audio $\le 30\text{MB}$) or pre-uploaded CDN URLs.
     - Line 558: `POST /api/submissions/write` — Browser-composed essay submission / draft save with `sanitizeArticleBody` and `countUnresolvedArticleImages` validation.
     - Line 634: `GET /api/submissions` — User submissions and authored works retrieval with `?trashed=true` filter.
     - Line 788: `GET /api/submissions/:id` — Single submission retrieval with ownership/admin check.
     - Line 870: `PUT /api/submissions/:id` — Draft update and promotion to `RECEIVED` status.
     - Line 970: `DELETE /api/submissions/:id` — Soft-deletion of submission and linked publication to Trash.
     - Line 1047: `POST /api/submissions/:id/restore` — Restoration of trashed submission.
     - Line 1120: `DELETE /api/submissions/:id/permanent` — Permanent deletion of trashed submission.
2. **Media & Document Ingestion Endpoints:**
   - `artifacts/api-server/src/routes/media.ts`:
     - Line 121: `POST /api/media/upload` — Context-sensitive media upload (`article_inline`, `avatar`, `paper_pdf`, `submission_cover`, `voice_note`).
     - Line 273: `POST /api/media/extract-doc` — Server-side DOCX (via `mammoth.convertToHtml` + automated embedded image upload) and TXT parser.
   - `artifacts/api-server/src/routes/extract-url.ts`:
     - Line 794: `POST /api/extract-url` — Google Docs and web URL semantic ingestion with SSRF guards, permission lock detection, and image persistence.
   - `artifacts/api-server/src/routes/uploads.ts`:
     - Line 9: `GET /api/uploads/:filename` — Serves local files safely using `path.basename`.
3. **Admin Editorial Endpoints:**
   - `artifacts/api-server/src/routes/admin.ts`:
     - Line 466: `GET /api/admin/submissions` — Admin queue listing (strictly filters out `status = 'DRAFT'`).
     - Line 506: `PATCH /api/admin/submissions/:id` — Status transitions (`ACCEPTED`, `UNDER_REVIEW`, `REVISION_REQUESTED`, `REJECTED`, `PUBLISHED`) with automatic publication creation and rollback resilience on error (`502 PUBLICATION_FAILED`).
     - Line 642: `DELETE /api/admin/submissions/:id` — Admin soft delete (requires linked article/paper in Trash first).
     - Line 677: `POST /api/admin/submissions/:id/restore` — Admin restore.
     - Line 691: `DELETE /api/admin/submissions/:id/permanent` — Admin permanent purge.
     - Line 866: `POST /api/admin/submissions/sync-public-archives` — Publication reconciler.
4. **File Validation & Sanitization Helpers:**
   - `artifacts/api-server/src/lib/file-validation.ts:7`: `hasExpectedFileSignature` validates magic bytes for JPG, PNG, GIF, WEBP, PDF, DOCX, DOC, TXT, OGG, WAV, WEBM, MP3, M4A/MP4.
   - `artifacts/api-server/src/lib/content.ts:72`: `sanitizeArticleBody` strips dangerous HTML tags/attributes while preserving rich article elements.
   - `artifacts/api-server/src/lib/content.ts:84`: `countUnresolvedArticleImages` detects unsaved base64 or blob images.

---

## 2. Logic Chain

1. From observing the API route handlers and Zod schemas, the system supports three distinct submission mechanisms: (a) structured metadata JSON (`POST /api/submissions`), (b) multipart file attachments or pre-uploaded URLs (`POST /api/submissions/upload`), and (c) in-browser rich essay drafts and submissions (`POST /api/submissions/write`).
2. Each route enforces specific authorization, CSRF protection (`sameHost || configured || localDevelopment`), rate limits (20 writes/hr), and payload validation rules (e.g. `consent === true`, non-empty abstracts, and resolution of all embedded images).
3. File uploads enforce strict size caps (10MB for images, 30MB for audio, 50MB for PDF/DOCX) and binary signature verification against spoofed extensions.
4. Storage tiering is designed with a 4-tier fallback: Vercel Blob $\rightarrow$ Cloudinary $\rightarrow$ Local Disk $\rightarrow$ In-memory Base64 (images $\le 5\text{MB}$).
5. Document extraction handles Word DOCX (with embedded image uploads to CDN), TXT (with binary byte rejection), and Google Docs (with SSRF protection against private networks, redirect loops, and permission lock screen detection).
6. State changes in submissions immediately reflect on the user's dashboard (`/account`) across Drafts, In-Review submissions, and Published articles. The admin queue (`/admin/submissions`) manages the review workflow, isolating private drafts from review, and protecting publication with atomic status rollback if public record insertion fails.

---

## 3. Caveats

- **No caveats.** The complete route tree, schemas, MIME validations, error codes, and frontend integration flows for Requirement 1 were fully inspected and documented.

---

## 4. Conclusion

The specification mining for Requirement 1 (R1: Submission Pipeline & Uploads) is complete and comprehensively documented in `report.md`. All endpoints, methods, headers, schemas, file constraints, error payloads, and dashboard/admin reflection mechanisms have been mapped into exact, testable specifications with accompanying feature and edge-case tables.

---

## 5. Verification Method

To verify these findings independently:
1. Inspect `artifacts/api-server/src/routes/submissions.ts`, `artifacts/api-server/src/routes/media.ts`, `artifacts/api-server/src/routes/extract-url.ts`, and `artifacts/api-server/src/routes/admin.ts`.
2. Inspect `artifacts/api-server/src/lib/file-validation.ts` and `artifacts/api-server/src/lib/content.ts`.
3. Run the project tests via `pnpm --filter @workspace/api-server test` (Vitest).
4. Run workspace typechecking via `pnpm run typecheck`.
5. Review the full specification artifact at `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo\.agents\e2e_spec_miner_1\report.md`.
