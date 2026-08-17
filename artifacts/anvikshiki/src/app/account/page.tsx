import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArchiveRestore, BookMarked, BookOpen, Check, Edit3, FileText, LogOut, Mail, MessageSquare, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";
import { messagesApi } from "@/lib/messagesApi";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "badge-draft" },
  RECEIVED: { label: "Received", className: "badge-received" },
  UNDER_REVIEW: { label: "Under Review", className: "badge-reviewing" },
  REVISION_REQUESTED: { label: "Revision Requested", className: "badge-received" },
  ACCEPTED: { label: "Accepted", className: "badge-approved" },
  REJECTED: { label: "Rejected", className: "badge-rejected" },
  PUBLISHED: { label: "Published", className: "badge-published" },
  ARCHIVED: { label: "Archived", className: "badge-draft" },
};

// Authors can edit any of their submissions/articles at any stage
const USER_EDITABLE_STATUSES = new Set(["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "ACCEPTED", "PUBLISHED"]);
const USER_DELETABLE_STATUSES = new Set(["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "REJECTED", "PUBLISHED", "ACCEPTED", "ARCHIVED"]);

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { user, logout, refresh } = useAuthContext();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [deletedSubmissions, setDeletedSubmissions] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [social, setSocial] = useState<{ followers: number; following: number } | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permDeletingId, setPermDeletingId] = useState<string | null>(null);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem("anv-reading-history") || "[]");
      setReadingHistory(history.slice(0, 5));
    } catch (e) {
      // ignore
    }
  }, []);

  // Unread count for the Messages link, and the follower figure beside it.
  useEffect(() => {
    if (!user) { setUnreadMessages(0); setSocial(null); return; }
    let cancelled = false;
    messagesApi.cursor()
      .then(({ totalUnread }) => { if (!cancelled) setUnreadMessages(totalUnread); })
      .catch(() => {});
    fetch(`${base()}/api/users/${user.id}/social`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setSocial(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // A failed request must never look like an empty desk — an author whose work
  // simply could not be loaded needs to see that, not "No submissions yet".
  const fetchList = async (query: string) => {
    const response = await fetch(`${base()}/api/submissions${query}`, { credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data.submissions || [];
  };

  const loadSubmissions = () => {
    setLoadError("");
    fetchList("")
      .then((active) => {
        setSubmissions(active);
        setLoadingPage(false);
      })
      .catch((err: any) => {
        setLoadError(err?.message || "Your works could not be loaded. Please refresh and try again.");
        setLoadingPage(false);
      });

    fetchList("?deleted=true")
      .then((deleted) => {
        setDeletedSubmissions(deleted);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user && !loadingPage) {
      navigate("/login");
      return;
    }
    if (user) {
      setEditName(user.name || "");
      loadSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (!user) {
      timeoutId = window.setTimeout(() => {
        if (!user) navigate("/login");
      }, 1500);
    } else {
      setLoadingPage(false);
    }
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    toast.success("You have been signed out");
    navigate("/");
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${base()}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      await refresh();
      setEditing(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  const deleteSubmission = async (id: string) => {
    const target = submissions.find(s => s.id === id);
    const isPub = target?.status === "PUBLISHED";
    const confirmMsg = isPub
      ? "Hide this published work? It will be unpublished and moved to your Account Trash."
      : "Delete this submission? It will be moved to your Deleted items.";
    if (!window.confirm(confirmMsg)) return;
    setDeletingId(id);
    try {
      const r = await fetch(`${base()}/api/submissions/${id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to delete");
      if (data.submission) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        setDeletedSubmissions(prev => [data.submission, ...prev.filter(s => s.id !== id)]);
      } else {
        loadSubmissions();
      }
      toast.success(isPub ? "Published work hidden and moved to Trash" : "Submission moved to Trash");
      window.dispatchEvent(new Event("anv:content-changed"));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete submission");
    }
    setDeletingId(null);
  };

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <div className="h-9 w-9 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  const drafts = submissions.filter((s) => s.status === "DRAFT");
  const published = submissions.filter((s) => s.status !== "DRAFT");

  const renderProgressTracker = (status: string) => {
    if (["REVISION_REQUESTED", "REJECTED", "ARCHIVED", "DRAFT"].includes(status)) return null;
    const steps = ["RECEIVED", "UNDER_REVIEW", "ACCEPTED", "PUBLISHED"];
    let currentIndex = steps.indexOf(status);
    if (currentIndex === -1) currentIndex = 0;

    return (
      <div className="mt-5 mb-4 flex items-center justify-between relative w-full pt-1 px-2">
        <div className="absolute left-2 right-2 top-1.5 h-[2px] bg-[var(--border)] z-0"></div>
        <div 
          className="absolute left-2 top-1.5 h-[2px] bg-[var(--gold)] z-0 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (steps.length - 1)) * 100}% - 16px)` }}
        ></div>
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold border-[1.5px] transition-colors ${isCompleted ? 'bg-[var(--gold)] border-[var(--gold)] text-[var(--bg)]' : 'bg-[var(--surface)] border-[var(--border)] text-transparent'}`}>
                {isCompleted && "✓"}
              </div>
              <span className={`text-[8px] font-ui font-bold uppercase tracking-widest absolute top-5 w-max text-center ${isCurrent ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                {STATUS_LABELS[step]?.label || step}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCard = (submission: any, isDraft: boolean) => {
    const status = STATUS_LABELS[submission.status] || { label: submission.status || "Received", className: "badge-received" };
    const canEdit = USER_EDITABLE_STATUSES.has(submission.status);
    const canDelete = USER_DELETABLE_STATUSES.has(submission.status);
    const isPublished = submission.status === "PUBLISHED";
    const isPaper = submission.type === "PAPER" || submission.itemType === "PAPER";
    const readUrl = isPaper ? `/papers/${submission.slug}` : `/articles/${submission.slug}`;
    // The editor resolves papers and essays from different collections, so tell
    // it which one to load first instead of letting it guess from the slug.
    const editUrl = isPublished && submission.slug
      ? `/account/edit/${submission.slug}${isPaper ? "?type=paper" : ""}`
      : `/submit/write?draftId=${submission.id}`;

    return (
      <div key={submission.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <AnimalGlyph domain={submission.domain || "papers"} size={28} className="mt-1 shrink-0 text-[var(--gold)]" />
            <div className="min-w-0">
              <h3 className="font-display text-xl leading-tight text-[var(--ink)] break-words">{submission.title || "Untitled draft"}</h3>
              <p className="mt-1 font-ui text-xs text-[var(--muted)]">
                {submission.type} · {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "Undated"}
              </p>
              {submission.abstract ? <p className="mt-2 line-clamp-2 font-body text-sm leading-6 text-[var(--ink-soft)]">{submission.abstract}</p> : null}
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end shrink-0">
            <span className={`badge ${status.className} text-[10px]`}>{status.label}</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {isPublished && submission.slug ? (
                <Link
                  href={readUrl}
                  className="btn-ink px-2 py-1 text-[10px] text-[var(--gold)] hover:bg-[var(--gold)]/10"
                  title="Read published work on live journal"
                >
                  <BookOpen size={12} /> Read
                </Link>
              ) : null}

              {canEdit ? (
                <Link
                  href={editUrl}
                  className="btn-ink px-2 py-1 text-[10px] text-[var(--gold)] hover:bg-[var(--gold)]/10"
                  title={isDraft ? "Resume writing" : "Edit article, images, title, and body text"}
                >
                  <Edit3 size={12} /> {isDraft ? "Resume" : "Edit"}
                </Link>
              ) : null}

              {canDelete ? (
                <button
                  type="button"
                  onClick={() => deleteSubmission(submission.id)}
                  disabled={deletingId === submission.id}
                  className="btn-ink px-2 py-1 text-[10px] text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10"
                  title={isPublished ? "Hide from public site and move to Trash" : "Delete this submission"}
                >
                  <Trash2 size={12} /> {deletingId === submission.id ? (isPublished ? "Hiding…" : "Deleting…") : (isPublished ? "Hide / Trash" : "Delete")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {!isDraft && renderProgressTracker(submission.status)}
      </div>
    );
  };

  const restoreSubmission = async (id: string) => {
    setRestoringId(id);
    try {
      const r = await fetch(`${base()}/api/submissions/${id}/restore`, { method: "POST", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to restore");
      if (data.submission) {
        setDeletedSubmissions(prev => prev.filter(s => s.id !== id));
        setSubmissions(prev => [data.submission, ...prev.filter(s => s.id !== id)]);
      } else {
        loadSubmissions();
      }
      toast.success("Work restored successfully");
      window.dispatchEvent(new Event("anv:content-changed"));
    } catch (err: any) {
      toast.error(err.message || "Failed to restore");
    }
    setRestoringId(null);
  };

  const permanentlyDelete = async (id: string) => {
    if (!window.confirm("⚠️ This will permanently erase this work. This CANNOT be undone. Continue?")) return;
    setPermDeletingId(id);
    try {
      const r = await fetch(`${base()}/api/submissions/${id}/permanent`, { method: "DELETE", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to permanently delete");
      setDeletedSubmissions(prev => prev.filter(s => s.id !== id));
      toast.success("Permanently deleted");
      window.dispatchEvent(new Event("anv:content-changed"));
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete");
    }
    setPermDeletingId(null);
  };

  const renderDeletedCard = (submission: any) => (
    <div key={submission.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AnimalGlyph domain={submission.domain || "papers"} size={28} className="mt-1 shrink-0 text-[var(--ink-faint)]" />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl leading-tight text-[var(--ink-soft)] break-words">{submission.title || "Untitled"}</h3>
            <p className="mt-1 font-ui text-xs text-[var(--muted)]">
              {submission.type}
              {submission.deletedAt
                ? ` · Deleted ${new Date(submission.deletedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-row flex-wrap items-start justify-between gap-2 sm:flex-col sm:items-end sm:justify-start shrink-0">
          <span className="badge badge-draft">In Trash</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => restoreSubmission(submission.id)}
              disabled={restoringId === submission.id}
              className="btn-ink px-2 py-1 text-[10px] text-[var(--sage)]"
              title="Restore this work"
            >
              <ArchiveRestore size={11} /> {restoringId === submission.id ? "Restoring…" : "Restore"}
            </button>
            <button
              type="button"
              onClick={() => permanentlyDelete(submission.id)}
              disabled={permDeletingId === submission.id}
              className="btn-ink px-2 py-1 text-[10px] text-[var(--terracotta)]"
              title="Permanently delete — cannot be undone"
            >
              <Trash2 size={11} /> {permDeletingId === submission.id ? "Deleting…" : "Delete Forever"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--bg)] w-full overflow-x-hidden">
      <section className="container-anv py-6 sm:py-10 px-4 sm:px-6 w-full max-w-full overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] w-full max-w-full">
          <aside className="space-y-4 w-full max-w-full min-w-0">
            <ParchmentCard className="p-6 text-center">
              {/* Avatar (Clickable for close-up preview) */}
              <div 
                onClick={() => user.avatarUrl && setShowLightbox(true)}
                className={`mx-auto mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-[var(--border-gold)] bg-[var(--terracotta-pale)] text-[var(--terracotta)] ${user.avatarUrl ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                title={user.avatarUrl ? "Click for close-up preview" : ""}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || "Your avatar"} className="h-full w-full object-cover" />
                ) : (
                  <User size={34} />
                )}
              </div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input autoFocus className="input-sacred py-1 text-center" value={editName} onChange={(event) => setEditName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveProfile()} />
                  <button type="button" onClick={saveProfile} disabled={saving} className="text-[var(--sage)]"><Check size={18} /></button>
                  <button type="button" onClick={() => { setEditing(false); setEditName(user.name || ""); }} className="text-[var(--terracotta)]"><X size={18} /></button>
                </div>
              ) : (
                <div className="flex min-w-0 items-center justify-center gap-2">
                  <h1 className="min-w-0 break-words text-center font-display text-3xl text-[var(--ink)]">{user.name || "My Account"}</h1>
                  <button type="button" onClick={() => setEditing(true)} className="text-[var(--gold)]" aria-label="Edit profile name">
                    <Edit3 size={15} />
                  </button>
                </div>
              )}
              <div className="mt-2 flex min-w-0 items-center justify-center gap-2 break-all text-center font-ui text-sm text-[var(--muted)]">
                <Mail size={14} className="shrink-0" /> <span className="min-w-0">{user.email}</span>
              </div>
              {user.institution ? <p className="mt-1 break-words text-center font-ui text-xs text-[var(--muted)]">{user.institution}</p> : null}
              <span className="badge badge-received mt-4">{user.role === "ADMIN" ? "Admin" : "Member"}</span>
              <OrnamentDivider variant="minimal" className="my-5" />
              <button type="button" onClick={handleLogout} className="btn-ink w-full justify-center">
                <LogOut size={14} /> Sign Out
              </button>
            </ParchmentCard>

            <ParchmentCard className="p-5">
              <p className="type-section-label mb-4">Desk Links</p>
              <div className="grid gap-2">
                {/* Messages live with the account, where personal things belong. */}
                <Link href="/messages" className="btn-ink justify-start">
                  <MessageSquare size={15} /> Messages
                  {unreadMessages > 0 ? (
                    <span
                      className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 font-ui text-[10px] font-bold leading-none"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  ) : null}
                </Link>
                <Link href="/saved" className="btn-ink justify-start"><BookMarked size={15} /> Saved Items</Link>
                <Link href="/account/collections" className="btn-ink justify-start"><FileText size={15} /> Collections</Link>
                <Link href="/submit" className="btn-ink justify-start"><FileText size={15} /> Submit Work</Link>
                {user.role === "ADMIN" ? <Link href="/admin" className="btn-ink justify-start"><AnimalGlyph domain="archive" size={15} /> Admin</Link> : null}
              </div>
            </ParchmentCard>

            <ParchmentCard className="p-5">
              <p className="type-section-label mb-4">Account</p>
              <div className="grid gap-2">
                <Link href="/account/profile" className="btn-ink justify-start"><User size={15} /> Edit Profile</Link>
                <Link href="/account/notifications" className="btn-ink justify-start"><Mail size={15} /> Notifications</Link>
                <Link href="/account/settings" className="btn-ink justify-start"><FileText size={15} /> Settings</Link>
              </div>
            </ParchmentCard>
          </aside>

          <main className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Link href="/submit" className="flex flex-col items-center justify-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-gold)] transition-colors group text-center">
                <Edit3 size={24} className="text-[var(--gold)] group-hover:scale-110 transition-transform" />
                <span className="font-ui text-sm font-bold text-[var(--ink)]">Write New Work</span>
              </Link>
              <Link href="/account/collections" className="flex flex-col items-center justify-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-gold)] transition-colors group text-center">
                <FileText size={24} className="text-[var(--gold)] group-hover:scale-110 transition-transform" />
                <span className="font-ui text-sm font-bold text-[var(--ink)]">My Collections</span>
              </Link>
              <Link href="/saved" className="flex flex-col items-center justify-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-gold)] transition-colors group text-center">
                <BookMarked size={24} className="text-[var(--gold)] group-hover:scale-110 transition-transform" />
                <span className="font-ui text-sm font-bold text-[var(--ink)]">Saved Items</span>
              </Link>
            </div>

            <ParchmentCard className="p-6">
              <p className="type-section-label mb-2">Scholar's Desk</p>
              <h2 className="font-display text-4xl text-[var(--ink)]">Your Profile</h2>
              {/*
                "Profile Views" was the literal number 0 — nothing counted
                views, so the tile could never say anything else. A figure that
                is always zero is worse than no figure at all: it reads as
                nobody having looked. Followers and following are counted for
                real, and they are what this page can honestly report.
              */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Submissions", submissions.length],
                  ["Published", submissions.filter((s) => s.status === "PUBLISHED").length],
                  ["Drafts", drafts.length],
                  ["Followers", social?.followers ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
                    <div className="font-display text-2xl text-[var(--gold)]">{value}</div>
                    <div className="font-ui text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)] mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </ParchmentCard>

            {drafts.length > 0 ? (
              <ParchmentCard className="p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="type-section-label mb-2">Not Yet Submitted</p>
                    <h2 className="font-display text-3xl text-[var(--ink)]">Your Drafts</h2>
                  </div>
                </div>
                <div className="space-y-3">{drafts.map((d) => renderCard(d, true))}</div>
              </ParchmentCard>
            ) : null}

            <ParchmentCard className="p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="type-section-label mb-2">My Submissions</p>
                  <h2 className="font-display text-3xl text-[var(--ink)]">Editorial Status</h2>
                </div>
                <Link href="/submit" className="btn-terracotta self-start sm:self-auto">New Submission</Link>
              </div>

              {loadError ? (
                <div className="rounded-[8px] border border-[var(--terracotta)]/40 bg-[var(--terracotta)]/5 p-5 text-center">
                  <p className="font-ui text-sm font-bold text-[var(--terracotta)]">Your works could not be loaded</p>
                  <p className="mt-2 font-body text-sm text-[var(--ink-soft)]">{loadError}</p>
                  <button type="button" onClick={loadSubmissions} className="btn-ink mt-4 justify-center">Try again</button>
                </div>
              ) : published.length === 0 ? (
                <EmptyState title="No submissions yet" description="Submit your work to the journal and track its progress here." action={<Link href="/submit" className="btn-terracotta">Submit Work</Link>} />
              ) : (
                <div className="space-y-3">{published.map((s) => renderCard(s, false))}</div>
              )}
            </ParchmentCard>

            {deletedSubmissions.length > 0 ? (
              <ParchmentCard className="p-6">
                <div className="mb-4">
                  <p className="type-section-label mb-2">Submission Trash</p>
                  <h2 className="font-display text-3xl text-[var(--ink-soft)]">Deleted Submissions</h2>
                  <p className="mt-2 font-body text-sm text-[var(--muted)]">
                    These submissions are hidden from normal views. Restore them to return them to your account, or permanently delete them when you are certain.
                  </p>
                </div>
                <div className="space-y-3">{deletedSubmissions.map((s) => renderDeletedCard(s))}</div>
              </ParchmentCard>
            ) : null}

            {readingHistory.length > 0 ? (
              <ParchmentCard className="p-6">
                <div className="mb-5">
                  <p className="type-section-label mb-2">Library</p>
                  <h2 className="font-display text-3xl text-[var(--ink)]">Recently Read</h2>
                </div>
                <div className="space-y-3">
                  {readingHistory.map((item, i) => (
                    <Link key={i} href={item.url} className="block rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-gold)] transition-colors">
                      <div className="flex flex-col">
                        <h3 className="font-display text-xl leading-tight text-[var(--ink)]">{item.title}</h3>
                        <p className="mt-1 font-ui text-xs text-[var(--muted)]">
                          Viewed {new Date(item.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ParchmentCard>
            ) : null}
          </main>
        </div>
      </section>

      {/* Lightbox Close-up Modal (Page Root Level to avoid layout flickering) */}
      {showLightbox && user.avatarUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowLightbox(false)}
        >
          <div 
            className="relative max-w-md w-full bg-[var(--bg-alt)] border-2 border-[var(--border-gold)] rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-1"
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center">
              <div className="h-64 w-64 rounded-full overflow-hidden border-4 border-[var(--border-gold)] shadow-xl mb-4">
                <img src={user.avatarUrl} alt={user.name || "Your avatar"} className="h-full w-full object-cover" />
              </div>
              <h3 className="font-display text-2xl text-[var(--ink)] font-semibold">{user.name}</h3>
              {user.institution && (
                <p className="font-ui text-sm text-[var(--muted)] mt-1">{user.institution}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
