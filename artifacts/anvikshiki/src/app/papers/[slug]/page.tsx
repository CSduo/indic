import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { ArticleActionBar } from "@/components/manuscript/ArticleActionBar";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { ReadingProgress } from "@/components/manuscript/ReadingProgress";
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
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        setPaper(data.paper || data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)] px-4">
        <EmptyState title="Paper not found" action={<Link href="/papers" className="btn-terracotta">Back to Papers</Link>} />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)]">
      <ReadingProgress />
      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/papers" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)]"><ArrowLeft size={13} /> Papers</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Research</span>
        </nav>

        <ParchmentCard className="p-6 md:p-8">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="badge badge-published">Paper</span>
            {paper.peerReviewed ? <span className="badge badge-approved">Peer Reviewed</span> : null}
            {paper.year ? <span className="badge badge-received">{paper.year}</span> : null}
            <GlyphTag domain={paper.categorySlug || paper.categoryId || paper.discipline || "papers"} />
          </div>
          <h1 className="font-display text-[clamp(2.2rem,5vw,4.7rem)] leading-none text-[var(--ink)]">{paper.title}</h1>
          {paper.authorName ? <p className="mt-4 font-ui text-sm uppercase tracking-[0.08em] text-[var(--muted)]">by {paper.authorName}</p> : null}
          <ArticleActionBar title={paper.title} downloadUrl={paper.pdfUrl || paper.fileUrl} className="mt-6" />
        </ParchmentCard>
      </section>

      <section className="container-anv pb-16">
        <article className="mx-auto max-w-[var(--max-reader)]">
          <OrnamentDivider className="mb-8" />
          {paper.abstract ? (
            <ParchmentCard className="mb-8 p-5">
              <p className="type-section-label mb-3">Abstract</p>
              <p className="font-body text-lg leading-8 text-[var(--ink-soft)]">{paper.abstract}</p>
            </ParchmentCard>
          ) : null}
          {paper.body ? <div className="prose-anv whitespace-pre-wrap">{paper.body}</div> : null}
          {paper.pdfUrl ? (
            <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-terracotta mt-8">
              <Download size={14} /> Download PDF
            </a>
          ) : null}
          {paper.citationText ? (
            <ParchmentCard className="mt-8 p-5">
              <p className="type-section-label mb-3">Citation</p>
              <p className="font-body text-sm leading-6 text-[var(--ink-soft)]">{paper.citationText}</p>
            </ParchmentCard>
          ) : null}
        </article>
      </section>
    </div>
  );
}
