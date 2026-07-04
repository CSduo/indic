import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set. Did you forget to configure environment variables? Database queries will fail."
  );
}

const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === "production";

const maxConnections = Number(
  process.env.PG_POOL_MAX || (isVercel ? 2 : isProduction ? 5 : 20)
);

const sslConfig = process.env.PGSSL === "false"
  ? undefined
  : (process.env.PGSSL === "true" || isProduction || isVercel)
    ? { rejectUnauthorized: false }
    : undefined;

// Robust connection pool with configuration for production stability
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/placeholder",
  max: maxConnections, // Max active connections
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

export * from "./schema";
