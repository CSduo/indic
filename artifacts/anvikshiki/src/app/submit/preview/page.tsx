import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Clock, Eye } from "lucide-react";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PreviewPage() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { navigate("/submit/write"); return; }
    fetch(`${base()}/api/submissions/${id}`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/login"); return null; } return r.json(); })
      .then(d => { if (d) setDraft(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div style={{ width: 36, height: 36, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)]">
      {/* Preview toolbar */}
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="container-anv flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/submit/write" className="btn-ink p-2 text-xs"><ArrowLeft size={15} /></Link>
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-[var(--gold)]" />
              <span className="font-ui text-sm font-medium text-[var(--ink)]">Submission Preview</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-draft text-[0.65rem]">Preview Mode</span>
            <Link href="/submit/details" className="btn-terracotta text-xs">
              Continue to Details <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Article preview */}
      <article className="container-anv py-12 max-w-3xl mx-auto">
        {draft ? (
          <>
            <header className="mb-10">
              <p className="type-section-label mb-3">{draft.type || "Essay"}</p>
              <h1 className="font-display text-4xl md:text-5xl text-[var(--ink)] leading-[1.1] mb-4">
                {draft.title || "Untitled Submission"}
              </h1>
              {draft.abstract && (
                <p className="font-body text-base leading-7 text-[var(--ink-soft)] border-l-2 border-[var(--border-gold)] pl-4 italic mb-6">
                  {draft.abstract}
                </p>
              )}
              <div className="flex items-center gap-4 font-ui text-xs text-[var(--muted)]">
                {draft.submitterName && <span>{draft.submitterName}</span>}
                {draft.createdAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(draft.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
            </header>

            <OrnamentDivider className="mb-10" />

            {draft.body ? (
              <div
                className="prose-anv font-body text-base leading-[1.9] text-[var(--ink-soft)]"
                dangerouslySetInnerHTML={{ __html: draft.body.replace(/\n/g, "<br />") }}
              />
            ) : (
              <ParchmentCard className="p-8 text-center">
                <p className="font-body text-base text-[var(--muted)]">
                  No body text to preview. Return to the editor to add content.
                </p>
                <Link href="/submit/write" className="btn-ink mt-4">← Back to Editor</Link>
              </ParchmentCard>
            )}
          </>
        ) : (
          <ParchmentCard className="p-10 text-center">
            <h2 className="font-display text-3xl text-[var(--ink)] mb-3">No Draft Found</h2>
            <p className="font-body text-sm text-[var(--ink-soft)] mb-6">
              Start writing to preview your submission here.
            </p>
            <Link href="/submit/write" className="btn-terracotta">Go to Editor</Link>
          </ParchmentCard>
        )}
      </article>
    </div>
  );
}
