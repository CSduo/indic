import { Router } from "express";
import {
  articlesTable,
  collectionItemsTable,
  collectionsTable,
  db,
  papersTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { z } from "zod";

const router = Router();

async function ownedCollection(collectionId: string, userId: string) {
  const [collection] = await db.select().from(collectionsTable)
    .where(and(eq(collectionsTable.id, collectionId), eq(collectionsTable.userId, userId)))
    .limit(1);
  return collection;
}

router.get("/collections", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const collections = await db.select({
      id: collectionsTable.id,
      userId: collectionsTable.userId,
      title: collectionsTable.title,
      createdAt: collectionsTable.createdAt,
      updatedAt: collectionsTable.updatedAt,
      itemCount: sql<number>`count(${collectionItemsTable.id})`,
    })
      .from(collectionsTable)
      .leftJoin(collectionItemsTable, eq(collectionItemsTable.collectionId, collectionsTable.id))
      .where(eq(collectionsTable.userId, auth.userId))
      .groupBy(collectionsTable.id)
      .orderBy(desc(collectionsTable.updatedAt));

    return res.json({
      collections: collections.map(collection => ({
        ...collection,
        itemCount: Number(collection.itemCount),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list collections");
    return res.status(500).json({ error: "Failed to list collections" });
  }
});

router.post("/collections", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    const parsed = z.object({ title: z.string().trim().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Title is required" });

    const [collection] = await db.insert(collectionsTable).values({
      userId: auth.userId,
      title: parsed.data.title,
    }).returning();
    return res.status(201).json({ ...collection, itemCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create collection");
    return res.status(500).json({ error: "Failed to create collection" });
  }
});

router.get("/collections/:id", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    const collection = await ownedCollection(req.params.id, auth.userId);
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    const items = await db.select().from(collectionItemsTable)
      .where(eq(collectionItemsTable.collectionId, collection.id))
      .orderBy(desc(collectionItemsTable.createdAt));
    return res.json({ collection, items });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch collection");
    return res.status(500).json({ error: "Failed to fetch collection" });
  }
});

router.post("/collections/:id/items", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    const collection = await ownedCollection(req.params.id, auth.userId);
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    const parsed = z.object({
      itemType: z.enum(["ARTICLE", "PAPER"]),
      itemId: z.string().min(1).max(200),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid item" });

    const { itemType, itemId } = parsed.data;
    const [item] = itemType === "ARTICLE"
      ? await db.select({ id: articlesTable.id }).from(articlesTable)
          .where(and(
            eq(articlesTable.id, itemId),
            eq(articlesTable.status, "PUBLISHED"),
            eq(articlesTable.deleted, false),
          )).limit(1)
      : await db.select({ id: papersTable.id }).from(papersTable)
          .where(and(
            eq(papersTable.id, itemId),
            eq(papersTable.status, "PUBLISHED"),
            eq(papersTable.deleted, false),
          )).limit(1);
    if (!item) return res.status(404).json({ error: "Published item not found" });

    const [collectionItem] = await db.insert(collectionItemsTable)
      .values({ collectionId: collection.id, itemType, itemId })
      .onConflictDoNothing({
        target: [
          collectionItemsTable.collectionId,
          collectionItemsTable.itemType,
          collectionItemsTable.itemId,
        ],
      })
      .returning();
    await db.update(collectionsTable)
      .set({ updatedAt: new Date() })
      .where(eq(collectionsTable.id, collection.id));
    return res.status(collectionItem ? 201 : 200).json({
      success: true,
      item: collectionItem || null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add collection item");
    return res.status(500).json({ error: "Failed to add collection item" });
  }
});

router.delete("/collections/:id/items/:itemId", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    const collection = await ownedCollection(req.params.id, auth.userId);
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    await db.delete(collectionItemsTable).where(and(
      eq(collectionItemsTable.id, req.params.itemId),
      eq(collectionItemsTable.collectionId, collection.id),
    ));
    await db.update(collectionsTable)
      .set({ updatedAt: new Date() })
      .where(eq(collectionsTable.id, collection.id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove collection item");
    return res.status(500).json({ error: "Failed to remove collection item" });
  }
});

router.delete("/collections/:id", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });
    const [deleted] = await db.delete(collectionsTable)
      .where(and(eq(collectionsTable.id, req.params.id), eq(collectionsTable.userId, auth.userId)))
      .returning({ id: collectionsTable.id });
    if (!deleted) return res.status(404).json({ error: "Collection not found" });
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete collection");
    return res.status(500).json({ error: "Failed to delete collection" });
  }
});

export default router;
