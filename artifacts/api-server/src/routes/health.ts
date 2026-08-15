import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable, submissionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { activeStorageProvider, storageIsDegraded, storageTiers } from "../lib/storage";

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
  // `storageProvider` used to echo an env var the upload code never reads, so
  // it could report "local" while files were going to Cloudinary, or the
  // reverse. It now reports the tier an upload would actually land in.
  return res.status(ok ? 200 : 503).json({
    ok,
    service: "anvikshiki-api",
    time: new Date().toISOString(),
    environment: {
      hasCloudinaryUrl: Boolean(process.env.CLOUDINARY_URL),
      hasVercelBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    },
    storage: {
      activeProvider: activeStorageProvider(),
      degraded: storageIsDegraded(),
      warning: storageIsDegraded()
        ? "No durable external file storage is configured. Uploads are stored on a local/ephemeral filesystem or inlined into the database. Set BLOB_READ_WRITE_TOKEN or CLOUDINARY_URL."
        : null,
      tiers: storageTiers(),
    },
    database: {
      reachable: dbReachable,
      schemaReady,
    },
  });
});

export default router;
