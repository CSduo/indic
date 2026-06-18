# Ānvīkṣikī — आन्वीक्षिकी

A premium Indian intellectual publication platform for essays, papers, civilizational inquiry, history, philosophy, psychology, sociology, geopolitics, science, archive-based research, and long-form academic writing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, prefix `/api`)
- `pnpm --filter @workspace/anvikshiki run dev` — run the frontend (port 24483, preview path `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed DB with sample data
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter routing, TanStack Query, Tailwind CSS, Framer Motion
- API: Express 5 (port 8080, prefix `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: `bcryptjs` (pure JS — native bcrypt binding fails in Replit)

## Where things live

- `artifacts/anvikshiki/src/` — React frontend
  - `pages/` — Home, ArticleDetail, Papers, PaperDetail, Category, Search, Submit, About
  - `pages/admin/` — AdminLogin, AdminLayout, AdminDashboard, AdminArticles, AdminArticleForm, AdminPapers, AdminSubmissions, AdminNewsletter
  - `components/` — Emblem, Wordmark, Navbar, BottomNav, Layout, ThemeToggle, ArticleCard, PaperCard, CategoryBadge
  - `hooks/useTheme.ts` — day/night theme toggle
  - `index.css` — full theme system with CSS custom properties
- `artifacts/api-server/src/routes/` — all API routes
- `lib/db/src/schema.ts` — Drizzle schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/api.ts` — all generated hooks (do not edit manually)
- `scripts/src/seed.ts` — DB seed script

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → generated TanStack Query hooks. Never call fetch directly from components.
- Mutations use `{ data: ... }` not named-input objects (orval convention).
- Admin auth via HttpOnly cookie `anvikshiki_session`, session stored in DB.
- All API calls include `credentials: "include"` via custom-fetch.ts.
- `bcryptjs` used instead of `bcrypt` — native bcrypt bindings fail in the Replit sandbox.

## Product

- **Public readers**: Featured essay hero, browse by domain, search, article detail with key takeaways, papers archive with download, newsletter sign-up, submission form.
- **Admins** (`/admin`): Dashboard with stats, full CRUD for articles and papers, submission review (accept/reject), newsletter subscriber list with CSV export.

## Admin Credentials

- URL: `/admin/login`
- Email: `admin@anvikshiki.in`
- Password: `anvikshiki2024`

## Theme

- Day: warm ivory `#fbf3e4`, gold `#a87c2b`, rose `#a93b5a`
- Night: deep teal `#071115`, gold `#d5aa61`, rose `#dc587c`
- Fonts: Cormorant Garamond (display), Literata (body), Inter (UI), Noto Serif Devanagari (Devanagari)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Never use native `bcrypt` — always `bcryptjs` (pure JS).
- Mutation variables in generated hooks use `{ data: ... }` not named input objects (e.g. `{ data: payload }` not `{ articleInput: payload }`).
- For TanStack Query v5 + orval: `UseQueryOptions` requires `queryKey`. When passing only `enabled`, cast as `any` or omit.
- Paths are not rewritten by the proxy — API server must handle the full `/api` prefix itself.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
