import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Mail, Users, Download } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminNewsletterPage() {
  const [, navigate] = useLocation();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${base()}/api/admin/newsletter`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then(d => d && (setSubscribers(d.subscribers || []), setLoading(false)))
      .catch(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const header = "email,name,subscribed_at\n";
    const rows = subscribers.map(s => `${s.email},${s.name || ""},${s.createdAt || ""}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/newsletter" />
      <main className="admin-main">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Newsletter</h1>
            <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>{subscribers.length} active subscribers</p>
          </div>
          <button type="button" onClick={exportCsv} className="btn-sacred btn-ghost text-xs inline-flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[{ icon: <Mail size={18} />, label: "Total Subscribers", value: subscribers.length, color: "var(--gold)" }].map(s => (
            <div key={s.label} className="card-sacred p-4 col-span-1">
              <div className="flex items-center justify-between mb-2">
                <div style={{ color: s.color }}>{s.icon}</div>
                <div className="font-display text-2xl" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card-sacred" style={{ overflow: "hidden" }}>
          {loading ? (
            <div className="flex justify-center py-10"><div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" /></div>
          ) : subscribers.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <LotusIcon size={36} style={{ color: "var(--gold)", opacity: 0.3 }} />
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>No subscribers yet</p>
            </div>
          ) : (
            <table className="sacred-table" role="table">
              <thead><tr><th scope="col">Email</th><th scope="col">Name</th><th scope="col">Subscribed</th></tr></thead>
              <tbody>
                {subscribers.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--gold-bright)" }}>{s.email}</td>
                    <td>{s.name || "—"}</td>
                    <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}</td>
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
