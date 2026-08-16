const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}/api${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json()).error || message; } catch { /* keep the status */ }
    throw new Error(message);
  }
  return res.json();
}

export type ConversationSummary = {
  id: string;
  kind: "DIRECT" | "GROUP";
  title: string;
  avatarUrl: string | null;
  otherUserId: string | null;
  lastMessageAt: string;
  preview: string;
  unread: number;
  muted: boolean;
  memberCount: number;
};

export type ConversationMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "MEMBER" | "ADMIN";
  lastReadAt: string | null;
};

export type Message = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderAvatarUrl: string | null;
  kind: "TEXT" | "IMAGE" | "AUDIO" | "FILE" | "SYSTEM";
  body: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaName: string | null;
  mediaSizeBytes: number | null;
  deleted: boolean;
  edited: boolean;
  createdAt: string;
  mine: boolean;
  reactions: Array<{ emoji: string; count: number; mine: boolean }>;
  replyTo: { id: string; senderName: string; preview: string } | null;
};

export const messagesApi = {
  inbox: () => json<{ conversations: ConversationSummary[]; totalUnread: number }>("/conversations"),

  /** Deliberately tiny — this is what gets polled. */
  cursor: () => json<{ cursor: string; totalUnread: number }>("/conversations/cursor"),

  conversation: (id: string) => json<{
    conversation: {
      id: string; kind: "DIRECT" | "GROUP"; title: string; avatarUrl: string | null;
      otherUserId: string | null; muted: boolean; role: "MEMBER" | "ADMIN";
      members: ConversationMember[];
    };
    typing: Array<{ userId: string; name: string | null }>;
  }>(`/conversations/${id}`),

  messages: (id: string, opts: { before?: string; after?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.before) params.set("before", opts.before);
    if (opts.after) params.set("after", opts.after);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return json<{ messages: Message[]; hasMore: boolean }>(`/conversations/${id}/messages${qs ? `?${qs}` : ""}`);
  },

  send: (id: string, body: string, replyToId?: string) =>
    json<{ message: Message }>(`/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, replyToId }),
    }),

  sendAttachment: async (id: string, file: File, body?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (body) form.append("body", body);
    const res = await fetch(`${base()}/api/conversations/${id}/attachments`, {
      method: "POST", credentials: "include", body: form,
    });
    if (!res.ok) {
      let message = "Could not send that attachment";
      try { message = (await res.json()).error || message; } catch { /* keep default */ }
      throw new Error(message);
    }
    return res.json();
  },

  start: (userIds: string[], kind: "DIRECT" | "GROUP" = "DIRECT", title?: string) =>
    json<{ conversation: { id: string }; created: boolean }>("/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, userIds, title }),
    }),

  people: (q: string) =>
    json<{ people: Array<{ id: string; name: string; avatarUrl: string | null }> }>(
      `/messages/people?q=${encodeURIComponent(q)}`,
    ),

  markRead: (id: string) => json(`/conversations/${id}/read`, { method: "POST" }),
  typing: (id: string) => json(`/conversations/${id}/typing`, { method: "POST" }),
  react: (messageId: string, emoji: string) =>
    json<{ reacted: boolean }>(`/messages/${messageId}/reactions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }),
  edit: (messageId: string, body: string) =>
    json(`/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }),
  unsend: (messageId: string) => json(`/messages/${messageId}`, { method: "DELETE" }),
  update: (id: string, patch: { title?: string; muted?: boolean }) =>
    json(`/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  addMembers: (id: string, userIds: string[]) =>
    json(`/conversations/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    }),
  removeMember: (id: string, userId: string) =>
    json(`/conversations/${id}/members/${userId}`, { method: "DELETE" }),
};

/**
 * Adaptive polling.
 *
 * Serverless cannot hold a websocket open, so new messages are discovered by
 * asking. The cost of asking is managed rather than ignored: a visible tab with
 * a thread open checks often, a backgrounded tab barely checks at all, and a
 * hidden tab stops entirely — the browser push notification covers that case.
 * Every check hits the cursor endpoint, which returns two values, so a poll
 * that finds nothing is close to free.
 */
export function createPoller(options: {
  onTick: () => void | Promise<void>;
  activeMs?: number;
  idleMs?: number;
}) {
  const activeMs = options.activeMs ?? 4000;
  const idleMs = options.idleMs ?? 20000;
  let timer: number | undefined;
  let stopped = false;

  const delay = () => {
    if (document.visibilityState === "hidden") return null;
    return document.hasFocus() ? activeMs : idleMs;
  };

  const schedule = () => {
    if (stopped) return;
    const wait = delay();
    if (wait === null) return; // Resumes on visibilitychange.
    timer = window.setTimeout(async () => {
      try { await options.onTick(); } catch { /* a failed poll is not an error */ }
      schedule();
    }, wait);
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      window.clearTimeout(timer);
      void options.onTick();
      schedule();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onVisibility);
  schedule();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onVisibility);
  };
}
