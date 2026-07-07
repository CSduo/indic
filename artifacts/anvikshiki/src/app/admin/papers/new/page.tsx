import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusDivider } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminNewPaperPage() {
  const [, navigate] = useLocation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", slug: "", authorName: "", authorEmail: "", abstract: "", body: "",
    categorySlug: "", year: new Date().getFullYear().toString(),
    keywords: "", peerReviewed: false, status: "DRAFT",
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${base()}/api/admin/papers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, year: parseInt(form.year) || new Date().getFullYear() }),
        credentials: "include",
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed"); }
      toast.success("Paper created");
      navigate("/admin/papers");
    } catch (err: any) {
      toast.error(err.message || "Failed to create paper");
    }
    setSaving(false);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/papers" />
      <main className="admin-main">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/papers" className="btn-sacred btn-ghost text-xs inline-flex items-center gap-1"><ArrowLeft size={13} /> Papers</Link>
          <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>New Paper</h1>
        </div>
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="paper-title">Title *</label>
              <input id="paper-title" className="input-sacred" value={form.title} onChange={e => { set("title", e.target.value); if (!form.slug) set("slug", autoSlug(e.target.value)); }} required />
            </div>
            <div>
              <label className="form-label" htmlFor="paper-slug">Slug *</label>
              <input id="paper-slug" className="input-sacred" value={form.slug} onChange={e => set("slug", e.target.value)} required />
            </div>
            <div>
              <label className="form-label" htmlFor="paper-author">Author Name</label>
              <input id="paper-author" className="input-sacred" value={form.authorName} onChange={e => set("authorName", e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="paper-email">Author Email</label>
              <input id="paper-email" type="email" className="input-sacred" value={form.authorEmail} onChange={e => set("authorEmail", e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="paper-year">Year</label>
              <input id="paper-year" type="number" className="input-sacred" value={form.year} onChange={e => set("year", e.target.value)} min="1900" max="2100" />
            </div>
            <div>
              <label className="form-label" htmlFor="paper-discipline">Discipline Slug</label>
              <input id="paper-discipline" className="input-sacred" placeholder="philosophy, history, etc." value={form.categorySlug} onChange={e => set("categorySlug", e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="paper-status">Status</label>
              <select id="paper-status" className="input-sacred" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input id="peer-reviewed" type="checkbox" checked={form.peerReviewed} onChange={e => set("peerReviewed", e.target.checked)} className="accent-gold" />
              <label htmlFor="peer-reviewed" className="form-label cursor-pointer">Peer Reviewed</label>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="paper-abstract">Abstract *</label>
            <textarea id="paper-abstract" className="textarea-sacred" rows={6} value={form.abstract} onChange={e => set("abstract", e.target.value)} required />
          </div>
          <div>
            <label className="form-label" htmlFor="paper-body">Full Text</label>
            <textarea id="paper-body" className="textarea-sacred" rows={12} value={form.body} onChange={e => set("body", e.target.value)} placeholder="Full paper text or leave empty for PDF-only papers…" />
          </div>
          <div>
            <label className="form-label" htmlFor="paper-keywords">Keywords (comma separated)</label>
            <input id="paper-keywords" className="input-sacred" value={form.keywords} onChange={e => set("keywords", e.target.value)} placeholder="phenomenology, consciousness, Husserl" />
          </div>
          <LotusDivider className="my-4" />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-sacred btn-gold inline-flex items-center gap-2">
              <Save size={14} /> {saving ? "Saving…" : "Create Paper"}
            </button>
            <Link href="/admin/papers" className="btn-sacred btn-ghost">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
