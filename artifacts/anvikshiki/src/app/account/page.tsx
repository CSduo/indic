import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, FileText, Edit3, Check, X, User, Mail, BookMarked } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED:           { label: "Received",           color: "var(--gold)" },
  UNDER_REVIEW:       { label: "Under Review",       color: "var(--moon)" },
  REVISION_REQUESTED: { label: "Revision Requested", color: "#f59e0b" },
  ACCEPTED:           { label: "Accepted",           color: "#4ade80" },
  REJECTED:           { label: "Rejected",           color: "var(--lotus)" },
  PUBLISHED:          { label: "Published",          color: "#4ade80" },
  ARCHIVED:           { label: "Archived",           color: "var(--muted)" },
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
        .then(r => r.json())
        .then(d => setSubmissions(d.submissions || []))
        .catch(() => {})
        .finally(() => setLoadingPage(false));
    }
  }, [user, loadingPage, navigate]);

  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        if (!user) navigate("/login");
      }, 1500);
      return () => clearTimeout(t);
    } else {
      setLoadingPage(false);
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    toast.success("You have been signed out");
    navigate("/");
  };

  const saveProfile = async () => {
    if (!editName.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${base()}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!r.ok) throw new Error("Failed to update profile");
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
      <div style={{ background: "var(--bg)", minHeight: "60vh" }} className="flex items-center justify-center">
        <div style={{ width: 36, height: 36, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="container-anv py-12 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(201,152,58,0.12)", border: "1px solid rgba(201,152,58,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={26} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="input-sacred py-1 text-base font-display"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveProfile()}
                    style={{ color: "var(--gold-bright)", width: 200 }}
                  />
                  <button type="button" onClick={saveProfile} disabled={saving} className="p-1.5 rounded" style={{ color: "#4ade80" }}><Check size={16} /></button>
                  <button type="button" onClick={() => { setEditing(false); setEditName(user.name || ""); }} className="p-1.5 rounded" style={{ color: "var(--lotus)" }}><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>{user.name || "My Account"}</h1>
                  <button type="button" onClick={() => setEditing(true)} className="opacity-40 hover:opacity-70 transition-opacity" style={{ color: "var(--gold)" }}>
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <Mail size={12} style={{ color: "var(--muted)" }} />
                <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>{user.email}</p>
              </div>
              <div className="mt-1">
                <span className="font-ui text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(201,152,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,152,58,0.25)" }}>
                  {user.role === "ADMIN" ? "Admin" : "Member"}
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="btn-sacred btn-ghost text-xs inline-flex items-center gap-1.5">
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        <LotusDivider className="mb-8" />

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/saved" className="card-sacred p-4 flex items-center gap-3 cursor-pointer">
            <BookMarked size={18} style={{ color: "var(--gold)" }} />
            <div>
              <div className="font-ui text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>Saved Items</div>
              <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>Essays &amp; papers</div>
            </div>
          </Link>
          <Link href="/submit" className="card-sacred p-4 flex items-center gap-3 cursor-pointer">
            <FileText size={18} style={{ color: "var(--gold)" }} />
            <div>
              <div className="font-ui text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>Submit Work</div>
              <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>New submission</div>
            </div>
          </Link>
        </div>

        {/* Submissions */}
        <div className="section-label mb-4">My Submissions</div>
        {submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Submit your work to the journal and track its progress here."
            action={<Link href="/submit" className="btn-sacred btn-gold">Submit Work</Link>}
          />
        ) : (
          <div className="space-y-3">
            {submissions.map(s => {
              const st = STATUS_LABELS[s.status] || { label: s.status || "Received", color: "var(--gold)" };
              return (
                <div key={s.id} className="card-sacred p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <FileText size={16} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div className="font-ui text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>{s.title}</div>
                        <div className="font-ui text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                          {s.type} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        </div>
                        {s.abstract && <p className="font-body text-xs mt-1 line-clamp-2" style={{ color: "var(--ink-faint)" }}>{s.abstract}</p>}
                      </div>
                    </div>
                    <span className="font-ui text-[10px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}40` }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <LotusIcon size={14} style={{ color: "var(--gold)", opacity: 0.5 }} />
            <span className="font-ui text-xs" style={{ color: "var(--ink-faint)" }}>Account details are stored securely. Submissions are saved to the journal database.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
