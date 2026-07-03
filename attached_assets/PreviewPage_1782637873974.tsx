import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Eye, ArrowLeft, Edit3, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useRequireAuth } from "@/lib/auth-context";
import { draftApi } from "@/lib/api";
import { formatDateLong } from "@/lib/utils";

export function PreviewPage() {
  useRequireAuth();
  const { id } = useParams<{ id: string }>();

  const { data: draft, isLoading } = useQuery({
    queryKey: ["draft", id],
    queryFn: () => draftApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-parchment)] pt-[var(--header-height)]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Skeleton className="w-full h-10 mb-4" />
          <Skeleton className="w-2/3 h-6 mb-8" />
          <Skeleton className="w-full h-4 mb-2" />
          <Skeleton className="w-full h-4 mb-2" />
          <Skeleton className="w-3/4 h-4" />
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <AppShell>
        <div className="container py-20">
          <EmptyState
            glyph="📝"
            title="Draft not found"
            action={{ label: "Go to drafts", href: "/account/drafts" }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-parchment)]">
      {/* Preview banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-ink)] text-[var(--color-parchment)] flex items-center justify-between px-5 h-[var(--header-height)]">
        <div className="flex items-center gap-2.5">
          <Eye size={16} className="text-[var(--color-gold)]" />
          <span className="text-sm font-medium">Draft preview</span>
          <span className="text-xs text-[var(--color-parchment)]/50 ml-1">
            Not public · Only you can see this
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/write/drafts/${id}`}
            className="flex items-center gap-1.5 text-sm text-[var(--color-parchment)]/70 hover:text-[var(--color-parchment)] transition-colors"
          >
            <Edit3 size={14} /> Edit
          </a>
          <a
            href={`/write/drafts/${id}/submit`}
            className="flex items-center gap-1.5 ml-3 px-4 py-1.5 bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-[var(--color-ink)] text-sm font-medium rounded-full transition-colors"
          >
            <Send size={14} /> Submit for review
          </a>
        </div>
      </div>

      {/* Article-style render */}
      <div className="pt-[var(--header-height)]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
          {/* Domain placeholder */}
          <p className="eyebrow mb-4">
            {draft.mode === "paper" ? "Research Paper" : "Essay"}
          </p>

          {/* Title */}
          <h1
            className="font-[var(--font-display)] font-bold leading-tight text-[var(--color-ink)] mb-4"
            style={{ fontSize: "clamp(1.75rem, 5vw, 2.75rem)" }}
          >
            {draft.title || <span className="opacity-30">Untitled draft</span>}
          </h1>

          {/* Subtitle */}
          {draft.subtitle && (
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-muted)] font-normal mb-6">
              {draft.subtitle}
            </h2>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 pb-6 mb-8 border-b border-[var(--color-border)] text-sm text-[var(--color-muted)]">
            <span>Draft</span>
            <span>·</span>
            <span>{draft.wordCount ? `${draft.wordCount.toLocaleString()} words` : "—"}</span>
            {draft.lastSavedAt && (
              <>
                <span>·</span>
                <span>Last saved {formatDateLong(draft.lastSavedAt)}</span>
              </>
            )}
          </div>

          {/* Body */}
          {draft.contentHtml ? (
            <article
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: draft.contentHtml }}
            />
          ) : draft.plainText ? (
            <article className="prose max-w-none">
              {draft.plainText.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </article>
          ) : (
            <div className="py-16 text-center">
              <p className="text-[var(--color-muted)] italic">
                No content yet. Return to the editor to write.
              </p>
            </div>
          )}

          {/* Bottom nav */}
          <div className="mt-16 flex items-center justify-between border-t border-[var(--color-border)] pt-6">
            <a
              href={`/write/drafts/${id}`}
              className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              <ArrowLeft size={14} /> Back to editor
            </a>
            <a
              href={`/write/drafts/${id}/submit`}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-[var(--color-ink)] text-sm font-medium rounded-[var(--radius-md)] transition-colors"
            >
              <Send size={14} /> Submit for review
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
