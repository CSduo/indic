import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Download, Bookmark, BookmarkCheck, Share2, ShieldCheck, FileText, Copy, Link2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { contentApi } from "@/lib/api";
import { DOMAINS } from "@/lib/constants";
import { formatDateLong, getDomainAccent } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import { ASSET_BASE } from "@/env";

export function PaperDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [saved, setSaved] = useState(false);

  const { data: paper, isLoading, isError } = useQuery({
    queryKey: ["paper", slug],
    queryFn: () => contentApi.paper(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="container py-10 max-w-4xl">
          <Skeleton className="w-32 h-4 mb-8" />
          <Skeleton className="w-3/4 h-10 mb-4" />
          <Skeleton className="w-1/2 h-5 mb-3" />
          <Skeleton className="w-full h-32 mb-6" />
        </div>
      </AppShell>
    );
  }

  if (isError || !paper) {
    return (
      <AppShell>
        <div className="container py-20">
          <EmptyState
            glyph="🗂"
            title="Paper not found"
            description="This paper may have been moved or is not publicly available."
            action={{ label: "Browse papers", href: "/papers" }}
          />
        </div>
      </AppShell>
    );
  }

  const domain = DOMAINS.find((d) => d.slug === paper.domain);
  const accent = getDomainAccent(paper.domain);
  const authorsLine = paper.authors.join(", ");

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast("Link copied.", "success");
  }

  function copyCitation() {
    const year = new Date(paper.publishedAt).getFullYear();
    const citation = `${authorsLine} (${year}). ${paper.title}. Ānvīkṣikī Journal. ${window.location.href}`;
    navigator.clipboard.writeText(citation);
    toast("Citation copied.", "success");
  }

  return (
    <AppShell>
      <div className="container py-10 max-w-4xl">
        <Breadcrumb
          backHref="/papers"
          backLabel="Papers"
          crumbs={[{ label: "Papers", href: "/papers" }, { label: paper.title }]}
          className="mb-8"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Domain */}
            <div className="flex items-center gap-2 mb-4">
              {domain && (
                <div className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: `${accent}18`, color: accent }}>
                  <AnimalGlyph glyph={domain.glyph} size={16} />
                </div>
              )}
              <span className="eyebrow">{domain?.name ?? paper.domain}</span>
              {paper.peerReviewed && (
                <Badge variant="teal"><ShieldCheck size={10} className="inline mr-1" />Peer reviewed</Badge>
              )}
              {paper.workingPaper && (
                <Badge variant="rust">Working paper</Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="font-[var(--font-display)] text-3xl md:text-4xl font-bold text-[var(--color-ink)] leading-tight mb-4">
              {paper.title}
            </h1>

            {/* Authors + date */}
            <p className="text-[var(--color-muted)] mb-1">{authorsLine}</p>
            <p className="text-sm text-[var(--color-muted)]">{formatDateLong(paper.publishedAt)}</p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-5 mb-8 flex-wrap">
              {paper.fileUrl && (
                <a
                  href={`${ASSET_BASE}${paper.fileUrl}`}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-[var(--color-ink)] font-medium text-sm rounded-[var(--radius-md)] transition-colors"
                >
                  <Download size={15} /> Download PDF
                </a>
              )}
              <button
                onClick={() => setSaved((p) => !p)}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--color-border)] bg-white hover:bg-[var(--color-parchment-dark)] text-sm rounded-[var(--radius-md)] transition-colors"
              >
                {saved ? <BookmarkCheck size={15} className="text-[var(--color-gold)]" /> : <Bookmark size={15} />}
                {saved ? "Saved" : "Save"}
              </button>
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--color-border)] bg-white hover:bg-[var(--color-parchment-dark)] text-sm rounded-[var(--radius-md)] transition-colors"
              >
                <Link2 size={15} /> Copy link
              </button>
            </div>

            {/* Abstract */}
            <div className="bg-[var(--color-parchment-dark)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 mb-8">
              <p className="eyebrow mb-3">Abstract</p>
              <p className="font-[var(--font-display)] text-[var(--color-ink)] leading-relaxed">
                {paper.abstract}
              </p>
            </div>

            {/* Tags */}
            {paper.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {paper.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 text-xs rounded-full bg-white border border-[var(--color-border)] text-[var(--color-muted)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Citation */}
            {paper.citation && (
              <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="eyebrow">Suggested citation</p>
                  <button onClick={copyCitation} className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <p className="text-sm text-[var(--color-ink)]/80 font-[var(--font-display)] leading-relaxed">
                  {paper.citation}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            {/* Metadata card */}
            <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
              <p className="eyebrow mb-4">Publication details</p>
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-[var(--color-muted)] text-xs mb-0.5">Authors</dt>
                  <dd className="text-[var(--color-ink)] font-medium">{authorsLine}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)] text-xs mb-0.5">Domain</dt>
                  <dd className="text-[var(--color-ink)]">{domain?.name ?? paper.domain}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)] text-xs mb-0.5">Published</dt>
                  <dd className="text-[var(--color-ink)]">{formatDateLong(paper.publishedAt)}</dd>
                </div>
                {typeof paper.downloads === "number" && (
                  <div>
                    <dt className="text-[var(--color-muted)] text-xs mb-0.5">Downloads</dt>
                    <dd className="text-[var(--color-ink)]">{paper.downloads.toLocaleString()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[var(--color-muted)] text-xs mb-0.5">Type</dt>
                  <dd>
                    {paper.peerReviewed ? (
                      <Badge variant="teal" size="xs"><ShieldCheck size={9} className="inline mr-1" />Peer reviewed</Badge>
                    ) : paper.workingPaper ? (
                      <Badge variant="rust" size="xs">Working paper</Badge>
                    ) : (
                      <Badge size="xs">Paper</Badge>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Share */}
            <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
              <p className="eyebrow mb-3">Share</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={copyLink} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-parchment-dark)] transition-colors">
                  <Link2 size={12} /> Copy link
                </button>
                <button onClick={copyCitation} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-parchment-dark)] transition-colors">
                  <Copy size={12} /> Cite
                </button>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="bg-[var(--color-teal)] rounded-[var(--radius-lg)] p-5 text-[var(--color-parchment)]">
              <p className="text-sm font-semibold mb-1.5">Contribute research</p>
              <p className="text-xs opacity-70 mb-3">Submit a paper or essay for editorial review.</p>
              <a href="/write" className="text-xs font-medium text-[var(--color-gold)] hover:text-[var(--color-gold-light)] transition-colors">
                Submit your work →
              </a>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
