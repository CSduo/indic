import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable, articlesTable, usersTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getUserAuth, getAdminAuth } from "../lib/auth";
import { z } from "zod";

const router = Router();

// Admin auth middleware (mirrors admin.ts)
async function requireAdmin(req: any, res: any, next: any) {
  const auth = await getAdminAuth(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  req.adminAuth = auth;
  next();
}

// GET /api/articles/:articleId/comments — all approved top-level comments + their replies
router.get("/articles/:articleId/comments", async (req, res) => {
  try {
    const { articleId } = req.params;

    // Verify article exists and is published
    const [article] = await db.select({ id: articlesTable.id })
      .from(articlesTable)
      .where(and(eq(articlesTable.id, articleId), eq(articlesTable.status, "PUBLISHED"), eq(articlesTable.deleted, false)))
      .limit(1);
    if (!article) return res.status(404).json({ error: "Article not found" });

    // Get all approved non-deleted comments for this article (top-level + replies)
    const allComments = await db.select({
      id: commentsTable.id,
      articleId: commentsTable.articleId,
      userId: commentsTable.userId,
      parentId: commentsTable.parentId,
      authorName: commentsTable.authorName,
      content: commentsTable.content,
      approved: commentsTable.approved,
      createdAt: commentsTable.createdAt,
      userAvatarUrl: usersTable.avatarUrl,
    })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
      .where(and(
        eq(commentsTable.articleId, articleId),
        eq(commentsTable.approved, true),
        eq(commentsTable.deleted, false),
      ))
      .orderBy(desc(commentsTable.createdAt));

    // Nest replies under their parents
    const topLevel = allComments.filter(c => !c.parentId);
    const replies = allComments.filter(c => !!c.parentId);

    const threaded = topLevel.map(c => ({
      ...c,
      replies: replies.filter(r => r.parentId === c.id).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }));

    return res.json({ comments: threaded });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST /api/articles/:articleId/comments — submit a comment or reply
router.post("/articles/:articleId/comments", async (req, res) => {
  try {
    const { articleId } = req.params;

    const schema = z.object({
      authorName: z.string().trim().min(1).max(160),
      content: z.string().trim().min(1).max(5000),
      authorEmail: z.string().trim().toLowerCase().email().optional(),
      parentId: z.string().optional(), // if replying to a comment
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    // Verify article exists and is published
    const [article] = await db.select({ id: articlesTable.id })
      .from(articlesTable)
      .where(and(eq(articlesTable.id, articleId), eq(articlesTable.status, "PUBLISHED"), eq(articlesTable.deleted, false)))
      .limit(1);
    if (!article) return res.status(404).json({ error: "Article not found" });

    // Verify parent comment exists if replying
    if (parsed.data.parentId) {
      const [parent] = await db.select({ id: commentsTable.id })
        .from(commentsTable)
        .where(and(
          eq(commentsTable.id, parsed.data.parentId),
          eq(commentsTable.articleId, articleId),
          eq(commentsTable.approved, true),
          eq(commentsTable.deleted, false),
        ))
        .limit(1);
      if (!parent) return res.status(404).json({ error: "Parent comment not found" });
    }

    // Check if user is logged in — auto-approve if so
    const auth = await getUserAuth(req);
    const isLoggedIn = Boolean(auth);
    const [user] = auth
      ? await db.select({ name: usersTable.name, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, auth.userId))
          .limit(1)
      : [];

    const [comment] = await db.insert(commentsTable).values({
      articleId,
      userId: auth?.userId || null,
      parentId: parsed.data.parentId || null,
      authorName: user?.name || parsed.data.authorName,
      authorEmail: user?.email || parsed.data.authorEmail || null,
      content: parsed.data.content,
      approved: isLoggedIn, // auto-approve logged-in users
    }).returning();

    return res.status(201).json({
      success: true,
      comment: { ...comment, replies: [] },
      autoApproved: isLoggedIn,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to submit comment" });
  }
});

// PATCH /api/comments/:id — edit comment (owner or admin)
router.patch("/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      content: z.string().min(1).max(5000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid content" });

    const [comment] = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);

    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const auth = await getUserAuth(req);
    const isAdmin = Boolean(await getAdminAuth(req));
    const isOwner = Boolean(auth && comment.userId === auth.userId);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "You are not authorized to edit this comment" });
    }

    const [updatedComment] = await db.update(commentsTable)
      .set({ content: parsed.data.content, updatedAt: new Date() })
      .where(eq(commentsTable.id, id))
      .returning();

    return res.json({ success: true, comment: updatedComment });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to edit comment" });
  }
});

// DELETE /api/comments/:id — delete comment (owner or admin)
router.delete("/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [comment] = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);

    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const auth = await getUserAuth(req);
    const isAdmin = Boolean(await getAdminAuth(req));
    const isOwner = Boolean(auth && comment.userId === auth.userId);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "You are not authorized to delete this comment" });
    }

    const [deletedComment] = await db.update(commentsTable)
      .set({ deleted: true, updatedAt: new Date() })
      .where(eq(commentsTable.id, id))
      .returning();

    return res.json({ success: true, comment: deletedComment });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete comment" });
  }
});

// PATCH /api/comments/:id/approve — admin only, approve comment
router.patch("/comments/:id/approve", requireAdmin, async (req, res) => {
  try {
    const [comment] = await db.update(commentsTable)
      .set({ approved: true, updatedAt: new Date() })
      .where(eq(commentsTable.id, req.params.id))
      .returning();
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    return res.json({ success: true, comment });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to approve comment" });
  }
});

export default router;
