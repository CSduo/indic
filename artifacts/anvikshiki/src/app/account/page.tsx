import { useLocation } from 'wouter';
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { User, Bookmark, FileText, Feather, LogOut, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function AccountPage() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          // Fetch submissions
          fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/submissions`, { credentials: "include" })
            .then((r) => r.json())
            .then((s) => setSubmissions(s.submissions || []));
        } else {
          navigate("/login");
        }
      })
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/auth/logout`, { method: "POST", credentials: "include" });
    toast.success("Signed out");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8 max-w-2xl">
        {/* Profile */}
        <div className="card-anv p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
            >
              <User size={24} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <h1 className="font-display text-xl" style={{ color: "var(--ink)" }}>
                {user.name || "Reader"}
              </h1>
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>{user.email}</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <Link
            href="/saved"
            className="card-anv p-4 text-center hover:translate-y-[-2px] transition-all block"
          >
            <Bookmark size={20} className="mx-auto mb-2" style={{ color: "var(--gold)" }} />
            <span className="font-ui text-xs font-medium" style={{ color: "var(--ink)" }}>Saved</span>
          </Link>
          <Link
            href="/papers"
            className="card-anv p-4 text-center hover:translate-y-[-2px] transition-all block"
          >
            <FileText size={20} className="mx-auto mb-2" style={{ color: "var(--peacock)" }} />
            <span className="font-ui text-xs font-medium" style={{ color: "var(--ink)" }}>Papers</span>
          </Link>
          <Link
            href="/submit"
            className="card-anv p-4 text-center hover:translate-y-[-2px] transition-all block"
          >
            <Feather size={20} className="mx-auto mb-2" style={{ color: "var(--rose)" }} />
            <span className="font-ui text-xs font-medium" style={{ color: "var(--ink)" }}>Submit</span>
          </Link>
        </div>

        {/* Submissions */}
        {submissions.length > 0 && (
          <div className="mt-8">
            <h2 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--gold)" }}>
              Your Submissions
            </h2>
            <div className="space-y-3">
              {submissions.map((s) => (
                <div key={s.id} className="card-anv p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-base" style={{ color: "var(--ink)" }}>{s.title}</h4>
                      <span className="font-ui text-xs" style={{ color: "var(--muted)" }}>
                        Submitted {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className="status-badge text-[10px]"
                      style={{
                        background: s.status === "RECEIVED" ? "rgba(213,170,97,0.15)" :
                          s.status === "ACCEPTED" ? "rgba(138,160,113,0.2)" :
                          s.status === "REJECTED" ? "rgba(220,88,124,0.15)" :
                          "rgba(21,116,109,0.15)",
                        color: s.status === "RECEIVED" ? "var(--gold)" :
                          s.status === "ACCEPTED" ? "var(--sage)" :
                          s.status === "REJECTED" ? "var(--rose)" :
                          "var(--peacock)",
                      }}
                    >
                      {s.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-8 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-ui text-sm font-medium transition-colors"
          style={{ background: "var(--surface-soft)", color: "var(--rose)", border: "1px solid var(--border)" }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
