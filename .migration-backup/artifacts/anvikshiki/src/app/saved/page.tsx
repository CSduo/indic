import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bookmark, BookOpen, FileText, X } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SavedPage() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${base()}/api/saved-items`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/login"); return null; } return r.json(); })
      .then(d => d && (setItems(d.savedItems || []), setLoading(false)))
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await fetch(`${base()}/api/saved-items/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="container-anv py-12 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark size={22} style={{ color: "var(--gold)" }} />
          <h1 className="font-display text-3xl" style={{ color: "var(--gold-bright)" }}>Saved Items</h1>
        </div>
        <LotusDivider className="mb-8" />
        {loading ? (
          <div className="flex justify-center py-12">
            <div style={{ width: 36, height: 36, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No saved items"
            description="Bookmark essays and papers to revisit them here."
            action={<Link href="/browse" className="btn-sacred btn-gold">Browse Content</Link>}
          />
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="card-sacred p-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.itemType === "PAPER"
                    ? <FileText size={18} style={{ color: "var(--gold)", flexShrink: 0 }} />
                    : <BookOpen size={18} style={{ color: "var(--gold)", flexShrink: 0 }} />}
                  <div>
                    <Link
                      href={item.itemType === "PAPER"
                        ? `/papers/${item.item?.slug || item.itemId}`
                        : `/articles/${item.item?.slug || item.itemId}`}
                      className="font-ui text-sm font-semibold hover:opacity-80 transition-opacity"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {item.item?.title || item.itemId}
                    </Link>
                    <div className="font-ui text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      <span className="badge badge-draft" style={{ fontSize: "0.6rem" }}>{item.itemType}</span>
                      {" "}{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : ""}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => remove(item.id)} className="shrink-0 p-1.5 rounded-md hover:bg-rose transition-colors" style={{ color: "var(--muted)" }} title="Remove" aria-label="Remove saved item">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
