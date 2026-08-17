import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, MessageSquare, Search, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { messagesApi } from "@/lib/messagesApi";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

type Member = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  institution: string | null;
  followers: number;
  publishedWorks: number;
  youFollow: boolean;
  isYou: boolean;
};

function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-ui font-semibold"
      style={{
        width: size, height: size, background: "var(--surface-2)",
        border: "1px solid var(--hairline)", color: "var(--ink-meta)", fontSize: size * 0.36,
      }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function CommunityMembersPage() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${base()}/api/community/members?limit=60${q ? `&q=${encodeURIComponent(q)}` : ""}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not load the directory");
      const data = await res.json();
      setMembers(data.members || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Could not load the directory");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(""); }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => { void load(query.trim()); }, 280);
    return () => window.clearTimeout(t);
  }, [query, load]);

  const toggleFollow = async (member: Member) => {
    if (!user) { navigate("/login"); return; }
    setActing(member.id);
    const next = !member.youFollow;
    // Optimistic: the button should answer the tap immediately.
    setMembers(list => list.map(m => m.id === member.id
      ? { ...m, youFollow: next, followers: m.followers + (next ? 1 : -1) }
      : m));
    try {
      const res = await fetch(`${base()}/api/users/${member.id}/follow`, {
        method: next ? "POST" : "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
    } catch (err: any) {
      setMembers(list => list.map(m => m.id === member.id
        ? { ...m, youFollow: !next, followers: m.followers + (next ? -1 : 1) }
        : m));
      toast.error(err.message || "Could not update that");
    } finally {
      setActing(null);
    }
  };

  const message = async (member: Member) => {
    if (!user) { navigate("/login"); return; }
    setActing(member.id);
    try {
      const { conversation, pendingRequest } = await messagesApi.start([member.id], "DIRECT");
      if (pendingRequest) {
        toast.success(`Your message request will reach ${member.name} once they accept it.`);
      }
      navigate(`/messages/${conversation.id}`);
    } catch (err: any) {
      toast.error(err.message || "Could not open that conversation");
    } finally {
      setActing(null);
    }
  };

  const heading = useMemo(
    () => query.trim() ? `${members.length} of ${total}` : `${total} ${total === 1 ? "member" : "members"}`,
    [members.length, total, query],
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="container-anv mx-auto max-w-3xl py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/community" className="btn-ink p-2" aria-label="Back to community"><ArrowLeft size={16} /></Link>
          <div>
            <p className="mono-label">Community</p>
            <h1 className="font-display text-3xl text-[var(--ink)]">The Assembly</h1>
          </div>
        </div>

        <p className="mb-6 max-w-xl font-body text-sm leading-6 text-[var(--ink-body)]">
          Everyone who writes and reads here. Follow someone to see their work, or send a message —
          people you have not met will receive it as a request first.
        </p>

        <div className="relative mb-5">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-meta)" }} />
          <input
            className="input-sacred input-with-icon-left w-full text-sm"
            placeholder="Search by name, field, or institution…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search members"
          />
        </div>

        <p className="mono-label mb-3">{busy ? "Loading…" : heading}</p>

        {busy ? (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-[2px] border border-[var(--hairline)] p-4">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="confirm-card text-center">
            <p className="confirm-card__title">Nobody found</p>
            <p className="font-body text-sm text-[var(--ink-body)]">
              No member matches that search.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.id} className="flex flex-col gap-3 rounded-[2px] border border-[var(--hairline)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--hairline-strong)] sm:flex-row sm:items-center">
                <Link href={`/profile/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={m.name} url={m.avatarUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-body text-sm font-semibold text-[var(--ink)]">
                      {m.name}{m.isYou ? <span className="ml-1.5 mono-label">You</span> : null}
                    </span>
                    {m.institution ? (
                      <span className="block truncate font-body text-[13px] text-[var(--ink-meta)]">{m.institution}</span>
                    ) : null}
                    {m.bio ? (
                      <span className="mt-0.5 block line-clamp-1 font-body text-[13px] text-[var(--ink-meta)]">{m.bio}</span>
                    ) : null}
                    <span className="mt-1 flex items-center gap-3">
                      <span className="mono-label inline-flex items-center gap-1"><Users size={10} /> {m.followers}</span>
                      {m.publishedWorks > 0 ? (
                        <span className="mono-label">{m.publishedWorks} published</span>
                      ) : null}
                    </span>
                  </span>
                </Link>

                {!m.isYou ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFollow(m)}
                      disabled={acting === m.id}
                      className={m.youFollow ? "btn-ink text-[11px]" : "btn-terracotta text-[11px]"}
                    >
                      {m.youFollow ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => message(m)}
                      disabled={acting === m.id}
                      className="btn-ink text-[11px]"
                      aria-label={`Message ${m.name}`}
                    >
                      <MessageSquare size={13} /> Message
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
