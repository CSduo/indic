import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { getAdminAuth } from "../lib/auth";

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

function isCronAuthorized(authorization: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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

export default router;
