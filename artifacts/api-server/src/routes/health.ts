import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable, submissionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (_req, res) => {
  let dbReachable = false;
  let tablesOk = false;
  let dbError: string | null = null;

  try {
    // Check connection reachability
    await db.execute(sql`SELECT 1`);
    dbReachable = true;

    // Check table existence
    await db.select().from(usersTable).limit(1);
    await db.select().from(submissionsTable).limit(1);
    tablesOk = true;
  } catch (err: any) {
    dbError = err?.message || String(err);
  }

  res.json({
    ok: dbReachable && tablesOk,
    service: "anvikshiki-api",
    time: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV || "development",
      vercel: Boolean(process.env.VERCEL),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      hasAdminSecret: Boolean(process.env.ADMIN_SECRET),
      hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    },
    database: {
      reachable: dbReachable,
      tablesOk,
      error: dbError || undefined,
    },
  });
});

export default router;
