import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArchiveRestore, BookMarked, Check, Edit3, FileText, LogOut, Mail, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

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

// Statuses the user themselves may still delete (mirrors the server rule).
// All statuses are user-deletable; the server enforces its own rules on accepted/published.
const USER_DELETABLE_STATUSES = new Set(["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "REJECTED", "ACCEPTED", "PUBLISHED", "ARCHIVED"]);

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { user, logout, refresh } = useAuthContext();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [deletedSubmissions, setDeletedSubmissions] = useState<any[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSubmissions = () => {
    Promise.all([
      fetch(`${base()}/api/submissions`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${base()}/api/submissions?deleted=true`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([active, deleted]) => {
        setSubmissions(active.submissions || []);
        setDeletedSubmissions(deleted.submissions || []);
      })
      .catch(() => {})
      .finally(() => setLoadingPage(false));
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
    if (!window.confirm("Delete this submission? It will be moved to your Deleted items.")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`${base()}/api/submissions/${id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to delete");
      // Move item from active to deleted list
      setSubmissions((prev) => {
        const item = prev.find((s) => s.id === id);
        if (item) setDeletedSubmissions((d) => [{ ...item, deleted: true, deletedAt: new Date().toISOString() }, ...d]);
        return prev.filter((s) => s.id !== id);
      });
      toast.success("Submission moved to Deleted");
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

  const renderCard = (submission: any, isDraft: boolean) => {
    const status = STATUS_LABELS[submission.status] || { label: submission.status || "Received", className: "badge-received" };
    const canDelete = USER_DELETABLE_STATUSES.has(submission.status);
    return (
      <div key={submission.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AnimalGlyph domain={submission.domain || "papers"} size={28} className="mt-1 shrink-0 text-[var(--gold)]" />
            <div>
              <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">{submission.title || "Untitled draft"}</h3>
              <p className="mt-1 font-ui text-xs text-[var(--muted)]">
                {submission.type} · {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "Undated"}
              </p>
              {submission.abstract ? <p className="mt-2 line-clamp-2 font-body text-sm leading-6 text-[var(--ink-soft)]">{submission.abstract}</p> : null}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`badge ${status.className}`}>{status.label}</span>
            <div className="flex items-center gap-2">
              {isDraft ? (
                <Link href={`/submit/write?draftId=${submission.id}`} className="btn-ink px-2 py-1 text-[10px]">
                  <Edit3 size={12} /> Resume
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => deleteSubmission(submission.id)}
                disabled={deletingId === submission.id}
                className="btn-ink px-2 py-1 text-[10px] text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10"
                title="Delete this submission"
              >
                <Trash2 size={12} /> {deletingId === submission.id ? "Deleting…" : "Delete"}
              </button>

            </div>
          </div>
        </div>
      </div>
    );
  };

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permDeletingId, setPermDeletingId] = useState<string | null>(null);

  const restoreSubmission = async (id: string) => {
    setRestoringId(id);
    try {
      const r = await fetch(`${base()}/api/submissions/${id}/restore`, { method: "POST", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to restore");
      // Move from deleted back to active
      setDeletedSubmissions(prev => {
        const item = prev.find(s => s.id === id);
        if (item) setSubmissions(a => [{ ...item, deleted: false, deletedAt: null }, ...a]);
        return prev.filter(s => s.id !== id);
      });
      toast.success("Submission restored successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to restore submission");
    }
    setRestoringId(null);
  };

  const permanentlyDelete = async (id: string) => {
    if (!window.confirm("⚠️ This will permanently erase this submission. This CANNOT be undone. Continue?")) return;
    setPermDeletingId(id);
    try {
      const r = await fetch(`${base()}/api/submissions/${id}/permanent`, { method: "DELETE", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to permanently delete");
      setDeletedSubmissions(prev => prev.filter(s => s.id !== id));
      toast.success("Submission permanently deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete submission");
    }
    setPermDeletingId(null);
  };

  const renderDeletedCard = (submission: any) => (
    <div key={submission.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AnimalGlyph domain={submission.domain || "papers"} size={28} className="mt-1 shrink-0 text-[var(--ink-faint)]" />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl leading-tight text-[var(--ink-soft)] line-through">{submission.title || "Untitled"}</h3>
            <p className="mt-1 font-ui text-xs text-[var(--muted)]">
              {submission.type}
              {submission.deletedAt
                ? ` · Deleted ${new Date(submission.deletedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="badge badge-draft">Deleted</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => restoreSubmission(submission.id)}
              disabled={restoringId === submission.id}
              className="btn-ink px-2 py-1 text-[10px] text-[var(--sage)]"
              title="Restore this submission"
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
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-10">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <ParchmentCard className="p-6 text-center">
              <div className="mx-auto mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-[var(--border-gold)] bg-[var(--terracotta-pale)] text-[var(--terracotta)]">
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
                <div className="flex items-center justify-center gap-2">
                  <h1 className="font-display text-3xl text-[var(--ink)]">{user.name || "My Account"}</h1>
                  <button type="button" onClick={() => setEditing(true)} className="text-[var(--gold)]" aria-label="Edit profile name">
                    <Edit3 size={15} />
                  </button>
                </div>
              )}
              <div className="mt-2 flex items-center justify-center gap-2 font-ui text-sm text-[var(--muted)]">
                <Mail size={14} /> {user.email}
              </div>
              {user.institution ? <p className="mt-1 font-ui text-xs text-[var(--muted)]">{user.institution}</p> : null}
              <span className="badge badge-received mt-4">{user.role === "ADMIN" ? "Admin" : "Member"}</span>
              <OrnamentDivider variant="minimal" className="my-5" />
              <button type="button" onClick={handleLogout} className="btn-ink w-full justify-center">
                <LogOut size={14} /> Sign Out
              </button>
            </ParchmentCard>

            <ParchmentCard className="p-5">
              <p className="type-section-label mb-4">Desk Links</p>
              <div className="grid gap-2">
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

          <main className="space-y-6">
            <ParchmentCard className="p-6">
              <p className="type-section-label mb-2">Scholar's Desk</p>
              <h2 className="font-display text-4xl text-[var(--ink)]">Your Profile</h2>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Submissions", published.length],
                  ["Published", submissions.filter((s) => s.status === "PUBLISHED").length],
                  ["Drafts", drafts.length],
                  ["Profile Views", 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
                    <div className="font-display text-3xl text-[var(--gold)]">{value}</div>
                    <div className="font-ui text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">{label}</div>
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
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="type-section-label mb-2">My Submissions</p>
                  <h2 className="font-display text-3xl text-[var(--ink)]">Editorial Status</h2>
                </div>
                <Link href="/submit" className="btn-terracotta">New Submission</Link>
              </div>

              {published.length === 0 ? (
                <EmptyState title="No submissions yet" description="Submit your work to the journal and track its progress here." action={<Link href="/submit" className="btn-terracotta">Submit Work</Link>} />
              ) : (
                <div className="space-y-3">{published.map((s) => renderCard(s, false))}</div>
              )}
            </ParchmentCard>

            {deletedSubmissions.length > 0 ? (
              <ParchmentCard className="p-6">
                <div className="mb-4">
                  <p className="type-section-label mb-2">Removed from Journal</p>
                  <h2 className="font-display text-3xl text-[var(--ink-soft)]">Deleted Submissions</h2>
                  <p className="mt-2 font-body text-sm text-[var(--muted)]">
                    These submissions have been soft-deleted and are no longer visible on the journal. They cannot be restored.
                  </p>
                </div>
                <div className="space-y-3">{deletedSubmissions.map((s) => renderDeletedCard(s))}</div>
              </ParchmentCard>
            ) : null}
          </main>
        </div>
      </section>
    </div>
  );
}
