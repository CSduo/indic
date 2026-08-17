# Brief for Antigravity — database latency and capacity

Paste everything below this line into Antigravity. It contains the measurements
already taken, so it should not need to re-measure anything to answer.

---

## What I need from you

My website is slow, and I want to know two things:

1. **Why every page takes about a second**, and exactly what to change to fix
   it. I have measurements below that point at one specific cause — confirm or
   correct that diagnosis.
2. **How much data I can actually store**, on what I am currently paying
   (nothing), what happens when I exceed it, and when I would need to move.

Please answer with specific settings and values I can apply, not general
advice. If the fix is a connection string change, tell me exactly what the new
string should look like and where in my hosting dashboard to change it.

## The system

- **Site:** anvikshikijournal.in — an academic journal. Articles, research
  papers, user accounts, submissions, comments, and private direct messages
  between members.
- **Hosting:** Vercel, serverless functions (not a long-running server).
- **Backend:** Node + Express, bundled to a single serverless handler.
- **Database:** PostgreSQL, accessed with Drizzle ORM over the `pg` driver
  (node-postgres) using a connection pool.
- **File storage:** Cloudinary — images, PDFs and message attachments. Free
  tier. Confirmed active and healthy.
- **Traffic:** low. Tens of visitors a day, not thousands.

I do not know for certain which Postgres provider the database is on. The
connection string is stored as a **Sensitive** environment variable in Vercel,
which means it cannot be read back out — only overwritten. Part of what I need
from you is how to identify the provider and find the right endpoint to use.

## The measurements

Each endpoint measured three times against the live site. The only thing that
differs between them is how many database queries the endpoint runs.

| Endpoint | Database queries | Time to first byte |
|---|---|---|
| `/api/healthz` | 0 | 251ms, 248ms, 246ms |
| `/api/categories` | 1 | 1069ms, 950ms, 905ms |
| `/api/health` | 3 | 912ms, 893ms, 888ms |

TCP connect time was 10–25ms in every case, so the network path to the host is
not the problem.

**What this looks like to me:** going from zero queries to one query costs
about 650ms. Going from one query to three costs nothing measurable. That says
the cost is paid once per request, at the moment the first query runs — a fixed
setup cost, not query execution time. The queries themselves appear to be fast.

My reading is that each serverless invocation is establishing a brand-new
Postgres connection — TCP handshake, TLS negotiation, and authentication —
because serverless functions do not share a connection pool between
invocations. The pool exists inside one invocation and is thrown away with it.

**Please confirm whether that is right, and if so, tell me the fix.** My
understanding is that the answer is to connect through a connection pooler that
holds warm connections on the provider's side, rather than connecting directly
to the database. I believe this means:

- **Neon:** use the endpoint with `-pooler` in the hostname
- **Supabase:** use port `6543` (transaction mode) instead of `5432`
- **Others:** PgBouncer or the provider's equivalent

Questions I need answered concretely:

1. Is the diagnosis correct — is this connection setup, or something else?
2. For each of the common providers, what exactly does the pooled connection
   string look like, and what query parameters does it need? I have read that
   transaction-mode pooling requires disabling prepared statements for some
   drivers — does node-postgres with Drizzle need that, and how is it set?
3. How do I find out which provider my database is on, given that I cannot read
   the connection string? Is there a query I can run against the database
   itself that identifies the host?
4. Are there settings on the client side — pool size, idle timeout, connection
   timeout — that matter specifically for serverless, where every invocation is
   short-lived and isolated?
5. Is there anything about this that would be made worse by switching to a
   pooler, that I should know before doing it?

## The capacity question

I want to understand my storage headroom before it becomes a problem.

- **Text** (articles, papers, comments, messages, user records) goes in
  Postgres.
- **Files** (images, PDFs, message attachments) go to Cloudinary.

Please tell me:

1. **Free tier storage limits** for the main Postgres providers — Neon,
   Supabase, Vercel Postgres, Railway — as they stand now. Not just the
   storage number: also the limits people actually hit first, like compute
   hours, connection counts, or projects being suspended after inactivity.
2. **What one article actually costs** in database terms. A long essay is maybe
   50,000 characters of text. Roughly how many of those fit in 500MB? I want a
   realistic sense of whether "500MB" means hundreds of articles or hundreds of
   thousands.
3. **Cloudinary's free tier** — the credit system, how transformations and
   bandwidth consume credits, and what actually happens when I run out. Does
   delivery stop, or do I just get billed?
4. **What the warning signs look like** before I hit a wall, and what I should
   be watching.
5. **The cheapest sensible upgrade path** for each, if I do outgrow the free
   tier — with actual current prices.

## Constraints

- I want to stay on free tiers. If something must be paid, tell me the real
  cost and what it buys.
- I am not moving off Vercel.
- Private message attachments are stored as authenticated Cloudinary objects,
  which means the delivery URL must be signed by my server. If any advice
  changes how files are stored, note the effect on that.
- Whatever you recommend, give me the steps in order, and tell me which ones
  carry a risk of downtime.
