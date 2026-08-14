import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusDivider } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminNewPaperPage() {
  const [, navigate] = useLocation();
  const [saving, setSaving] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", slug: "", authorName: "", authorEmail: "", abstract: "", body: "",
    categorySlug: "", year: new Date().getFullYear().toString(),
    keywords: "", peerReviewed: false, status: "DRAFT",
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  const selectPdf = (file: File) => {
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF files must be 50 MB or smaller");
      return;
    }
    setPdfFile(file);
  };

  const uploadPdfIfNeeded = async (): Promise<string | undefined> => {
    if (!pdfFile) return undefined;

    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("context", "paper_pdf");
    const response = await fetch(`${base()}/api/media/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to upload PDF");
    if (typeof data.url !== "string" || !data.url) {
      throw new Error("PDF storage did not return a URL");
    }
    return data.url;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.categorySlug.trim()) { toast.error("Discipline slug is required"); return; }
    setSaving(true);
    try {
      const pdfUrl = await uploadPdfIfNeeded();
      const r = await fetch(`${base()}/api/admin/papers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pdfUrl, year: parseInt(form.year) || new Date().getFullYear() }),
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
              <label className="form-label" htmlFor="paper-discipline">Discipline Slug *</label>
              <input id="paper-discipline" className="input-sacred" placeholder="philosophy, history, etc." value={form.categorySlug} onChange={e => set("categorySlug", e.target.value)} required />
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
            <label className="form-label" htmlFor="paper-pdf">Paper PDF</label>
            <input
              ref={pdfInputRef}
              id="paper-pdf"
              type="file"
              accept="application/pdf,.pdf"
              className="input-sacred"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) selectPdf(file);
                event.target.value = "";
              }}
            />
            <p className="mt-1 font-ui text-[10px] text-[var(--ink-faint)]">PDF only · Maximum 50 MB</p>
            {pdfFile ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded border border-[var(--border)] px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 font-ui text-xs text-[var(--ink-soft)]"><FileText size={14} /> <span className="truncate">{pdfFile.name}</span></span>
                <button
                  type="button"
                  onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ""; }}
                  className="btn-sacred btn-ghost px-2 py-1 text-[10px]"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <label className="form-label" htmlFor="paper-keywords">Keywords (comma separated)</label>
            <input id="paper-keywords" className="input-sacred" value={form.keywords} onChange={e => set("keywords", e.target.value)} placeholder="phenomenology, consciousness, Husserl" />
          </div>
          <LotusDivider className="my-4" />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-sacred btn-gold inline-flex items-center gap-2">
              <Save size={14} /> {saving ? (pdfFile ? "Uploading PDF…" : "Saving…") : "Create Paper"}
            </button>
            <Link href="/admin/papers" className="btn-sacred btn-ghost">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
