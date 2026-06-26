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
  consent: z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform(v => v === true || v === "true"),
});

// POST /api/submissions (JSON body)
router.post("/submissions", async (req, res) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const auth = await getUserAuth(req);
    const data = parsed.data;

    if (!data.consent) return res.status(400).json({ error: "Consent is required" });

    const [submission] = await db.insert(submissionsTable).values({
      userId: auth?.userId || null,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      type: data.type,
      title: data.title,
      abstract: data.abstract,
      notes: data.notes,
      consent: true,
    }).returning();

    return res.status(201).json({ success: true, submission });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/submissions/upload — accepts multipart but falls back to JSON fields
router.post("/submissions/upload", async (req, res) => {
  try {
    // Handle both multipart/form-data and application/json
    const ct = req.headers["content-type"] || "";
    let fields: Record<string, string> = {};

    if (ct.includes("application/json")) {
      fields = req.body || {};
    } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
      // Express will have already parsed urlencoded, but for multipart we need special handling
      // Since busboy is not available, we extract from req.body if express-raw has it
      // Otherwise, parse from query or default
      fields = req.body || {};
      // For multipart without busboy, we try to extract fields from the raw body if express has parsed them
      // This is a best-effort fallback
    } else {
      fields = req.body || {};
    }

    const submitterName = (fields.submitterName || "").toString().trim();
    const submitterEmail = (fields.submitterEmail || "").toString().trim();
    const title = (fields.title || "").toString().trim();
    const abstract = (fields.abstract || "").toString().trim();
    const typeRaw = (fields.type || "ESSAY").toString().toUpperCase();
    const notes = (fields.notes || "").toString().trim();

    if (!submitterName || !submitterEmail || !title) {
      return res.status(400).json({ error: "Missing required fields: submitterName, submitterEmail, title" });
    }
    if (!abstract) {
      return res.status(400).json({ error: "Abstract is required" });
    }

    const validTypes = ["ESSAY", "PAPER", "REVIEW", "COMMENTARY"];
    const type = validTypes.includes(typeRaw) ? typeRaw as "ESSAY" | "PAPER" | "REVIEW" | "COMMENTARY" : "ESSAY";

    const auth = await getUserAuth(req);

    const [submission] = await db.insert(submissionsTable).values({
      userId: auth?.userId || null,
      submitterName,
      submitterEmail,
      type,
      title,
      abstract: abstract || "Submitted via upload form",
      notes: notes || null,
      consent: true,
    }).returning();

    return res.status(201).json({ success: true, submission });
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: "Upload failed", detail: err?.message });
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
