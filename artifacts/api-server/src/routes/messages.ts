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
  followsTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { persistUploadedFile, signedMediaUrl } from "../lib/storage";
import { sendPushToUser } from "../lib/push";
import { notifyUser } from "../lib/notify";
import { validateHandle, handleIsAvailable } from "../lib/handles";
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

/**
 * A pending request lets the sender write exactly once.
 *
 * Without this cap, "request to message" would be decoration: anyone could
 * fill a stranger's request list with an unlimited stream before it was ever
 * accepted. One message is enough to say who you are and why.
 */
const REQUEST_MESSAGE_ALLOWANCE = 1;

type RequestState = {
  pending: boolean;
  /** True when the viewer is the one who sent the request. */
  iRequested: boolean;
};

async function requestStateFor(conversationId: string, userId: string): Promise<RequestState> {
  const [row] = await db
    .select({ requestedBy: conversationsTable.requestedBy, acceptedAt: conversationsTable.acceptedAt })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);
  const pending = Boolean(row && !row.acceptedAt && row.requestedBy);
  return { pending, iRequested: pending && row!.requestedBy === userId };
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

/* â”€â”€â”€ Inbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * GET /api/conversations â€” the inbox.
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
        requestedBy: conversationsTable.requestedBy,
        acceptedAt: conversationsTable.acceptedAt,
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

    const all = rows.map(row => {
      const members = byConversation.get(row.id) || [];
      const described = describeConversation(row, members, userId);
      const pending = Boolean(!row.acceptedAt && row.requestedBy);
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
        pending,
        iRequested: pending && row.requestedBy === userId,
      };
    });

    // Requests are kept out of the main inbox. Mixing an unaccepted stranger
    // in with real conversations is how an inbox becomes something people stop
    // opening, and it makes the accept step easy to miss.
    const conversations = all.filter(c => !c.pending || c.iRequested);
    const requests = all.filter(c => c.pending && !c.iRequested);

    return res.json({
      conversations,
      requests,
      // A pending request is not an unread message; it is counted separately
      // so the inbox badge never nags about someone you have not admitted.
      totalUnread: conversations.reduce((sum, c) => sum + c.unread, 0),
      requestCount: requests.length,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to list conversations");
    return res.status(500).json({ error: "Could not load your messages" });
  }
});

/**
 * GET /api/conversations/cursor â€” a tiny endpoint the client polls.
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

/* â”€â”€â”€ Starting a conversation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * POST /api/conversations â€” open a direct thread, or create a group.
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

    // Only real accounts may be added â€” a stale id would otherwise create a
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

      // Someone the recipient already follows is not a stranger, so their
      // thread opens immediately. Anyone else has to be accepted first â€” that
      // is what stops the directory turning into an open channel to every
      // member of the site.
      const [theyFollowMe] = await db
        .select({ id: followsTable.id })
        .from(followsTable)
        .where(and(eq(followsTable.followerId, others[0]), eq(followsTable.followingId, userId)))
        .limit(1);

      const [conversation] = await db.insert(conversationsTable).values({
        kind: "DIRECT",
        directKey: key,
        createdBy: userId,
        requestedBy: theyFollowMe ? null : userId,
        acceptedAt: theyFollowMe ? new Date() : null,
      }).returning({ id: conversationsTable.id });

      await db.insert(conversationMembersTable).values([
        { conversationId: conversation.id, userId, role: "MEMBER" },
        { conversationId: conversation.id, userId: others[0], role: "MEMBER" },
      ]);

      return res.status(201).json({
        conversation: { id: conversation.id },
        created: true,
        pendingRequest: !theyFollowMe,
      });
    }

    // A group may only be assembled from people who have actually agreed to
    // hear from you â€” otherwise a group becomes a way around the request step.
    const reachable = await db
      .select({ other: conversationsTable.directKey })
      .from(conversationsTable)
      .where(and(
        eq(conversationsTable.kind, "DIRECT"),
        isNotNull(conversationsTable.acceptedAt),
        inArray(conversationsTable.directKey, others.map(id => directKeyFor(userId, id))),
      ));
    const acceptedKeys = new Set(reachable.map(r => r.other));
    const notReachable = others.filter(id => !acceptedKeys.has(directKeyFor(userId, id)));
    if (notReachable.length > 0) {
      return res.status(403).json({
        error: "You can only start a group with people who have accepted a message from you.",
        code: "GROUP_MEMBERS_NOT_ACCEPTED",
        blocked: notReachable.length,
      });
    }

    const [conversation] = await db.insert(conversationsTable).values({
      kind: "GROUP",
      acceptedAt: new Date(),
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

/* â”€â”€â”€ A single thread â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** GET /api/conversations/:id â€” details, members, and who is typing. */
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
 * GET /api/conversations/:id/messages â€” a page of the thread.
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
        mediaStorageKey: messagesTable.mediaStorageKey,
        mediaResourceType: messagesTable.mediaResourceType,
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

      /*
        Attachments are stored privately, so the address that opens one is
        computed here, for someone whose membership of this conversation has
        already been established above. Messages sent before attachments became
        private have no storage key and keep the URL they were stored with.
      */
      /*
        The address handed out is this server's, not storage's. A storage URL
        is a bearer token — whoever holds it can open the file forever, from
        anywhere, signed in as nobody. Routing through here means every request
        for an attachment is checked against the conversation it belongs to.
      */
      const hasMedia = Boolean(m.mediaUrl || m.mediaStorageKey);
      const viewUrl = m.deletedAt || !hasMedia ? null : `/api/messages/${m.id}/media`;
      const saveUrl = m.deletedAt || !hasMedia ? null : `/api/messages/${m.id}/media?download=1`;

      return {
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName || m.senderEmail?.split("@")[0] || "Someone",
        senderAvatarUrl: m.senderAvatarUrl,
        kind: m.kind,
        // An unsent message keeps its place in the thread but not its content.
        body: m.deletedAt ? null : m.body,
        mediaUrl: viewUrl,
        mediaDownloadUrl: saveUrl,
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

/* â”€â”€â”€ Sending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
        title: conversationTitle === senderName ? senderName : `${senderName} Â· ${conversationTitle}`,
        body: preview,
        url: `/messages/${conversationId}`,
        // One notification per conversation, replaced as it goes â€” a burst of
        // messages should not become a wall of separate alerts.
        tag: `conversation-${conversationId}`,
      })));
  } catch (err) {
    console.warn("Could not notify conversation members:", err);
  }
}

/** POST /api/conversations/:id/messages â€” send text, optionally quoting. */
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

    // While a request is pending the sender gets one message, and the
    // recipient cannot reply at all without accepting â€” replying *is*
    // accepting, so an implicit one would defeat the point.
    const request = await requestStateFor(req.params.id, userId);
    if (request.pending) {
      if (!request.iRequested) {
        return res.status(403).json({
          error: "Accept this message request before replying.",
          code: "REQUEST_NOT_ACCEPTED",
        });
      }
      const [{ sent }] = await db
        .select({ sent: sql<number>`count(*)` })
        .from(messagesTable)
        .where(and(eq(messagesTable.conversationId, req.params.id), eq(messagesTable.senderId, userId)));
      if (Number(sent) >= REQUEST_MESSAGE_ALLOWANCE) {
        return res.status(403).json({
          error: "You have sent your message request. You can write again once they accept it.",
          code: "REQUEST_LIMIT_REACHED",
        });
      }
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

    /*
      Latency here is almost entirely round trips, not work: this database is
      remote, so every sequential query adds its own delay to how long a
      message takes to send. The write and the two lookups it does not depend
      on are issued together, and the follow-up bookkeeping likewise — which
      turns eight round trips in a row into three.
    */
    const [inserted, senderRows, conversationRows] = await Promise.all([
      db.insert(messagesTable).values({
        conversationId: req.params.id,
        senderId: userId,
        kind: "TEXT",
        body: parsed.data.body,
        replyToId: parsed.data.replyToId || null,
      }).returning(),
      db.select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1),
      db.select({ kind: conversationsTable.kind, title: conversationsTable.title })
        .from(conversationsTable).where(eq(conversationsTable.id, req.params.id)).limit(1),
    ]);

    const message = inserted[0];
    const sender = senderRows[0];
    const conversation = conversationRows[0];
    const senderName = sender?.name || sender?.email?.split("@")[0] || "Someone";

    await Promise.all([
      deliverMessage({
        conversationId: req.params.id,
        senderId: userId,
        senderName,
        preview: previewOf(message),
        conversationTitle: conversation?.title || senderName,
      }),
      // Sending is also reading — nobody has unread messages in a thread they
      // are actively typing in.
      markRead(req.params.id, userId),
      // Typing has clearly stopped now that the message is sent.
      db.delete(typingIndicatorsTable).where(and(
        eq(typingIndicatorsTable.conversationId, req.params.id),
        eq(typingIndicatorsTable.userId, userId),
      )).catch(() => {}),
    ]);

    return res.status(201).json({ message: normaliseOwnMessage(message, senderName) });
  } catch (err) {
    req.log?.error({ err }, "Failed to send message");
    return res.status(500).json({ error: "Could not send that message" });
  }
});

/** POST /api/conversations/:id/attachments â€” send a photo, voice note, or file. */
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

      // The sender's filename is kept, with a short token for uniqueness and
      // the extension left at the end. Prefixing a full UUID made every
      // attachment arrive looking like machine output; the extension staying
      // last is what lets the browser open a document rather than download it.
      const originalName = String(req.file.originalname || "attachment");
      const extension = /\.[A-Za-z0-9]{1,8}$/.exec(originalName)?.[0] || "";
      const stem = originalName
        .slice(0, originalName.length - extension.length)
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "attachment";

      const stored = await persistUploadedFile({
        buffer: req.file.buffer,
        filename: `${stem}-${crypto.randomUUID().slice(0, 8)}${extension}`,
        mimeType: mime,
        folder: "messages",
        // What is sent in a conversation belongs to that conversation. Stored
        // privately, the file has no address that works for anyone this server
        // has not signed a URL for.
        visibility: "private",
      });

      const [message] = await db.insert(messagesTable).values({
        conversationId: req.params.id,
        senderId: userId,
        kind,
        body: (req.body?.body || "").trim().slice(0, MAX_MESSAGE_CHARS) || null,
        mediaUrl: stored.url,
        mediaMimeType: mime,
        mediaName: originalName,
        mediaSizeBytes: req.file.size,
        mediaStorageKey: stored.private ? stored.storageKey : null,
        mediaResourceType: stored.private ? (stored.resourceType || "image") : null,
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

      return res.status(201).json({ message: normaliseOwnMessage(message, senderName) });
    } catch (err: any) {
      req.log?.error({ err }, "Failed to send attachment");
      return res.status(500).json({ error: err?.message || "Could not send that attachment" });
    }
  },
);

/**
 * Shape a freshly-written row the way the thread endpoint shapes every other
 * message, so the sender's screen can drop it straight in beside the rest
 * instead of waiting for a refetch to learn what it looks like.
 */
function normaliseOwnMessage(message: any, senderName: string) {
  const hasMedia = Boolean(message.mediaUrl || message.mediaStorageKey);
  const viewUrl = hasMedia ? `/api/messages/${message.id}/media` : null;

  return {
    id: message.id,
    senderId: message.senderId,
    senderName,
    senderAvatarUrl: null,
    kind: message.kind,
    body: message.body,
    mediaUrl: viewUrl,
    mediaDownloadUrl: hasMedia ? `/api/messages/${message.id}/media?download=1` : null,
    mediaMimeType: message.mediaMimeType ?? null,
    mediaName: message.mediaName ?? null,
    mediaSizeBytes: message.mediaSizeBytes ?? null,
    deleted: false,
    edited: false,
    createdAt: message.createdAt,
    mine: true,
    reactions: [] as Array<{ emoji: string; count: number; mine: boolean }>,
    replyTo: null,
  };
}

/* â”€â”€â”€ Message actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** PATCH /api/messages/:id â€” edit your own message. */
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

/**
 * GET /api/handles/check?handle=x — is this one usable?
 *
 * Answers only "free or not", never who holds it. Telling an anonymous caller
 * which handles are taken and by whom would turn this into a way to enumerate
 * the membership.
 */
router.get("/handles/check", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const check = validateHandle(String(req.query.handle || ""));
    if (!check.ok) return res.json({ available: false, reason: check.reason });

    const available = await handleIsAvailable(check.handle, userId);
    return res.json({
      available,
      handle: check.handle,
      reason: available ? null : "That handle is already taken.",
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to check a handle");
    return res.status(500).json({ error: "Could not check that handle.", code: "LOAD_FAILED" });
  }
});

/**
 * GET /api/conversations/by-handle/:handle — the direct thread with a person.
 *
 * What makes `/messages/@arya-ambadi` work: the browser asks which conversation
 * that handle corresponds to, and gets the existing one or a newly opened one,
 * subject to the same request rules as starting a conversation any other way.
 */
router.get("/conversations/by-handle/:handle", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const wanted = String(req.params.handle || "").replace(/^@/, "").toLowerCase();
    const [other] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.handle}) = ${wanted}`)
      .limit(1);

    if (!other) return res.status(404).json({ error: "No member with that handle." });
    if (other.id === userId) return res.status(400).json({ error: "That is you." });

    const key = directKeyFor(userId, other.id);
    const [existing] = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(eq(conversationsTable.directKey, key))
      .limit(1);

    if (!existing) return res.json({ conversationId: null, otherUserId: other.id });
    return res.json({ conversationId: existing.id, otherUserId: other.id });
  } catch (err) {
    req.log?.error({ err }, "Failed to resolve a handle");
    return res.status(500).json({ error: "Could not open that conversation.", code: "LOAD_FAILED" });
  }
});

/**
 * GET /api/messages/:id/media — serve an attachment, to members only.
 *
 * Storing attachments privately stopped them being reachable by guessing, but
 * the signed address the server minted was still a bearer token: anyone holding
 * that link could open the file, indefinitely, without being in the
 * conversation or signed in as anyone at all. A link pasted into the wrong
 * place, or lifted from a browser's history, was enough.
 *
 * So the link handed to the browser now points here instead, and every request
 * for it is checked the same way the message itself is: are you signed in, and
 * are you in this conversation? The address is worthless to anybody else. The
 * file is fetched from storage on the server side and passed through, so the
 * real storage URL is never given out.
 *
 * Range requests are forwarded, because a voice note that cannot be scrubbed is
 * a voice note you have to listen to from the beginning every time.
 */
router.get("/messages/:id/media", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const [message] = await db
      .select({
        conversationId: messagesTable.conversationId,
        mediaUrl: messagesTable.mediaUrl,
        mediaName: messagesTable.mediaName,
        mediaMimeType: messagesTable.mediaMimeType,
        mediaStorageKey: messagesTable.mediaStorageKey,
        mediaResourceType: messagesTable.mediaResourceType,
        deletedAt: messagesTable.deletedAt,
      })
      .from(messagesTable)
      .where(eq(messagesTable.id, req.params.id))
      .limit(1);

    if (!message || message.deletedAt) return res.status(404).json({ error: "Not found" });

    const membership = await requireMembership(message.conversationId, userId);
    if (!membership) return res.status(404).json({ error: "Not found" });

    const source = signedMediaUrl({
      storageKey: message.mediaStorageKey,
      resourceType: message.mediaResourceType,
    }) || message.mediaUrl;
    if (!source) return res.status(404).json({ error: "Not found" });

    // A data URI is already the file; there is nothing to fetch.
    if (source.startsWith("data:")) return res.redirect(source);

    const upstream = await fetch(source, {
      headers: req.headers.range ? { Range: String(req.headers.range) } : undefined,
    });
    if (!upstream.ok && upstream.status !== 206) {
      req.log?.warn({ status: upstream.status }, "Attachment fetch failed");
      return res.status(502).json({ error: "That file could not be loaded." });
    }

    const name = (message.mediaName || "attachment").replace(/["\\\r\n]/g, "");
    const wantsDownload = req.query.download === "1";

    res.status(upstream.status);
    res.setHeader("Content-Type", message.mediaMimeType || upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Content-Disposition", `${wantsDownload ? "attachment" : "inline"}; filename="${name}"`);
    // Private: a shared cache must never hold one member's attachment.
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    for (const header of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    return res.end();
  } catch (err) {
    req.log?.error({ err }, "Failed to serve an attachment");
    return res.status(500).json({ error: "That file could not be loaded.", code: "LOAD_FAILED" });
  }
});

/** DELETE /api/messages/:id â€” unsend your own message. */
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

/** PUT /api/messages/:id/reactions â€” add or remove one of your reactions. */
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

/* â”€â”€â”€ Read state, typing, membership â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** POST /api/conversations/:id/read â€” mark everything up to now as seen. */
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

/** POST /api/conversations/:id/typing â€” refresh the typing signal. */
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

/** PATCH /api/conversations/:id â€” rename a group, or mute it for yourself. */
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

/** POST /api/conversations/:id/members â€” add people to a group. */
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

/** DELETE /api/conversations/:id/members/:userId â€” leave, or remove someone. */
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

/** POST /api/conversations/:id/accept â€” accept a message request. */
router.post("/conversations/:id/accept", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    const request = await requestStateFor(req.params.id, userId);
    if (!request.pending) return res.json({ success: true, alreadyOpen: true });
    if (request.iRequested) {
      return res.status(403).json({ error: "The other person has to accept this one" });
    }

    await db.update(conversationsTable)
      .set({ acceptedAt: new Date(), requestedBy: null, updatedAt: new Date() })
      .where(eq(conversationsTable.id, req.params.id));

    const [me] = await db.select({ name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const others = await recipientsOf(req.params.id, userId);
    await Promise.all(others.map(o => notifyUser({
      userId: o.userId,
      type: "MESSAGE_REQUEST_ACCEPTED",
      message: `${me?.name || "Someone"} accepted your message request.`,
      href: `/messages/${req.params.id}`,
      pushTitle: "Message request accepted",
      tag: `conversation-${req.params.id}`,
    })));

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to accept request");
    return res.status(500).json({ error: "Could not accept that request" });
  }
});

/**
 * DELETE /api/conversations/:id/request â€” decline.
 *
 * The whole conversation goes, not just the membership: a declined request
 * should leave nothing behind, and keeping the row would let the sender see
 * that it had been read and then refused.
 */
router.delete("/conversations/:id/request", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;
    const membership = await requireMembership(req.params.id, userId);
    if (!membership) return res.status(404).json({ error: "Conversation not found" });

    const request = await requestStateFor(req.params.id, userId);
    if (!request.pending || request.iRequested) {
      return res.status(400).json({ error: "There is no pending request to decline here" });
    }

    await db.delete(conversationsTable).where(eq(conversationsTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to decline request");
    return res.status(500).json({ error: "Could not decline that request" });
  }
});

/* â”€â”€â”€ Finding people â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** GET /api/messages/people?q= â€” search accounts to start a conversation with. */
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
        // Names only. Matching against email never showed an address, but it
        // still answered questions about them: whether a particular person has
        // an account here, and — searching for a provider's domain — who all
        // of them are. Someone's address is theirs, and it is not a handle
        // other members get to look people up by.
        ilike(usersTable.name, term),
      ))
      .limit(15);

    // The display name is all that leaves this endpoint.
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
