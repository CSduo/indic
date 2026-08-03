# CSduo/indic production-readiness audit

Audit completed 15 July 2026 against `main` at baseline commit `902d87c`.

## Outcome

The repository was pulled into the workspace, audited across the React/Vite frontend, Express API, PostgreSQL/Drizzle data layer, publishing workflow, media paths, authentication, admin tooling, and Vercel configuration, then repaired in place. Existing content was preserved; no live database mutation or destructive migration was performed because `DATABASE_URL` was not available.

## Critical vulnerabilities fixed

- Removed an unauthenticated HTTP account-promotion backdoor that could create an administrator session.
- Corrected publication synchronization so only `PUBLISHED` submissions become public; received, under-review, revision-requested, and accepted work remains private.
- Added shared rich-content sanitization at editor, import, admin, publication, and legacy read boundaries to block scripts, event handlers, unsafe schemes, and malicious markup while preserving long-form formatting.
- Added origin-based CSRF protection, strict credentialed CORS, secure response headers, a Content Security Policy, production HSTS, and safe proxy handling.
- Hardened JWT issuer/audience validation, cookie settings, database-backed admin-session validation, Google audience/email verification, and bcrypt-only administrator bootstrap credentials.
- Removed raw health/debug errors and the data-mutating debug endpoint; malformed JSON now receives a generic JSON error instead of a stack trace.
- Added authentication, response-size limits, content-type limits, and safer network checks to remote URL imports.
- Added byte-signature checks, UUID filenames, extension restrictions, and size limits to document, image, and audio uploads.
- Replaced hard deletes of articles, papers, and submissions with soft deletion and removed unsafe title-based deletion fallbacks.
- Secured scheduled backups with constant-time `CRON_SECRET` Bearer verification. Vercel invokes cron paths with `GET` and can attach `Authorization: Bearer ${CRON_SECRET}`, matching the repaired handler: [Vercel cron security documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Functional and data-flow repairs

- Replaced fake collection and notification endpoints with owned, persistent implementations.
- Replaced the contact form's false-success stub with real webhook/SMTP delivery and an honest `503` when no delivery channel is configured.
- Made newsletter subscription idempotent and enumeration-resistant.
- Added durable status notifications and transactional rollback behavior when publication synchronization fails.
- Fixed the article cover-image field mismatch and rendered research-paper HTML through the shared safe content layer.
- Added an in-page, responsive PDF viewer while retaining open/download fallbacks; original uploaded files remain unchanged.
- Batched saved-item hydration, removed N+1 queries, filtered unpublished/deleted items, and capped/escaped search and pagination inputs.
- Made deployment builds reproducible with a frozen lockfile and removed automatic database schema pushes from every production build.

## Reading and writing upgrades

- Added accessible Light, Dark, and System reading modes with persisted preference, OS-change handling, and no-reload switching.
- Applied a softer light palette and higher-contrast warm dark palette across text, controls, tables, code, quotes, media, and forms.
- Expanded the desktop reading shell to `1120px` while centering normal prose at approximately `88ch`/`920px`; mobile and tablet widths use responsive padding without page-level horizontal scrolling.
- Refined long-form type scale, line height, paragraph rhythm, blockquotes, tables, code, media, and reduced-motion behavior. Shared styles and server-side compatibility sanitization automatically update existing content.
- Expanded the author workspace to `1120px`, reduced the metadata rail to `280px`, set a verified `560px` editor height, and added an Escape-enabled distraction-free mode with a `960px` writing surface.
- Clarified browser-local autosave versus account saves, escaped plain-text imports, restricted imports to supported `.docx`/`.txt` formats, and warns before leaving with selected media that has not been uploaded.

## Accessibility, SEO, and performance

- Added pressed-state theme controls, accessible labels, keyboard focus outlines, responsive table/code scrolling, reduced-motion support, and semantic PDF controls.
- Added canonical URLs, dynamic descriptions, Open Graph/Twitter metadata, `ScholarlyArticle` JSON-LD, crawler exclusions for private areas, and a corrected public sitemap.
- Cancelled stale article/paper requests during navigation, lazy-loaded PDF.js, retained split vendor/PDF bundles, and removed globally loaded Google Identity code when Google login is not configured.
- A fully server-rendered or pre-rendered metadata layer remains advisable for crawlers that do not execute SPA JavaScript.

## Database changes prepared

An additive migration was prepared at `lib/db/migrations/0001_collections_notifications.sql` for collections, collection items, and notifications, with ownership foreign keys, cascade cleanup, uniqueness, and lookup indexes. The matching Drizzle schema is implemented.

The migration was deliberately not applied. Before production rollout:

1. Take and verify a database backup.
2. Review the generated schema diff against the live database.
3. Apply the additive migration (or the reviewed non-force `pnpm db:push`) in a controlled deployment step.
4. Verify counts, ownership, published statuses, slugs, media links, and rollback readiness.

## Verification results

- `pnpm build`: passed for all workspace packages.
- Full TypeScript checking: passed for libraries, frontend, API, mockup sandbox, and scripts.
- Vitest: **4 files, 10 tests, all passed**. Coverage targets rich-content XSS, legacy formatting, file-signature spoofing, pagination/search bounds, liveness, CSRF ordering, CORS behavior, and generic malformed-JSON errors.
- Production dependency audit: **no known vulnerabilities found**.
- Browser verification: home, authentication states, article reader, theme switching/persistence, metadata, editor, focus mode, and desktop/tablet/mobile layouts passed with no error overlay, console warnings, or page-level horizontal overflow.
- Browser-measured widths: reader shell `1120px`, prose `757px` on desktop, editor workspace `1120px`, editor `750px` normally and `958px` in focus mode; 390px and 768px checks remained overflow-free.

## External configuration and remaining validation

Production rollout still requires real infrastructure values and live-data validation:

- Database: `DATABASE_URL`; apply the prepared migration only after backup/review.
- Sessions/admin: strong `AUTH_SECRET`, `ADMIN_SECRET`, `ADMIN_EMAIL`, bcrypt `ADMIN_PASSWORD_HASH`.
- Origin/URLs: `FRONTEND_URL`, `PUBLIC_SITE_URL`, and `VITE_PUBLIC_SITE_URL`.
- Scheduled backup: `CRON_SECRET` plus Neon project/API credentials.
- Optional Google login: matching `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.
- Media and delivery: Cloudinary or durable upload storage, plus SMTP/webhook/notification provider credentials.
- Live database-dependent flows—registration, login, ownership checks, draft persistence, moderation, publishing, collections, notifications, and existing-data reconciliation—must be smoke-tested in a staging environment populated from a sanitized production backup.
- Password recovery is not present in the original product and was not added without an approved mail-delivery and session-revocation design. Treat it as a required follow-up before a broad public launch.

## Change surface

The implementation changes 52 project files across frontend themes and screens, shared renderers, API middleware and routes, tests, database schema/migration, package lock, and both Vercel deployment configurations. No commit, push, deployment, or live database change was performed.
