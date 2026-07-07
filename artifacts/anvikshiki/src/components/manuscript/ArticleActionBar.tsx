import { useState, useEffect } from "react";
import { Bookmark, Download, Quote, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

type ArticleActionBarProps = {
  articleId?: string;
  title: string;
  downloadUrl?: string | null;
  className?: string;
  vertical?: boolean;
};

export function ArticleActionBar({ articleId, title, downloadUrl, className, vertical = false }: ArticleActionBarProps) {
  const { user } = useAuthContext();
  const [isSaved, setIsSaved] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);

  // Fetch saved status on mount
  useEffect(() => {
    if (!user || !articleId) return;
    fetch(`${base()}/api/saved-items`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        const found = data.savedItems?.find((item: any) => item.itemId === articleId);
        if (found) {
          setIsSaved(true);
          setSavedItemId(found.id);
        }
      })
      .catch(() => {});
  }, [user, articleId]);

  const save = async () => {
    if (!user) {
      toast.error("Please sign in to save articles");
      return;
    }
    if (!articleId) return;

    setLoadingSave(true);
    try {
      if (isSaved && savedItemId) {
        // Unsave
        const res = await fetch(`${base()}/api/saved-items/${savedItemId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          setIsSaved(false);
          setSavedItemId(null);
          toast.success("Article removed from saved items");
        } else {
          toast.error("Failed to unsave article");
        }
      } else {
        // Save
        const res = await fetch(`${base()}/api/saved-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType: "ARTICLE", itemId: articleId }),
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          setIsSaved(true);
          setSavedItemId(data.savedItem?.id || null);
          toast.success("Article saved to your bookmarks");
        } else if (res.status === 409) {
          setIsSaved(true);
          toast.info("Article already saved");
        } else {
          throw new Error(data.error || "Failed to save article");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update saved status");
    } finally {
      setLoadingSave(false);
    }
  };

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

  const buttonClass = "btn-ink min-h-0 px-3 py-2 text-[0.65rem]";

  return (
    <div className={className}>
      <div className={vertical ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
        <button
          type="button"
          className={buttonClass}
          onClick={save}
          disabled={loadingSave}
          aria-label={isSaved ? "Remove from saved" : "Save article"}
        >
          <Bookmark size={14} fill={isSaved ? "var(--gold)" : "none"} className={isSaved ? "text-[var(--gold)]" : ""} />
          {isSaved ? "Saved" : "Save"}
        </button>
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
