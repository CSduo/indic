import { Router } from "express";
import { getAdminAuth } from "../lib/auth";

const router = Router();

async function requireAdmin(req: any, res: any, next: any) {
  const auth = await getAdminAuth(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  req.adminAuth = auth;
  next();
}

// POST /api/admin/trigger-backup — trigger a Neon database snapshot via Neon API
// Called manually or by Vercel Cron every Sunday
router.post("/admin/trigger-backup", requireAdmin, async (req: any, res) => {
  try {
    const neonApiKey = process.env.NEON_API_KEY;
    const neonProjectId = process.env.NEON_PROJECT_ID;

    if (!neonApiKey || !neonProjectId) {
      // Graceful fallback: log that backup was triggered but credentials are missing
      req.log.warn("Neon backup triggered but NEON_API_KEY or NEON_PROJECT_ID is not set. Set these in Vercel env vars.");
      return res.json({
        success: false,
        message: "Backup credentials not configured. Set NEON_API_KEY and NEON_PROJECT_ID in Vercel environment variables.",
        timestamp: new Date().toISOString(),
      });
    }

    // Call Neon API to create a branch (snapshot) of the main branch
    const branchName = `backup-${new Date().toISOString().split("T")[0]}`;
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${neonProjectId}/branches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${neonApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: { name: branchName },
          endpoints: [],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      req.log.error({ err }, "Failed to create Neon branch backup");
      return res.status(500).json({ success: false, error: "Backup failed", detail: err });
    }

    const data = (await response.json()) as any;
    req.log.info({ branchName, branchId: data.branch?.id }, "Database backup branch created successfully");

    return res.json({
      success: true,
      message: `Database snapshot created: ${branchName}`,
      branchId: data.branch?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: "Backup request failed", detail: err?.message });
  }
});

// GET /api/admin/backups — list recent backup branches in Neon
router.get("/admin/backups", requireAdmin, async (req: any, res) => {
  try {
    const neonApiKey = process.env.NEON_API_KEY;
    const neonProjectId = process.env.NEON_PROJECT_ID;

    if (!neonApiKey || !neonProjectId) {
      return res.json({ branches: [], message: "Neon credentials not set" });
    }

    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${neonProjectId}/branches`,
      {
        headers: { Authorization: `Bearer ${neonApiKey}` },
      }
    );

    if (!response.ok) return res.status(500).json({ error: "Failed to fetch branches" });

    const data = (await response.json()) as any;
    // Only return branches whose names start with "backup-"
    const backups = (data.branches || []).filter((b: any) => b.name?.startsWith("backup-"));

    return res.json({ branches: backups });
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed", detail: err?.message });
  }
});

export default router;
