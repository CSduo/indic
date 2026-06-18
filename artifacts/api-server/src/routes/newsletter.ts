import { Router } from "express";
import { db } from "@workspace/db";
import { newsletterSubscribersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth.js";
import { newsletterRateLimiter } from "../middlewares/rateLimiter.js";
import { z } from "zod/v4";

const router = Router();

// POST /newsletter
router.post("/newsletter", newsletterRateLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email().max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid email" }); return; }

  try {
    await db.insert(newsletterSubscribersTable).values({ email: parsed.data.email });
    res.status(201).json({ message: "Subscribed successfully" });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      res.status(409).json({ error: "Already subscribed" });
    } else {
      throw err;
    }
  }
});

// GET /newsletter
router.get("/newsletter", requireAdmin, async (_req, res) => {
  const subscribers = await db.select().from(newsletterSubscribersTable).orderBy(newsletterSubscribersTable.createdAt);
  res.json(subscribers.map((s) => ({
    id: s.id, email: s.email, createdAt: s.createdAt.toISOString(), active: s.active,
  })));
});

export default router;
