# Ānvīkṣikī — Journal & Research Platform

A scholarly journal and research platform at the intersection of history, philosophy, civilizational thought, and the arts.

## Quick Start

### On Replit (new account import)
1. Import the GitHub repo — if Replit asks about "migrating from Vercel", click **Skip** or **Keep as-is**. The project already has full Replit configuration committed.
2. Add a PostgreSQL database via the **Database** tab — Replit injects `DATABASE_URL` automatically.
3. Click **Run** — both the frontend (Vite) and API server start automatically.

### On Vercel
1. Connect the GitHub repo in the Vercel dashboard.
2. **Do not change** the Framework Preset — `vercel.json` sets `"framework": null` to handle everything.
3. Add `DATABASE_URL` under Project → Settings → Environment Variables.
4. Deploy — Vercel builds the Vite frontend and serves it as a static SPA.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. Required:

| Variable | Where needed | Notes |
|---|---|---|
| `DATABASE_URL` | API server, DB migrations | PostgreSQL connection string |
| `PORT` | API server | Replit/Vercel set this automatically |
| `NODE_ENV` | API server | `development` or `production` |

## Run & Operate

- `pnpm --filter @workspace/anvikshiki run dev` — frontend dev server
- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (requires `DATABASE_URL`)

## Stack

- **Frontend**: Vite + React 19 + Tailwind CSS v4 + wouter (client-side routing)
- **API**: Express 5 (Node.js 20+)
- **DB**: PostgreSQL + Drizzle ORM
- **Workspace**: pnpm workspaces, TypeScript 5.9
- **Deployment**: Vercel (static SPA) + Replit (autoscale)

## Where things live

- `artifacts/anvikshiki/` — Vite + React frontend
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle ORM schema and migrations
- `lib/api-spec/` — OpenAPI spec
- `vercel.json` — Vercel deployment config (Vite build, SPA rewrites)
- `.env.example` — all required environment variables documented

## Deployment configs

Both deployment targets are committed and work independently:

- **Replit**: `.replit` + `artifacts/*/. replit-artifact/artifact.toml`
- **Vercel**: `vercel.json` at the repo root

## User preferences

_Populate as you build._

## Gotchas

- **Fresh Replit import**: `DATABASE_URL` won't exist until you add a database. The post-merge script skips DB migration gracefully if `DATABASE_URL` is missing — run `pnpm --filter db push` manually after adding the database.
- **Vercel**: Only the frontend deploys to Vercel (static SPA). The API server (`/api/*`) is not included in the Vercel deployment — it runs separately on Replit or another Node.js host.
- **pnpm only**: The workspace enforces pnpm via a `preinstall` check. Do not use npm or yarn.
