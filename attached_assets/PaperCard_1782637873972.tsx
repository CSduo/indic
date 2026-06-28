import React, { useState } from "react";
import { Bookmark, BookmarkCheck, FileText, Download, ShieldCheck } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { DOMAINS } from "@/lib/constants";
import type { Paper } from "@/lib/api";

interface PaperCardProps {
  paper: Paper;
  onSave?: (id: string) => void;
  saved?: boolean;
  featured?: boolean;
  layout?: "grid" | "list";
  className?: string;
}

export function PaperCard({
  paper,
  onSave,
  saved = false,
  featured = false,
  layout = "grid",
  className,
}: PaperCardProps) {
  const [isSaved, setIsSaved] = useState(saved);
  const domain = DOMAINS.find((d) => d.slug === paper.domain);
  const authorsLine = paper.authors.length > 2
    ? `${paper.authors[0]} et al.`
    : paper.authors.join(", ");

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved((prev) => !prev);
    onSave?.(paper.id);
  }

  const reviewBadge = paper.peerReviewed ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-teal)]/12 text-[var(--color-teal)]">
      <ShieldCheck size={10} /> Peer reviewed
    </span>
  ) : paper.workingPaper ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-rust)]/12 text-[var(--color-rust)]">
      Working paper
    </span>
  ) : null;

  if (layout === "list") {
    return (
      <a
        href={`/papers/${paper.slug}`}
        className={cn(
          "group flex gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white",
          "hover:border-[var(--color-gold)]/50 hover:shadow-[var(--shadow-card)] transition-all duration-200",
          className
        )}
      >
        <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-parchment-dark)] text-[var(--color-teal)] mt-0.5">
          {domain ? <AnimalGlyph glyph={domain.glyph} size={20} /> : <FileText size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="eyebrow">{domain?.name ?? paper.domain}</p>
            {reviewBadge}
          </div>
          <h3 className="font-[var(--font-display)] font-semibold text-base text-[var(--color-ink)] group-hover:text-[var(--color-teal)] transition-colors line-clamp-2">
            {paper.title}
          </h3>
          <p className="text-sm text-[var(--color-muted)] mt-0.5 line-clamp-1">{authorsLine}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-muted)]">
            <span>{formatDate(paper.publishedAt)}</span>
            {typeof paper.downloads === "number" && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1"><Download size={11} /> {paper.downloads}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          className="shrink-0 p-1.5 rounded hover:bg-[var(--color-parchment-dark)] text-[var(--color-muted)] hover:text-[var(--color-gold)] transition-colors self-start"
          aria-label={isSaved ? "Remove bookmark" : "Save paper"}
        >
          {isSaved ? <BookmarkCheck size={16} className="text-[var(--color-gold)]" /> : <Bookmark size={16} />}
        </button>
      </a>
    );
  }

  return (
    <a
      href={`/papers/${paper.slug}`}
      className={cn("group card flex flex-col p-5 gap-3", className)}
    >
      {/* Domain + save */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {domain && (
            <AnimalGlyph glyph={domain.glyph} size={16} className="text-[var(--color-rust)]" />
          )}
          <span className="eyebrow">{domain?.name ?? paper.domain}</span>
        </div>
        <button
          onClick={handleSave}
          className="p-1 rounded hover:bg-[var(--color-parchment-dark)] text-[var(--color-muted)] hover:text-[var(--color-gold)] transition-colors"
          aria-label={isSaved ? "Remove bookmark" : "Save paper"}
        >
          {isSaved
            ? <BookmarkCheck size={15} className="text-[var(--color-gold)]" />
            : <Bookmark size={15} />
          }
        </button>
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-[var(--font-display)] font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-teal)] transition-colors leading-snug",
          featured ? "text-xl" : "text-base line-clamp-2"
        )}
      >
        {paper.title}
      </h3>

      {/* Authors */}
      <p className="text-sm text-[var(--color-muted)]">{authorsLine}</p>

      {/* Abstract */}
      {paper.abstract && (
        <p className={cn(
          "text-sm text-[var(--color-ink)]/70 leading-relaxed",
          featured ? "line-clamp-4" : "line-clamp-2"
        )}>
          {paper.abstract}
        </p>
      )}

      {reviewBadge && <div>{reviewBadge}</div>}

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mt-auto pt-2 border-t border-[var(--color-border)]">
        <span>{formatDate(paper.publishedAt)}</span>
        {typeof paper.downloads === "number" && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1"><Download size={11} /> {paper.downloads.toLocaleString()}</span>
          </>
        )}
      </div>
    </a>
  );
}
