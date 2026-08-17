import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArchiveRestore, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";
import { QuietEmpty } from "@/components/sacred/QuietEmpty";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminArticlesPage() {
  const [, navigate] = useLocation();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"active" | "trash">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "trash" ? "trash" : "active",
  );

  const load = (trashed = view === "trash") => {
    setLoading(true);
    setError(null);
    fetch(`${base()}/api/admin/articles${trashed ? "?trashed=true" : ""}`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(d => d && setArticles(d.articles || []))
      .catch(() => setError("Failed to load articles."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(view === "trash"); }, [view]);

  const del = async (id: string) => {
    if (!confirm("Move this article to Trash? You can restore it or delete it permanently later.")) return;
    const r = await fetch(`${base()}/api/admin/articles/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Article moved to Trash"); load(); } else toast.error("Could not move article to Trash");
  };

  const restore = async (id: string) => {
    const r = await fetch(`${base()}/api/admin/articles/${id}/restore`, { method: "POST", credentials: "include" });
    if (r.ok) { toast.success("Article restored"); load(); } else toast.error("Could not restore article");
  };

  const permanentlyDelete = async (id: string) => {
    if (!confirm("Permanently delete this article? This cannot be undone.")) return;
    const r = await fetch(`${base()}/api/admin/articles/${id}/permanent`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Article permanently deleted"); load(); } else toast.error("Could not permanently delete article");
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
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>{view === "trash" ? "Article Trash" : "Articles"}</h1>
            <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>{view === "trash" ? "Restore items or permanently delete them." : "Deleted articles are kept in Trash until you remove them permanently."}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => setView(view === "trash" ? "active" : "trash")} className="btn-sacred btn-ghost text-xs">
              <Trash2 size={13} /> {view === "trash" ? "Back to Articles" : "View Trash"}
            </button>
            {view === "active" && <Link href="/admin/articles/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> New Article</Link>}
          </div>
        </div>
        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.3)", color: "var(--rose-bright)" }}>
            {error}
          </div>
        )}
        <div className="card-sacred" style={{ overflowX: "auto" }}>
          {loading ? (
            <div className="flex justify-center py-10">
              <div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <QuietEmpty
                compact
                title="No articles yet"
                description="Published essays will be listed here."
                action={<Link href="/admin/articles/new" className="btn-sacred btn-gold text-xs"><Plus size={14} /> Create First Article</Link>}
              />
            </div>
          ) : (
            <table className="sacred-table" role="table">
              <thead><tr><th scope="col">Title</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">{view === "trash" ? "Trashed" : "Date"}</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: "var(--ink-soft)", maxWidth: 250 }}>{a.title}</td>
                    <td>{a.categorySlug}</td>
                    <td><span className={`badge ${a.status === "PUBLISHED" ? "badge-approved" : "badge-draft"}`}>{a.status}</span></td>
                    <td>{a.updatedAt ? new Date(a.updatedAt).toLocaleDateString("en-IN") : "—"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2 min-w-[170px]">
                        {view === "trash" ? <>
                          <button type="button" onClick={() => restore(a.id)} className="btn-sacred text-[10px] py-1 px-2 btn-ghost" title="Restore article"><ArchiveRestore size={11} /> Restore</button>
                          <button type="button" onClick={() => permanentlyDelete(a.id)} className="btn-sacred text-[10px] py-1 px-2" style={{ background: "rgba(139,26,74,0.1)", border: "1px solid rgba(139,26,74,0.25)", color: "var(--rose-bright)" }} title="Permanently delete article"><Trash2 size={11} /> Delete Forever</button>
                        </> : <>
                          {a.slug && <Link href={`/articles/${a.slug}`} className="btn-sacred text-[10px] py-1 px-2 btn-ghost" title="View"><Eye size={11} /></Link>}
                          <button type="button" onClick={() => toggle(a.id, a.status)} className="btn-sacred text-[10px] py-1 px-2" style={{ background: a.status === "PUBLISHED" ? "rgba(139,26,74,0.15)" : "rgba(26,74,56,0.2)", border: "1px solid var(--border)", color: a.status === "PUBLISHED" ? "var(--lotus)" : "#4ade80" }}>
                            {a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                          <button type="button" onClick={() => del(a.id)} className="btn-sacred text-[10px] py-1 px-2" style={{ background: "rgba(139,26,74,0.1)", border: "1px solid rgba(139,26,74,0.25)", color: "var(--rose-bright)" }} title="Move to Trash">
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
