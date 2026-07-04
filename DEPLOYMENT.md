# Deploying Anvikshiki to Vercel

This project is structured as a pnpm monorepo. When deploying to Vercel, the configuration must compile the static frontend and mount the serverless API routes correctly.

---

## 1. Vercel Project Settings

Configure these settings on your Vercel Dashboard (**Settings -> General**):

*   **Root Directory**: Leave blank (or set to `.`, the repository root). Do **NOT** set it to `artifacts/anvikshiki`.
*   **Framework Preset**: `Vite` (or `Other`).
*   **Build Command**: `pnpm --filter @workspace/db run push && pnpm --filter @workspace/anvikshiki build`
*   **Install Command**: `pnpm install --no-frozen-lockfile`
*   **Output Directory**: `artifacts/anvikshiki/dist/public`

---

## 2. Environment Variables

Add the following variables under **Settings -> Environment Variables**:

### Required (Production Runtime & Build)
*   **`DATABASE_URL`**: Your PostgreSQL connection string (e.g. `postgresql://user:password@host:5432/dbname`).
    *   *Must be checked for Build Command as well so the schema push works.*
*   **`AUTH_SECRET`**: A secure, long, random string (min 32 characters) used to sign user JWTs.
*   **`ADMIN_SECRET`**: A secure, long, random string (min 32 characters) used to sign admin JWTs.

### Optional (Persistence & Custom Domain)
*   **`BLOB_READ_WRITE_TOKEN`**: Required to enable persistent file uploads via Vercel Blob. 
    *   *Configure this by selecting "Storage" on your Vercel Dashboard, creating a Blob store, and linking it to your project.*
*   **`COOKIE_SAMESITE`**: Set to `none` if your backend and frontend are hosted on separate domains. Defaults to `lax`.
*   **`PG_POOL_MAX`**: Restricts the maximum active connections per serverless container. Defaults to `2` on Vercel to prevent database exhaustion.

---

## 3. Database Schema Updates

The database migrations will run automatically on every build when `DATABASE_URL` is set.
To manually push local schema changes:
```bash
pnpm --filter @workspace/db run push
```
