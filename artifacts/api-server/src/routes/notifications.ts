import { Router } from "express";
import { getUserAuth } from "../lib/auth";

const router = Router();

// GET /api/notifications — user's notifications (stub: no DB table yet)
router.get("/notifications", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    return res.json({ notifications: [] });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/notifications/read-all — mark all as read (stub)
router.post("/notifications/read-all", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
