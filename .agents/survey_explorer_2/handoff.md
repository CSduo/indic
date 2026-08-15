# Handoff Report: Article & Paper Editing Flow Exploration (Requirement R2)

**Agent:** Survey Explorer 2  
**Role:** Article & Paper Editing Flow Explorer  
**Working Directory:** `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo\.agents\survey_explorer_2`  
**Date:** 2026-08-15  
**Handoff Type:** Hard (Task Complete)  

---

## 1. Observation

Direct code inspections and behavioral traces identified the following exact points of failure in the article and paper editing subsystems:

1. **Published Paper Edit Route Failure (404):**
   - In `artifacts/anvikshiki/src/app/account/page.tsx:243`:
     ```tsx
     href={isPublished && submission.slug ? `/account/edit/${submission.slug}` : `/submit/write?draftId=${submission.id}`}
     ```
   - In `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:58`:
     ```tsx
     fetch(`${base()}/api/articles/${slug}`)
     ```
   - When editing a published paper, `/account/edit/:slug` calls `GET /api/articles/${slug}`, which responds with HTTP 404 because papers are stored in `papersTable` and served via `/api/papers/:slug`.

2. **Missing Backend Endpoint for Updating Papers:**
   - In `artifacts/api-server/src/routes/papers.ts:1-166`: Contains only `GET /api/papers` and `GET /api/papers/:slug`. There is no `PATCH /api/papers/:slug/edit` or `PUT /api/papers/:slug`.

3. **Field Stripping & Schema Omissions in Article Editor:**
   - In `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:288`:
     ```tsx
     body: JSON.stringify({ title, authorName, excerpt, body: currentBody, heroImageUrl: finalCover })
     ```
   - In `artifacts/api-server/src/routes/articles.ts:261-271`:
     ```ts
     const parsed = z.object({
       title: z.string().trim().min(1).max(500).optional(),
       authorName: z.string().trim().min(1).max(160).optional(),
       categorySlug: z.string().trim().min(1).max(100).optional(),
       excerpt: z.string().max(5_000).optional(),
       body: z.string().max(500_000).optional(),
       heroImageUrl: z.string().max(2_000).optional().or(z.literal("")).or(z.null()),
     }).safeParse(req.body);
     ```
   - `categorySlug` is missing from `EditArticlePage` form state and save payload.
   - `tags`, `references`, `keyTakeaways`, `subtitle`, `heroImageAlt`, `audioUrl`, `seoTitle`, and `seoDescription` are missing from both form state and backend Zod validator.

4. **Missing Author Authorization in Article Edit API:**
   - In `artifacts/api-server/src/routes/articles.ts:243-260`:
     The endpoint requires authentication (`getUserAuth(req)`), but does not verify whether `auth.userId` or `authorName` matches the article or if the user is an admin. Any authenticated user can modify any published article.

5. **Database Split-Brain / Overwrite Vulnerability:**
   - In `artifacts/api-server/src/routes/articles.ts:282-301`:
     `PATCH /api/articles/:slug/edit` updates only `articlesTable`.
   - In `artifacts/api-server/src/lib/publication-sync.ts:374-390`:
     `ensurePublicPublicationForSubmission` copies data from `submissionsTable` to `articlesTable`. Because `submissionsTable` was not updated during editing, running archive sync or server startup sync overwrites the author's edits in `articlesTable` with stale submission data.

6. **Live View Cache Stagnation:**
   - In `artifacts/anvikshiki/src/app/articles/[slug]/page.tsx:161-171`:
     Article data is cached in `sessionStorage.getItem("anv_article_" + slug)`.
   - In `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:293`:
     `EditArticlePage` dispatches `anv:content-changed` but does not clear `sessionStorage` or invalidate React Query cache, and `ArticlePage` does not listen for `anv:content-changed`.

7. **Preview HTML Double-Escaping Bug:**
   - In `artifacts/anvikshiki/src/app/submit/preview/page.tsx:94`:
     ```tsx
     dangerouslySetInnerHTML={{ __html: escapeHtml(draft.body).replace(/\n/g, "<br />") }}
     ```
   - Calling `escapeHtml` on HTML from the rich text editor causes markup tags (`<p>`, `<img>`, `<blockquote>`) to render as literal text (`&lt;p&gt;`) instead of formatted typography.

---

## 2. Logic Chain

1. Tracing the `/account` dashboard revealed that all published works generate an edit link pointing to `/account/edit/:slug`.
2. Inspecting `EditArticlePage` (`artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx`) showed that it unconditionally issues `GET /api/articles/:slug`. When a user edits a published paper, this fetch fails with HTTP 404 because papers exist in `papersTable` and are queried through `/api/papers/:slug`.
3. Inspecting `artifacts/api-server/src/routes/papers.ts` confirmed that no update endpoint exists for papers, meaning even if the client routed properly, paper edits could not be saved to the database.
4. Comparing the database schema (`lib/db/src/schema/index.ts:58-123`) against `EditArticlePage` and `PATCH /api/articles/:slug/edit` revealed that critical fields (`categorySlug`, `tags`, `references`, `keyTakeaways`, `subtitle`, `audioUrl`, `heroImageAlt`) are absent from the form and excluded by the backend validator.
5. Analyzing background sync routines (`artifacts/api-server/src/lib/publication-sync.ts`) showed that reconciliation is unidirectional (`submissionsTable` -> `articlesTable`). Because `PATCH /api/articles/:slug/edit` writes only to `articlesTable`, any future execution of `syncPublishedSubmissions` or `ensureLiveSubmissionsPublished` will overwrite author edits with unedited submission data.
6. Inspecting the caching architecture in `ArticlePage` and `App.tsx` revealed that `sessionStorage` and React Query in-memory cache persist stale data for up to 10 minutes without invalidation hooks when edits occur.

---

## 3. Caveats

- **External Cloud Storage Providers:** Testing uploads with Vercel Blob and Cloudinary requires active environment tokens (`BLOB_READ_WRITE_TOKEN`, `CLOUDINARY_URL`). In local/test environments without these credentials, the system falls back to disk storage (`/tmp/anvikshiki-uploads`) or Base64 Data URIs.
- **Admin Panel Scope:** Admin editing flows in `/admin/articles` and `/admin/papers` currently lack direct edit UI pages (only listing, publishing toggles, and trash actions are present). Implementing user-facing polymorphic editing on `/account/edit/:slug` will resolve the core author requirement, while admin routes can leverage the same underlying API endpoints.

---

## 4. Conclusion

Requirement R2 cannot be satisfied in the current codebase without resolving:
1. Polymorphic loading and saving in `/account/edit/:slug` (supporting both articles and papers).
2. Addition of `PATCH /api/papers/:slug/edit` in `routes/papers.ts`.
3. Expansion of form fields in `EditArticlePage` and Zod validator in `routes/articles.ts` to cover `categorySlug`, `tags`, `references`, `keyTakeaways`, `subtitle`, `audioUrl`, and `heroImageAlt`.
4. Bidirectional persistence to `submissionsTable` when an article or paper linked via `sourceSubmissionId` is edited.
5. Enforcement of author ownership in `PATCH /api/articles/:slug/edit` and `PATCH /api/papers/:slug/edit`.
6. Cache invalidation on edit (`sessionStorage.removeItem`, `queryClient.invalidateQueries`, and `"anv:content-changed"` listener on reader views).
7. Fixing HTML double-escaping in `SubmitPreviewPage`.

Detailed documentation and remediation specifications have been written to `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo\.agents\survey_explorer_2\analysis.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Paper Edit 404:**
   - Run `pnpm run build` or inspect `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:58`.
   - Send `GET /api/articles/<any-published-paper-slug>`: returns HTTP 404.
2. **Verify Missing Paper Update Route:**
   - Inspect `artifacts/api-server/src/routes/papers.ts`: confirm absence of `router.patch` or `router.put`.
3. **Verify Authorization Gap:**
   - Send `PATCH /api/articles/<slug>/edit` with an authenticated session of a non-author user: request succeeds and modifies the article.
4. **Verify Schema Truncation:**
   - Send `PATCH /api/articles/<slug>/edit` with `{ "tags": ["test"], "categorySlug": "history", "references": [{"title": "Ref"}] }`: check returned article and database row; tags and references remain unpersisted.
5. **Verify Desync Overwrite:**
   - Edit an article linked to a submission via `PATCH /api/articles/:slug/edit`.
   - Trigger `GET /api/sync-live-publications`: observe the article reverting to the submission's original title and body.
