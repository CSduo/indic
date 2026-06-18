import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import { submitRateLimiter } from "../middlewares/rateLimiter.js";
import { z } from "zod/v4";

const router = Router();

// POST /submissions
router.post("/submissions", submitRateLimiter, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(300),
    type: z.enum(["article", "paper"]),
    title: z.string().min(1).max(500),
    abstract: z.string().max(5000).optional(),
    notes: z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid submission data" }); return; }

  const [submission] = await db.insert(submissionsTable).values(parsed.data).returning();
  res.status(201).json({
    id: submission!.id,
    name: submission!.name,
    email: submission!.email,
    type: submission!.type,
    title: submission!.title,
    abstract: submission!.abstract,
    notes: submission!.notes,
    status: submission!.status,
    createdAt: submission!.createdAt.toISOString(),
  });
});

// GET /submissions
router.get("/submissions", requireAdmin, async (req, res) => {
  const { status } = req.query as Record<string, string>;
  const submissions = status
    ? await db.select().from(submissionsTable).where(eq(submissionsTable.status, status))
    : await db.select().from(submissionsTable);

  res.json(submissions.map((s) => ({
    id: s.id, name: s.name, email: s.email, type: s.type, title: s.title,
    abstract: s.abstract, notes: s.notes, status: s.status, createdAt: s.createdAt.toISOString(),
  })));
});

// PATCH /submissions/:id
router.patch("/submissions/:id", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params["id"]));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const schema = z.object({ status: z.enum(["pending", "accepted", "rejected"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }

  const [submission] = await db.update(submissionsTable).set({ status: parsed.data.status }).where(eq(submissionsTable.id, id)).returning();
  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

  res.json({
    id: submission.id, name: submission.name, email: submission.email, type: submission.type,
    title: submission.title, abstract: submission.abstract, notes: submission.notes,
    status: submission.status, createdAt: submission.createdAt.toISOString(),
  });
});

export default router;
