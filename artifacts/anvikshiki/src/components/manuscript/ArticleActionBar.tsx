import { Bookmark, Download, Quote, Share2 } from "lucide-react";
import { toast } from "sonner";

type ArticleActionBarProps = {
  title: string;
  downloadUrl?: string | null;
  className?: string;
  vertical?: boolean;
};

export function ArticleActionBar({ title, downloadUrl, className, vertical = false }: ArticleActionBarProps) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      toast.error("Could not share this page");
    }
  };

  const cite = async () => {
    const citation = `${title}. Anvikshiki Journal & Research Platform. ${window.location.href}`;
    try {
      await navigator.clipboard.writeText(citation);
      toast.success("Citation copied");
    } catch {
      toast.error("Could not copy citation");
    }
  };

  const save = () => toast.info("Saving will connect to saved items when the account API is available.");

  const buttonClass = "btn-ink min-h-0 px-3 py-2 text-[0.65rem]";

  return (
    <div className={className}>
      <div className={vertical ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
        <button type="button" className={buttonClass} onClick={save} aria-label="Save article"><Bookmark size={14} /> Save</button>
        <button type="button" className={buttonClass} onClick={share} aria-label="Share article"><Share2 size={14} /> Share</button>
        <button type="button" className={buttonClass} onClick={cite} aria-label="Copy citation"><Quote size={14} /> Cite</button>
        {downloadUrl ? (
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className={buttonClass} aria-label="Download article">
            <Download size={14} /> PDF
          </a>
        ) : (
          <button type="button" className={buttonClass} onClick={() => window.print()} aria-label="Print article"><Download size={14} /> Print</button>
        )}
      </div>
    </div>
  );
}
