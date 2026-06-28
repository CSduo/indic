import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookMarked, Check, Edit3, FileText, LogOut, Mail, User, X } from "lucide-react";
import { toast } from "sonner";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  RECEIVED: { label: "Received", className: "badge-received" },
  UNDER_REVIEW: { label: "Under Review", className: "badge-reviewing" },
  REVISION_REQUESTED: { label: "Revision Requested", className: "badge-received" },
  ACCEPTED: { label: "Accepted", className: "badge-approved" },
  REJECTED: { label: "Rejected", className: "badge-rejected" },
  PUBLISHED: { label: "Published", className: "badge-published" },
  ARCHIVED: { label: "Archived", className: "badge-draft" },
};

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { user, logout, refresh } = useAuthContext();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user && !loadingPage) {
      navigate("/login");
      return;
    }
    if (user) {
      setEditName(user.name || "");
      fetch(`${base()}/api/submissions`, { credentials: "include" })
        .then((response) => response.json())
        .then((data) => setSubmissions(data.submissions || []))
        .catch(() => {})
        .finally(() => setLoadingPage(false));
    }
  }, [user, loadingPage, navigate]);

  useEffect(() => {
    if (!user) {
      const timeout = window.setTimeout(() => {
        if (!user) navigate("/login");
      }, 1500);
      return () => window.clearTimeout(timeout);
    }
    setLoadingPage(false);
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

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <div className="h-9 w-9 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-10">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <ParchmentCard className="p-6 text-center">
              <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border border-[var(--border-gold)] bg-[var(--terracotta-pale)] text-[var(--terracotta)]">
                <User size={34} />
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
                  ["Submissions", submissions.length],
                  ["Published", submissions.filter((s) => s.status === "PUBLISHED").length],
                  ["Bookmarks", 0],
                  ["Profile Views", 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
                    <div className="font-display text-3xl text-[var(--gold)]">{value}</div>
                    <div className="font-ui text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">{label}</div>
                  </div>
                ))}
              </div>
            </ParchmentCard>

            <ParchmentCard className="p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="type-section-label mb-2">My Submissions</p>
                  <h2 className="font-display text-3xl text-[var(--ink)]">Editorial Status</h2>
                </div>
                <Link href="/submit" className="btn-terracotta">New Submission</Link>
              </div>

              {submissions.length === 0 ? (
                <EmptyState title="No submissions yet" description="Submit your work to the journal and track its progress here." action={<Link href="/submit" className="btn-terracotta">Submit Work</Link>} />
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => {
                    const status = STATUS_LABELS[submission.status] || { label: submission.status || "Received", className: "badge-received" };
                    return (
                      <div key={submission.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <AnimalGlyph domain={submission.domain || "papers"} size={28} className="mt-1 shrink-0 text-[var(--gold)]" />
                            <div>
                              <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">{submission.title}</h3>
                              <p className="mt-1 font-ui text-xs text-[var(--muted)]">
                                {submission.type} · {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "Undated"}
                              </p>
                              {submission.abstract ? <p className="mt-2 line-clamp-2 font-body text-sm leading-6 text-[var(--ink-soft)]">{submission.abstract}</p> : null}
                            </div>
                          </div>
                          <span className={`badge ${status.className} shrink-0`}>{status.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ParchmentCard>
          </main>
        </div>
      </section>
    </div>
  );
}
