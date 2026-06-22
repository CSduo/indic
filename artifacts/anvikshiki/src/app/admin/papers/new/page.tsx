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

export default function NewPaperPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    title: "", abstract: "", body: "", categorySlug: "philosophy",
    tags: "", authorName: "", pdfUrl: "", citationText: "",
    peerReviewed: false, paperType: "RESEARCH_PAPER", year: new Date().getFullYear(),
    doi: "", status: "DRAFT",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/papers`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
      });
      if (res.ok) { toast.success("Paper created"); navigate("/admin/papers"); }
      else toast.error("Failed");
    } catch { toast.error("Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8 max-w-3xl">
        <Link href="/admin/papers" className="inline-flex items-center gap-2 font-ui text-sm mb-6" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="font-display text-2xl mb-6" style={{ color: "var(--ink)" }}>New Paper</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Title *</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-anv" /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Category</label>
              <select value={form.categorySlug} onChange={(e) => setForm({ ...form, categorySlug: e.target.value })} className="input-anv">
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select></div>
            <div><label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Paper Type</label>
              <select value={form.paperType} onChange={(e) => setForm({ ...form, paperType: e.target.value })} className="input-anv">
                <option value="RESEARCH_PAPER">Research Paper</option>
                <option value="WORKING_PAPER">Working Paper</option>
                <option value="REVIEW_ESSAY">Review Essay</option>
                <option value="MONOGRAPH">Monograph</option>
              </select></div>
          </div>
          <div><label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Abstract</label>
            <textarea rows={4} value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} className="input-anv resize-none" /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>PDF URL</label>
              <input type="url" value={form.pdfUrl} onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })} className="input-anv" placeholder="https://..." /></div>
            <div><label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Year</label>
              <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="input-anv" /></div>
          </div>
          <div><label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>Citation</label>
            <input type="text" value={form.citationText} onChange={(e) => setForm({ ...form, citationText: e.target.value })} className="input-anv" /></div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.peerReviewed} onChange={(e) => setForm({ ...form, peerReviewed: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="font-ui text-sm" style={{ color: "var(--muted)" }}>Peer-reviewed</span>
          </label>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving..." : "Save Paper"}</button>
            <Link href="/admin/papers" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
