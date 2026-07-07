import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusDivider } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminNewArticlePage() {
  const [, navigate] = useLocation();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", authorName: "", excerpt: "", body: "",
    categorySlug: "", status: "DRAFT", readingTime: "5",
    metaDescription: "", featuredImage: "",
  });

  useEffect(() => {
    fetch(`${base()}/api/categories`, { credentials: "include" })
      .then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${base()}/api/admin/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, readingTime: parseInt(form.readingTime) || 5, ...(form.status === "PUBLISHED" ? { publishedAt: new Date().toISOString() } : {}) }),
        credentials: "include",
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed"); }
      toast.success("Article created");
      navigate("/admin/articles");
    } catch (err: any) {
      toast.error(err.message || "Failed to create article");
    }
    setSaving(false);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/articles" />
      <main className="admin-main">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/articles" className="btn-sacred btn-ghost text-xs inline-flex items-center gap-1"><ArrowLeft size={13} /> Articles</Link>
          <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>New Article</h1>
        </div>
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="art-title">Title *</label>
              <input id="art-title" className="input-sacred" value={form.title} onChange={e => { set("title", e.target.value); if (!form.slug) set("slug", autoSlug(e.target.value)); }} required />
            </div>
            <div>
              <label className="form-label" htmlFor="art-slug">Slug *</label>
              <input id="art-slug" className="input-sacred" value={form.slug} onChange={e => set("slug", e.target.value)} required />
            </div>
            <div>
              <label className="form-label" htmlFor="art-author">Author Name</label>
              <input id="art-author" className="input-sacred" value={form.authorName} onChange={e => set("authorName", e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="art-category">Category</label>
              <select id="art-category" className="input-sacred" value={form.categorySlug} onChange={e => set("categorySlug", e.target.value)}>
                <option value="">— Select category —</option>
                {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                {["philosophy","history","psychology","sociology","science","geopolitics","culture","language"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="art-reading-time">Reading Time (mins)</label>
              <input id="art-reading-time" type="number" className="input-sacred" value={form.readingTime} onChange={e => set("readingTime", e.target.value)} min="1" max="120" />
            </div>
            <div>
              <label className="form-label" htmlFor="art-status">Status</label>
              <select id="art-status" className="input-sacred" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="art-image">Featured Image URL</label>
              <input id="art-image" type="url" className="input-sacred" value={form.featuredImage} onChange={e => set("featuredImage", e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="art-excerpt">Excerpt</label>
            <textarea id="art-excerpt" className="textarea-sacred" rows={3} value={form.excerpt} onChange={e => set("excerpt", e.target.value)} placeholder="Brief summary shown in article cards…" />
          </div>
          <div>
            <label className="form-label" htmlFor="art-body">Body *</label>
            <textarea id="art-body" className="textarea-sacred" rows={14} value={form.body} onChange={e => set("body", e.target.value)} placeholder="Full article text (Markdown supported)…" required />
          </div>
          <div>
            <label className="form-label" htmlFor="art-meta">Meta Description</label>
            <input id="art-meta" className="input-sacred" value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} placeholder="SEO description…" />
          </div>
          <LotusDivider className="my-4" />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-sacred btn-gold inline-flex items-center gap-2">
              <Save size={14} /> {saving ? "Saving…" : "Create Article"}
            </button>
            <Link href="/admin/articles" className="btn-sacred btn-ghost">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
