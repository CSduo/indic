import {
  db,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  messageReactionsTable,
  typingIndicatorsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";

/**
 * How long a typing signal is believed. The client refreshes every few seconds
 * while someone is actually typing, so anything older than this is a client
 * that stopped, navigated away, or lost its connection.
 */
export const TYPING_TTL_MS = 8000;

/** The canonical key for a one-to-one thread, so two people can only ever have one. */
export function directKeyFor(userA: string, userB: string): string {
  return [userA, userB].sort().join(":");
}

export type Membership = {
  conversationId: string;
  userId: string;
  role: "MEMBER" | "ADMIN";
  lastReadAt: Date | null;
  muted: boolean;
};

/**
 * Confirm the caller is currently in this conversation.
 *
 * Every read and write goes through this. Membership is the only access rule
 * in messaging — there is no "public" conversation — so a missing check here
 * would expose private threads to anyone who guessed an id.
 */
export async function requireMembership(
  conversationId: string,
  userId: string,
): Promise<Membership | null> {
  const [row] = await db
    .select({
      conversationId: conversationMembersTable.conversationId,
      userId: conversationMembersTable.userId,
      role: conversationMembersTable.role,
      lastReadAt: conversationMembersTable.lastReadAt,
      muted: conversationMembersTable.muted,
    })
    .from(conversationMembersTable)
    .where(and(
      eq(conversationMembersTable.conversationId, conversationId),
      eq(conversationMembersTable.userId, userId),
      isNull(conversationMembersTable.leftAt),
    ))
    .limit(1);
  return (row as Membership) || null;
}

/** Everyone currently in a conversation, with their profile details. */
export async function listMembers(conversationId: string) {
  return db
    .select({
      userId: conversationMembersTable.userId,
      role: conversationMembersTable.role,
      joinedAt: conversationMembersTable.joinedAt,
      lastReadAt: conversationMembersTable.lastReadAt,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
      handle: usersTable.handle,
    })
    .from(conversationMembersTable)
    .innerJoin(usersTable, eq(conversationMembersTable.userId, usersTable.id))
    .where(and(
      eq(conversationMembersTable.conversationId, conversationId),
      isNull(conversationMembersTable.leftAt),
    ));
}

/**
 * The display identity of a conversation for one particular person.
 *
 * A group carries its own title. A direct thread has none — it is "the other
 * person", which differs for each side, so it can only be resolved per viewer
 * and never stored on the row.
 */
export function describeConversation(
  conversation: { kind: string; title: string | null; avatarUrl: string | null },
  members: Array<{ userId: string; name: string | null; email: string; avatarUrl: string | null; handle?: string | null }>,
  viewerId: string,
): { title: string; avatarUrl: string | null; otherUserId: string | null; handle?: string | null } {
  if (conversation.kind === "GROUP") {
    const names = members
      .filter(m => m.userId !== viewerId)
      .map(m => (m.name || m.email.split("@")[0]).split(" ")[0]);
    return {
      title: conversation.title || names.slice(0, 3).join(", ") || "Group",
      avatarUrl: conversation.avatarUrl,
      otherUserId: null,
    };
  }
  const other = members.find(m => m.userId !== viewerId) || members[0];
  return {
    title: other?.name || other?.email.split("@")[0] || "Conversation",
    avatarUrl: other?.avatarUrl || null,
    otherUserId: other?.userId || null,
    handle: other?.handle || null,
  };
}

/**
 * Unread counts for every conversation this person belongs to, in one query.
 *
 * Counting per conversation in a loop is the obvious version and the wrong
 * one: the inbox is polled continuously, so this has to be a single aggregate
 * regardless of how many threads someone is in. Messages the viewer sent
 * themselves never count.
 */
export async function unreadCountsFor(userId: string): Promise<Map<string, number>> {
  const rows: any = await db.execute(sql`
    SELECT m.conversation_id AS "conversationId", COUNT(*)::int AS "unread"
    FROM messages m
    JOIN conversation_members cm
      ON cm.conversation_id = m.conversation_id
     AND cm.user_id = ${userId}
     AND cm.left_at IS NULL
    WHERE m.deleted_at IS NULL
      AND m.sender_id IS DISTINCT FROM ${userId}
      AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
    GROUP BY m.conversation_id
  `);
  const list = rows?.rows ?? rows ?? [];
  return new Map(list.map((r: any) => [r.conversationId, Number(r.unread)]));
}

/** Reactions for a set of messages, grouped by message. */
export async function reactionsFor(messageIds: string[]) {
  if (messageIds.length === 0) return new Map<string, Array<{ emoji: string; userId: string }>>();
  const rows = await db
    .select({
      messageId: messageReactionsTable.messageId,
      emoji: messageReactionsTable.emoji,
      userId: messageReactionsTable.userId,
    })
    .from(messageReactionsTable)
    .where(inArray(messageReactionsTable.messageId, messageIds));

  const grouped = new Map<string, Array<{ emoji: string; userId: string }>>();
  for (const row of rows) {
    const list = grouped.get(row.messageId) || [];
    list.push({ emoji: row.emoji, userId: row.userId });
    grouped.set(row.messageId, list);
  }
  return grouped;
}

/** Who is currently typing in a conversation, excluding the viewer. */
export async function typingIn(conversationId: string, viewerId: string) {
  const cutoff = new Date(Date.now() - TYPING_TTL_MS);
  return db
    .select({
      userId: typingIndicatorsTable.userId,
      name: usersTable.name,
    })
    .from(typingIndicatorsTable)
    .innerJoin(usersTable, eq(typingIndicatorsTable.userId, usersTable.id))
    .where(and(
      eq(typingIndicatorsTable.conversationId, conversationId),
      ne(typingIndicatorsTable.userId, viewerId),
      gt(typingIndicatorsTable.updatedAt, cutoff),
    ));
}

/** A one-line preview of a message for the inbox list. */
export function previewOf(message: {
  kind: string;
  body: string | null;
  mediaName: string | null;
}): string {
  if (message.kind === "IMAGE") return "📷 Photo";
  if (message.kind === "AUDIO") return "🎙 Voice note";
  if (message.kind === "FILE") return `📎 ${message.mediaName || "File"}`;
  const text = (message.body || "").replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}

/**
 * Move a conversation to the top of everyone's inbox and cache the preview,
 * so the list can be rendered without reading the messages table at all.
 */
export async function touchConversation(conversationId: string, preview: string) {
  const now = new Date();
  await db
    .update(conversationsTable)
    .set({ lastMessageAt: now, lastMessagePreview: preview, updatedAt: now })
    .where(eq(conversationsTable.id, conversationId));
}

/** The most recent message timestamp across a person's conversations. */
export async function inboxCursor(userId: string): Promise<string> {
  const [row] = await db
    .select({ latest: sql<string>`max(${conversationsTable.lastMessageAt})` })
    .from(conversationsTable)
    .innerJoin(conversationMembersTable, eq(conversationMembersTable.conversationId, conversationsTable.id))
    .where(and(
      eq(conversationMembersTable.userId, userId),
      isNull(conversationMembersTable.leftAt),
    ));
  return row?.latest ? new Date(row.latest).toISOString() : "";
}

/** Everyone in a conversation except the given person — the notification set. */
export async function recipientsOf(conversationId: string, exceptUserId: string) {
  return db
    .select({ userId: conversationMembersTable.userId, muted: conversationMembersTable.muted })
    .from(conversationMembersTable)
    .where(and(
      eq(conversationMembersTable.conversationId, conversationId),
      ne(conversationMembersTable.userId, exceptUserId),
      isNull(conversationMembersTable.leftAt),
    ));
}

export {
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  messageReactionsTable,
  typingIndicatorsTable,
  desc,
};
