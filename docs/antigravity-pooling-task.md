# Task for Antigravity — switch the database to a pooled connection

Paste everything below the line into Antigravity. It is written as a job to
carry out, not a question to answer.

---

## What I need you to do

Make my site stop taking about a second to serve every page. The cause is
already diagnosed and the fix is a connection-string change I need you to
identify and apply. Do the work end to end: find out which Postgres provider I
am on, get the correct pooled connection string, set it in Vercel, redeploy,
and verify it worked. Tell me the before and after numbers.

**Do not change any application code.** The code is correct; the connection is
the problem. If you believe code must change, stop and explain why before
touching anything.

## The diagnosis, already done

Measured against the live site. The only difference between these endpoints is
how many database queries they run:

| Endpoint | DB queries | Time to first byte |
|---|---|---|
| `/api/healthz` | 0 | 0.25s, 0.49s, 0.57s |
| `/api/categories` | 1 | 0.89s, 0.90s, 1.14s, 1.16s |
| `/api/health` | 3 | 0.89s, 0.89s, 0.91s |

TCP connect is 10–25ms, so the network to the host is fine.

Going from zero queries to one costs about 600ms. Going from one to three costs
nothing measurable. That is a fixed cost paid once per request at the moment
the first query runs — a new Postgres connection being opened: TCP, then TLS,
then authentication. The queries themselves are nearly free.

Each serverless invocation opens its own connection because serverless
functions do not share a pool. Holding connections open for longer was already
tried inside the code and did **not** help, because at this traffic level
almost every request lands on a cold instance that has no pool yet. The fix has
to be on the connection itself: connect through the provider's pooler, which
keeps warm connections on their side.

## The environment

- **Host**: Vercel, project `anvikshiki-app`, production domain
  `anvikshikijournal.in`. The Vercel CLI is installed and already logged in.
- **Database**: PostgreSQL, accessed with Drizzle ORM over `pg` (node-postgres).
- **Pool config** lives in `lib/db/src/index.ts`. On Vercel it uses `max: 1`
  per instance. Leave that at 1 — with a pooler that is correct.
- **`DATABASE_URL` is marked Sensitive in Vercel.** It cannot be read back by
  anyone, including you. You can only overwrite it. So you must reconstruct the
  full connection string from the provider's dashboard, not by editing the
  existing value.

## Step 1 — find out which provider it is

I do not know. Work it out. Options that should not require the secret:

- Check the Vercel dashboard for a linked storage integration (Neon, Supabase
  and Vercel Postgres all show up there).
- Ask me to look at my Vercel project's Storage tab and read you the provider
  name — I can do that.
- If there is a provider dashboard I am logged into, have me read you the host
  name of the database.

Report which provider it is before changing anything.

## Step 2 — get the pooled connection string

Whatever the provider, I need the **pooled / transaction-mode** endpoint rather
than the direct one:

- **Neon** — the host with `-pooler` in it, e.g.
  `ep-xxxx-pooler.<region>.aws.neon.tech`. Neon's dashboard offers "Pooled
  connection" explicitly.
- **Supabase** — the Connection Pooling string on port `6543`, host like
  `aws-0-<region>.pooler.supabase.com`, mode **Transaction**. Not the direct
  `db.<ref>.supabase.co:5432` string.
- **Vercel Postgres** — the `POSTGRES_URL` pooled variant, not
  `POSTGRES_URL_NON_POOLING`.
- **Anything else** — the PgBouncer or equivalent endpoint in transaction mode.

Tell me exactly what the new string looks like with the password masked, and
what query parameters you added, before you set it.

### Compatibility — already checked, confirm I am right

Transaction-mode pooling breaks a few things. I have checked this codebase and
it uses **none** of them:

- No `LISTEN` / `NOTIFY`.
- No session-level advisory locks. There is one advisory lock, and it is
  `pg_advisory_xact_lock` inside an explicit transaction, which is
  transaction-scoped and therefore safe under transaction pooling.
- No named prepared statements — no `.prepare()` anywhere, and node-postgres
  only creates named statements when explicitly asked.
- No session `SET` statements.

Verify that yourself rather than taking my word for it, then confirm. If your
provider needs a flag for this driver (some want `?pgbouncer=true`, some want
`statement_cache_size=0` for other drivers), tell me which applies to
node-postgres specifically — many of those instructions are written for Prisma
and do not apply here.

Also keep `sslmode=require` if the provider expects it. The code sets
`ssl: { rejectUnauthorized: true }` in production, so the certificate must be
valid; if the pooled host needs different SSL handling, say so rather than
telling me to disable verification.

## Step 3 — set it in Vercel

Set `DATABASE_URL` for **Production** to the pooled string.

Two warnings from experience on this project:

1. **Do not pipe the value through PowerShell.** Doing that once prepended a
   byte-order mark to a different variable, which was invisible in every
   dashboard and broke the feature that read it. Set it through the Vercel
   dashboard UI, or pass the exact bytes to the CLI's stdin.
2. **Keep the direct (non-pooled) URL somewhere I can find it.** If any
   migration tooling needs a direct connection later, it will not work through
   the pooler. If the provider distinguishes them, set the direct one as a
   second variable such as `DATABASE_URL_UNPOOLED` and tell me.

## Step 4 — redeploy and verify

A new deployment is needed for the change to take effect. Pushing to `main`
triggers one automatically; otherwise `npx vercel --prod --yes`.

Then verify, and give me the numbers:

```
curl -s -o /dev/null -w "%{time_starttransfer}s\n" https://anvikshikijournal.in/api/healthz
curl -s -o /dev/null -w "%{time_starttransfer}s\n" https://anvikshikijournal.in/api/categories
curl -s https://anvikshikijournal.in/api/health
```

Success looks like `/api/categories` landing near `/api/healthz` — roughly
0.3–0.4s rather than 0.9–1.2s. Run each several times; ignore the first, which
is a cold start.

Also confirm `/api/health` still reports `"reachable": true` and
`"schemaReady": true`. If `schemaReady` goes false, the pooled connection is
rejecting something the schema check does — tell me immediately, do not try to
fix it by changing code.

## Step 5 — if it does not work, roll back

If latency does not improve, or anything starts failing, put `DATABASE_URL`
back to the direct string and redeploy. Then tell me what you saw. A working
slow site is much better than a broken fast one.

## What to report back

1. Which provider, and how you determined it.
2. The new connection string with the password masked, and why those parameters.
3. Before and after timings from Step 4.
4. Whether `schemaReady` is still true.
5. Anything you had to change beyond the connection string — and if that
   includes application code, why.

## Also, while you are in the environment

Check for anything else obviously wrong or wasteful in this project's Vercel
environment variables — leftover or duplicated values, anything holding a
secret in plaintext beside a hashed version of the same thing. Report what you
find; do not delete anything without telling me first.
