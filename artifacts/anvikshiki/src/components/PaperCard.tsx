import { Link } from "wouter";
import { Download, BookCheck } from "lucide-react";
import type { Paper } from "@workspace/api-client-react";

interface PaperCardProps {
  paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
  return (
    <Link href={`/papers/${paper.slug}`}>
      <article
        className="rounded-lg p-5 cursor-pointer group transition-all duration-200 flex flex-col gap-3 h-full"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
          >
            {paper.categoryName || paper.publicationType || "Paper"}
          </div>
          {paper.peerReviewed && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: "var(--surface-2)",
                color: "var(--gold)",
                border: "1px solid var(--line-2)",
                fontFamily: "var(--font-ui)",
              }}
            >
              <BookCheck size={10} />
              Peer-reviewed
            </span>
          )}
        </div>

        <h3
          className="text-base md:text-lg font-bold leading-snug group-hover:text-[var(--gold)] transition-colors"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          {paper.title}
        </h3>

        {paper.abstract && (
          <p
            className="text-sm leading-relaxed line-clamp-3 flex-1"
            style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}
            dangerouslySetInnerHTML={{ __html: paper.abstract }}
          />
        )}

        <div
          className="flex items-center justify-between text-xs pt-2 mt-auto"
          style={{ borderTop: "1px solid var(--line)", color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
        >
          <span>{paper.authorName}</span>
          <span className="flex items-center gap-1">
            <Download size={10} />
            {paper.downloadCount} downloads
          </span>
        </div>
      </article>
    </Link>
  );
}
