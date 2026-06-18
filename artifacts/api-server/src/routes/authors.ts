import { Router } from "express";
import { db } from "@workspace/db";
import { authorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import { z } from "zod/v4";

const router = Router();

// GET /authors
router.get("/authors", async (_req, res) => {
  const authors = await db.select().from(authorsTable).orderBy(authorsTable.name);
  res.json(authors);
});

// POST /authors
router.post("/authors", requireAdmin, async (req, res) => {
  const schema = z.object({
    slug: z.string().optional(),
    name: z.string().min(1),
    bio: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    title: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }

  const slug = parsed.data.slug ?? parsed.data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [author] = await db.insert(authorsTable).values({ ...parsed.data, slug }).returning();
  res.status(201).json(author);
});

// GET /authors/:id
router.get("/authors/:id", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, id)).limit(1);
  if (!author) { res.status(404).json({ error: "Author not found" }); return; }
  res.json(author);
});

export default router;
