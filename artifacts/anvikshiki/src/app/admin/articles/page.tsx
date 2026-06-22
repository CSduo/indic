import { useLocation } from 'wouter';
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { FileText, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminArticlesPage() {
  const [, navigate] = useLocation();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/articles`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { navigate("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setArticles(data.articles || []); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    try {
      await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/articles/${id}`, { method: "DELETE", credentials: "include" });
      setArticles(articles.filter((a) => a.id !== id));
      toast.success("Article deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--ink)" }}>Articles</h1>
          <Link href="/admin/articles/new" className="btn-primary">
            <Plus size={16} /> New Article
          </Link>
        </div>

        <div className="card-anv overflow-hidden">
          <table className="w-full admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium" style={{ color: "var(--ink)" }}>{a.title}</td>
                  <td style={{ color: "var(--muted)" }}>{a.category?.name}</td>
                  <td>
                    <span className={`status-badge status-${a.status.toLowerCase()} text-[10px]`}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)" }}>
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/articles/${a.slug}`} className="p-1.5 rounded transition-colors hover:bg-[var(--surface-soft)]">
                        <Eye size={14} style={{ color: "var(--muted)" }} />
                      </Link>
                      <button onClick={() => deleteArticle(a.id)} className="p-1.5 rounded transition-colors hover:bg-[var(--surface-soft)]">
                        <Trash2 size={14} style={{ color: "var(--rose)" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {articles.length === 0 && (
            <div className="text-center py-12">
              <p className="font-body" style={{ color: "var(--muted)" }}>No articles yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
