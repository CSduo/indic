import { Router } from "express";
import { db } from "@workspace/db";
import { newsletterSubscribersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const newsletterSchema = z.object({
  email: z.string().email(),
  name: z.string().max(160).optional(),
});

router.post("/newsletter", async (req, res) => {
  try {
    const parsed = newsletterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid email" });

    const { email, name } = parsed.data;
    const [existing] = await db.select().from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.email, email)).limit(1);

    if (existing) {
      if (!existing.isActive) {
        await db.update(newsletterSubscribersTable).set({ isActive: true }).where(eq(newsletterSubscribersTable.email, email));
        return res.json({ success: true, message: "Subscription reactivated" });
      }
      return res.status(409).json({ error: "Already subscribed" });
    }

    await db.insert(newsletterSubscribersTable).values({ email, name: name || null });
    return res.json({ success: true, message: "Subscribed successfully" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
