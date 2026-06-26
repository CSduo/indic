import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminArticlesPage() {
  const [, navigate] = useLocation();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${base()}/api/admin/articles`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then(d => d && (setArticles(d.articles || []), setLoading(false)))
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const r = await fetch(`${base()}/api/admin/articles/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Deleted"); load(); } else toast.error("Delete failed");
  };

  const toggle = async (id: string, current: string) => {
    const status = current === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const r = await fetch(`${base()}/api/admin/articles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...(status === "PUBLISHED" ? { publishedAt: new Date().toISOString() } : {}) }), credentials: "include" });
    if (r.ok) { toast.success(status === "PUBLISHED" ? "Published" : "Unpublished"); load(); } else toast.error("Failed");
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/articles" />
      <main className="admin-main">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Articles</h1>
          <Link href="/admin/articles/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> New Article</Link>
        </div>
        <div className="card-sacred" style={{ overflow: "hidden" }}>
          {loading ? (
            <div className="flex justify-center py-10">
              <div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <LotusIcon size={36} style={{ color: "var(--gold)", opacity: 0.3 }} />
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>No articles yet</p>
              <Link href="/admin/articles/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> Create First Article</Link>
            </div>
          ) : (
            <table className="sacred-table" role="table">
              <thead><tr><th scope="col">Title</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: "var(--ink-soft)", maxWidth: 250 }}>{a.title}</td>
                    <td>{a.categorySlug}</td>
                    <td><span className={`badge ${a.status === "PUBLISHED" ? "badge-approved" : "badge-draft"}`}>{a.status}</span></td>
                    <td>{a.updatedAt ? new Date(a.updatedAt).toLocaleDateString("en-IN") : "—"}</td>
                    <td>
                      <div className="flex gap-2">
                        {a.slug && <Link href={`/articles/${a.slug}`} className="btn-sacred text-[10px] py-1 px-2 btn-ghost" title="View"><Eye size={11} /></Link>}
                        <button type="button" onClick={() => toggle(a.id, a.status)} className="btn-sacred text-[10px] py-1 px-2" style={{ background: a.status === "PUBLISHED" ? "rgba(139,26,74,0.15)" : "rgba(26,74,56,0.2)", border: "1px solid var(--border)", color: a.status === "PUBLISHED" ? "var(--lotus)" : "#4ade80" }}>
                          {a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </button>
                        <button type="button" onClick={() => del(a.id)} className="btn-sacred text-[10px] py-1 px-2" style={{ background: "rgba(139,26,74,0.1)", border: "1px solid rgba(139,26,74,0.25)", color: "var(--rose-bright)" }} title="Delete">
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
