import { Router } from "express";
import { db } from "@workspace/db";
import { newsletterSubscribersTable } from "@workspace/db";
import { z } from "zod";

const router = Router();

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(160).optional(),
});

router.post("/newsletter", async (req, res) => {
  try {
    const parsed = newsletterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid email" });

    const { email, name } = parsed.data;
    await db.insert(newsletterSubscribersTable)
      .values({ email, name: name || null })
      .onConflictDoUpdate({
        target: newsletterSubscribersTable.email,
        set: { isActive: true, ...(name ? { name } : {}) },
      });
    return res.json({ success: true, message: "Subscription active" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
