import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Bell, BellOff, Check, Copy, CornerUpLeft, Download, ExternalLink,
  Image as ImageIcon, MoreHorizontal, Paperclip, Pencil, Send, Trash2, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { createPoller, messagesApi, type ConversationMember, type Message } from "@/lib/messagesApi";
import { goBack } from "@/lib/goBack";

const QUICK_REACTIONS = ["❤️", "👍", "🎉", "🙏", "😮", "😢"];

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(name: string | null | undefined): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(name || "");
  return match ? match[1].toUpperCase() : "";
}

/**
 * The address that saves the file under the name it was sent with.
 *
 * Both URLs are signed by the server, so neither can be edited here — asking
 * for the download variant means using the one the server minted for it, and
 * falling back to the viewing URL when there is none.
 */
function downloadUrl(message: Message): string {
  return message.mediaDownloadUrl || message.mediaUrl || "";
}

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

/**
 * Replace a locally-shown bubble with the stored one.
 *
 * The poll that watches for new messages can return our own message before the
 * send call resolves. Swapping blindly would then leave the same message on
 * screen twice, so a placeholder whose real counterpart has already arrived is
 * simply dropped.
 */
function reconcile(list: Message[], tempId: string, optimistic: Message, saved: Message): Message[] {
  if (list.some(m => m.id === saved.id)) return list.filter(m => m.id !== tempId);
  const merged: Message = {
    ...optimistic,
    ...saved,
    // The write endpoint answers with the row it stored, which does not carry
    // the quoted message or the sender's picture. Keeping what was already on
    // screen avoids a reply losing its quote the instant it is confirmed.
    replyTo: saved.replyTo ?? optimistic.replyTo,
    senderAvatarUrl: saved.senderAvatarUrl ?? optimistic.senderAvatarUrl,
    mine: true,
    pending: false,
  };
  return list.map(m => (m.id === tempId ? merged : m));
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
  message, isGroup, showTail, onReply, onReact, onUnsend, onEdit,
}: {
  message: Message;
  isGroup: boolean;
  /** False when the message above is from the same person in the same minute. */
  showTail: boolean;
  onReply: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  onUnsend: (m: Message) => void;
  onEdit: (m: Message) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<number | undefined>(undefined);
  const mine = message.mine;

  /*
    Touch has no hover, so the actions open on a long press of the bubble
    itself — the gesture people already expect from every other messaging app.
    The visible button remains for pointer users and for anyone who does not
    know the gesture.
  */
  const startPress = () => {
    pressTimer.current = window.setTimeout(() => setMenuOpen(true), 450);
  };
  const cancelPress = () => window.clearTimeout(pressTimer.current);

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
      {/* The avatar column keeps its width on every row so consecutive
          messages stay aligned instead of stepping in and out. */}
      {!mine && isGroup ? (
        showTail
          ? <Avatar name={message.senderName} url={message.senderAvatarUrl} />
          : <span className="w-7 shrink-0" aria-hidden="true" />
      ) : null}

      {/*
        `min-w-0` is what actually lets this column shrink. A flex child
        defaults to min-width:auto, so a long word or filename inside it forces
        the column wider than its share and pushes the bubble off the screen —
        which is why messages were being clipped at both edges on a phone.
        The width also leaves room for the avatar and the actions button rather
        than competing with them for the same space.
      */}
      <div className={`flex min-w-0 max-w-[calc(100%-2.5rem)] flex-col sm:max-w-[78%] ${mine ? "items-end" : "items-start"}`}>
        {!mine && isGroup && showTail ? (
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
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onTouchMove={cancelPress}
          onContextMenu={e => { e.preventDefault(); setMenuOpen(true); }}
          className="relative px-3 py-2 transition-opacity"
          style={{
            ...(mine
              ? { background: "var(--ink)", color: "var(--bg)" }
              : { background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--hairline)" }),
            /*
              Softly rounded, with the corner nearest the sender squared off on
              the last message of a run. It is the cheapest way to show who is
              speaking without repeating a name above every line, and it stops
              the thread reading as a stack of identical grey boxes.
            */
            borderRadius: mine
              ? `12px 12px ${showTail ? "2px" : "12px"} 12px`
              : `12px 12px 12px ${showTail ? "2px" : "12px"}`,
            // A message that has not landed yet reads as slightly lighter, so
            // "sent" is visible without a status line under every bubble.
            opacity: message.pending ? 0.55 : 1,
          }}
        >
          {message.kind === "IMAGE" && message.mediaUrl ? (
            <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
              {/* max-w-full keeps a wide photo inside the bubble instead of
                  stretching the row past the edge of the screen. */}
              <img
                src={message.mediaUrl}
                alt={message.mediaName || "Shared image"}
                className="max-h-72 max-w-full rounded-[2px] object-contain"
              />
            </a>
          ) : null}

          {message.kind === "AUDIO" && message.mediaUrl ? (
            <audio src={message.mediaUrl} controls preload="metadata" className="max-w-[240px]" />
          ) : null}

          {message.kind === "FILE" && message.mediaUrl ? (
            /* The document keeps the name it was sent under, and offers both
               ways of opening it. Storage rewrites the filename to keep it
               unique, so the delivered URL is unreadable — showing that
               instead of the real name made every attachment anonymous.

               No minimum width: a document name is often longer than a phone
               is wide, and forcing one pushed the whole bubble off-screen. */
            <div className="min-w-0 max-w-full">
              <div className="flex items-start gap-2">
                <Paperclip size={14} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="break-all font-body text-[13px] font-semibold leading-5">
                    {message.mediaName || "Attachment"}
                  </p>
                  <p className="font-ui text-[10px] opacity-70">
                    {formatBytes(message.mediaSizeBytes)}
                    {fileExtension(message.mediaName) ? ` · ${fileExtension(message.mediaName)}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={message.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-[2px] border px-2 py-1 font-ui text-[10px] uppercase tracking-[0.1em]"
                  style={{ borderColor: "currentColor", color: "inherit", opacity: 0.9 }}
                >
                  <ExternalLink size={11} /> Open
                </a>
                <a
                  href={downloadUrl(message)}
                  download={message.mediaName || undefined}
                  className="inline-flex items-center gap-1 rounded-[2px] border px-2 py-1 font-ui text-[10px] uppercase tracking-[0.1em]"
                  style={{ borderColor: "currentColor", color: "inherit", opacity: 0.9 }}
                >
                  <Download size={11} /> Save
                </a>
              </div>
            </div>
          ) : null}

          {message.body ? (
            <p className="whitespace-pre-wrap break-words font-body text-[14px] leading-6">{message.body}</p>
          ) : null}

          <span className="mt-1 flex items-center gap-1.5 opacity-60">
            <span className="font-ui text-[10px]">
              {message.pending ? "Sending…" : clockTime(message.createdAt)}
            </span>
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

      {/*
        Actions fade on a pointer device but are always present on touch.
        The previous version revealed them on hover alone, so on a phone —
        where nothing hovers — reply, react and unsend were invisible. They
        are dimmed rather than hidden so the row stays quiet without becoming
        a secret.
      */}
      <div className="relative self-center opacity-40 transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
        <button type="button" className="editor-tool" onClick={() => setMenuOpen(v => !v)} aria-label="Message actions">
          <MoreHorizontal size={14} />
        </button>
        {menuOpen ? (
          <>
            <button type="button" className="fixed inset-0 z-[90] cursor-default" aria-hidden="true" onClick={() => setMenuOpen(false)} />
            {/*
              The menu opens towards the middle of the screen, not away from
              it. On your own messages the row is reversed, so the button sits
              against the left edge — anchoring the menu's right edge to it
              sent the whole panel off the side of the phone, which is where
              the reactions and Unsend were disappearing to.
            */}
            <div
              className="absolute z-[95] mt-1 w-44 max-w-[min(11rem,calc(100vw-2rem))] overflow-hidden rounded-[2px] border border-[var(--hairline)] bg-[var(--surface)] shadow-lg"
              style={{ [mine ? "left" : "right"]: 0 } as any}
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
              {message.body ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-ui text-xs hover:bg-[var(--surface-2)]"
                  onClick={() => { void navigator.clipboard?.writeText(message.body || ""); setMenuOpen(false); toast.success("Copied"); }}
                >
                  <Copy size={13} /> Copy text
                </button>
              ) : null}
              {/* Editing is for your own words only, and only words — there is
                  nothing to edit about a file someone already received. */}
              {mine && message.kind === "TEXT" && !message.pending ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-ui text-xs hover:bg-[var(--surface-2)]"
                  onClick={() => { onEdit(message); setMenuOpen(false); }}
                >
                  <Pencil size={13} /> Edit
                </button>
              ) : null}
              {mine && !message.pending ? (
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
  const [editing, setEditing] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
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

  /**
   * Send, showing the message immediately.
   *
   * The round trip to this database is slow enough to feel broken — the
   * previous version waited for the write *and then refetched the thread*
   * before anything appeared, so a message took a couple of seconds to show
   * up in your own conversation. The bubble now appears at once, marked as
   * sending, and is reconciled with the server's copy when the write returns.
   * If it fails the bubble is removed and the text is handed back rather than
   * lost.
   */
  const send = async () => {
    const body = draft.trim();
    // Deliberately not gated on `sending`: each message is independent, so a
    // fast typist should be able to fire off three in a row without the
    // second one being swallowed while the first is in flight.
    if (!body) return;
    const quoted = replyTo;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setDraft("");
    setReplyTo(null);
    setSending(true);

    const optimistic: Message = {
      id: tempId,
      senderId: user?.id ?? null,
      senderName: user?.name || "You",
      senderAvatarUrl: user?.avatarUrl ?? null,
      kind: "TEXT",
      body,
      mediaUrl: null, mediaMimeType: null, mediaName: null, mediaSizeBytes: null,
      deleted: false, edited: false,
      createdAt: new Date().toISOString(),
      mine: true,
      reactions: [],
      replyTo: quoted ? { id: quoted.id, senderName: quoted.senderName, preview: quoted.body || "Attachment" } : null,
      pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    atBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      const { message } = await messagesApi.send(conversationId, body, quoted?.id);
      setMessages(prev => reconcile(prev, tempId, optimistic, message));
      if (message?.createdAt && message.createdAt > lastAtRef.current) {
        lastAtRef.current = message.createdAt;
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
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

    // Photos preview from a local object URL while the upload runs, so the
    // picture is on screen the moment it is chosen rather than after a round
    // trip. The URL is revoked once the stored copy replaces it.
    const isImage = file.type.startsWith("image/");
    const localUrl = isImage ? URL.createObjectURL(file) : null;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const optimistic: Message = {
      id: tempId,
      senderId: user?.id ?? null,
      senderName: user?.name || "You",
      senderAvatarUrl: user?.avatarUrl ?? null,
      kind: isImage ? "IMAGE" : file.type.startsWith("audio/") ? "AUDIO" : "FILE",
      body: null,
      mediaUrl: localUrl,
      mediaMimeType: file.type || null,
      mediaName: file.name,
      mediaSizeBytes: file.size,
      deleted: false, edited: false,
      createdAt: new Date().toISOString(),
      mine: true, reactions: [], replyTo: null, pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    atBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      const result = await messagesApi.sendAttachment(conversationId, file);
      const saved = result?.message;
      if (saved) {
        setMessages(prev => reconcile(prev, tempId, optimistic, saved));
        if (saved.createdAt > lastAtRef.current) lastAtRef.current = saved.createdAt;
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(err.message || "Could not send that attachment");
    } finally {
      if (localUrl) setTimeout(() => URL.revokeObjectURL(localUrl), 30000);
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
    if (!window.confirm("Unsend this message? It will disappear for everyone in this conversation.")) return;
    // Removed on screen straight away, and restored if the server disagrees —
    // an undo that hesitates does not feel like an undo.
    const previous = message;
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, deleted: true, body: null, mediaUrl: null } : m));
    try {
      await messagesApi.unsend(message.id);
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === message.id ? previous : m));
      toast.error(err.message || "Could not unsend that message");
    }
  };

  /** Put a sent message back into the composer to be rewritten. */
  const startEdit = (message: Message) => {
    setEditing(message);
    setReplyTo(null);
    setDraft(message.body || "");
    composerRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const body = draft.trim();
    if (!body) return;
    const original = editing.body;
    const id = editing.id;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, body, edited: true } : m));
    setEditing(null);
    setDraft("");

    try {
      await messagesApi.edit(id, body);
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, body: original } : m));
      toast.error(err.message || "Could not save that edit");
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
    <div className="flex h-full min-h-0 flex-col" style={{ background: "var(--bg)" }}>
      <header className="shrink-0 border-b border-[var(--hairline)]" style={{ background: "var(--surface)" }}>
        <div className="container-anv mx-auto flex max-w-3xl items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => goBack("/messages", navigate)}
            className="btn-ink p-2"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
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

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
       <div className="container-anv mx-auto w-full max-w-3xl overflow-x-hidden py-5">
        {busy ? (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <div className="h-10 w-52 animate-pulse rounded-[2px] bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Avatar name={details?.title || ""} url={details?.avatarUrl} size={64} />
            <p className="mt-3 font-display text-lg text-[var(--ink)]">{details?.title || ""}</p>
            <p className="mx-auto mt-1 max-w-xs font-body text-sm text-[var(--muted)]">
              This is the beginning of your conversation.
            </p>
          </div>
        ) : (
          <div>
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              // Consecutive messages from one person within a couple of minutes
              // read as one turn in the conversation, so they are drawn tight
              // together with a single tail at the end.
              const sameRun = (a?: Message, b?: Message) =>
                Boolean(a && b && a.senderId === b.senderId && !a.deleted && !b.deleted
                  && Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < 120000);
              const continues = !newDay && sameRun(prev, m);
              const showTail = !sameRun(m, next);

              return (
                <div key={m.id} className={continues ? "mt-0.5" : "mt-3"}>
                  {newDay ? (
                    <div className="flex items-center gap-3 py-3">
                      <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
                      <span className="mono-label">{dayLabel(m.createdAt)}</span>
                      <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
                    </div>
                  ) : null}
                  <MessageBubble
                    message={m}
                    isGroup={Boolean(isGroup)}
                    showTail={showTail}
                    onReply={setReplyTo}
                    onReact={react}
                    onUnsend={unsend}
                    onEdit={startEdit}
                  />
                </div>
              );
            })}
          </div>
        )}
       </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--hairline)]" style={{ background: "var(--surface)" }}>
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

          {editing ? (
            <div className="mb-2 flex items-center gap-2 rounded-[2px] border-l-2 px-2.5 py-1.5" style={{ borderColor: "var(--accent)", background: "var(--surface-2)" }}>
              <Pencil size={13} style={{ color: "var(--accent)" }} />
              <p className="mono-label flex-1">Editing your message</p>
              <button type="button" onClick={cancelEdit} className="editor-tool" aria-label="Cancel edit"><X size={13} /></button>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <input ref={imageRef} type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />
            <input ref={fileRef} type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />

            {/* Attachment controls are hidden while editing: an edit changes
                words, it cannot turn a message into a file. */}
            {!editing ? (
              <>
                <button type="button" className="editor-tool" onClick={() => imageRef.current?.click()} aria-label="Send a photo" disabled={sending}>
                  <ImageIcon size={15} />
                </button>
                <button type="button" className="editor-tool" onClick={() => fileRef.current?.click()} aria-label="Attach a file" disabled={sending}>
                  <Paperclip size={15} />
                </button>
              </>
            ) : null}

            <textarea
              ref={composerRef}
              className="textarea-sacred min-h-[42px] flex-1 resize-none text-sm"
              rows={1}
              placeholder={editing ? "Edit your message…" : "Write a message…"}
              value={draft}
              maxLength={4000}
              onChange={e => { setDraft(e.target.value); if (!editing) signalTyping(); }}
              onKeyDown={e => {
                // Enter sends; Shift+Enter is a new line, as everywhere else.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void (editing ? saveEdit() : send());
                }
                if (e.key === "Escape" && editing) cancelEdit();
              }}
            />

            <button
              type="button"
              onClick={editing ? saveEdit : send}
              disabled={!draft.trim()}
              className="btn-terracotta shrink-0"
              aria-label={editing ? "Save edit" : "Send"}
            >
              {editing ? <Check size={14} /> : <Send size={14} />}
            </button>
          </div>

        </div>
      </footer>
    </div>
  );
}
