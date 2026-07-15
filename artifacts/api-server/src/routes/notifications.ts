import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, auth.userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    return res.json({ notifications });
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    return res.status(500).json({ error: "Failed to list notifications" });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    await db.update(notificationsTable)
      .set({ read: true })
      .where(and(
        eq(notificationsTable.userId, auth.userId),
        eq(notificationsTable.read, false),
      ));
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notifications read");
    return res.status(500).json({ error: "Failed to update notifications" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    const [notification] = await db.update(notificationsTable)
      .set({ read: true })
      .where(and(
        eq(notificationsTable.id, req.params.id),
        eq(notificationsTable.userId, auth.userId),
      ))
      .returning();
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    return res.json({ success: true, notification });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification read");
    return res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;
