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
  let usersTableExists = false;
  let submissionsTableExists = false;
  let dbError: string | null = null;

  try {
    // Check connection reachability
    await db.execute(sql`SELECT 1`);
    dbReachable = true;

    // Check users table existence
    try {
      await db.select().from(usersTable).limit(1);
      usersTableExists = true;
    } catch (e: any) {
      console.warn("usersTable check failed:", e?.message);
    }

    // Check submissions table existence
    try {
      await db.select().from(submissionsTable).limit(1);
      submissionsTableExists = true;
    } catch (e: any) {
      console.warn("submissionsTable check failed:", e?.message);
    }
  } catch (err: any) {
    dbError = err?.message || String(err);
  }

  res.json({
    ok: dbReachable && usersTableExists && submissionsTableExists,
    service: "anvikshiki-api",
    time: new Date().toISOString(),
    environment: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      hasAdminSecret: Boolean(process.env.ADMIN_SECRET),
      hasCloudinaryUrl: Boolean(process.env.CLOUDINARY_URL),
      storageProvider: process.env.STORAGE_PROVIDER || "local",
      isVercel: Boolean(process.env.VERCEL)
    },
    database: {
      reachable: dbReachable,
      usersTableExists,
      submissionsTableExists,
      error: dbError || undefined
    }
  });
});

export default router;
