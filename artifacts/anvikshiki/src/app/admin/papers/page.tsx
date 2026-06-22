import { useLocation } from 'wouter';
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Scroll, Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPapersPage() {
  const [, navigate] = useLocation();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/papers`, { credentials: "include" })
      .then((r) => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then((d) => { if (d) setPapers(d.papers || []); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const deletePaper = async (id: string) => {
    if (!confirm("Delete?")) return;
    await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/papers/${id}`, { method: "DELETE", credentials: "include" });
    setPapers(papers.filter((p) => p.id !== id));
    toast.success("Deleted");
  };

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--ink)" }}>Papers</h1>
          <Link href="/admin/papers/new" className="btn-primary"><Plus size={16} /> New Paper</Link>
        </div>
        <div className="card-anv overflow-hidden">
          <table className="w-full admin-table">
            <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium" style={{ color: "var(--ink)" }}>{p.title}</td>
                  <td style={{ color: "var(--muted)" }}>{p.category?.name}</td>
                  <td><span className="font-ui text-[10px] uppercase" style={{ color: "var(--gold)" }}>{p.paperType?.replace("_", " ")}</span></td>
                  <td><span className={`status-badge status-${p.status.toLowerCase()} text-[10px]`}>{p.status}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/papers/${p.slug}`} className="p-1.5 rounded hover:bg-[var(--surface-soft)]"><Eye size={14} style={{ color: "var(--muted)" }} /></Link>
                      <button onClick={() => deletePaper(p.id)} className="p-1.5 rounded hover:bg-[var(--surface-soft)]"><Trash2 size={14} style={{ color: "var(--rose)" }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {papers.length === 0 && <div className="text-center py-12"><p className="font-body" style={{ color: "var(--muted)" }}>No papers yet.</p></div>}
        </div>
      </div>
    </div>
  );
}
