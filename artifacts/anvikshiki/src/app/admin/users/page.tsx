import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { User, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";
import { toast } from "sonner";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`${base()}/api/admin/users`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then(d => d && setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const toggleRole = async (userId: string, currentRole: string) => {
    const targetRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const confirmMsg = targetRole === "ADMIN" 
      ? "Are you sure you want to make this user an ADMIN? They will have full access to modify settings, manage users, and edit articles."
      : "Are you sure you want to demote this ADMIN to a regular USER?";
      
    if (!confirm(confirmMsg)) return;

    try {
      const r = await fetch(`${base()}/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to update role");

      toast.success(data.message || `User role updated to ${targetRole}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
    } catch (err: any) {
      toast.error(err.message || "Failed to update user role");
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/users" />
      <main className="admin-main">
        <div className="mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Users</h1>
          <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="card-sacred" style={{ overflow: "hidden" }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <LotusIcon size={36} style={{ color: "var(--gold)", opacity: 0.25 }} />
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>No users have signed up yet</p>
            </div>
          ) : (
            <table className="sacred-table" role="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,152,58,0.12)", border: "1px solid rgba(201,152,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <User size={13} style={{ color: "var(--gold)" }} />
                        </div>
                        <span style={{ color: "var(--ink-soft)" }}>{u.name || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No name</span>}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} style={{ color: "var(--muted)" }} />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-ui text-[10px] px-2 py-0.5 rounded-full" style={{ background: u.role === "ADMIN" ? "rgba(239,68,68,0.1)" : "rgba(201,152,58,0.1)", color: u.role === "ADMIN" ? "#ef4444" : "var(--gold)", border: u.role === "ADMIN" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(201,152,58,0.2)" }}>
                        {u.role || "USER"}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => toggleRole(u.id, u.role || "USER")}
                        className="btn-sacred btn-ghost text-[10px] py-1 px-2.5 inline-flex items-center gap-1"
                        style={{ borderColor: "rgba(201,152,58,0.15)" }}
                      >
                        {u.role === "ADMIN" ? (
                          <>
                            <ShieldAlert size={12} className="text-red-400" /> Make Member
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={12} className="text-emerald-400" /> Make Admin
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
