import { Router } from "express";
import { getUserAuth } from "../lib/auth";
import { z } from "zod";

const router = Router();

// GET /api/collections — user's collections (stub: no DB table yet)
router.get("/collections", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    return res.json({ collections: [] });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/collections — create a collection (stub)
router.post("/collections", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const schema = z.object({ title: z.string().min(1).max(200) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Title is required" });

    const collection = {
      id: crypto.randomUUID(),
      userId: auth.userId,
      title: parsed.data.title,
      itemCount: 0,
      createdAt: new Date().toISOString(),
    };
    return res.status(201).json(collection);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
