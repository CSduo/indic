import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { LotusIcon } from "@/components/sacred/LotusIcon";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CollectionsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetch(`${base()}/api/collections`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/login"); return null; } return r.json(); })
      .then(d => d && (setCollections(d.collections || d || []), setLoading(false)))
      .catch(() => setLoading(false));
  }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const r = await fetch(`${base()}/api/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const d = await r.json();
      setCollections(prev => [d, ...prev]);
      setNewTitle("");
      setCreating(false);
      toast.success("Collection created");
    } catch {
      toast.error("Failed to create collection");
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      <div className="container-anv py-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Link href="/account" className="btn-ink p-2"><ArrowLeft size={16} /></Link>
            <div>
              <p className="type-section-label">Account</p>
              <h1 className="font-display text-3xl text-[var(--ink)]">Collections</h1>
            </div>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="btn-terracotta">
            <Plus size={14} /> New Collection
          </button>
        </div>

        <OrnamentDivider className="mb-8" />

        {creating && (
          <ParchmentCard className="p-5 mb-6">
            <form onSubmit={create} className="flex gap-3">
              <input
                autoFocus
                className="input-sacred flex-1"
                placeholder="Collection name…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <button type="submit" className="btn-terracotta">Create</button>
              <button type="button" onClick={() => setCreating(false)} className="btn-ink">Cancel</button>
            </form>
          </ParchmentCard>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div style={{ width: 36, height: 36, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            description="Organise your saved essays and papers into named collections."
            action={<button type="button" onClick={() => setCreating(true)} className="btn-sacred btn-gold">Create a Collection</button>}
          />
        ) : (
          <div className="space-y-3">
            {collections.map((col: any) => (
              <ParchmentCard key={col.id} className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] grid place-items-center text-[var(--gold)] shrink-0">
                  <FolderOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-xl text-[var(--ink)] leading-tight">{col.title}</h2>
                  <p className="font-ui text-xs text-[var(--muted)] mt-0.5">
                    {col.itemCount ?? 0} {col.itemCount === 1 ? "item" : "items"}
                    {col.createdAt ? ` · Created ${new Date(col.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}
                  </p>
                </div>
                <LotusIcon size={20} style={{ color: "var(--gold)", opacity: 0.4 }} />
              </ParchmentCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
