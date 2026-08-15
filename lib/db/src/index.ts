import { drizzle } from "drizzle-orm/node-postgres";
import { sql as sqlOperator } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema/index";
import { runSchemaRepair, type SchemaRepairReport } from "./ensure-schema";

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

// Robust connection pool with configuration for production stability
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/placeholder",
  max: maxConnections,
  ssl: sslConfig,
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s on connect
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
 */
export async function repairDatabaseSchema(): Promise<SchemaRepairReport> {
  return runSchemaRepair(statement => db.execute(sqlOperator.raw(statement)));
}

let schemaReady: Promise<SchemaRepairReport | null> | null = null;

/**
 * Repair the schema at most once per process. Request handlers await this
 * before their first query, so a cold serverless start cannot serve a request
 * against a half-migrated table.
 */
export function ensureDatabaseSchema(): Promise<SchemaRepairReport | null> {
  if (!schemaReady) {
    schemaReady = repairDatabaseSchema()
      .then(report => {
        if (report.failed.length > 0) {
          console.warn(
            `Schema repair completed with ${report.failed.length} skipped statement(s):`,
            report.failed,
          );
        }
        return report;
      })
      .catch(err => {
        console.error("Schema repair failed entirely:", err);
        // Clear the cache so a later request can retry instead of being stuck.
        schemaReady = null;
        return null;
      });
  }
  return schemaReady;
}

export * from "./schema/index";
export { schemaRepairStatements, type SchemaRepairReport } from "./ensure-schema";
