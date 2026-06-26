import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PaperDetailPage() {
  const [, params] = useRoute("/papers/:slug");
  const slug = params?.slug || "";
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${base()}/api/papers/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setPaper(d.paper || d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div style={{ background: "var(--bg)", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
    </div>
  );
  if (error || !paper) return (
    <div style={{ background: "var(--bg)", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EmptyState title="Paper not found" action={<Link href="/papers" className="btn-sacred btn-gold">Back to Papers</Link>} />
    </div>
  );

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="container-anv py-12 max-w-3xl mx-auto">
        <Link href="/papers" className="flex items-center gap-1.5 mb-8 font-ui text-xs hover:opacity-70" style={{ color: "var(--ink-faint)" }}>
          <ArrowLeft size={12} /> Back to Papers
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <span className="badge badge-published">Paper</span>
          {paper.peerReviewed && <span className="badge badge-approved">Peer Reviewed</span>}
          {paper.year && <span className="font-ui text-xs" style={{ color: "var(--muted)" }}>{paper.year}</span>}
        </div>
        <h1 className="font-display mb-4 leading-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", color: "var(--gold-bright)" }}>{paper.title}</h1>
        {paper.authorName && <p className="font-ui text-sm mb-6" style={{ color: "var(--muted)" }}>by {paper.authorName}</p>}
        <LotusDivider className="mb-6" />
        {paper.abstract && (
          <div className="mb-6">
            <div className="section-label mb-2">Abstract</div>
            <p className="font-body text-base leading-relaxed" style={{ color: "var(--ink-soft)" }}>{paper.abstract}</p>
          </div>
        )}
        {paper.body && <div className="font-body text-base leading-loose whitespace-pre-wrap mb-6" style={{ color: "var(--ink-soft)" }}>{paper.body}</div>}
        {paper.pdfUrl && (
          <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-sacred btn-gold inline-flex items-center gap-2">
            <Download size={14} /> Download PDF
          </a>
        )}
        {paper.citationText && (
          <div className="mt-8 p-4 rounded-lg" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="section-label mb-2">Citation</div>
            <p className="font-body text-xs" style={{ color: "var(--ink-faint)" }}>{paper.citationText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
