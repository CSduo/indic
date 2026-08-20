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
import { VoiceRecorder, VoiceNoteButton } from "@/components/messages/VoiceRecorder";
import { VoiceNotePlayer } from "@/components/messages/VoiceNotePlayer";

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
const apiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Attachment addresses now point at this site rather than at storage, so they
 * are resolved against the app's base path. Being same-origin is the point:
 * the browser sends the session cookie, and the server checks the conversation
 * before it sends a byte.
 */
function mediaUrl(message: Message): string {
  const url = message.mediaUrl || "";
  return url.startsWith("/") ? `${apiBase()}${url}` : url;
}

function downloadUrl(message: Message): string {
  const url = message.mediaDownloadUrl || message.mediaUrl || "";
  return url.startsWith("/") ? `${apiBase()}${url}` : url;
}

/**
 * The divider between one day and the next.
 *
 * "Today" and "Yesterday" are what anyone reading a recent conversation
 * actually wants, but on their own they answer the wrong question a week
 * later — so the date is given alongside rather than instead. Anything older
 * is simply dated.
 */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const dated = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });

  if (same(d, today)) return `Today · ${dated}`;
  if (same(d, yesterday)) return `Yesterday · ${dated}`;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
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

/**
 * Message text, folded once it gets long enough to bury the conversation.
 *
 * Someone pasting several paragraphs should not push every other message off
 * the screen. Past a threshold the text is clamped to a readable opening and
 * the rest is one tap away — and once opened it stays open, because collapsing
 * something the reader deliberately expanded is infuriating.
 *
 * The threshold is generous on purpose. Ordinary long messages are meant to
 * arrive whole; this exists for the essay, not the paragraph.
 */
const COLLAPSE_AFTER_LINES = 12;
const COLLAPSE_AFTER_CHARS = 700;

function MessageText({ body, mine }: { body: string; mine: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const longEnough =
    body.length > COLLAPSE_AFTER_CHARS
    || body.split("\n").length > COLLAPSE_AFTER_LINES;

  if (!longEnough) {
    return <p className="whitespace-pre-wrap break-words font-body text-[14px] leading-6">{body}</p>;
  }

  return (
    <>
      <p
        className="whitespace-pre-wrap break-words font-body text-[14px] leading-6"
        style={expanded ? undefined : {
          display: "-webkit-box",
          WebkitLineClamp: COLLAPSE_AFTER_LINES,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {body}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="mt-1 font-ui text-[11px] font-semibold underline underline-offset-2"
        style={{ color: mine ? "var(--bg)" : "var(--accent)", opacity: mine ? 0.85 : 1 }}
        aria-expanded={expanded}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </>
  );
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
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const pressTimer = useRef<number | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const mine = message.mine;

  const startPress = () => {
    pressTimer.current = window.setTimeout(() => setMenuOpen(true), 450);
  };
  const cancelPress = () => window.clearTimeout(pressTimer.current);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      startPress();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      cancelPress();
      setIsSwiping(true);
      // For received messages: swipe right to reply; for own: swipe left or right
      const clamped = mine ? Math.max(Math.min(dx, 0), -65) : Math.min(Math.max(dx, 0), 65);
      setSwipeX(clamped);
    }
  };

  const handleTouchEnd = () => {
    cancelPress();
    if (Math.abs(swipeX) >= 36) {
      onReply(message);
      try { window.navigator?.vibrate?.(25); } catch {}
    }
    setSwipeX(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  };

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
    <div className={`group relative flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      {/* Swipe Reply indicator behind bubble */}
      {swipeX !== 0 ? (
        <div
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-opacity ${
            mine ? "right-2" : "left-2"
          }`}
          style={{ opacity: Math.min(Math.abs(swipeX) / 36, 1) }}
        >
          <div className="w-7 h-7 rounded-full bg-[var(--terracotta)] text-white flex items-center justify-center shadow-md animate-in zoom-in-75">
            <CornerUpLeft size={14} className="stroke-[2.5]" />
          </div>
        </div>
      ) : null}

      {/* The avatar column with direct profile navigation */}
      {!mine && isGroup ? (
        showTail ? (
          message.senderId ? (
            <Link href={`/profile/${message.senderId}`} className="hover:opacity-80 transition-opacity" title={`View ${message.senderName}'s profile`}>
              <Avatar name={message.senderName} url={message.senderAvatarUrl} />
            </Link>
          ) : (
            <Avatar name={message.senderName} url={message.senderAvatarUrl} />
          )
        ) : (
          <span className="w-7 shrink-0" aria-hidden="true" />
        )
      ) : null}

      <div className={`flex min-w-0 max-w-[78%] flex-col sm:max-w-[68%] ${mine ? "items-end" : "items-start"}`}>
        {!mine && isGroup && showTail ? (
          message.senderId ? (
            <Link
              href={`/profile/${message.senderId}`}
              className="mb-0.5 px-1 font-ui text-[10px] font-semibold text-[var(--ink-meta)] hover:text-[var(--gold)] transition-colors"
            >
              {message.senderName}
            </Link>
          ) : (
            <span className="mb-0.5 px-1 font-ui text-[10px] font-semibold text-[var(--ink-meta)]">{message.senderName}</span>
          )
        ) : null}

        {message.replyTo ? (
          <div
            className="mb-1 max-w-full rounded-[2px] border-l-2 px-2.5 py-1.5 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ borderColor: "var(--accent)", background: "var(--surface-2)" }}
            onClick={() => {
              const el = document.getElementById(`msg-${message.replyTo?.id}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <p className="mono-label">{message.replyTo.senderName}</p>
            <p className="truncate font-body text-[12px] text-[var(--ink-meta)]">{message.replyTo.preview}</p>
          </div>
        ) : null}

        <div
          id={`msg-${message.id}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onContextMenu={e => { e.preventDefault(); setMenuOpen(true); }}
          className={`relative transition-all select-none ${message.kind === "AUDIO" ? "p-2.5 sm:p-3" : "px-3 py-2"}`}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping ? "none" : "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)",
            ...(message.kind === "AUDIO"
              ? {
                  background: "#1e2022",
                  color: "#f3f4f6",
                  border: "1px solid #363a40",
                  borderRadius: "14px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                }
              : mine
              ? {
                  background: "var(--ink)",
                  color: "var(--bg)",
                  borderRadius: mine
                    ? `12px 12px ${showTail ? "2px" : "12px"} 12px`
                    : `12px 12px 12px ${showTail ? "2px" : "12px"}`,
                }
              : {
                  background: "var(--surface-2)",
                  color: "var(--ink)",
                  border: "1px solid var(--hairline)",
                  borderRadius: mine
                    ? `12px 12px ${showTail ? "2px" : "12px"} 12px`
                    : `12px 12px 12px ${showTail ? "2px" : "12px"}`,
                }),
            opacity: message.pending ? 0.55 : 1,
          }}
        >
          {message.kind === "IMAGE" && message.mediaUrl ? (
            <a href={mediaUrl(message)} target="_blank" rel="noopener noreferrer" className="block">
              {/* max-w-full keeps a wide photo inside the bubble instead of
                  stretching the row past the edge of the screen. */}
              <img
                src={mediaUrl(message)}
                alt={message.mediaName || "Shared image"}
                className="max-h-72 max-w-full rounded-[2px] object-contain"
              />
            </a>
          ) : null}

          {message.kind === "AUDIO" && message.mediaUrl ? (
            <VoiceNotePlayer
              src={mediaUrl(message)}
              mine={mine}
              transcript={message.body}
              messageId={message.id}
              onTranscriptUpdate={(t) => {
                message.body = t;
              }}
            />
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
                  href={mediaUrl(message)}
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

          {message.body ? <MessageText body={message.body} mine={mine} /> : null}

          {/* The exact moment is always available on hover or long-press, so a
              message can be dated precisely without every bubble carrying a
              full timestamp. */}
          <span
            className="mt-1 flex items-center gap-1.5 opacity-60"
            title={new Date(message.createdAt).toLocaleString(undefined, {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          >
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

      {/* Action button trigger & Quick Reply */}
      <div className="relative self-center flex items-center gap-1 opacity-40 transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
        <button
          type="button"
          className="editor-tool hover:text-[var(--gold)] transition-colors"
          onClick={() => onReply(message)}
          aria-label="Reply"
          title="Reply to message"
        >
          <CornerUpLeft size={14} />
        </button>
        <button
          type="button"
          className="editor-tool"
          onClick={() => setMenuOpen(true)}
          aria-label="Message actions"
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen ? (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Message options"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMenuOpen(false)}
            />

            {/* Floating Pop-up Card */}
            <div
              className="relative z-10 w-full max-w-xs overflow-hidden rounded-[8px] border border-[var(--hairline-strong)] bg-[var(--surface)] p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              style={{ background: "var(--surface)", borderColor: "var(--hairline-strong)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Quick Reactions Bar */}
              <div className="flex items-center justify-around gap-1 rounded-[6px] bg-[var(--surface-2)] p-2 mb-2">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className="text-xl hover:scale-125 active:scale-95 transition-transform p-1 rounded"
                    onClick={() => { onReact(message, emoji); setMenuOpen(false); }}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Action list */}
              <div className="space-y-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left font-ui text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                  onClick={() => { onReply(message); setMenuOpen(false); }}
                >
                  <CornerUpLeft size={16} className="text-[var(--accent)]" />
                  <span>Reply</span>
                </button>

                {message.body ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left font-ui text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                    onClick={() => {
                      void navigator.clipboard?.writeText(message.body || "");
                      setMenuOpen(false);
                      toast.success("Text copied to clipboard");
                    }}
                  >
                    <Copy size={16} className="text-[var(--ink-meta)]" />
                    <span>Copy Text</span>
                  </button>
                ) : null}

                {mine && message.kind === "TEXT" && !message.pending ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left font-ui text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                    onClick={() => { onEdit(message); setMenuOpen(false); }}
                  >
                    <Pencil size={16} className="text-[var(--gold)]" />
                    <span>Edit Message</span>
                  </button>
                ) : null}

                {mine && !message.pending ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left font-ui text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      onUnsend(message);
                    }}
                  >
                    <Trash2 size={16} className="text-red-500" />
                    <span className="font-semibold">Unsend Message</span>
                  </button>
                ) : null}
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                className="mt-2.5 w-full rounded-[4px] border border-[var(--hairline)] py-2 text-center font-ui text-xs font-semibold text-[var(--ink-meta)] hover:bg-[var(--surface-2)] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  /*
    The address may be a conversation id or somebody's handle. A handle is the
    readable form — /messages/@arya-ambadi — and is exchanged for the id of the
    thread with that person before anything else happens.
  */
  const routeParam = params.id || "";
  const isHandle = routeParam.startsWith("@");
  const [resolvedId, setResolvedId] = useState<string | null>(isHandle ? null : routeParam);
  const conversationId = resolvedId || "";
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [details, setDetails] = useState<{
    id?: string;
    kind: "DIRECT" | "GROUP";
    title: string;
    avatarUrl: string | null;
    otherUserId?: string | null;
    handle?: string | null;
    muted: boolean;
    role: "MEMBER" | "ADMIN";
    pending?: boolean;
    iRequested?: boolean;
    isRequest?: boolean;
    members: ConversationMember[];
  } | null>(null);
  const [respondingRequest, setRespondingRequest] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
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
    if (!isHandle || loading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const handleWithoutAt = routeParam.replace(/^@/, "");
        const res = await fetch(
          `${apiBase()}/api/conversations/by-handle/${encodeURIComponent(handleWithoutAt)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No member with that handle.");

        // No thread yet — open one, which applies the same request rules as
        // starting a conversation from anywhere else.
        const id = data.conversationId
          || (await messagesApi.start([data.otherUserId], "DIRECT")).conversation.id;
        if (!cancelled) setResolvedId(id);
      } catch (err: any) {
        if (cancelled) return;
        toast.error(err.message || "Could not open that conversation");
        navigate("/messages");
      }
    })();
    return () => { cancelled = true; };
  }, [isHandle, routeParam, user, loading, navigate]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    if (!conversationId) return;
    setBusy(true);
    void loadInitial();
  }, [user, loading, conversationId, loadInitial, navigate]);

  // Synchronize browser address bar to aesthetic handle URL (/messages/@handle) for 1-on-1 chats
  useEffect(() => {
    if (!details || details.kind === "GROUP" || !user) return;
    const other = details.members.find(m => m.userId !== user.id);
    if (other?.handle && typeof window !== "undefined") {
      const aestheticPath = `/messages/@${other.handle}`;
      if (window.location.pathname !== aestheticPath) {
        window.history.replaceState(null, "", aestheticPath);
      }
    }
  }, [details, user]);

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

  /*
    No JavaScript sizing. The field is stretched by the row to the height of
    the tool column beside it, which is about five lines, and scrolls inside
    that. Setting an explicit height here would fight the stretch and make the
    two halves of the block disagree about how tall they are.
  */

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

  const attach = async (file: File, transcript?: string) => {
    if (!file) return;
    setSending(true);

    // Photos preview from a local object URL while the upload runs, so the
    // picture is on screen the moment it is chosen rather than after a round
    // trip. The URL is revoked once the stored copy replaces it.
    const isImage = file.type.startsWith("image/");
    const localUrl = isImage ? URL.createObjectURL(file) : null;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const quoted = replyTo;
    if (quoted) setReplyTo(null);

    const optimistic: Message = {
      id: tempId,
      senderId: user?.id ?? null,
      senderName: user?.name || "You",
      senderAvatarUrl: user?.avatarUrl ?? null,
      kind: isImage ? "IMAGE" : file.type.startsWith("audio/") ? "AUDIO" : "FILE",
      body: transcript || null,
      mediaUrl: localUrl,
      mediaMimeType: file.type || null,
      mediaName: file.name,
      mediaSizeBytes: file.size,
      deleted: false, edited: false,
      createdAt: new Date().toISOString(),
      mine: true, reactions: [],
      replyTo: quoted ? { id: quoted.id, senderName: quoted.senderName, preview: quoted.body || "Attachment" } : null,
      pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    atBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      const result = await messagesApi.sendAttachment(conversationId, file, transcript, quoted?.id);
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

  const respondToRequest = async (accept: boolean) => {
    if (!conversationId) return;
    setRespondingRequest(true);
    try {
      if (accept) {
        await messagesApi.acceptRequest(conversationId);
        toast.success("Request accepted — you can reply now.");
        setDetails(prev => prev ? { ...prev, pending: false, isRequest: false } : null);
      } else {
        await messagesApi.declineRequest(conversationId);
        toast.success("Request declined.");
        navigate("/messages");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to respond to request");
    } finally {
      setRespondingRequest(false);
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

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center" style={{ background: "var(--bg)" }}>
        <div className="h-8 w-8 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!user) return null;

  const isGroup = details?.kind === "GROUP";
  const otherMember = !isGroup ? details?.members.find(m => m.userId !== user.id) : null;

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
          {otherMember ? (
            <Link
              href={`/profile/${otherMember.userId}`}
              className="flex items-center gap-3 min-w-0 flex-1 group hover:opacity-90 transition-opacity"
              title={`View ${details?.title || "scholar"}'s profile`}
            >
              <Avatar name={details?.title || ""} url={details?.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-body text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors">{details?.title || "…"}</p>
                  {otherMember?.handle ? (
                    <span className="font-ui text-xs font-semibold text-[var(--gold)]">@{otherMember.handle}</span>
                  ) : null}
                </div>
                <p className="mono-label truncate">
                  {typing.length > 0
                    ? `${typing.slice(0, 2).join(", ")} ${typing.length === 1 ? "is" : "are"} typing…`
                    : isGroup ? `${details?.members.length ?? 0} members` : "Direct message · View profile →"}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar name={details?.title || ""} url={details?.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-semibold text-[var(--ink)]">{details?.title || "…"}</p>
                <p className="mono-label truncate">{isGroup ? `${details?.members.length ?? 0} members` : "Conversation"}</p>
              </div>
            </div>
          )}
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
                <li key={m.userId}>
                  <Link href={`/profile/${m.userId}`} className="flex items-center gap-2 hover:opacity-85 transition-opacity group">
                    <Avatar name={m.name} url={m.avatarUrl} size={24} />
                    <span className="font-body text-sm text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors">{m.name}</span>
                    {m.handle ? <span className="font-mono text-xs text-[var(--gold)]">@{m.handle}</span> : null}
                    {m.role === "ADMIN" ? <span className="mono-label">Admin</span> : null}
                  </Link>
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
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overscroll-behavior:contain]"
      >
       <div className="container-anv mx-auto flex min-h-full flex-col justify-end w-full max-w-3xl overflow-x-hidden py-5">
        {/* Header intro / Conversation start sits at top */}
        <div className="mb-auto flex flex-col items-center py-10 text-center">
          {otherMember ? (
            <Link
              href={`/profile/${otherMember.userId}`}
              className="group flex flex-col items-center hover:opacity-90 transition-opacity"
              title={`View ${details?.title || "scholar"}'s profile`}
            >
              <Avatar name={details?.title || ""} url={details?.avatarUrl} size={64} />
              <p className="mt-3 font-display text-lg text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors">{details?.title || ""}</p>
              {otherMember?.handle ? (
                <p className="font-mono text-xs font-semibold text-[var(--gold)] mt-0.5">@{otherMember.handle}</p>
              ) : null}
              <span className="mt-2.5 inline-flex items-center gap-1 font-ui text-[11px] font-semibold text-[var(--gold)] border border-[var(--border-gold)] px-3 py-1 rounded-full bg-[var(--surface-2)] hover:bg-[rgba(201,152,58,0.12)] transition-colors shadow-sm">
                View Scholar Profile →
              </span>
            </Link>
          ) : (
            <>
              <Avatar name={details?.title || ""} url={details?.avatarUrl} size={64} />
              <p className="mt-3 font-display text-lg text-[var(--ink)]">{details?.title || ""}</p>
            </>
          )}
          <p className="mx-auto mt-2 max-w-xs font-body text-xs text-[var(--muted)]">
            This is the beginning of your direct conversation with {details?.title || "this member"}.
          </p>
        </div>

        {busy ? (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <div className="h-10 w-52 animate-pulse rounded-[2px] bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? null : (
          <div className="space-y-1">
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
          {details?.isRequest ? (
            <div className="rounded-xl border border-[var(--border-gold)] bg-[var(--surface-card)] p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full border border-[var(--border-gold)] bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center font-display font-bold text-base shrink-0 overflow-hidden">
                  {details.avatarUrl ? (
                    <img src={details.avatarUrl} alt={details.title} className="w-full h-full object-cover" />
                  ) : (
                    details.title[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm md:text-base font-bold text-[var(--ink)]">
                    Message request from <span className="text-[var(--gold)]">{details.title}</span>
                  </p>
                  <p className="font-body text-xs text-[var(--ink-soft)] mt-0.5">
                    Accept this request to reply and continue the conversation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => respondToRequest(false)}
                  disabled={respondingRequest}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-[var(--hairline)] text-[var(--muted)] hover:text-[var(--state-error)] hover:border-[var(--state-error)] transition-all"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => respondToRequest(true)}
                  disabled={respondingRequest}
                  className="btn-terracotta px-5 py-2 text-xs font-bold rounded-full shadow-md hover:scale-105 transition-all inline-flex items-center gap-1.5"
                >
                  {respondingRequest ? <span className="spinner-editorial" aria-hidden="true" /> : <Check size={14} />}
                  Accept Request
                </button>
              </div>
            </div>
          ) : (
            <>
              {details?.pending && details?.iRequested ? (
                <div className="rounded-lg border border-[var(--border-gold)] bg-[var(--surface-soft)] p-2.5 text-center mb-2.5">
                  <p className="font-body text-xs text-[var(--ink-soft)]">
                    ⏳ Message request sent to <strong className="text-[var(--ink)]">{details.title}</strong>. They can reply once accepted.
                  </p>
                </div>
              ) : null}

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

              {recording ? (
                <VoiceRecorder
                  busy={sending}
                  onSend={(file) => attach(file)}
                  onCancel={() => setRecording(false)}
                />
              ) : (
                <div className="flex items-stretch gap-2">
                  <input ref={imageRef} type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />
                  <input ref={fileRef} type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void attach(f); e.target.value = ""; }} />

                  <textarea
                    ref={composerRef}
                    className="composer-input min-w-0 flex-1"
                    rows={1}
                    placeholder={editing ? "Edit your message…" : "Write a message…"}
                    value={draft}
                    maxLength={4000}
                    onChange={e => { setDraft(e.target.value); if (!editing) signalTyping(); }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void (editing ? saveEdit() : send());
                      }
                      if (e.key === "Escape" && editing) cancelEdit();
                    }}
                  />

                  <div className="composer-tools relative">
                    {!editing ? (
                      <>
                        <VoiceNoteButton onStart={() => setRecording(true)} disabled={sending} />
                        <button type="button" className="composer-tool" onClick={() => imageRef.current?.click()} aria-label="Send a photo" disabled={sending}>
                          <ImageIcon size={15} />
                        </button>
                        <button type="button" className="composer-tool" onClick={() => fileRef.current?.click()} aria-label="Attach a file" disabled={sending}>
                          <Paperclip size={15} />
                        </button>
                      </>
                    ) : null}

                    <button
                      type="button"
                      onClick={editing ? saveEdit : send}
                      disabled={!draft.trim()}
                      className="composer-send"
                      aria-label={editing ? "Save edit" : "Send"}
                    >
                      {editing ? <Check size={15} /> : <Send size={15} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
