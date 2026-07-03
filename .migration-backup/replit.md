# Anvikshiki — Journal & Research Platform

A scholarly journal and research platform for deep thinking across philosophy, science, humanities, and culture. Supports article and paper publishing, submissions, newsletter, admin dashboard, and user accounts.

## Run & Operate

- Workflows: `artifacts/anvikshiki: web` (frontend) + `artifacts/api-server: API Server` (backend)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Wouter (SPA, served at `/`)
- API: Express 5 (served at `/api`)
- DB: PostgreSQL + Drizzle ORM (`lib/db/src/schema/index.ts`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from `lib/api-spec/openapi.yaml`)
- CSS: Tailwind v4 with a custom parchment/gold/terracotta design system (`artifacts/anvikshiki/src/index.css`)
- Fonts: Cormorant Garamond (display), EB Garamond (body), DM Sans (UI)

## Where things live

- **Frontend routes**: `artifacts/anvikshiki/src/App.tsx`
- **Page components**: `artifacts/anvikshiki/src/app/**` (Next.js-style flat tree, routed via Wouter)
- **Theme/CSS**: `artifacts/anvikshiki/src/index.css` — custom CSS vars (`--ink`, `--gold`, `--terracotta`, etc.)
- **API routes**: `artifacts/api-server/src/routes/`
- **DB schema**: `lib/db/src/schema/index.ts`
- **OpenAPI spec**: `lib/api-spec/openapi.yaml`
- **Public assets**: `artifacts/anvikshiki/public/` (images, hero media, brand emblem)
- **Shared assets**: `attached_assets/` (aliased as `@assets` in Vite)

## Architecture decisions

- Converted from Next.js (Vercel) to Vite + React with Wouter routing for Replit compatibility
- SPA with client-side routing — all deep links handled via `/* → /index.html` rewrite
- API server uses JWT + cookie auth with separate admin and user sessions
- Theme uses custom CSS variables only (no shadcn tokens) — the parchment design system is fully self-contained
- `fs.strict: false` in vite.config.ts is intentional — `@assets` alias points to `attached_assets/` outside the artifact root

## Product

- **Articles & Papers**: Editorial content with categories, tags, authors, hero images, audio narration
- **Browse & Search**: Filterable content discovery across domains
- **Submissions**: Multi-step submission flow (details → upload → write → preview → success)
- **Admin Dashboard**: Full CMS for articles, papers, submissions, users, newsletter, settings
- **User Accounts**: Registration, saved items, collections, notifications, profile settings
- **Newsletter**: Subscriber management with admin broadcast

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not run `pnpm dev` at workspace root — apps run via their artifact workflows
- `PORT` and `BASE_PATH` are injected by the artifact workflow; never hardcode them
- After any OpenAPI spec change, run codegen before using new types
- DB schema push is dev-only; production schema is managed via Replit's Publish flow

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
