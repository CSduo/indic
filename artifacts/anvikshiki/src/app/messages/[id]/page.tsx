import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Bell, BellOff, CornerUpLeft, Image as ImageIcon, MoreHorizontal,
  Paperclip, Send, Smile, Trash2, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { createPoller, messagesApi, type ConversationMember, type Message } from "@/lib/messagesApi";

const QUICK_REACTIONS = ["❤️", "👍", "🎉", "🙏", "😮", "😢"];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, url, size = 28 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-ui font-semibold"
      style={{
        width: size, height: size, background: "var(--surface-2)",
        border: "1px solid var(--hairline)", color: "var(--ink-meta)", fontSize: size * 0.38,
      }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function MessageBubble({
  message, isGroup, onReply, onReact, onUnsend,
}: {
  message: Message;
  isGroup: boolean;
  onReply: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  onUnsend: (m: Message) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mine = message.mine;

  if (message.deleted) {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <p className="rounded-[2px] border border-dashed border-[var(--hairline-strong)] px-3 py-2 font-ui text-[11px] italic text-[var(--muted)]">
          Message unsent
        </p>
      </div>
    );
  }

  return (
    <div className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      {!mine && isGroup ? <Avatar name={message.senderName} url={message.senderAvatarUrl} /> : null}

      <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {!mine && isGroup ? (
          <span className="mb-0.5 px-1 font-ui text-[10px] font-semibold text-[var(--ink-meta)]">{message.senderName}</span>
        ) : null}

        {message.replyTo ? (
          <div
            className="mb-1 max-w-full rounded-[2px] border-l-2 px-2.5 py-1.5"
            style={{ borderColor: "var(--accent)", background: "var(--surface-2)" }}
          >
            <p className="mono-label">{message.replyTo.senderName}</p>
            <p className="truncate font-body text-[12px] text-[var(--ink-meta)]">{message.replyTo.preview}</p>
          </div>
        ) : null}

        <div
          className="relative rounded-[2px] px-3 py-2"
          style={
            mine
              ? { background: "var(--ink)", color: "var(--bg)" }
              : { background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--hairline)" }
          }
        >
          {message.kind === "IMAGE" && message.mediaUrl ? (
            <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img src={message.mediaUrl} alt={message.mediaName || "Shared image"} className="max-h-72 rounded-[2px] object-cover" />
            </a>
          ) : null}

          {message.kind === "AUDIO" && message.mediaUrl ? (
            <audio src={message.mediaUrl} controls preload="metadata" className="max-w-[240px]" />
          ) : null}

          {message.kind === "FILE" && message.mediaUrl ? (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 underline"
              style={{ color: "inherit" }}
            >
              <Paperclip size={13} /> {message.mediaName || "Attachment"}
            </a>
          ) : null}

          {message.body ? (
            <p className="whitespace-pre-wrap break-words font-body text-[14px] leading-6">{message.body}</p>
          ) : null}

          <span className="mt-1 flex items-center gap-1.5 opacity-60">
            <span className="font-ui text-[10px]">{clockTime(message.createdAt)}</span>
            {message.edited ? <span className="font-ui text-[10px]">· edited</span> : null}
          </span>
        </div>

        {message.reactions.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map(r => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(message, r.emoji)}
                className="rounded-full border px-1.5 py-0.5 font-ui text-[11px]"
                style={{
                  borderColor: r.mine ? "var(--accent)" : "var(--hairline)",
                  background: r.mine ? "var(--accent-wash)" : "var(--surface)",
                  color: "var(--ink)",
                }}
                aria-label={`${r.emoji} ${r.count}`}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Actions stay out of the way until the message is hovered or focused. */}
      <div className="relative self-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button type="button" className="editor-tool" onClick={() => setMenuOpen(v => !v)} aria-label="Message actions">
          <MoreHorizontal size={14} />
        </button>
        {menuOpen ? (
          <>
            <button type="button" className="fixed inset-0 z-[90] cursor-default" aria-hidden="true" onClick={() => setMenuOpen(false)} />
            <div
              className="absolute z-[95] mt-1 w-44 overflow-hidden rounded-[2px] border border-[var(--hairline)] bg-[var(--surface)] shadow-lg"
              style={{ [mine ? "right" : "left"]: 0 } as any}
            >
              <div className="flex gap-1 border-b border-[var(--hairline)] p-2">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className="editor-tool"
                    onClick={() => { onReact(message, emoji); setMenuOpen(false); }}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-ui text-xs hover:bg-[var(--surface-2)]"
                onClick={() => { onReply(message); setMenuOpen(false); }}
              >
                <CornerUpLeft size={13} /> Reply
              </button>
              {mine ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-ui text-xs hover:bg-[var(--surface-2)]"
                  style={{ color: "var(--state-error)" }}
                  onClick={() => { onUnsend(message); setMenuOpen(false); }}
                >
                  <Trash2 size={13} /> Unsend
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [details, setDetails] = useState<{
    kind: "DIRECT" | "GROUP"; title: string; avatarUrl: string | null;
    muted: boolean; role: "MEMBER" | "ADMIN"; members: ConversationMember[];
  } | null>(null);
  const [typing, setTyping] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const lastAtRef = useRef<string>("");
  const typingSentAtRef = useRef(0);
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      const [thread, page] = await Promise.all([
        messagesApi.conversation(conversationId),
        messagesApi.messages(conversationId, { limit: 50 }),
      ]);
      setDetails(thread.conversation);
      setTyping(thread.typing.map(t => t.name || "Someone"));
      setMessages(page.messages);
      lastAtRef.current = page.messages.at(-1)?.createdAt || "";
      await messagesApi.markRead(conversationId).catch(() => {});
      requestAnimationFrame(() => scrollToBottom());
    } catch (err: any) {
      toast.error(err.message || "Could not open that conversation");
      navigate("/messages");
    } finally {
      setBusy(false);
    }
  }, [conversationId, navigate, scrollToBottom]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    setBusy(true);
    void loadInitial();
  }, [user, loading, conversationId, loadInitial, navigate]);

  // Poll for anything newer than the last message we hold, plus typing state.
  useEffect(() => {
    if (!user || !conversationId) return;
    return createPoller({
      activeMs: 3000,
      idleMs: 15000,
      onTick: async () => {
        const [fresh, thread] = await Promise.all([
          messagesApi.messages(conversationId, { after: lastAtRef.current || new Date(0).toISOString() }),
          messagesApi.conversation(conversationId),
        ]);
        setTyping(thread.typing.map(t => t.name || "Someone"));
        setDetails(thread.conversation);

        if (fresh.messages.length > 0) {
          setMessages(prev => {
            const seen = new Set(prev.map(m => m.id));
            const added = fresh.messages.filter(m => !seen.has(m.id));
            return added.length ? [...prev, ...added] : prev;
          });
          lastAtRef.current = fresh.messages.at(-1)!.createdAt;
          await messagesApi.markRead(conversationId).catch(() => {});
          // Only follow the conversation down if the reader was already at the
          // bottom — yanking the view while they read history is maddening.
          if (atBottomRef.current) requestAnimationFrame(() => scrollToBottom(true));
        }
      },
    });
  }, [user, conversationId, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const signalTyping = () => {
    // At most one signal every three seconds; the server treats it as stale
    // after eight, so this is enough to stay "typing" without spamming.
    const now = Date.now();
    if (now - typingSentAtRef.current < 3000) return;
    typingSentAtRef.current = now;
    messagesApi.typing(conversationId).catch(() => {});
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const quoted = replyTo;
    setDraft("");
    setReplyTo(null);
    try {
      await messagesApi.send(conversationId, body, quoted?.id);
      const fresh = await messagesApi.messages(conversationId, { after: lastAtRef.current || new Date(0).toISOString() });
      if (fresh.messages.length) {
        setMessages(prev => {
          const seen = new Set(prev.map(m => m.id));
          return [...prev, ...fresh.messages.filter(m => !seen.has(m.id))];
        });
        lastAtRef.current = fresh.messages.at(-1)!.createdAt;
      }
      atBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (err: any) {
      // Put the text back rather than losing what they wrote.
      setDraft(body);
      setReplyTo(quoted);
      toast.error(err.message || "Could not send that message");
    } finally {
      setSending(false);
    }
  };

  const attach = async (file: File) => {
    if (!file) return;
    setSending(true);
    try {
      await messagesApi.sendAttachment(conversationId, file);
      const fresh = await messagesApi.messages(conversationId, { after: lastAtRef.current || new Date(0).toISOString() });
      if (fresh.messages.length) {
        setMessages(prev => {
          const seen = new Set(prev.map(m => m.id));
          return [...prev, ...fresh.messages.filter(m => !seen.has(m.id))];
        });
        lastAtRef.current = fresh.messages.at(-1)!.createdAt;
      }
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (err: any) {
      toast.error(err.message || "Could not send that attachment");
    } finally {
      setSending(false);
    }
  };

  const react = async (message: Message, emoji: string) => {
    // Applied locally first so the tap feels instant, then confirmed.
    setMessages(prev => prev.map(m => {
      if (m.id !== message.id) return m;
      const existing = m.reactions.find(r => r.emoji === emoji);
      if (existing?.mine) {
        return {
          ...m,
          reactions: m.reactions
            .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r)
            .filter(r => r.count > 0),
        };
      }
      if (existing) {
        return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r) };
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, mine: true }] };
    }));
    try {
      await messagesApi.react(message.id, emoji);
    } catch {
      toast.error("Could not save that reaction");
    }
  };

  const unsend = async (message: Message) => {
    try {
      await messagesApi.unsend(message.id);
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, deleted: true, body: null, mediaUrl: null } : m));
    } catch (err: any) {
      toast.error(err.message || "Could not unsend that message");
    }
  };

  const toggleMute = async () => {
    if (!details) return;
    try {
      await messagesApi.update(conversationId, { muted: !details.muted });
      setDetails({ ...details, muted: !details.muted });
      toast.success(details.muted ? "Notifications on for this conversation" : "Muted");
    } catch {
      toast.error("Could not change that setting");
    }
  };

  const leave = async () => {
    if (!user) return;
    if (!window.confirm("Leave this conversation?")) return;
    try {
      await messagesApi.removeMember(conversationId, user.id);
      navigate("/messages");
    } catch (err: any) {
      toast.error(err.message || "Could not leave");
    }
  };

  if (!user) return null;

  const isGroup = details?.kind === "GROUP";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[var(--surface)]">
        <div className="container-anv mx-auto flex max-w-3xl items-center gap-3 py-3">
          <Link href="/messages" className="btn-ink p-2" aria-label="Back to messages"><ArrowLeft size={16} /></Link>
          <Avatar name={details?.title || ""} url={details?.avatarUrl} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-sm font-semibold text-[var(--ink)]">{details?.title || "…"}</p>
            <p className="mono-label truncate">
              {typing.length > 0
                ? `${typing.slice(0, 2).join(", ")} ${typing.length === 1 ? "is" : "are"} typing…`
                : isGroup ? `${details?.members.length ?? 0} members` : "Direct message"}
            </p>
          </div>
          <button type="button" onClick={toggleMute} className="editor-tool" aria-label={details?.muted ? "Unmute" : "Mute"}>
            {details?.muted ? <BellOff size={15} /> : <Bell size={15} />}
          </button>
          {isGroup ? (
            <button type="button" onClick={() => setShowMembers(v => !v)} className="editor-tool" aria-label="Members">
              <Users size={15} />
            </button>
          ) : null}
        </div>

        {showMembers && details ? (
          <div className="container-anv mx-auto max-w-3xl border-t border-[var(--hairline)] py-3">
            <p className="mono-label mb-2">Members</p>
            <ul className="space-y-1.5">
              {details.members.map(m => (
                <li key={m.userId} className="flex items-center gap-2">
                  <Avatar name={m.name} url={m.avatarUrl} size={24} />
                  <span className="font-body text-sm text-[var(--ink)]">{m.name}</span>
                  {m.role === "ADMIN" ? <span className="mono-label">Admin</span> : null}
                </li>
              ))}
            </ul>
            <button type="button" onClick={leave} className="btn-ink mt-3 text-[11px]">Leave conversation</button>
          </div>
        ) : null}
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="container-anv mx-auto w-full max-w-3xl flex-1 overflow-y-auto py-5" style={{ maxHeight: "calc(100vh - 190px)" }}>
        {busy ? (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <div className="h-10 w-52 animate-pulse rounded-[2px] bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center font-body text-sm text-[var(--muted)]">
            No messages yet. Say something.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              return (
                <div key={m.id} className="space-y-3">
                  {newDay ? (
                    <div className="flex items-center gap-3 py-2">
                      <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
                      <span className="mono-label">{dayLabel(m.createdAt)}</span>
                      <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
                    </div>
                  ) : null}
                  <MessageBubble message={m} isGroup={Boolean(isGroup)} onReply={setReplyTo} onReact={react} onUnsend={unsend} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 border-t border-[var(--hairline)] bg-[var(--surface)]">
        <div className="container-anv mx-auto max-w-3xl py-3">
          {replyTo ? (
            <div className="mb-2 flex items-center gap-2 rounded-[2px] border-l-2 px-2.5 py-1.5" style={{ borderColor: "var(--accent)", background: "var(--surface-2)" }}>
              <div className="min-w-0 flex-1">
                <p className="mono-label">Replying to {replyTo.senderName}</p>
                <p className="truncate font-body text-[12px] text-[var(--ink-meta)]">{replyTo.body || "Attachment"}</p>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} className="editor-tool" aria-label="Cancel reply"><X size={13} /></button>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <input ref={imageRef} type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />
            <input ref={fileRef} type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />

            <button type="button" className="editor-tool" onClick={() => imageRef.current?.click()} aria-label="Send a photo" disabled={sending}>
              <ImageIcon size={15} />
            </button>
            <button type="button" className="editor-tool" onClick={() => fileRef.current?.click()} aria-label="Attach a file" disabled={sending}>
              <Paperclip size={15} />
            </button>

            <textarea
              className="textarea-sacred min-h-[42px] flex-1 resize-none text-sm"
              rows={1}
              placeholder="Write a message…"
              value={draft}
              maxLength={4000}
              onChange={e => { setDraft(e.target.value); signalTyping(); }}
              onKeyDown={e => {
                // Enter sends; Shift+Enter is a new line, as everywhere else.
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
            />

            <button type="button" onClick={send} disabled={sending || !draft.trim()} className="btn-terracotta shrink-0" aria-label="Send">
              {sending ? <span className="spinner-editorial" aria-hidden="true" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
