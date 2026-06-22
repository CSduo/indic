import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Calendar, Download, Bookmark, Share2 } from "lucide-react";

export default function PaperPage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/papers/${params.slug}`)
      .then(r => { if (!r.ok) navigate("/papers"); return r.json(); })
      .then(data => { setPaper(data.paper); setLoading(false); })
      .catch(() => navigate("/papers"));
  }, [params.slug]);

  if (loading) return <div className="container-anv pt-16 text-center"><p className="font-body italic" style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!paper) return null;

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv pt-4">
        <Link href="/papers" className="inline-flex items-center gap-2 font-ui text-sm" style={{ color: "var(--muted)" }}><ArrowLeft size={16} /> Back to Papers</Link>
      </div>
      <article className="container-anv pt-6 pb-12">
        <div className="max-w-[var(--max-reader)] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            {paper.peerReviewed && <span className="status-badge status-published">Peer-Reviewed</span>}
            <span className="font-ui text-xs uppercase tracking-wider" style={{ color: "var(--gold)" }}>{paper.paperType?.replace(/_/g, " ")}</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl leading-[0.95]" style={{ color: "var(--ink)" }}>{paper.title}</h1>
          {paper.authorName && <p className="font-ui text-sm mt-4" style={{ color: "var(--muted)" }}>{paper.authorName}{paper.year && ` · ${paper.year}`}{paper.doi && ` · DOI: ${paper.doi}`}</p>}
          <div className="flex items-center gap-3 py-6">
            {paper.pdfUrl && <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-primary"><Download size={16} /> Download PDF</a>}
            <button className="btn-secondary"><Bookmark size={14} /> Save</button>
            <button className="btn-secondary"><Share2 size={14} /> Cite</button>
          </div>
          {paper.abstract && <div className="p-6 rounded-2xl mt-4" style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}><h3 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--gold)" }}>Abstract</h3><p className="font-body" style={{ color: "var(--ink)" }}>{paper.abstract}</p></div>}
          {paper.citationText && <div className="mt-6 p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}><h3 className="font-ui text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: "var(--gold)" }}>Citation</h3><p className="font-body text-sm italic" style={{ color: "var(--muted)" }}>{paper.citationText}</p></div>}
          {paper.body && <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: paper.body.replace(/\n/g, "<br/>") }} />}
        </div>
      </article>
    </div>
  );
}
