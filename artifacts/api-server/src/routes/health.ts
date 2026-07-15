import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable, submissionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (req, res) => {
  let dbReachable = false;
  let schemaReady = false;

  if (process.env.DATABASE_URL) {
    try {
      await db.execute(sql`SELECT 1`);
      dbReachable = true;
      await Promise.all([
        db.select({ id: usersTable.id }).from(usersTable).limit(1),
        db.select({ id: submissionsTable.id }).from(submissionsTable).limit(1),
      ]);
      schemaReady = true;
    } catch (err) {
      req.log.warn({ err }, "Health check database probe failed");
    }
  }

  const ok = dbReachable && schemaReady;
  return res.status(ok ? 200 : 503).json({
    ok,
    service: "anvikshiki-api",
    time: new Date().toISOString(),
    environment: {
      hasCloudinaryUrl: Boolean(process.env.CLOUDINARY_URL),
      storageProvider: process.env.STORAGE_PROVIDER || "local",
    },
    database: {
      reachable: dbReachable,
      schemaReady,
    },
  });
});

export default router;
