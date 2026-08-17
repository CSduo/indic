import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArchiveRestore, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";
import { QuietEmpty } from "@/components/sacred/QuietEmpty";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminPapersPage() {
  const [, navigate] = useLocation();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"active" | "trash">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "trash" ? "trash" : "active",
  );

  const load = (trashed = view === "trash") => {
    setLoading(true);
    fetch(`${base()}/api/admin/papers${trashed ? "?trashed=true" : ""}`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(d => d && setPapers(d.papers || []))
      .catch(() => toast.error("Failed to load papers"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(view === "trash"); }, [view]);

  const del = async (id: string) => {
    if (!confirm("Move this paper to Trash? You can restore it or delete it permanently later.")) return;
    const r = await fetch(`${base()}/api/admin/papers/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Paper moved to Trash"); load(); } else toast.error("Could not move paper to Trash");
  };

  const restore = async (id: string) => {
    const r = await fetch(`${base()}/api/admin/papers/${id}/restore`, { method: "POST", credentials: "include" });
    if (r.ok) { toast.success("Paper restored"); load(); } else toast.error("Could not restore paper");
  };

  const permanentlyDelete = async (id: string) => {
    if (!confirm("Permanently delete this paper? This cannot be undone.")) return;
    const r = await fetch(`${base()}/api/admin/papers/${id}/permanent`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Paper permanently deleted"); load(); } else toast.error("Could not permanently delete paper");
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
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>{view === "trash" ? "Paper Trash" : "Papers"}</h1>
            <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>{view === "trash" ? "Restore items or permanently delete them." : "Deleted papers are kept in Trash until you remove them permanently."}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => setView(view === "trash" ? "active" : "trash")} className="btn-sacred btn-ghost text-xs">
              <Trash2 size={13} /> {view === "trash" ? "Back to Papers" : "View Trash"}
            </button>
            {view === "active" && <Link href="/admin/papers/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> New Paper</Link>}
          </div>
        </div>
        <div className="card-sacred" style={{ overflowX: "auto" }}>
          {loading ? (
            <div className="flex justify-center py-10">
              <div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
            </div>
          ) : papers.length === 0 ? (
            <QuietEmpty
              compact
              title="No papers yet"
              description="Published research will be listed here."
              action={<Link href="/admin/papers/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> Add First Paper</Link>}
            />
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
                      <div className="flex flex-wrap gap-2 min-w-[170px]">
                        {view === "trash" ? <>
                          <button type="button" onClick={() => restore(p.id)} className="btn-sacred text-[10px] py-1 px-2 btn-ghost" title="Restore paper"><ArchiveRestore size={11} /> Restore</button>
                          <button type="button" onClick={() => permanentlyDelete(p.id)} className="btn-sacred text-[10px] py-1 px-2" style={{ background: "rgba(139,26,74,0.1)", border: "1px solid rgba(139,26,74,0.25)", color: "var(--rose-bright)" }} title="Permanently delete paper"><Trash2 size={11} /> Delete Forever</button>
                        </> : <>
                          {p.slug && <Link href={`/papers/${p.slug}`} className="btn-sacred text-[10px] py-1 px-2 btn-ghost" title="View"><Eye size={11} /></Link>}
                          <button type="button" onClick={() => toggle(p.id, p.status)}
                            className="btn-sacred text-[10px] py-1 px-2"
                            style={{ background: p.status === "PUBLISHED" ? "rgba(139,26,74,0.15)" : "rgba(26,74,56,0.2)", border: "1px solid var(--border)", color: p.status === "PUBLISHED" ? "var(--lotus)" : "#4ade80" }}>
                            {p.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                          <button type="button" onClick={() => del(p.id)}
                            className="btn-sacred text-[10px] py-1 px-2"
                            style={{ background: "rgba(139,26,74,0.1)", border: "1px solid rgba(139,26,74,0.25)", color: "var(--rose-bright)" }} title="Move to Trash">
                            <Trash2 size={11} /> Trash
                          </button>
                        </>}
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
