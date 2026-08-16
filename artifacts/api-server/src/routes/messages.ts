import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  db,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  messageReactionsTable,
  typingIndicatorsTable,
  usersTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { persistUploadedFile } from "../lib/storage";
import { sendPushToUser } from "../lib/push";
import {
  describeConversation,
  directKeyFor,
  inboxCursor,
  listMembers,
  previewOf,
  reactionsFor,
  recipientsOf,
  requireMembership,
  touchConversation,
  typingIn,
  unreadCountsFor,
} from "../lib/messaging";

const router = Router();

const MAX_MESSAGE_CHARS = 4000;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES },
});

/**
 * Mark a conversation read, stamped by the database's own clock.
 *
 * Unread counts compare `messages.created_at` against this value, and
 * `created_at` is filled by Postgres `now()`. Writing a JavaScript Date here
 * instead would compare two different clocks: these columns carry no time
 * zone, so a server whose local zone is ahead of UTC stores a marker *behind*
 * the message it was meant to cover, and the message stays unread forever.
 * Taking both from `now()` removes the question entirely.
 */
async function markRead(conversationId: string, userId: string) {
  await db.execute(sql`
    UPDATE conversation_members
    SET last_read_at = now()
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
  `);
}

/** Every endpoint here is private; there is no anonymous view of a thread. */
async function requireUser(req: any, res: any): Promise<string | null> {
  const auth = await getUserAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Sign in to use messages" });
    return null;
  }
  return auth.userId;
}

/* ─── Inbox ────────────────────────────────────────────────────────────── */

/**
 * GET /api/conversations — the inbox.
 *
 * Reads only the conversations table plus one aggregate for unread counts, so
 * the cost does not grow with message volume. This is the most-polled endpoint
 * in the product.
 */
router.get("/conversations", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const rows = await db
      .select({
        id: conversationsTable.id,
        kind: conversationsTable.kind,
        title: conversationsTable.title,
        avatarUrl: conversationsTable.avatarUrl,
        lastMessageAt: conversationsTable.lastMessageAt,
        lastMessagePreview: conversationsTable.lastMessagePreview,
        muted: conversationMembersTable.muted,
        lastReadAt: conversationMembersTable.lastReadAt,
      })
      .from(conversationsTable)
      .innerJoin(conversationMembersTable, eq(conversationMembersTable.conversationId, conversationsTable.id))
      .where(and(
        eq(conversationMembersTable.userId, userId),
        isNull(conversationMembersTable.leftAt),
      ))
      .orderBy(desc(conversationsTable.lastMessageAt))
      .limit(200);

    const ids = rows.map(r => r.id);
    const [unread, memberRows] = await Promise.all([
      unreadCountsFor(userId),
      ids.length
        ? db
            .select({
              conversationId: conversationMembersTable.conversationId,
              userId: conversationMembersTable.userId,
              name: usersTable.name,
              email: usersTable.email,
              avatarUrl: usersTable.avatarUrl,
            })
            .from(conversationMembersTable)
            .innerJoin(usersTable, eq(conversationMembersTable.userId, usersTable.id))
            .where(and(
              inArray(conversationMembersTable.conversationId, ids),
              isNull(conversationMembersTable.leftAt),
            ))
        : Promise.resolve([] as any[]),
    ]);

    const byConversation = new Map<string, any[]>();
    for (const m of memberRows) {
      const list = byConversation.get(m.conversationId) || [];
      list.push(m);
      byConversation.set(m.conversationId, list);
    }

    const conversations = rows.map(row => {
      const members = byConversation.get(row.id) || [];
      const described = describeConversation(row, members, userId);
      return {
        id: row.id,
        kind: row.kind,
        title: described.title,
        avatarUrl: described.avatarUrl,
        otherUserId: described.otherUserId,
        lastMessageAt: row.lastMessageAt,
        preview: row.lastMessagePreview || "",
        unread: unread.get(row.id) || 0,
        muted: row.muted,
        memberCount: members.length,
      };
    });

    return res.json({
      conversations,
      totalUnread: conversations.reduce((sum, c) => sum + c.unread, 0),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to list conversations");
    return res.status(500).json({ error: "Could not load your messages" });
  }
});

/**
 * GET /api/conversations/cursor — a tiny endpoint the client polls.
 *
 * Returns only the newest activity timestamp and the total unread count. The
 * client compares it against what it already has and only fetches the full
 * inbox when something actually changed, which is what makes polling every few
 * seconds affordable on serverless.
 */
router.get("/conversations/cursor", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const [cursor, unread] = await Promise.all([inboxCursor(userId), unreadCountsFor(userId)]);
    let total = 0;
    unread.forEach(value => { total += value; });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ cursor, totalUnread: total });
  } catch (err) {
    req.log?.error({ err }, "Failed to read inbox cursor");
    return res.status(500).json({ error: "Could not check for new messages" });
  }
});

/* ─── Starting a conversation ──────────────────────────────────────────── */

/**
 * POST /api/conversations — open a direct thread, or create a group.
 *
 * Opening a direct thread is idempotent: the sorted-pair key means asking
 * twice returns the same conversation rather than splitting the history in
 * two, no matter which side asks.
 */
router.post("/conversations", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const parsed = z.object({
      kind: z.enum(["DIRECT", "GROUP"]).default("DIRECT"),
      userIds: z.array(z.string().min(1)).min(1).max(50),
      title: z.string().trim().max(200).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    const { kind, title } = parsed.data;
    const others = [...new Set(parsed.data.userIds.filter(id => id !== userId))];
    if (others.length === 0) return res.status(400).json({ error: "Choose someone to message" });

    // Only real accounts may be added — a stale id would otherwise create a
    // conversation with a member who can never read it.
    const found = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.id, others));
    if (found.length !== others.length) {
      return res.status(400).json({ error: "One or more of those people no longer have an account" });
    }

    if (kind === "DIRECT") {
      if (others.length !== 1) {
        return res.status(400).json({ error: "A direct conversation is between exactly two people" });
      }
      const key = directKeyFor(userId, others[0]);

      const [existing] = await db
        .select({ id: conversationsTable.id })
        .from(conversationsTable)
        .where(eq(conversationsTable.directKey, key))
        .limit(1);

      if (existing) {
        // Rejoin quietly if either side had left.
        await db
          .update(conversationMembersTable)
          .set({ leftAt: null })
          .where(and(
            eq(conversationMembersTable.conversationId, existing.id),
            eq(conversationMembersTable.userId, userId),
          ));
        return res.json({ conversation: { id: existing.id }, created: false });
      }

      const [conversation] = await db.insert(conversationsTable).values({
        kind: "DIRECT",
        directKey: key,
        createdBy: userId,
      }).returning({ id: conversationsTable.id });

      await db.insert(conversationMembersTable).values([
        { conversationId: conversation.id, userId, role: "MEMBER" },
        { conversationId: conversation.id, userId: others[0], role: "MEMBER" },
      ]);

      return res.status(201).json({ conversation: { id: conversation.id }, created: true });
    }

    const [conversation] = await db.insert(conversationsTable).values({
      kind: "GROUP",
      title: title || null,
      createdBy: userId,
    }).returning({ id: conversationsTable.id });

    await db.insert(conversationMembersTable).values([
      // Whoever creates a group administers it.
      { conversationId: conversation.id, userId, role: "ADMIN" as const },
      ...others.map(id => ({ conversationId: conversation.id, userId: id, role: "MEMBER" as const })),
    ]);

    return res.status(201).json({ conversation: { id: conversation.id }, created: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to create conversation");
    return res.status(500).json({ error: "Could not start that conversation" });
  }
});

/* ─── A single thread ──────────────────────────────────────────────────── */

/** GET /api/conversations/:id — details, members, and who is typing. */
router.get("/conversations/:id", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, req.params.id))
      .limit(1);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const [members, typing] = await Promise.all([
      listMembers(req.params.id),
      typingIn(req.params.id, userId),
    ]);
    const described = describeConversation(conversation, members, userId);

    return res.json({
      conversation: {
        id: conversation.id,
        kind: conversation.kind,
        title: described.title,
        avatarUrl: described.avatarUrl,
        otherUserId: described.otherUserId,
        muted: membership.muted,
        role: membership.role,
        members: members.map(m => ({
          userId: m.userId,
          name: m.name || m.email.split("@")[0],
          avatarUrl: m.avatarUrl,
          role: m.role,
          lastReadAt: m.lastReadAt,
        })),
      },
      typing: typing.map(t => ({ userId: t.userId, name: t.name })),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to load conversation");
    return res.status(500).json({ error: "Could not load that conversation" });
  }
});

/**
 * GET /api/conversations/:id/messages — a page of the thread.
 *
 * `before` pages backwards through history; `after` fetches only what is new,
 * which is what the open thread polls with.
 */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
    const before = typeof req.query.before === "string" ? new Date(req.query.before) : null;
    const after = typeof req.query.after === "string" ? new Date(req.query.after) : null;

    const conditions = [eq(messagesTable.conversationId, req.params.id)];
    if (before && !Number.isNaN(before.getTime())) conditions.push(lt(messagesTable.createdAt, before));
    if (after && !Number.isNaN(after.getTime())) conditions.push(gt(messagesTable.createdAt, after));

    const rows = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        kind: messagesTable.kind,
        body: messagesTable.body,
        mediaUrl: messagesTable.mediaUrl,
        mediaMimeType: messagesTable.mediaMimeType,
        mediaName: messagesTable.mediaName,
        mediaSizeBytes: messagesTable.mediaSizeBytes,
        replyToId: messagesTable.replyToId,
        createdAt: messagesTable.createdAt,
        editedAt: messagesTable.editedAt,
        deletedAt: messagesTable.deletedAt,
        senderName: usersTable.name,
        senderEmail: usersTable.email,
        senderAvatarUrl: usersTable.avatarUrl,
      })
      .from(messagesTable)
      .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(and(...conditions))
      // Newest first for a backwards page; oldest first when catching up.
      .orderBy(after ? asc(messagesTable.createdAt) : desc(messagesTable.createdAt))
      .limit(limit);

    const ordered = after ? rows : rows.slice().reverse();
    const reactions = await reactionsFor(ordered.map(m => m.id));

    // Quoted messages are resolved in one extra query rather than a join, so a
    // page with no replies costs nothing.
    const replyIds = [...new Set(ordered.map(m => m.replyToId).filter(Boolean) as string[])];
    const quoted = replyIds.length
      ? await db
          .select({
            id: messagesTable.id,
            body: messagesTable.body,
            kind: messagesTable.kind,
            mediaName: messagesTable.mediaName,
            deletedAt: messagesTable.deletedAt,
            senderName: usersTable.name,
          })
          .from(messagesTable)
          .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
          .where(inArray(messagesTable.id, replyIds))
      : [];
    const quotedById = new Map(quoted.map(q => [q.id, q]));

    const messages = ordered.map(m => {
      const grouped = reactions.get(m.id) || [];
      const counts = new Map<string, { emoji: string; count: number; mine: boolean }>();
      for (const r of grouped) {
        const entry = counts.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
        entry.count += 1;
        if (r.userId === userId) entry.mine = true;
        counts.set(r.emoji, entry);
      }
      const quotedRow = m.replyToId ? quotedById.get(m.replyToId) : null;

      return {
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName || m.senderEmail?.split("@")[0] || "Someone",
        senderAvatarUrl: m.senderAvatarUrl,
        kind: m.kind,
        // An unsent message keeps its place in the thread but not its content.
        body: m.deletedAt ? null : m.body,
        mediaUrl: m.deletedAt ? null : m.mediaUrl,
        mediaMimeType: m.deletedAt ? null : m.mediaMimeType,
        mediaName: m.deletedAt ? null : m.mediaName,
        mediaSizeBytes: m.deletedAt ? null : m.mediaSizeBytes,
        deleted: Boolean(m.deletedAt),
        edited: Boolean(m.editedAt),
        createdAt: m.createdAt,
        mine: m.senderId === userId,
        reactions: [...counts.values()],
        replyTo: quotedRow
          ? {
              id: quotedRow.id,
              senderName: quotedRow.senderName || "Someone",
              preview: quotedRow.deletedAt
                ? "Message unsent"
                : previewOf({ kind: quotedRow.kind, body: quotedRow.body, mediaName: quotedRow.mediaName }),
            }
          : null,
      };
    });

    return res.json({
      messages,
      hasMore: !after && rows.length === limit,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to load messages");
    return res.status(500).json({ error: "Could not load those messages" });
  }
});

/* ─── Sending ──────────────────────────────────────────────────────────── */

async function deliverMessage(options: {
  conversationId: string;
  senderId: string;
  senderName: string;
  preview: string;
  conversationTitle: string;
}) {
  const { conversationId, senderId, senderName, preview, conversationTitle } = options;
  await touchConversation(conversationId, preview);

  // Sending a message must not fail because a push did.
  try {
    const recipients = await recipientsOf(conversationId, senderId);
    await Promise.all(recipients
      .filter(r => !r.muted)
      .map(r => sendPushToUser(r.userId, {
        title: conversationTitle === senderName ? senderName : `${senderName} · ${conversationTitle}`,
        body: preview,
        url: `/messages/${conversationId}`,
        // One notification per conversation, replaced as it goes — a burst of
        // messages should not become a wall of separate alerts.
        tag: `conversation-${conversationId}`,
      })));
  } catch (err) {
    console.warn("Could not notify conversation members:", err);
  }
}

/** POST /api/conversations/:id/messages — send text, optionally quoting. */
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    const parsed = z.object({
      body: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      replyToId: z.string().max(120).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Write a message first", details: parsed.error.flatten() });
    }

    // A quote must point at a message in this same thread, or it would leak a
    // line of a conversation the reader is not in.
    if (parsed.data.replyToId) {
      const [target] = await db
        .select({ id: messagesTable.id })
        .from(messagesTable)
        .where(and(
          eq(messagesTable.id, parsed.data.replyToId),
          eq(messagesTable.conversationId, req.params.id),
        ))
        .limit(1);
      if (!target) return res.status(400).json({ error: "That message is not part of this conversation" });
    }

    const [message] = await db.insert(messagesTable).values({
      conversationId: req.params.id,
      senderId: userId,
      kind: "TEXT",
      body: parsed.data.body,
      replyToId: parsed.data.replyToId || null,
    }).returning();

    const [sender] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const senderName = sender?.name || sender?.email?.split("@")[0] || "Someone";

    const [conversation] = await db
      .select({ kind: conversationsTable.kind, title: conversationsTable.title })
      .from(conversationsTable).where(eq(conversationsTable.id, req.params.id)).limit(1);

    await deliverMessage({
      conversationId: req.params.id,
      senderId: userId,
      senderName,
      preview: previewOf(message),
      conversationTitle: conversation?.title || senderName,
    });

    // Sending is also reading — nobody has unread messages in a thread they
    // are actively typing in.
    await markRead(req.params.id, userId);

    // Typing has clearly stopped now that the message is sent.
    await db.delete(typingIndicatorsTable).where(and(
      eq(typingIndicatorsTable.conversationId, req.params.id),
      eq(typingIndicatorsTable.userId, userId),
    )).catch(() => {});

    return res.status(201).json({ message: { ...message, mine: true, senderName } });
  } catch (err) {
    req.log?.error({ err }, "Failed to send message");
    return res.status(500).json({ error: "Could not send that message" });
  }
});

/** POST /api/conversations/:id/attachments — send a photo, voice note, or file. */
router.post(
  "/conversations/:id/attachments",
  (req: any, res: any, next: any) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({
          error: err.code === "LIMIT_FILE_SIZE"
            ? "Attachments must be 25 MB or smaller"
            : err.message || "Could not read that file",
        });
      }
      next();
    });
  },
  async (req: any, res) => {
    try {
      const userId = await requireUser(req, res);
      if (!userId) return;

      const membership = await requireMembership(req.params.id, userId);
      if (!membership) return res.status(404).json({ error: "Conversation not found" });
      if (!req.file) return res.status(400).json({ error: "No file was attached" });

      const mime = String(req.file.mimetype || "");
      const kind = mime.startsWith("image/") ? "IMAGE" : mime.startsWith("audio/") ? "AUDIO" : "FILE";

      const stored = await persistUploadedFile({
        buffer: req.file.buffer,
        filename: `message-${crypto.randomUUID()}-${req.file.originalname}`.slice(0, 180),
        mimeType: mime,
        folder: "messages",
      });

      const [message] = await db.insert(messagesTable).values({
        conversationId: req.params.id,
        senderId: userId,
        kind,
        body: (req.body?.body || "").trim().slice(0, MAX_MESSAGE_CHARS) || null,
        mediaUrl: stored.url,
        mediaMimeType: mime,
        mediaName: req.file.originalname,
        mediaSizeBytes: req.file.size,
      }).returning();

      const [sender] = await db
        .select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      const senderName = sender?.name || sender?.email?.split("@")[0] || "Someone";
      const [conversation] = await db
        .select({ title: conversationsTable.title })
        .from(conversationsTable).where(eq(conversationsTable.id, req.params.id)).limit(1);

      await deliverMessage({
        conversationId: req.params.id,
        senderId: userId,
        senderName,
        preview: previewOf(message),
        conversationTitle: conversation?.title || senderName,
      });

      return res.status(201).json({ message: { ...message, mine: true, senderName } });
    } catch (err: any) {
      req.log?.error({ err }, "Failed to send attachment");
      return res.status(500).json({ error: err?.message || "Could not send that attachment" });
    }
  },
);

/* ─── Message actions ──────────────────────────────────────────────────── */

/** PATCH /api/messages/:id — edit your own message. */
router.patch("/messages/:id", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const parsed = z.object({ body: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Message cannot be empty" });

    const [existing] = await db.select().from(messagesTable)
      .where(eq(messagesTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Message not found" });
    if (existing.senderId !== userId) return res.status(403).json({ error: "You can only edit your own messages" });
    if (existing.deletedAt) return res.status(409).json({ error: "That message was unsent" });
    if (existing.kind !== "TEXT") return res.status(400).json({ error: "Only text messages can be edited" });

    const [message] = await db.update(messagesTable)
      .set({ body: parsed.data.body, editedAt: new Date() })
      .where(eq(messagesTable.id, req.params.id))
      .returning();

    return res.json({ message });
  } catch (err) {
    req.log?.error({ err }, "Failed to edit message");
    return res.status(500).json({ error: "Could not edit that message" });
  }
});

/** DELETE /api/messages/:id — unsend your own message. */
router.delete("/messages/:id", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const [existing] = await db.select().from(messagesTable)
      .where(eq(messagesTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Message not found" });
    if (existing.senderId !== userId) return res.status(403).json({ error: "You can only unsend your own messages" });

    await db.update(messagesTable)
      .set({ deletedAt: new Date(), body: null, mediaUrl: null })
      .where(eq(messagesTable.id, req.params.id));

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to unsend message");
    return res.status(500).json({ error: "Could not unsend that message" });
  }
});

/** PUT /api/messages/:id/reactions — add or remove one of your reactions. */
router.put("/messages/:id/reactions", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const parsed = z.object({ emoji: z.string().trim().min(1).max(16) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid reaction" });

    const [message] = await db.select({ conversationId: messagesTable.conversationId })
      .from(messagesTable).where(eq(messagesTable.id, req.params.id)).limit(1);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const membership = await requireMembership(message.conversationId, userId);
    if (!membership) return res.status(403).json({ error: "You are not in this conversation" });

    const [existing] = await db.select({ id: messageReactionsTable.id })
      .from(messageReactionsTable)
      .where(and(
        eq(messageReactionsTable.messageId, req.params.id),
        eq(messageReactionsTable.userId, userId),
        eq(messageReactionsTable.emoji, parsed.data.emoji),
      )).limit(1);

    // Tapping the same emoji again takes it back.
    if (existing) {
      await db.delete(messageReactionsTable).where(eq(messageReactionsTable.id, existing.id));
      return res.json({ success: true, reacted: false });
    }

    await db.insert(messageReactionsTable).values({
      messageId: req.params.id,
      userId,
      emoji: parsed.data.emoji,
    }).onConflictDoNothing();

    return res.json({ success: true, reacted: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to react");
    return res.status(500).json({ error: "Could not add that reaction" });
  }
});

/* ─── Read state, typing, membership ───────────────────────────────────── */

/** POST /api/conversations/:id/read — mark everything up to now as seen. */
router.post("/conversations/:id/read", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    await markRead(req.params.id, userId);

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to mark read");
    return res.status(500).json({ error: "Could not update read state" });
  }
});

/** POST /api/conversations/:id/typing — refresh the typing signal. */
router.post("/conversations/:id/typing", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    await db.insert(typingIndicatorsTable)
      .values({ conversationId: req.params.id, userId, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [typingIndicatorsTable.conversationId, typingIndicatorsTable.userId],
        set: { updatedAt: new Date() },
      });

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to record typing");
    return res.status(500).json({ error: "Could not update typing state" });
  }
});

/** PATCH /api/conversations/:id — rename a group, or mute it for yourself. */
router.patch("/conversations/:id", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    const parsed = z.object({
      title: z.string().trim().max(200).optional(),
      muted: z.boolean().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    // Muting is a personal preference; the title is shared, so only an admin
    // may change what everyone sees.
    if (parsed.data.muted !== undefined) {
      await db.update(conversationMembersTable)
        .set({ muted: parsed.data.muted })
        .where(and(
          eq(conversationMembersTable.conversationId, req.params.id),
          eq(conversationMembersTable.userId, userId),
        ));
    }

    if (parsed.data.title !== undefined) {
      if (membership.role !== "ADMIN") {
        return res.status(403).json({ error: "Only a group admin can rename this conversation" });
      }
      await db.update(conversationsTable)
        .set({ title: parsed.data.title || null, updatedAt: new Date() })
        .where(eq(conversationsTable.id, req.params.id));
    }

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to update conversation");
    return res.status(500).json({ error: "Could not update that conversation" });
  }
});

/** POST /api/conversations/:id/members — add people to a group. */
router.post("/conversations/:id/members", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });
    if (membership.role !== "ADMIN") return res.status(403).json({ error: "Only a group admin can add people" });

    const parsed = z.object({ userIds: z.array(z.string().min(1)).min(1).max(50) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Choose someone to add" });

    const [conversation] = await db.select({ kind: conversationsTable.kind })
      .from(conversationsTable).where(eq(conversationsTable.id, req.params.id)).limit(1);
    if (conversation?.kind !== "GROUP") {
      return res.status(400).json({ error: "People can only be added to a group" });
    }

    for (const id of [...new Set(parsed.data.userIds)]) {
      // Someone who previously left is restored rather than duplicated.
      await db.insert(conversationMembersTable)
        .values({ conversationId: req.params.id, userId: id, role: "MEMBER" })
        .onConflictDoUpdate({
          target: [conversationMembersTable.conversationId, conversationMembersTable.userId],
          set: { leftAt: null },
        });
    }

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to add members");
    return res.status(500).json({ error: "Could not add those people" });
  }
});

/** DELETE /api/conversations/:id/members/:userId — leave, or remove someone. */
router.delete("/conversations/:id/members/:userId", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    const target = req.params.userId;
    const removingSomeoneElse = target !== userId;
    if (removingSomeoneElse && membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only a group admin can remove someone" });
    }

    await db.update(conversationMembersTable)
      .set({ leftAt: new Date() })
      .where(and(
        eq(conversationMembersTable.conversationId, req.params.id),
        eq(conversationMembersTable.userId, target),
      ));

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to update membership");
    return res.status(500).json({ error: "Could not update the group" });
  }
});

/* ─── Finding people ───────────────────────────────────────────────────── */

/** GET /api/messages/people?q= — search accounts to start a conversation with. */
router.get("/messages/people", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ people: [] });

    const term = `%${q.replace(/[%_]/g, m => `\\${m}`)}%`;
    const people = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(and(
        ne(usersTable.id, userId),
        or(ilike(usersTable.name, term), ilike(usersTable.email, term)),
      ))
      .limit(15);

    // Only the display name is returned. Email is what was searched on, but
    // echoing it back would turn this into an address-harvesting endpoint.
    return res.json({
      people: people.map(p => ({
        id: p.id,
        name: p.name || p.email.split("@")[0],
        avatarUrl: p.avatarUrl,
      })),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to search people");
    return res.status(500).json({ error: "Could not search for people" });
  }
});

export default router;
