import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Robust connection pool with configuration for production stability
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max active connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s on connect
});

// Handle errors on idle clients in the pool to prevent process crash
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client:", err.message);
});

// Verification function to test connectivity asynchronously without crashing process on start
export async function verifyDatabaseConnection(retries = 5, delay = 2000): Promise<boolean> {
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

// Trigger non-blocking verification on initialization
verifyDatabaseConnection().catch((err) => {
  console.error("Database connection verification error:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
