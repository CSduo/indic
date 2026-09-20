import React, { useState } from "react";
import { Check, Copy, Share2, Quote, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface PublicationCitationProps {
  title: string;
  authorName?: string | null;
  publishedAt?: Date | string | null;
  slug: string;
  kind?: "article" | "paper";
  doi?: string | null;
  journalTitle?: string;
}

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication: PublicationCitationProps;
}

type CitationStyle = "APA" | "MLA" | "Chicago" | "Harvard" | "BibTeX";

export function CitationModal({ isOpen, onClose, publication }: CitationModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>("APA");
  const [copied, setCopied] = useState(false);

  const author = (publication.authorName || "Ānvīkṣikī Editorial Collective").trim();
  const dateObj = publication.publishedAt ? new Date(publication.publishedAt) : new Date();
  const year = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const formattedDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${year}`;

  const pathPrefix = publication.kind === "paper" ? "papers" : "articles";
  const canonicalUrl = `https://anvikshikijournal.in/${pathPrefix}/${publication.slug}`;
  const journalName = publication.journalTitle || "Ānvīkṣikī: An Open Journal of Indic Philosophy & Intellectual Traditions";

  const citations: Record<CitationStyle, string> = {
    APA: `${author} (${year}). ${publication.title}. ${journalName}. ${canonicalUrl}`,
    MLA: `${author}. "${publication.title}." ${journalName}, ${formattedDate}, ${canonicalUrl}.`,
    Chicago: `${author}. ${year}. "${publication.title}." ${journalName}. ${canonicalUrl}.`,
    Harvard: `${author} (${year}) '${publication.title}', ${journalName}. Available at: ${canonicalUrl} (Accessed: ${formattedDate}).`,
    BibTeX: `@article{${author.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${year},
  title={${publication.title}},
  author={${author}},
  journal={${journalName}},
  year={${year}},
  url={${canonicalUrl}}${publication.doi ? `,\n  doi={${publication.doi}}` : ""}
}`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citations[selectedStyle]);
      setCopied(true);
      toast.success(`${selectedStyle} citation copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy citation");
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: publication.title,
          text: `${publication.title} by ${author}`,
          url: canonicalUrl,
        });
      } catch (e: any) {
        if (e.name !== "AbortError") toast.error("Could not complete share");
      }
    } else {
      await navigator.clipboard.writeText(canonicalUrl);
      toast.success("Canonical publication link copied!");
    }
  };

  const shareUrls = {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${publication.title} by ${author}`)}&url=${encodeURIComponent(canonicalUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${publication.title} — ${canonicalUrl}`)}`,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[var(--parchment)] border-[var(--ssr-border,#d7c9b8)] text-[var(--ink)] shadow-2xl p-6">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--gold,#b38235)]">
            <Quote size={14} /> Scholarly Citation &amp; Attribution
          </div>
          <DialogTitle className="font-heading text-xl text-[var(--ink)]">
            Cite this Publication
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--ink-soft,#666)]">
            Export accurate, standard academic citations formatted directly from publication metadata.
          </DialogDescription>
        </DialogHeader>

        {/* Style selection tabs */}
        <div className="flex flex-wrap gap-1.5 pt-3 pb-1 border-b border-[var(--ssr-border,#e5dacd)]">
          {(["APA", "MLA", "Chicago", "Harvard", "BibTeX"] as CitationStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => {
                setSelectedStyle(style);
                setCopied(false);
              }}
              className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                selectedStyle === style
                  ? "bg-[var(--ink,#221f1d)] text-[var(--parchment,#fdfbf7)] font-semibold"
                  : "bg-[var(--parchment-deep,#f2ece1)] text-[var(--ink,#221f1d)] hover:bg-[var(--ssr-border,#e5dacd)]"
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Citation text display */}
        <div className="relative mt-3 p-4 rounded bg-[var(--parchment-light,#fff)] border border-[var(--ssr-border,#e5dacd)] font-mono text-xs leading-relaxed text-[var(--ink)] overflow-x-auto select-all">
          <pre className="whitespace-pre-wrap font-sans text-sm">{citations[selectedStyle]}</pre>
        </div>

        {/* Copy action */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-[var(--ink-muted,#888)]">
            Canonical URL: <span className="font-mono">{canonicalUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-xs rounded font-semibold bg-[var(--gold,#b38235)] text-white hover:bg-[var(--gold-dark,#996924)] transition-colors shadow-sm"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : `Copy ${selectedStyle}`}
          </button>
        </div>

        {/* Social Distribution Kit */}
        <div className="mt-4 pt-4 border-t border-[var(--ssr-border,#e5dacd)]">
          <p className="text-xs font-semibold text-[var(--ink-soft,#666)] mb-2 uppercase tracking-wide">
            Share &amp; Distribute
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareNative}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-[var(--ssr-border,#d7c9b8)] bg-[var(--parchment-deep,#f2ece1)] hover:bg-[var(--ssr-border,#e5dacd)] transition-colors"
            >
              <Share2 size={13} /> Share Link
            </button>
            <a
              href={shareUrls.x}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-[var(--ssr-border,#d7c9b8)] bg-[var(--parchment-deep,#f2ece1)] hover:bg-[var(--ssr-border,#e5dacd)] transition-colors text-[var(--ink)] no-underline"
            >
              <ExternalLink size={12} /> X (Twitter)
            </a>
            <a
              href={shareUrls.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-[var(--ssr-border,#d7c9b8)] bg-[var(--parchment-deep,#f2ece1)] hover:bg-[var(--ssr-border,#e5dacd)] transition-colors text-[var(--ink)] no-underline"
            >
              <ExternalLink size={12} /> LinkedIn
            </a>
            <a
              href={shareUrls.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-[var(--ssr-border,#d7c9b8)] bg-[var(--parchment-deep,#f2ece1)] hover:bg-[var(--ssr-border,#e5dacd)] transition-colors text-[var(--ink)] no-underline"
            >
              <ExternalLink size={12} /> WhatsApp
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
