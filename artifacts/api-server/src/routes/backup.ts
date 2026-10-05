import { Router } from "express";
import { getAdminAuth } from "../lib/auth";
import { isCronAuthorized } from "../lib/automation-auth";
import { purgeDueAccounts, DELETION_GRACE_DAYS } from "../lib/account-deletion";
import { backfillHandles } from "../lib/handles";
import { parseReindexOptions, reindexAllPublicContent } from "../lib/seo-service";

const router = Router();

type NeonBranch = {
  id?: string;
  name?: string;
};

type NeonBranchResponse = {
  branch?: NeonBranch;
  branches?: NeonBranch[];
};

async function requireAdmin(req: any, res: any, next: any) {
  const auth = await getAdminAuth(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  req.adminAuth = auth;
  next();
}

async function createBackup(req: any, res: any) {
  try {
    const neonApiKey = process.env.NEON_API_KEY;
    const neonProjectId = process.env.NEON_PROJECT_ID;
    if (!neonApiKey || !neonProjectId) {
      req.log.warn("Neon backup credentials are not configured");
      return res.status(503).json({
        success: false,
        message: "Backup service is not configured.",
      });
    }

    const branchName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${encodeURIComponent(neonProjectId)}/branches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${neonApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ branch: { name: branchName }, endpoints: [] }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) {
      req.log.error({ status: response.status }, "Failed to create Neon backup branch");
      return res.status(502).json({ success: false, error: "Backup provider rejected the request" });
    }

    const data = await response.json() as NeonBranchResponse;
    req.log.info(
      { branchName, branchId: data.branch?.id, actor: req.adminAuth?.adminId || "cron" },
      "Database backup branch created",
    );
    return res.json({
      success: true,
      message: "Database snapshot created.",
      branchId: data.branch?.id,
      branchName,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Backup request failed");
    return res.status(502).json({ error: "Backup request failed" });
  }
}

// Vercel Cron invokes configured jobs with GET and Bearer CRON_SECRET.
router.get("/admin/trigger-backup", async (req: any, res: any) => {
  if (!isCronAuthorized(req.get("authorization"))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return createBackup(req, res);
});

// Administrators may also trigger a snapshot manually.
router.post("/admin/trigger-backup", requireAdmin, createBackup);

/**
 * GET /api/admin/purge-deleted-accounts — carry out deletions whose grace
 * period has run out.
 *
 * Runs on a schedule, guarded by the same secret as the backup job. Nothing
 * here is reachable by a browser: an endpoint that erases accounts must be
 * callable only by the scheduler and by an administrator.
 */
router.get("/admin/purge-deleted-accounts", async (req: any, res: any) => {
  if (!isCronAuthorized(req.get("authorization"))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return runAccountPurge(req, res);
});

router.post("/admin/purge-deleted-accounts", requireAdmin, (req: any, res: any) => runAccountPurge(req, res));

async function runAccountPurge(req: any, res: any) {
  try {
    /*
      The same daily pass fills in missing handles. Handles arrived after most
      accounts existed and were only assigned on the owner's next sign-in,
      which left people present in the Assembly but unmessageable — messaging
      goes through the handle. Waiting for everyone to come back was never
      going to finish.
    */
    const handles = await backfillHandles().catch(err => {
      req.log.warn({ err }, "Handle backfill failed");
      return { assigned: 0, skipped: 0 };
    });
    if (handles.assigned > 0) req.log.info(handles, "Assigned handles to accounts that had none");

    const result = await purgeDueAccounts();
    if (result.purged > 0 || result.failed > 0) {
      req.log.info(result, "Account purge run complete");
    }
    return res.json({ success: true, ...result, handles, graceDays: DELETION_GRACE_DAYS });
  } catch (err) {
    req.log.error({ err }, "Account purge failed");
    return res.status(500).json({ error: "The purge could not be completed.", code: "PURGE_FAILED" });
  }
}

router.get("/admin/backups", requireAdmin, async (req: any, res) => {
  try {
    const neonApiKey = process.env.NEON_API_KEY;
    const neonProjectId = process.env.NEON_PROJECT_ID;
    if (!neonApiKey || !neonProjectId) {
      return res.status(503).json({ branches: [], message: "Backup service is not configured." });
    }

    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${encodeURIComponent(neonProjectId)}/branches`,
      {
        headers: { Authorization: `Bearer ${neonApiKey}` },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) {
      return res.status(502).json({ error: "Failed to fetch backup list" });
    }

    const data = await response.json() as NeonBranchResponse;
    const backups = (data.branches || []).filter(branch => branch.name?.startsWith("backup-"));
    return res.json({ branches: backups });
  } catch (err) {
    req.log.error({ err }, "Failed to list backups");
    return res.status(502).json({ error: "Failed to fetch backup list" });
  }
});

/**
 * GET /api/admin/seo-reindex — daily IndexNow pass (Vercel Cron, Bearer CRON_SECRET).
 *
 * Submits only sitemap URLs whose lastmod changed in the last 26 hours. An
 * administrator may POST { "scope": "all" } once after a site-wide change.
 * Google is not contacted: the Indexing API is not permitted for these pages.
 */
router.get("/admin/seo-reindex", async (req: any, res: any) => {
  if (!isCronAuthorized(req.get("authorization"))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return runSeoReindex(req, res, {});
});

router.post("/admin/seo-reindex", requireAdmin, (req: any, res: any) => runSeoReindex(req, res, req.body));

async function runSeoReindex(req: any, res: any, body: unknown) {
  try {
    const result = await reindexAllPublicContent(parseReindexOptions(body));
    req.log?.info({ scope: result.scope, totalUrls: result.totalUrls, indexNow: result.indexNow }, "[SEO Cron] IndexNow pass completed");
    return res.json({
      success: result.success,
      message: `IndexNow ${result.scope === "all" ? "full" : "changed-URL"} pass covered ${result.totalUrls} URLs`,
      scope: result.scope,
      totalUrls: result.totalUrls,
      indexNow: result.indexNow,
    });
  } catch (err: any) {
    req.log?.error({ err: err?.message }, "[SEO Cron] Error during scheduled reindex");
    return res.status(500).json({ error: "SEO reindex failed" });
  }
}

export default router;
