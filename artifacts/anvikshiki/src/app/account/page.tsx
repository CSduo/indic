import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, FileText } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AccountPage() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${base()}/api/auth/me`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/login"); return null; } return r.json(); })
      .then(d => d && setUser(d.user))
      .catch(() => navigate("/login"));
    fetch(`${base()}/api/submissions`, { credentials: "include" })
      .then(r => r.json()).then(d => setSubmissions(d.submissions || [])).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch(`${base()}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    navigate("/");
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="container-anv py-12 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl" style={{ color: "var(--gold-bright)" }}>My Account</h1>
            {user && <p className="font-ui text-sm mt-1" style={{ color: "var(--muted)" }}>{user.email}</p>}
          </div>
          <button type="button" onClick={logout} className="btn-sacred btn-ghost text-xs inline-flex items-center gap-1.5">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
        <LotusDivider className="mb-8" />
        <div className="section-label mb-4">My Submissions</div>
        {submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Submit your work to the journal and track its progress here."
            action={<Link href="/submit" className="btn-sacred btn-gold">Submit Work</Link>}
          />
        ) : (
          <div className="space-y-3">
            {submissions.map(s => (
              <div key={s.id} className="card-sacred p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} style={{ color: "var(--gold)", flexShrink: 0 }} />
                    <div>
                      <div className="font-ui text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>{s.title}</div>
                      <div className="font-ui text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {s.type} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}
                      </div>
                    </div>
                  </div>
                  <span className={`badge badge-${(s.status || "received").toLowerCase()} shrink-0`}>
                    {s.status || "received"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/saved" className="btn-sacred btn-ghost text-xs inline-flex items-center gap-1.5">
            View Saved Items →
          </Link>
        </div>
      </div>
    </div>
  );
}
