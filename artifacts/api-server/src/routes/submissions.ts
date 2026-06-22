import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { z } from "zod";

const router = Router();

const submissionSchema = z.object({
  type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]),
  submitterName: z.string().min(1).max(160),
  submitterEmail: z.string().email(),
  title: z.string().min(1).max(500),
  abstract: z.string().min(1).max(5000),
  notes: z.string().max(2000).optional(),
  consent: z.boolean().refine(v => v === true),
});

// POST /api/submissions
router.post("/submissions", async (req, res) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const auth = await getUserAuth(req);
    const data = parsed.data;

    const [submission] = await db.insert(submissionsTable).values({
      userId: auth?.userId || null,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      type: data.type,
      title: data.title,
      abstract: data.abstract,
      notes: data.notes,
      consent: data.consent,
    }).returning();

    return res.status(201).json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/submissions (user's own)
router.get("/submissions", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const submissions = await db.select().from(submissionsTable)
      .where(eq(submissionsTable.userId, auth.userId))
      .orderBy(submissionsTable.createdAt);

    return res.json({ submissions });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
