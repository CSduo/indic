import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, MessageCircle, UserPlus } from "lucide-react";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { useAuthContext } from "@/contexts/AuthContext";
import { messagesApi, type ConversationSummary } from "@/lib/messagesApi";

/**
 * The most recent conversations, shown in the community section.
 *
 * This is a doorway, not a second inbox: the last few people who wrote, enough
 * of each message to recognise it, and a way through to the rest. Nobody's
 * email address appears here or anywhere else public — a conversation is
 * identified by the person's name and picture only.
 */

function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-ui text-sm font-semibold"
      style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--ink-meta)" }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function RecentMessages() {
  const { user } = useAuthContext();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (!user) { setConversations(null); return; }
    let cancelled = false;
    messagesApi.inbox()
      .then(data => {
        if (cancelled) return;
        setConversations(data.conversations.slice(0, 4));
        setRequestCount(data.requestCount);
      })
      .catch(() => { if (!cancelled) setConversations([]); });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <ParchmentCard className="mb-4 p-6 md:p-8">
        <p className="mono-label mb-2">Messages</p>
        <h2 className="font-display text-3xl text-[var(--ink)]">Write to someone directly</h2>
        <p className="mt-3 max-w-xl font-body text-sm leading-6 text-[var(--ink-body)]">
          Members can message each other privately, one to one or in a group. Sign in to see
          yours.
        </p>
        <Link href="/login" className="btn-terracotta mt-5 inline-flex">Sign in</Link>
      </ParchmentCard>
    );
  }

  return (
    <ParchmentCard className="mb-4 p-6 md:p-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mono-label mb-2">Messages</p>
          <h2 className="font-display text-3xl text-[var(--ink)]">Recent conversations</h2>
        </div>
        <Link href="/messages" className="btn-ink shrink-0 whitespace-nowrap">
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {requestCount > 0 ? (
        <Link
          href="/messages"
          className="mb-4 flex items-center gap-2 rounded-[2px] border px-3 py-2 font-ui text-xs"
          style={{ borderColor: "var(--accent)", background: "var(--accent-wash)", color: "var(--ink)" }}
        >
          <UserPlus size={14} />
          {requestCount === 1 ? "1 message request" : `${requestCount} message requests`} waiting
        </Link>
      ) : null}

      {conversations === null ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface-2)]" />
              <div className="h-4 flex-1 animate-pulse rounded-[2px] bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="py-6 text-center">
          <MessageCircle size={22} className="mx-auto mb-2 text-[var(--muted)]" />
          <p className="font-body text-sm text-[var(--ink-body)]">
            No conversations yet. Find someone in{" "}
            <Link href="/community/members" className="underline" style={{ color: "var(--accent)" }}>the Assembly</Link>{" "}
            and say hello.
          </p>
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--hairline)" }}>
          {conversations.map(conversation => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-[var(--surface-2)]"
              >
                <Avatar name={conversation.title} url={conversation.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-body text-sm font-semibold text-[var(--ink)]">
                      {conversation.title}
                    </span>
                    <span className="mono-label shrink-0">{relativeTime(conversation.lastMessageAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="truncate font-body text-[13px] text-[var(--ink-body)]">
                      {conversation.preview || "No messages yet"}
                    </span>
                    {conversation.unread > 0 ? (
                      <span
                        className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full px-1 font-ui text-[10px] font-bold leading-none"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        {conversation.unread > 9 ? "9+" : conversation.unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ParchmentCard>
  );
}
