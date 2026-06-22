import { useLocation } from 'wouter';
"use client";

import { useState } from "react";
;
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { slug: "philosophy", name: "Philosophy" },
  { slug: "history", name: "History" },
  { slug: "psychology", name: "Psychology" },
  { slug: "sociology", name: "Sociology" },
  { slug: "science", name: "Science" },
  { slug: "geopolitics", name: "Geopolitics" },
];

export default function NewArticlePage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    excerpt: "",
    body: "",
    categorySlug: "philosophy",
    tags: "",
    authorName: "",
    status: "DRAFT" as string,
    featured: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        toast.success("Article created");
        navigate("/admin/articles");
      } else {
        toast.error("Failed to create article");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8 max-w-3xl">
        <Link href="/admin/articles" className="inline-flex items-center gap-2 font-ui text-sm mb-6" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={16} /> Back to Articles
        </Link>

        <h1 className="font-display text-2xl mb-6" style={{ color: "var(--ink)" }}>
          New Article
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Title *</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-anv" />
          </div>

          <div>
            <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Subtitle</label>
            <input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input-anv" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Category</label>
              <select value={form.categorySlug} onChange={(e) => setForm({ ...form, categorySlug: e.target.value })} className="input-anv">
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Author</label>
              <input type="text" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} className="input-anv" placeholder="Author name" />
            </div>
          </div>

          <div>
            <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Excerpt</label>
            <textarea rows={3} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="input-anv resize-none" />
          </div>

          <div>
            <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Body (Markdown supported)</label>
            <textarea rows={12} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="input-anv resize-none font-mono text-sm" placeholder="# Heading&#10;&#10;Your content here..." />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Tags (comma separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-anv" placeholder="philosophy, ethics" />
            </div>
            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-anv">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="font-ui text-sm" style={{ color: "var(--muted)" }}>Feature on homepage</span>
          </label>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Saving..." : "Save Article"}
            </button>
            <Link href="/admin/articles" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
