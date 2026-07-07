import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function EditArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();
  const { user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [article, setArticle] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`${base()}/api/articles/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const a = data.article;
        setArticle(a);
        setTitle(a.title || "");
        setExcerpt(a.excerpt || "");
        setBody(a.body || "");
        setLoading(false);
      })
      .catch(() => {
        toast.error("Could not load article");
        setLoading(false);
      });
  }, [slug]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title cannot be empty"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${base()}/api/articles/${slug}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, excerpt, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Article updated successfully!");
      navigate(`/articles/${slug}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <p className="font-ui text-sm text-[var(--muted)]">You must be signed in to edit posts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <div className="h-9 w-9 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)] px-4 text-center">
        <div>
          <p className="font-display text-2xl text-[var(--ink)] mb-3">Article not found</p>
          <Link href="/account" className="btn-terracotta">Back to Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] min-h-screen pb-24">
      <div className="container-anv py-10 max-w-3xl mx-auto">

        {/* Back */}
        <div className="mb-6">
          <Link href="/account" className="btn-ink inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={15} /> Back to Account
          </Link>
        </div>

        <div className="mb-6">
          <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-[var(--gold-soft)] opacity-70 mb-1">Editing Post</p>
          <h1 className="font-display text-3xl text-[var(--ink)]">Edit Article</h1>
        </div>

        <OrnamentDivider className="mb-8" />

        <ParchmentCard className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="form-label mb-1" htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              type="text"
              className="input-sacred w-full text-sm"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={500}
              placeholder="Article title…"
            />
          </div>

          {/* Abstract / Excerpt */}
          <div>
            <label className="form-label mb-1" htmlFor="edit-excerpt">
              Abstract <span className="font-ui text-[10px] text-[var(--muted)] font-normal">(short summary shown below the title)</span>
            </label>
            <textarea
              id="edit-excerpt"
              className="textarea-sacred w-full text-sm"
              style={{ minHeight: "120px" }}
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              maxLength={1000}
              placeholder="Brief abstract or summary…"
            />
          </div>

          {/* Body */}
          <div>
            <label className="form-label mb-1" htmlFor="edit-body">
              Article Body <span className="font-ui text-[10px] text-[var(--muted)] font-normal">(HTML is supported)</span>
            </label>
            <textarea
              id="edit-body"
              className="textarea-sacred w-full text-sm font-mono leading-relaxed"
              style={{ minHeight: "380px" }}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Your article content…"
            />
          </div>


          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <Link href={`/articles/${slug}`} className="btn-ink text-sm" target="_blank" rel="noopener">
              View Live Article ↗
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-terracotta inline-flex items-center gap-2"
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </ParchmentCard>

        <p className="mt-4 font-ui text-[10px] text-[var(--muted)] text-center">
          Note: Major structural changes (images, PDF, cover) should be requested via the admin panel.
        </p>
      </div>
    </div>
  );
}
