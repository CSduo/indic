import { Router } from "express";
import { db } from "@workspace/db";
import { tagsTable } from "@workspace/db";

const router = Router();

// GET /tags
router.get("/tags", async (_req, res) => {
  const tags = await db.select().from(tagsTable).orderBy(tagsTable.name);
  res.json(tags);
});

export default router;
