import { Router } from "express";
import { db } from "@workspace/db";
import { savedItemsTable, articlesTable, papersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { z } from "zod";

const router = Router();

// GET /api/saved-items — user's saved items
router.get("/saved-items", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const savedItems = await db
      .select()
      .from(savedItemsTable)
      .where(eq(savedItemsTable.userId, auth.userId))
      .orderBy(savedItemsTable.createdAt);

    // Hydrate with actual item data
    const hydratedItems = await Promise.all(
      savedItems.map(async (item) => {
        if (item.itemType === "ARTICLE") {
          const [article] = await db
            .select()
            .from(articlesTable)
            .where(eq(articlesTable.id, item.itemId))
            .limit(1);
          return { ...item, item: article || null };
        } else {
          const [paper] = await db
            .select()
            .from(papersTable)
            .where(eq(papersTable.id, item.itemId))
            .limit(1);
          return { ...item, item: paper || null };
        }
      })
    );

    return res.json({ savedItems: hydratedItems });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/saved-items — save an article or paper
router.post("/saved-items", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const schema = z.object({
      itemType: z.enum(["ARTICLE", "PAPER"]),
      itemId: z.string().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const { itemType, itemId } = parsed.data;

    const [existing] = await db
      .select()
      .from(savedItemsTable)
      .where(
        and(
          eq(savedItemsTable.userId, auth.userId),
          eq(savedItemsTable.itemType, itemType),
          eq(savedItemsTable.itemId, itemId)
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "Already saved" });
    }

    const [savedItem] = await db
      .insert(savedItemsTable)
      .values({ userId: auth.userId, itemType, itemId })
      .returning();

    return res.status(201).json({ success: true, savedItem });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/saved-items/:id — remove a saved item
router.delete("/saved-items/:id", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const [item] = await db
      .select()
      .from(savedItemsTable)
      .where(
        and(
          eq(savedItemsTable.id, req.params.id),
          eq(savedItemsTable.userId, auth.userId)
        )
      )
      .limit(1);

    if (!item) return res.status(404).json({ error: "Not found" });

    await db.delete(savedItemsTable).where(eq(savedItemsTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
