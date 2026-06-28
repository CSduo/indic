import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminPapersPage() {
  const [, navigate] = useLocation();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${base()}/api/admin/papers`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then(d => d && (setPapers(d.papers || []), setLoading(false)))
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this paper?")) return;
    const r = await fetch(`${base()}/api/admin/papers/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Deleted"); load(); } else toast.error("Delete failed");
  };

  const toggle = async (id: string, current: string) => {
    const status = current === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const r = await fetch(`${base()}/api/admin/papers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(status === "PUBLISHED" ? { publishedAt: new Date().toISOString() } : {}) }),
      credentials: "include",
    });
    if (r.ok) { toast.success(status === "PUBLISHED" ? "Published" : "Unpublished"); load(); } else toast.error("Failed");
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/papers" />
      <main className="admin-main">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Papers</h1>
          <Link href="/admin/papers/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> New Paper</Link>
        </div>
        <div className="card-sacred" style={{ overflow: "hidden" }}>
          {loading ? (
            <div className="flex justify-center py-10">
              <div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
            </div>
          ) : papers.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <LotusIcon size={36} style={{ color: "var(--gold)", opacity: 0.3 }} />
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>No papers yet</p>
              <Link href="/admin/papers/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> Add First Paper</Link>
            </div>
          ) : (
            <table className="sacred-table" role="table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Year</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--ink-soft)", maxWidth: 250 }}>{p.title}</td>
                    <td><span className="badge badge-draft" style={{ fontSize: "0.6rem" }}>{p.paperType || "PAPER"}</span></td>
                    <td><span className={`badge ${p.status === "PUBLISHED" ? "badge-approved" : "badge-draft"}`}>{p.status}</span></td>
                    <td>{p.year || "—"}</td>
                    <td>
                      <div className="flex gap-2">
                        {p.slug && <Link href={`/papers/${p.slug}`} className="btn-sacred text-[10px] py-1 px-2 btn-ghost" title="View"><Eye size={11} /></Link>}
                        <button type="button" onClick={() => toggle(p.id, p.status)}
                          className="btn-sacred text-[10px] py-1 px-2"
                          style={{ background: p.status === "PUBLISHED" ? "rgba(139,26,74,0.15)" : "rgba(26,74,56,0.2)", border: "1px solid var(--border)", color: p.status === "PUBLISHED" ? "var(--lotus)" : "#4ade80" }}>
                          {p.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </button>
                        <button type="button" onClick={() => del(p.id)}
                          className="btn-sacred text-[10px] py-1 px-2"
                          style={{ background: "rgba(139,26,74,0.1)", border: "1px solid rgba(139,26,74,0.25)", color: "var(--rose-bright)" }} title="Delete">
                          <Trash2 size={11} />
                        </button>
                      </div>
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
