import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Check, PenSquare, RefreshCw, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { createPoller, messagesApi, type ConversationSummary } from "@/lib/messagesApi";
import { goBack } from "@/lib/goBack";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-ui font-semibold"
      style={{
        width: size, height: size,
        background: "var(--surface-2)",
        border: "1px solid var(--hairline)",
        color: "var(--ink-meta)",
        fontSize: size * 0.36,
      }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** The "new message" panel â€” search people, or assemble a group. */
function ComposePanel({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; avatarUrl: string | null }>>([]);
  const [chosen, setChosen] = useState<Array<{ id: string; name: string }>>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); return; }
    // Debounced so a search fires once the typing settles, not per keystroke.
    const t = window.setTimeout(() => {
      messagesApi.people(term).then(d => setResults(d.people)).catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const isGroup = chosen.length > 1;

  const start = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      const { conversation, pendingRequest } = await messagesApi.start(
        chosen.map(c => c.id),
        isGroup ? "GROUP" : "DIRECT",
        isGroup ? (title.trim() || undefined) : undefined,
      );
      onClose();
      if (pendingRequest) {
        toast.success("Send one message — they'll see it as a request, and can reply once they accept.");
      }
      navigate(`/messages/${conversation.id}`);
    } catch (err: any) {
      toast.error(err.message || "Could not start that conversation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center p-4" style={{ background: "rgba(0,0,0,0.55)" }} role="dialog" aria-modal="true" aria-label="New message">
      <div className="w-full max-w-md overflow-hidden rounded-[2px] border border-[var(--hairline)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
          <p className="mono-label">New message</p>
          <button type="button" onClick={onClose} className="editor-tool" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="p-4">
          {chosen.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {chosen.map(c => (
                <span key={c.id} className="status-chip">
                  {c.name}
                  <button
                    type="button"
                    onClick={() => setChosen(list => list.filter(x => x.id !== c.id))}
                    aria-label={`Remove ${c.name}`}
                    className="ml-1"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {isGroup ? (
            <input
              className="input-sacred mb-3 w-full text-sm"
              placeholder="Group name (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
            />
          ) : null}

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-meta)" }} />
            <input
              className="input-sacred w-full pl-9 text-sm"
              placeholder="Search people by nameâ€¦"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto">
            {results.length === 0 && query.trim().length >= 2 ? (
              <p className="px-1 py-4 font-ui text-xs text-[var(--muted)]">No one found by that name.</p>
            ) : null}
            {results.map(person => {
              const already = chosen.some(c => c.id === person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    setChosen(list => already ? list.filter(c => c.id !== person.id) : [...list, { id: person.id, name: person.name }]);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-3 rounded-[2px] px-2 py-2 text-left hover:bg-[var(--surface-2)]"
                >
                  <Avatar name={person.name} url={person.avatarUrl} size={32} />
                  <span className="font-body text-sm text-[var(--ink)]">{person.name}</span>
                  {already ? <span className="ml-auto mono-label">Added</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] px-4 py-3">
          <p className="font-ui text-[11px] text-[var(--muted)]">
            {chosen.length === 0
              ? "Pick one person, or several for a group."
              : isGroup
                ? `Group of ${chosen.length + 1} — everyone must already have accepted a message from you.`
                : "Direct message"}
          </p>
          <button type="button" onClick={start} disabled={busy || chosen.length === 0} className="btn-terracotta">
            {busy ? <><span className="spinner-editorial" aria-hidden="true" /> Startingâ€¦</> : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessagesInboxPage() {
  const { user, loading } = useAuthContext();
  const [, navigate] = useLocation();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [requests, setRequests] = useState<ConversationSummary[]>([]);
  const [tab, setTab] = useState<"inbox" | "requests">("inbox");
  const [acting, setActing] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState("");
  const [loadError, setLoadError] = useState("");
  const cursorRef = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const data = await messagesApi.inbox();
      setConversations(data.conversations);
      setRequests(data.requests || []);
      setLoadError("");
    } catch (err: any) {
      /*
        A failure must never be drawn as an empty inbox. Swallowing it meant a
        server error appeared as "No conversations yet" — which reads as though
        the conversations had been deleted, and is the single most alarming
        thing this screen could say when nothing is actually wrong with the
        data. Say what happened, and offer to try again.
      */
      setLoadError(err?.message || "Could not load your conversations.");
    } finally {
      setBusy(false);
    }
  }, []);

  const respond = async (id: string, accept: boolean) => {
    setActing(id);
    try {
      if (accept) {
        await messagesApi.acceptRequest(id);
        toast.success("Request accepted â€” you can reply now.");
        await load();
        navigate(`/messages/${id}`);
      } else {
        await messagesApi.declineRequest(id);
        setRequests(list => list.filter(r => r.id !== id));
        toast.success("Request removed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not do that");
    } finally {
      setActing(null);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    void load();
  }, [user, loading, load, navigate]);

  // Only refetch the full inbox when the cheap cursor says something moved.
  useEffect(() => {
    if (!user) return;
    return createPoller({
      onTick: async () => {
        const { cursor } = await messagesApi.cursor();
        if (cursor !== cursorRef.current) {
          cursorRef.current = cursor;
          await load();
        }
      },
    });
  }, [user, load]);

  const shown = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(c => c.title.toLowerCase().includes(term) || c.preview.toLowerCase().includes(term));
  }, [conversations, filter]);

  if (!user) return null;

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: "var(--bg)" }}>
      <header className="shrink-0 border-b border-[var(--hairline)]" style={{ background: "var(--surface)" }}>
        <div className="container-anv mx-auto flex max-w-2xl items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            {/*
              Back returns to wherever you actually came from. This used to be a
              fixed link to the account page, which is why leaving messages
              dropped you somewhere you had never been.
            */}
            <button
              type="button"
              onClick={() => goBack("/", navigate)}
              className="btn-ink p-2"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="mono-label">Private</p>
              <h1 className="font-display text-2xl text-[var(--ink)]">Messages</h1>
            </div>
          </div>
          <button type="button" onClick={() => setComposing(true)} className="btn-terracotta">
            <PenSquare size={14} /> New
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="container-anv mx-auto max-w-2xl py-5">

        {/* Requests are a separate list on purpose. Someone you have not
            admitted should never be mixed in with people you actually talk to,
            and the accept step must be impossible to miss. */}
        {requests.length > 0 ? (
          <div className="mb-4 flex items-center gap-1 border-b border-[var(--hairline)]">
            {([
              ["inbox", `Inbox`],
              ["requests", `Requests (${requests.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="relative px-3 py-2 font-ui text-[11px] uppercase tracking-[0.14em]"
                style={{
                  color: tab === key ? "var(--ink)" : "var(--ink-meta)",
                  fontWeight: tab === key ? 600 : 400,
                }}
                aria-current={tab === key}
              >
                {label}
                {tab === key ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5" style={{ background: "var(--accent)" }} />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        {tab === "requests" ? (
          <ul className="space-y-2">
            {requests.map(rq => (
              <li key={rq.id} className="rounded-[2px] border border-[var(--hairline)] bg-[var(--surface)] p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={rq.title} url={rq.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-semibold text-[var(--ink)]">{rq.title}</p>
                    <p className="mt-1 font-body text-[13px] leading-6 text-[var(--ink-body)]">{rq.preview}</p>
                    <p className="mono-label mt-1">Wants to message you Â· {relativeTime(rq.lastMessageAt)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => respond(rq.id, true)}
                        disabled={acting === rq.id}
                        className="btn-terracotta text-[11px]"
                      >
                        {acting === rq.id ? <span className="spinner-editorial" aria-hidden="true" /> : <Check size={13} />} Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(rq.id, false)}
                        disabled={acting === rq.id}
                        className="btn-ink text-[11px]"
                      >
                        <X size={13} /> Decline
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
        <>
        {conversations.length > 4 ? (
          <div className="relative mb-4">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-meta)" }} />
            <input
              className="input-sacred w-full pl-9 text-sm"
              placeholder="Search your conversationsâ€¦"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        ) : null}

        {busy ? (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-[2px] border border-[var(--hairline)] p-3">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="confirm-card text-center">
            <p className="confirm-card__title">Could not load your conversations</p>
            <p className="font-body text-sm leading-6 text-[var(--ink-body)]">
              {loadError} Your messages are safe — this is a problem reaching the
              server, not a problem with them.
            </p>
            <button
              type="button"
              onClick={() => { setBusy(true); void load(); }}
              className="btn-terracotta mt-4"
            >
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="confirm-card text-center">
            <p className="confirm-card__title">No conversations yet</p>
            <p className="font-body text-sm leading-6 text-[var(--ink-body)]">
              {filter ? "Nothing matches that search." : "Start one with another member of the journal."}
            </p>
            {!filter ? (
              <button type="button" onClick={() => setComposing(true)} className="btn-terracotta mt-4">
                <PenSquare size={14} /> New message
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {shown.map(c => (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-3 rounded-[2px] border border-[var(--hairline)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--hairline-strong)]"
                >
                  <Avatar name={c.title} url={c.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate font-body text-sm ${c.unread > 0 ? "font-semibold text-[var(--ink)]" : "text-[var(--ink)]"}`}>
                        {c.title}
                        {c.kind === "GROUP" ? (
                          <span className="ml-1.5 inline-flex items-center gap-1 align-middle mono-label">
                            <Users size={10} /> {c.memberCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="mono-label shrink-0">{relativeTime(c.lastMessageAt)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={`truncate font-body text-[13px] ${c.unread > 0 ? "text-[var(--ink)]" : "text-[var(--ink-meta)]"}`}>
                        {c.preview || "No messages yet"}
                      </span>
                      {c.unread > 0 ? (
                        <span
                          className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 font-ui text-[10px] font-semibold"
                          style={{ background: "var(--accent)", color: "#fff" }}
                          aria-label={`${c.unread} unread`}
                        >
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        </>
        )}
      </div>
      </div>

      {composing ? <ComposePanel onClose={() => setComposing(false)} /> : null}
    </div>
  );
}
