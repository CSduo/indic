# Requirement R2 Analysis: End-to-End Article & Paper Editing Flow

**Investigator:** Survey Explorer 2 (Article & Paper Editing Flow Explorer)  
**Workspace:** `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo`  
**Date:** 2026-08-15  
**Target Requirement:** Requirement R2 & Associated Acceptance Criteria  

---

## 1. Executive Summary

Requirement R2 mandates a reliable, end-to-end editing pipeline for articles and papers across the user account dashboard (`/account`), the unified editor (`/account/edit/:slug`), and live article/paper views (`/articles/:slug`, `/papers/:slug`). All content modifications—including title, author, category, excerpt/abstract, cover image, rich text body with inline images and audio voice notes, tags, DOI, citation text, and references—must accurately persist to the PostgreSQL database without schema mismatches, missing field mappings, or vulnerability to network blips. Furthermore, updates must reflect immediately on the live view upon saving.

Our investigation identified **7 critical defects and systemic architectural gaps** in the current editing implementation:
1. **Broken Paper Editing Flow:** Published papers cannot be edited. Navigating from `/account` to `/account/edit/:slug` for a paper fails with HTTP 404 because the editor hardcodes calls to `/api/articles/:slug`. Furthermore, the backend has no `PATCH /api/papers/:slug/edit` endpoint.
2. **Incomplete Field Mapping & Data Loss:** The editing form in `EditArticlePage` only exposes 5 fields (`title`, `authorName`, `excerpt`, `body`, `heroImageUrl`). Fields including `categorySlug`, `tags`, `subtitle`, `keyTakeaways`, `references`, `heroImageAlt`, `audioUrl`, `seoTitle`, and `seoDescription` are completely missing from the UI and stripped by the backend `PATCH /api/articles/:slug/edit` Zod validator.
3. **Database Desynchronization (Split-Brain) on Edit:** When an article is edited via `PATCH /api/articles/:slug/edit`, updates are written only to `articlesTable`. The linked record in `submissionsTable` (`sourceSubmissionId`) is left untouched. When automated background reconciliation (`publication-sync.ts` / `ensureLiveSubmissionsPublished`) runs, it overwrites the edited article with stale data from `submissionsTable`.
4. **Authorization Hole in Article Edit Endpoint:** `PATCH /api/articles/:slug/edit` checks only that a user is authenticated (`getUserAuth`), but fails to verify that the requesting user owns the article or is an admin. Any authenticated user can modify any published article on the platform.
5. **Live View Cache Stagnation:** `ArticlePage` utilizes `sessionStorage.getItem("anv_article_" + slug)` for instant restore. When an article is edited and saved, `sessionStorage` is never invalidated, and `ArticlePage` does not listen to the `anv:content-changed` event. As a result, users navigating to the live article immediately see stale, unedited content.
6. **Compulsory Cover Image Validation Trap:** `EditArticlePage` enforces `if (!imgPreview) toast.error("Choosing a cover image is compulsory for articles")`, blocking authors from saving text edits on articles that do not have a cover image, even though the database schema allows nullable cover images.
7. **Preview HTML Double-Escaping Bug:** In `SubmitPreviewPage` (`/submit/preview`), `escapeHtml(draft.body)` is executed before passing HTML to `dangerouslySetInnerHTML`, converting rich HTML into raw escaped text entities (`&lt;p&gt;`, `&lt;figure&gt;`) on the screen.

---

## 2. Architecture & Component Map

The editing subsystem spans frontend single-page application routes, UI components, rich-text WYSIWYG handlers, backend Express API routes, database schemas, and publication reconciliation workers.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT WORKSPACE (Vite + React)                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  User Account Dashboard          Article Reader           Paper Reader                 │
│  artifacts/anvikshiki/.../       artifacts/anvikshiki/    artifacts/anvikshiki/        │
│  app/account/page.tsx            .../articles/[slug]/     .../papers/[slug]/           │
│         │                               ▲                        ▲                     │
│         ▼ (Click 'Edit')                │                        │                     │
│  Unified Editor Route                   │ (Navigate upon save)   │ (No edit link)      │
│  artifacts/anvikshiki/.../              │                        │                     │
│  app/account/edit/[slug]/page.tsx ──────┘                        │                     │
│  - Rich Text contentEditable                                     │                     │
│  - Inline Image & Audio upload                                   │                     │
│  - Missing Paper Schema Handling ────────────────────────────────┼─── [FAILS: 404]     │
└──────────────────────────────────────────────────────────────────┼─────────────────────┘
                                   │                               │
                                   ▼ Fetch / PATCH                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER (Express + Drizzle ORM)                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  artifacts/api-server/src/routes/articles.ts                                           │
│  - GET  /api/articles/:slug       -> Fetches article details                           │
│  - PATCH /api/articles/:slug/edit -> Partially updates articlesTable (No Paper/Sync)   │
│                                                                                        │
│  artifacts/api-server/src/routes/papers.ts                                             │
│  - GET  /api/papers/:slug         -> Fetches paper details                             │
│  - PATCH /api/papers/:slug/edit   -> [MISSING ROUTE]                                   │
│                                                                                        │
│  artifacts/api-server/src/routes/submissions.ts                                        │
│  - GET  /api/submissions/:id      -> Fetches submission / art / paper                  │
│  - PUT  /api/submissions/:id      -> Updates drafts (rejects PUBLISHED)                │
│                                                                                        │
│  artifacts/api-server/src/lib/publication-sync.ts                                      │
│  - ensurePublicPublicationForSubmission -> Overwrites articlesTable from submissions   │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 POSTGRESQL DATABASE                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  lib/db/src/schema/index.ts                                                            │
│  - articlesTable (title, body, tags, categorySlug, heroImageUrl, audioUrl, references) │
│  - papersTable (title, abstract, body, pdfUrl, doi, year, citationText, references)    │
│  - submissionsTable (type, title, abstract, body, domain, notes, coverImageUrl, etc.)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Investigation of Requirement R2 & Acceptance Criteria

### 3.1 End-to-End Editing Pipeline
- **File:** `artifacts/anvikshiki/src/app/account/page.tsx`
  - **Lines 241–249:**
    ```tsx
    {canEdit ? (
      <Link
        href={isPublished && submission.slug ? `/account/edit/${submission.slug}` : `/submit/write?draftId=${submission.id}`}
        className="btn-ink px-2 py-1 text-[10px] text-[var(--gold)] hover:bg-[var(--gold)]/10"
        title={isDraft ? "Resume writing" : "Edit article, images, title, and body text"}
      >
        <Edit3 size={12} /> {isDraft ? "Resume" : "Edit"}
      </Link>
    ) : null}
    ```
  - **Bug Analysis:** For all published items, regardless of whether `submission.type` is `"ESSAY"` or `"PAPER"`, the link target is `/account/edit/${submission.slug}`.
- **File:** `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx`
  - **Lines 56–74:**
    ```tsx
    useEffect(() => {
      if (!slug) return;
      fetch(`${base()}/api/articles/${slug}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => {
          const a = data.article;
          setArticle(a);
          setTitle(a.title || "");
          setAuthorName(a.authorName || "");
          setExcerpt(a.excerpt || "");
          setBody(a.body || "");
          setImgPreview(a.heroImageUrl || "");
          setLoading(false);
        })
        .catch(() => {
          toast.error("Could not load article");
          setLoading(false);
        });
    }, [slug]);
    ```
  - **Bug Analysis:** When a user clicks "Edit" on a published research paper, `fetch('/api/articles/' + slug)` is executed. Since the paper exists in `papersTable` and not `articlesTable`, the API responds with 404, triggering "Could not load article" and rendering an empty error state.
  - Furthermore, `EditArticlePage` has no logic to distinguish or render paper-specific metadata (DOI, Year, Abstract, PDF URL, Citation Text, Peer Review flag, Paper Type).
- **File:** `artifacts/anvikshiki/src/app/papers/[slug]/page.tsx`
  - **Lines 133–148:** The paper detail page provides action buttons ("Cite (BibTeX)", "Download PDF", "ThemeToggle"), but has **no "Edit Paper" button** for the author or administrator, unlike `ArticlePage` (`artifacts/anvikshiki/src/app/articles/[slug]/page.tsx:539-548`).

---

### 3.2 Data Persistence & Schema Mapping Audit

| Entity / Table | Schema Field (`lib/db/src/schema/index.ts`) | Present in `EditArticlePage` UI? | Sent in Save Payload? | Accepted in `PATCH /api/articles/:slug/edit`? | Impact / Failure Mode |
|---|---|---|---|---|---|
| **Article** | `title: text("title")` | Yes (`input#edit-title`) | Yes | Yes | Works |
| **Article** | `authorName: text("author_name")` | Yes (`input#edit-author`) | Yes | Yes | Works |
| **Article** | `excerpt: text("excerpt")` | Yes (`textarea#edit-excerpt`) | Yes | Yes | Works |
| **Article** | `body: text("body")` | Yes (`contentEditable` div) | Yes | Yes | Works |
| **Article** | `heroImageUrl: text("hero_image_url")` | Yes (upload zone) | Yes | Yes | Works (Blocked if null) |
| **Article** | `categorySlug: varchar("category_slug")` | ❌ **No** | ❌ **No** | Yes | Cannot change category |
| **Article** | `tags: text("tags").array()` | ❌ **No** | ❌ **No** | ❌ **No** | Tags cannot be edited |
| **Article** | `subtitle: text("subtitle")` | ❌ **No** | ❌ **No** | ❌ **No** | Subtitle cannot be edited |
| **Article** | `keyTakeaways: text("key_takeaways").array()` | ❌ **No** | ❌ **No** | ❌ **No** | Takeaways cannot be edited |
| **Article** | `references: jsonb("references")` | ❌ **No** | ❌ **No** | ❌ **No** | References cannot be edited |
| **Article** | `heroImageAlt: text("hero_image_alt")` | ❌ **No** | ❌ **No** | ❌ **No** | Alt text cannot be edited |
| **Article** | `audioUrl: text("audio_url")` | ❌ **No** (Hero audio) | ❌ **No** | ❌ **No** | Hero voice note stripped |
| **Article** | `readingMinutes: integer("reading_minutes")` | N/A (Calculated) | N/A | ❌ **No** | Not recalculated on edit |
| **Article** | `seoTitle` / `seoDescription` | ❌ **No** | ❌ **No** | ❌ **No** | SEO metadata omitted |
| **Paper** | `title: text("title")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `abstract: text("abstract")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `body: text("body")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `categorySlug: varchar("category_slug")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `tags: text("tags").array()` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `authorName: text("author_name")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `pdfUrl: text("pdf_url")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `coverImageUrl: text("cover_image_url")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `citationText: text("citation_text")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `references: jsonb("references")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `peerReviewed: boolean("peer_reviewed")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `paperType: paperTypeEnum` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `year: integer("year")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |
| **Paper** | `doi: text("doi")` | ❌ No Paper Editor | ❌ N/A | ❌ **No Endpoint** | Papers cannot be edited |

---

### 3.3 API Route Audit & Security Vulnerabilities

#### Vulnerability 1: Missing Authorization Check in `PATCH /api/articles/:slug/edit`
- **File:** `artifacts/api-server/src/routes/articles.ts`
- **Lines 240–260:**
  ```ts
  router.patch("/articles/:slug/edit", async (req, res) => {
    try {
      const { getUserAuth } = await import("../lib/auth");
      const auth = await getUserAuth(req);
      if (!auth) return res.status(401).json({ error: "You must be logged in to edit" });

      const { slug } = req.params;
      const [row] = await db
        .select({
          article: {
            id: articlesTable.id,
            slug: articlesTable.slug,
            authorName: articlesTable.authorName,
          },
        })
        .from(articlesTable)
        .where(and(eq(articlesTable.slug, slug), eq(articlesTable.status, "PUBLISHED"), isNull(articlesTable.deletedAt)))
        .limit(1);

      if (!row) return res.status(404).json({ error: "Article not found" });
      // Missing: Check if auth.userId / auth.email / viewer owns row.article.authorName OR auth is ADMIN
  ```
- **Security Impact:** Any logged-in user can modify the title, author, abstract, cover image, and body of any published article across the journal.

#### Vulnerability 2: Database Desynchronization Bug on Article Updates
- **File:** `artifacts/api-server/src/routes/articles.ts:282-301` and `artifacts/api-server/src/lib/publication-sync.ts:374-390`
- **Mechanism:**
  1. When an article is submitted, a record is created in `submissionsTable`.
  2. When published, a linked record is created in `articlesTable` with `sourceSubmissionId = submission.id`.
  3. When the author edits the article via `PATCH /api/articles/:slug/edit`, only `articlesTable` is updated. `submissionsTable` retains the original, unedited content.
  4. If an admin triggers "Sync Public Archives" (`/api/admin/submissions/sync-public`) or `ensureLiveSubmissionsPublished()` executes, `ensurePublicPublicationForSubmission` runs:
     ```ts
     await db.update(articlesTable).set({
       title: submission.title || "Untitled Article",
       excerpt: submission.abstract || submission.title,
       body: sanitizeArticleBody(submission.body),
       ...
     }).where(eq(articlesTable.id, existing.id));
     ```
  5. The author's newly saved edits in `articlesTable` are silently overwritten by the old `submissionsTable` record!

#### Vulnerability 3: Completely Missing Paper Update API
- **File:** `artifacts/api-server/src/routes/papers.ts`
- **Observation:** `papers.ts` contains only `GET /api/papers` (line 12) and `GET /api/papers/:slug` (line 118). There is **no `PATCH /api/papers/:slug/edit` or `PUT /api/papers/:slug`**.

---

### 3.4 Live View Revalidation & Multi-Tier Caching Bottlenecks

1. **Client Session Storage Stagnation:**
   - In `ArticlePage` (`artifacts/anvikshiki/src/app/articles/[slug]/page.tsx:161-171`), cached article JSON is read synchronously from `sessionStorage.getItem("anv_article_" + slug)` to render instantly.
   - When saving an edit in `EditArticlePage` (`artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:293-294`), `sessionStorage.removeItem("anv_article_" + slug)` is **never called**.
   - `ArticlePage` has no event listener for `"anv:content-changed"`.
   - Result: Navigating back to the live article after editing renders the stale cached version from `sessionStorage`.

2. **React Query In-Memory Cache Invalidation Gap:**
   - In `artifacts/anvikshiki/src/App.tsx:67-75`, `QueryClient` is configured with `staleTime: 10 * 60 * 1000` (10 minutes) and `gcTime: 30 minutes`.
   - Eager prefetches for `["home-articles"]`, `["home-featured"]`, and `["home-papers"]` store lists in cache.
   - When articles or papers are updated, React Query cache queries are not invalidated. Navigating back to the homepage or browse page continues serving stale article summaries for up to 10 minutes.

3. **HTTP Cache Header Inconsistency:**
   - `GET /api/articles` sets `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600` (`routes/articles.ts:136`).
   - `GET /api/articles/:slug` and `GET /api/papers/:slug` do not set explicit Cache-Control headers, defaulting to browser heuristics.

---

### 3.5 Rich Text Editor, Media Ingestion & Network Resilience

1. **Base64 Inline Image Sanitization Deletion:**
   - When users paste images or when fallback storage generates a Data URI (`data:image/png;base64,...`), `sanitizeArticleBody` (`artifacts/api-server/src/lib/content.ts:72`) processes the HTML using `sanitize-html`.
   - `allowedSchemes` in `content.ts` is `["http", "https", "mailto", "tel"]`.
   - Because `"data"` is omitted from `allowedSchemes`, `sanitize-html` strips the `src` attribute.
   - The rule `exclusiveFilter: frame => frame.tag === "img" && !frame.attribs.src` (line 35) immediately deletes the entire `<img>` tag from the stored body.

2. **Zero Draft Persistence in `EditArticlePage`:**
   - Unlike `SubmitWritePage` (`/submit/write`) which automatically saves drafts to `sessionStorage` and attaches a `beforeunload` warning (`submit/write/page.tsx:814-862`), `EditArticlePage` has **no draft persistence and no `beforeunload` warning**.
   - A single accidental tab closure, page refresh, or network timeout completely wipes all uncommitted revisions.

3. **Double-Escaping Bug in `SubmitPreviewPage`:**
   - In `artifacts/anvikshiki/src/app/submit/preview/page.tsx:94`:
     ```tsx
     <div
       className="prose-anv font-body text-base leading-[1.9] text-[var(--ink-soft)]"
       dangerouslySetInnerHTML={{ __html: escapeHtml(draft.body).replace(/\n/g, "<br />") }}
     />
     ```
   - If `draft.body` is HTML generated by the rich-text editor (containing `<p>`, `<strong>`, `<figure>`), `escapeHtml` turns brackets into `&lt;` and `&gt;`, displaying raw unrendered markup to the author.

---

## 4. Defect Catalog & Root Cause Analysis

| Defect ID | Severity | Location | Summary & Root Cause | Recommended Fix |
|---|---|---|---|---|
| **DEF-R2-01** | **Critical** | `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:58`<br>`artifacts/api-server/src/routes/papers.ts` | **Paper editing completely broken (404).** `/account/edit/:slug` calls `/api/articles/:slug` unconditionally. No `PATCH /api/papers/:slug/edit` route exists on backend. | Implement polymorphic data loader on `/account/edit/:slug` (or dedicated paper edit mode) and add `PATCH /api/papers/:slug/edit` on backend. |
| **DEF-R2-02** | **Critical** | `artifacts/api-server/src/routes/articles.ts:243-260` | **Missing author authorization check on article edit.** Any authenticated user can overwrite any published article. | Verify author ownership (`resolveViewer` identity matching or admin role) before executing article updates. |
| **DEF-R2-03** | **Critical** | `artifacts/api-server/src/routes/articles.ts:282-301`<br>`artifacts/api-server/src/lib/publication-sync.ts:374` | **Database desynchronization upon article update.** `PATCH /api/articles/:slug/edit` updates `articlesTable` but not `submissionsTable`, causing background syncs to overwrite edited articles. | When `PATCH /api/articles/:slug/edit` updates an article, update the linked `submissionsTable` row if `sourceSubmissionId` is set. |
| **DEF-R2-04** | **High** | `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:288`<br>`artifacts/api-server/src/routes/articles.ts:261` | **Incomplete schema mapping & stripped fields.** Category, tags, subtitle, takeaways, references, audioUrl, and alt text are omitted from UI and backend Zod validator. | Add category selector, tags input, audio URL, subtitle, and references to `EditArticlePage` and include in `PATCH /api/articles/:slug/edit` schema. |
| **DEF-R2-05** | **High** | `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:293`<br>`artifacts/anvikshiki/src/app/articles/[slug]/page.tsx:161` | **Live view cache stagnation after saving.** `ArticlePage` restores old data from `sessionStorage` because `EditArticlePage` fails to clear the cache key or dispatch cache bust. | Clear `sessionStorage.removeItem("anv_article_" + slug)` in `handleSave`, invalidate React Query caches, and add `"anv:content-changed"` listener in `ArticlePage`. |
| **DEF-R2-06** | **Medium** | `artifacts/anvikshiki/src/app/account/edit/[slug]/page.tsx:267` | **Compulsory cover image validation blocks save.** Blocks saving edits on text-only articles without images. | Allow nullable cover images consistent with DB schema (`articlesTable.heroImageUrl`). |
| **DEF-R2-07** | **Medium** | `artifacts/anvikshiki/src/app/submit/preview/page.tsx:94` | **Preview page double-escapes HTML body.** Renders raw HTML strings (`&lt;p&gt;`) instead of formatted typography. | Use sanitized HTML rendering without double-escaping when body contains valid markup. |

---

## 5. Recommended Fix Strategy & Architecture Blueprint

### 5.1 Polymorphic / Unified Editor Architecture
1. **Frontend (`/account/edit/:slug`):**
   - On load, query `/api/articles/:slug` and `/api/papers/:slug` (or query `/api/submissions/:slug` / polymorphic loader) to determine whether the item is an Article or a Paper.
   - If Article: render article editing form with Title, Subtitle, Author Name, Category (dropdown from `/api/categories`), Abstract/Excerpt, Cover Image, Audio Reading URL, Tags (comma-separated or badge list), Rich Text Body (with inline image & voice note support), References (JSON/list), and Key Takeaways.
   - If Paper: render paper editing form with Title, Author Name, Category/Discipline, Abstract, Full Text Body, PDF upload/URL, Cover Image, Year, DOI, Paper Type dropdown, Peer Reviewed checkbox, Citation Text, and References.
   - Add local autosave / dirty state tracking with `beforeunload` confirmation to guard against accidental navigation or network disconnects.
   - On save:
     - For articles: `PATCH /api/articles/${slug}/edit`
     - For papers: `PATCH /api/papers/${slug}/edit`
     - Clear `sessionStorage.removeItem("anv_article_" + slug)` and `sessionStorage.removeItem("anv_paper_" + slug)`.
     - Invalidate React Query cache keys (`queryClient.invalidateQueries()`).
     - Dispatch `"anv:content-changed"`.
     - Navigate to `/articles/${slug}` or `/papers/${slug}`.

2. **Backend Endpoints:**
   - **`PATCH /api/articles/:slug/edit`:**
     - Enforce author ownership via `resolveViewer(req)` (or Admin role).
     - Extend Zod schema to accept: `title`, `authorName`, `categorySlug`, `subtitle`, `excerpt`, `body`, `heroImageUrl`, `heroImageAlt`, `audioUrl`, `tags`, `keyTakeaways`, `references`, `seoTitle`, `seoDescription`.
     - Automatically recalculate `readingMinutes` based on updated body word count.
     - Synchronize matching fields to `submissionsTable` if `sourceSubmissionId` is linked.
   - **`PATCH /api/papers/:slug/edit`:**
     - Add endpoint to `artifacts/api-server/src/routes/papers.ts`.
     - Enforce author ownership via `resolveViewer(req)` (or Admin role).
     - Accept: `title`, `authorName`, `categorySlug`, `abstract`, `body`, `pdfUrl`, `coverImageUrl`, `citationText`, `tags`, `references`, `peerReviewed`, `paperType`, `year`, `doi`, `seoTitle`, `seoDescription`.
     - Automatically recalculate `readingMinutes`.
     - Synchronize matching fields to `submissionsTable` if `sourceSubmissionId` is linked.

3. **Live View Cache Invalidation:**
   - In `ArticlePage` (`artifacts/anvikshiki/src/app/articles/[slug]/page.tsx`) and `PaperDetailPage` (`artifacts/anvikshiki/src/app/papers/[slug]/page.tsx`):
     - Add an event listener for `"anv:content-changed"` that triggers an immediate refetch bypassing `sessionStorage`.
     - Add "Edit Paper" action button in `PaperDetailPage` for authenticated owners/admins.

---

## 6. Verification & Test Plan

1. **Automated Unit & Integration Tests:**
   - Add tests in `artifacts/api-server/src/routes/articles.test.ts` verifying:
     - Authorized author can update all article fields (`title`, `categorySlug`, `tags`, `audioUrl`, `references`, `body`).
     - Unauthorized user receives 403 Forbidden when attempting to edit an article they do not own.
     - Updating an article updates both `articlesTable` and linked `submissionsTable`.
   - Add tests in `artifacts/api-server/src/routes/papers.test.ts` verifying:
     - Authorized author can update paper metadata, abstract, body, PDF URL, and references via `PATCH /api/papers/:slug/edit`.
     - Unauthorized user receives 403 Forbidden.
2. **Typecheck & Build Validation:**
   - Execute `pnpm run typecheck` across all packages to ensure zero TypeScript compiler errors.
   - Execute `pnpm run build` to verify production build integrity.
3. **End-to-End User Flow Walkthrough:**
   - Submit an article and a paper from `/account` -> approve/publish -> navigate to `/account` -> click "Edit" on both items.
   - Confirm `/account/edit/:slug` loads both articles and papers with all fields populated.
   - Modify fields (title, category, tags, body, cover image, voice notes) -> save changes.
   - Verify immediate redirect to live view with updated data rendered with zero stale cache delay.
