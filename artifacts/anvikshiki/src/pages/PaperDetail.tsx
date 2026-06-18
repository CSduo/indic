import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Download, BookCheck, Quote, ExternalLink } from "lucide-react";
import { useGetPaper, useIncrementPaperDownload } from "@workspace/api-client-react";
import { CategoryBadge } from "../components/CategoryBadge";

export function PaperDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: paper, isLoading, error } = useGetPaper(slug!);
  const downloadMutation = useIncrementPaperDownload();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 rounded mb-4" style={{ background: "var(--surface-2)", width: "70%" }} />
        <div className="h-4 rounded mb-3" style={{ background: "var(--surface-2)" }} />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>Paper not found.</p>
        <Link href="/papers" className="text-sm mt-4 inline-block" style={{ color: "var(--gold)" }}>
          Back to papers
        </Link>
      </div>
    );
  }

  function handleDownload() {
    downloadMutation.mutate({ slug: slug! });
    if (paper?.pdfUrl) window.open(paper.pdfUrl, "_blank", "noopener");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto px-4 md:px-6 py-8"
    >
      <Link href="/papers">
        <span
          className="inline-flex items-center gap-1 text-xs font-medium mb-6 cursor-pointer"
          style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
        >
          <ArrowLeft size={13} /> Back to papers
        </span>
      </Link>

      {/* Category + badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {paper.categorySlug && (
          <CategoryBadge slug={paper.categorySlug} name={paper.categoryName} />
        )}
        {paper.peerReviewed && (
          <span
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{
              background: "var(--surface-2)",
              color: "var(--gold)",
              border: "1px solid var(--line-2)",
              fontFamily: "var(--font-ui)",
            }}
          >
            <BookCheck size={11} /> Peer-reviewed
          </span>
        )}
        {paper.publicationType && (
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{
              background: "var(--surface-2)",
              color: "var(--muted-text)",
              border: "1px solid var(--line)",
              fontFamily: "var(--font-ui)",
              textTransform: "capitalize",
            }}
          >
            {paper.publicationType.replace("-", " ")}
          </span>
        )}
      </div>

      {/* Title */}
      <h1
        className="text-2xl md:text-4xl font-bold leading-tight mb-4"
        style={{ fontFamily: "var(--font-display)", color: "var(--ink)", lineHeight: 1.2 }}
      >
        {paper.title}
      </h1>

      {/* Author + date */}
      <div
        className="flex items-center gap-3 pb-6 mb-6"
        style={{ borderBottom: "1px solid var(--line)", fontFamily: "var(--font-ui)" }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--line-2)" }}
        >
          {paper.authorName?.[0] ?? "A"}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{paper.authorName || "Staff"}</div>
          {paper.publishedAt && (
            <div className="text-xs" style={{ color: "var(--muted-text)" }}>
              {new Date(paper.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          )}
        </div>
        <div className="ml-auto">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "var(--gold)",
              color: "var(--bg)",
              fontFamily: "var(--font-ui)",
            }}
          >
            <Download size={14} />
            {paper.pdfUrl ? "Download PDF" : "View Paper"}
          </button>
        </div>
      </div>

      {/* Abstract */}
      <div
        className="rounded-lg p-6 mb-8"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", borderLeft: "4px solid var(--gold)" }}
      >
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
        >
          Abstract
        </h2>
        <div
          className="text-base leading-relaxed"
          style={{ fontFamily: "var(--font-body)", color: "var(--ink)", fontStyle: "italic" }}
          dangerouslySetInnerHTML={{ __html: paper.abstract }}
        />
      </div>

      {/* Citation */}
      {paper.citationText && (
        <div
          className="rounded-lg p-5 mb-6"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          <h3
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
          >
            <Quote size={12} /> Citation
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-body)", color: "var(--ink-2)", fontStyle: "italic" }}
          >
            {paper.citationText}
          </p>
        </div>
      )}

      {/* Tags */}
      {paper.tags && paper.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {paper.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "var(--surface-2)",
                color: "var(--muted-text)",
                border: "1px solid var(--line)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Downloads */}
      <div className="mt-8 text-xs text-center" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
        {paper.downloadCount} download{paper.downloadCount !== 1 ? "s" : ""}
      </div>
    </motion.div>
  );
}
