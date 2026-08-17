import { drizzle } from "drizzle-orm/node-postgres";
import { sql as sqlOperator } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema/index";
import {
  runSchemaRepair,
  schemaRepairStatements,
  schemaFingerprint,
  SCHEMA_MARKER_KEY,
  type SchemaRepairReport,
} from "./ensure-schema";

const { Pool } = pg;

const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  if (isProduction || isVercel) {
    console.error(
      "DATABASE_URL environment variable is missing on Vercel. API routes will return a configuration error until it is set.",
    );
  } else {
    console.warn(
      "DATABASE_URL is not set. Did you forget to configure environment variables? Database queries will fail."
    );
  }
}

const configuredMaxConnections = Number(
  process.env.PG_POOL_MAX || (isVercel ? 1 : isProduction ? 5 : 20)
);
const maxConnections = Number.isInteger(configuredMaxConnections) && configuredMaxConnections > 0
  ? Math.min(configuredMaxConnections, 50)
  : (isVercel ? 1 : isProduction ? 5 : 20);

const sslConfig = process.env.PGSSL === "false"
  ? undefined
  : (process.env.PGSSL === "true" || isProduction || isVercel)
    ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined;

/**
 * How long a pooled connection is kept when nothing is using it.
 *
 * This is the one lever on request latency that is available from inside the
 * code. Opening a connection to this database costs roughly 650ms — TCP, TLS
 * and authentication — which is almost the entire time an API request takes;
 * the queries themselves are close to free. Closing the connection after 30
 * seconds of quiet meant a warm serverless instance paid that cost again for
 * anyone who arrived half a minute after the last visitor, which on a site
 * with this much traffic is nearly everyone.
 *
 * Serverless instances live for minutes, so the connection is now held for as
 * long as the instance that owns it, and a keepalive stops anything in the
 * middle deciding an idle socket is dead. A connection dropped from the other
 * end is not a problem: the pool's error handler discards it and the next
 * caller opens a fresh one.
 */
const idleTimeoutMillis = Number(process.env.PG_IDLE_TIMEOUT_MS)
  || (isVercel ? 10 * 60 * 1000 : 30 * 1000);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/placeholder",
  max: maxConnections,
  ssl: sslConfig,
  idleTimeoutMillis,
  connectionTimeoutMillis: 10000, // Timeout after 10s on connect
  // Without this, an idle TLS connection can be dropped silently by a NAT or
  // load balancer in between, and the drop is only discovered as a failed
  // query on the next request.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Handle errors on idle clients in the pool to prevent process crash
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client:", err.message);
});

// Verification function to test connectivity asynchronously without crashing process on start
export async function verifyDatabaseConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log("Successfully connected to the database.");
      client.release();
      return true;
    } catch (err: any) {
      console.warn(`Database connection attempt ${i + 1} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  console.error("Could not establish a connection to the database. Proceeding with caution...");
  return false;
}

// Trigger non-blocking verification on initialization only if requested
if (process.env.VERIFY_DATABASE_ON_START === "true") {
  verifyDatabaseConnection().catch((err) => {
    console.error("Database connection verification error:", err);
  });
}

export const db = drizzle(pool, { schema });

export type DbClient = typeof db;

/**
 * Postgres error codes that mean "the connection or transaction was lost, but
 * the same statement is safe to run again": serialization failure, deadlock,
 * connection failure, and admin shutdown. Serverless pools see these routinely
 * when a pooled connection is recycled between invocations.
 */
const TRANSIENT_PG_CODES = new Set(["40001", "40P01", "08000", "08003", "08006", "57P01", "57P03", "XX000"]);

function isTransientDbError(err: any): boolean {
  if (!err) return false;
  if (typeof err.code === "string" && TRANSIENT_PG_CODES.has(err.code)) return true;
  const message = String(err.message || "").toLowerCase();
  return (
    message.includes("connection terminated") ||
    message.includes("connection reset") ||
    message.includes("timeout exceeded when trying to connect") ||
    message.includes("server closed the connection")
  );
}

/**
 * Run a database operation, retrying only transient connection/serialization
 * failures with jittered exponential backoff. Application errors (constraint
 * violations, missing columns, bad input) are rethrown immediately so they stay
 * visible instead of being retried into a timeout.
 */
export async function withDbRetry<T>(
  operation: (client: DbClient) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation(db);
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isTransientDbError(err)) throw err;
      const backoff = Math.min(1000, 50 * 2 ** attempt) + Math.floor(Math.random() * 50);
      console.warn(
        `Transient database error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${backoff}ms:`,
        (err as any)?.message,
      );
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}

/** Close the pool cleanly so a shutting-down process does not leak connections. */
export async function closeDatabasePool(): Promise<void> {
  try {
    await pool.end();
  } catch (err: any) {
    console.warn("Database pool teardown error:", err?.message || err);
  }
}

/**
 * Bring the live database in line with the Drizzle schema. Idempotent — every
 * statement is `IF NOT EXISTS`, nothing is dropped or rewritten.
 *
 * This always runs the full statement list. Callers on the request path should
 * use `ensureDatabaseSchema()` instead, which skips the work when the database
 * is already up to date.
 */
export async function repairDatabaseSchema(): Promise<SchemaRepairReport> {
  const report = await runRepairOnce();
  await recordSchemaFingerprint();
  return report;
}

/**
 * A fixed key for the advisory lock that serialises schema repair. Any constant
 * works as long as nothing else in this database uses the same one.
 */
const REPAIR_LOCK_KEY = 8402551;

/**
 * Apply the schema, once, without a stampede.
 *
 * Two things made this expensive enough to take the site down after a schema
 * change. Every statement was its own round trip, and against a managed
 * database a hundred of those is seconds rather than milliseconds. And every
 * serverless instance that cold-started did the whole thing at the same time,
 * because they all saw the same stale fingerprint — so a deploy meant dozens of
 * copies of that work running at once, some of them timing out, and a request
 * that hit a timing-out instance failed.
 *
 * Now the statements go over in a single command inside one transaction, held
 * by an advisory lock so exactly one instance does the work and the rest wait
 * for it. That turns a hundred round trips into one, and a stampede into a
 * queue. If the batch cannot be applied as a unit — an existing object that
 * conflicts, most likely — it falls back to the statement-at-a-time path, which
 * tolerates individual failures and reports them.
 */
async function runRepairOnce(): Promise<SchemaRepairReport> {
  const statements = schemaRepairStatements();

  try {
    await db.transaction(async (tx: any) => {
      // Waits rather than failing: whichever instance arrives second blocks
      // here until the first has committed, then finds every statement is a
      // no-op. The lock is released when the transaction ends, including if it
      // rolls back or the connection dies.
      await tx.execute(sqlOperator.raw(`SELECT pg_advisory_xact_lock(${REPAIR_LOCK_KEY})`));
      await tx.execute(sqlOperator.raw(statements.join("\n")));
    });
    return { applied: statements.length, failed: [] };
  } catch (err: any) {
    console.warn(
      "Batched schema repair did not apply; falling back to statement-by-statement:",
      err?.message || err,
    );
  }

  return runSchemaRepair(statement => db.execute(sqlOperator.raw(statement)));
}

/**
 * Are the tables the site actually reads from present?
 *
 * Used to decide whether a failed repair is a catastrophe or a formality. A
 * database that already has its tables does not need the repair to have
 * succeeded in order to serve a request, and refusing to serve anything at all
 * in that case turns a warning into an outage.
 */
export async function coreTablesExist(): Promise<boolean> {
  try {
    const result: any = await db.execute(sqlOperator.raw(`
      SELECT to_regclass('public.users') IS NOT NULL
         AND to_regclass('public.articles') IS NOT NULL
         AND to_regclass('public.site_settings') IS NOT NULL AS ok
    `));
    const rows = result?.rows ?? result ?? [];
    return rows[0]?.ok === true;
  } catch {
    return false;
  }
}

/** Persist the fingerprint of the statement list we just applied. */
async function recordSchemaFingerprint(): Promise<void> {
  const fingerprint = schemaFingerprint();
  if (!/^[a-z0-9_]+$/.test(SCHEMA_MARKER_KEY) || !/^[A-Za-z0-9_.-]+$/.test(fingerprint)) return;

  try {
    await db.execute(sqlOperator.raw(`
      INSERT INTO site_settings (id, key, value, description, updated_at)
      VALUES ('${crypto.randomUUID()}', '${SCHEMA_MARKER_KEY}', '${fingerprint}',
              'Set automatically; identifies the last applied schema repair.', now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `));
  } catch (err: any) {
    // Not fatal — without the marker the repair simply runs again next time.
    console.warn("Could not record the schema fingerprint:", err?.message || err);
  }
}

/**
 * One cheap query: is the live database already at this schema revision?
 *
 * `to_regclass` returns NULL for a table that does not exist rather than
 * raising, so this is a single round trip that is safe to run against a
 * completely empty database. Probing with a plain SELECT instead would raise
 * "relation does not exist", and an erroring statement can take the connection
 * down with it — which would then fail the very repair meant to fix things.
 */
async function schemaAlreadyCurrent(): Promise<boolean> {
  // The marker key is a fixed module constant, not user input. Asserting its
  // shape here keeps it that way, so embedding it as a literal below stays safe
  // even if someone edits the constant later.
  if (!/^[a-z0-9_]+$/.test(SCHEMA_MARKER_KEY)) return false;

  try {
    // Two statements rather than one. Postgres resolves table references when
    // it plans a statement, so naming site_settings inside a query guarded by
    // `WHERE to_regclass(...) IS NOT NULL` still raises "relation does not
    // exist" on a database that has never been provisioned — the guard never
    // gets a chance to run. Asking the catalogue first is the only form that is
    // safe against an empty database, and it is still two round trips against
    // the hundred-plus the full repair costs.
    const presence: any = await db.execute(
      sqlOperator.raw(`SELECT to_regclass('public.site_settings') IS NOT NULL AS present`),
    );
    const presentRows = presence?.rows ?? presence ?? [];
    if (presentRows[0]?.present !== true) return false;

    const result: any = await db.execute(
      sqlOperator.raw(`SELECT value FROM site_settings WHERE key = '${SCHEMA_MARKER_KEY}' LIMIT 1`),
    );
    const rows = result?.rows ?? result ?? [];
    return rows[0]?.value === schemaFingerprint();
  } catch (err: any) {
    console.warn("Schema fingerprint probe failed; running the full repair:", err?.message || err);
    return false;
  }
}

let schemaReady: Promise<SchemaRepairReport | null> | null = null;

/**
 * Make sure the schema is current, at most once per process.
 *
 * The full repair is ~75 sequential DDL statements. Running it unconditionally
 * on every cold start cost a round trip per statement — barely noticeable
 * against a local database, but seconds against a managed one, paid by whoever
 * happened to make the first request after a new serverless instance started.
 *
 * So the common case is now a single indexed lookup of a fingerprint written by
 * the last successful repair. The DDL only runs when that fingerprint is
 * missing or stale, which is exactly when the schema has actually changed.
 */
export function ensureDatabaseSchema(): Promise<SchemaRepairReport | null> {
  if (!schemaReady) {
    schemaReady = (async () => {
      if (await schemaAlreadyCurrent()) {
        return { applied: 0, failed: [], skipped: true };
      }
      const report = await repairDatabaseSchema();
      if (report.failed.length > 0) {
        console.warn(
          `Schema repair completed with ${report.failed.length} skipped statement(s):`,
          report.failed,
        );
      }
      return report;
    })().catch(err => {
      console.error("Schema repair failed entirely:", err);
      // Clear the cache so a later request can retry instead of being stuck.
      schemaReady = null;
      return null;
    });
  }
  return schemaReady;
}

export * from "./schema/index";
export {
  schemaRepairStatements,
  schemaFingerprint,
  SCHEMA_MARKER_KEY,
  type SchemaRepairReport,
} from "./ensure-schema";
