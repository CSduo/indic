# Ānvīkṣikī — Journal & Research Platform

A premium intellectual journal and research platform for publishing essays, papers, and research across philosophy, history, psychology, sociology, science, and geopolitics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/anvikshiki run dev` — run the frontend (port from `$PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React 18, Tailwind v4, wouter routing
- API: Express 5 (port 8080)
- DB: PostgreSQL + Drizzle ORM
- Auth: jose JWT + bcryptjs, HTTP-only cookies (`user_session` 7d, `admin_session` 8h)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/anvikshiki/src/App.tsx` — wouter router, all routes defined
- `artifacts/anvikshiki/src/app/` — page components (Next.js `app/` structure, migrated to client components)
- `artifacts/anvikshiki/src/components/` — shared components (BrandHeader, MobileBottomNav, etc.)
- `artifacts/anvikshiki/src/index.css` — global styles, CSS variables, design tokens
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — JWT/cookie auth helpers
- `lib/db/src/schema/index.ts` — Drizzle schema (source of truth for DB)

## Architecture decisions

- Migrated from Next.js to Vite + wouter; `app/` folder structure kept but all pages converted to client components using `useEffect`+`fetch`
- All API calls from frontend use `import.meta.env.BASE_URL.replace(/\/$/, "") + "/api/..."` pattern
- Express handles all API at `/api/*`; old Next.js `app/api/` route files were deleted
- Admin auth uses separate `admin_session` cookie (8h); user auth uses `user_session` (7d)
- DB schema has 11 tables: users, admins, categories, articles, papers, submissions, newsletter_subscribers, saved_items, audit_logs, site_settings, media_assets

## Product

- **Homepage**: Featured essay hero, domain browsing, recent articles feed, newsletter signup
- **Articles**: Slug-based article pages with rich content
- **Papers**: Peer-reviewed research archive with discipline filters
- **Search**: Full-text search across essays, papers, domains
- **Submit**: Work submission form (essay/paper or review/commentary)
- **Archive**: Chronological publication archive
- **Admin panel**: Articles, papers, submissions, newsletter, settings management
- **User auth**: Sign up, login, saved items, account page

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The `"use client"` directives in UI components (shadcn/ui) are harmless — they're just strings in Vite, not Next.js directives
- Frontend API base: always use `import.meta.env.BASE_URL.replace(/\/$/, "") + "/api/..."` — not root-relative `/api/...`
- After any DB schema change: run `pnpm --filter @workspace/db run push`
- The `app/layout.tsx` (Next.js root layout) was deleted — fonts are loaded via `index.html` Google Fonts links instead

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
