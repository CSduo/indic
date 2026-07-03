import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

type Notification = { id: string; type: string; message: string; read: boolean; createdAt: string; };

const TYPE_ICON: Record<string, string> = {
  SUBMISSION_STATUS: "📋",
  NEW_ARTICLE: "📜",
  COMMUNITY: "🫂",
  SYSTEM: "⚙️",
};

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetch(`${base()}/api/notifications`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/login"); return null; } return r.json(); })
      .then(d => d && (setNotes(d.notifications || d || []), setLoading(false)))
      .catch(() => { setLoading(false); setNotes([]); });
  }, [user]);

  const markAllRead = async () => {
    try {
      await fetch(`${base()}/api/notifications/read-all`, { method: "POST", credentials: "include" });
      setNotes(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not mark as read");
    }
  };

  const unread = notes.filter(n => !n.read).length;

  return (
    <div className="bg-[var(--bg)]">
      <div className="container-anv py-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Link href="/account" className="btn-ink p-2"><ArrowLeft size={16} /></Link>
            <div>
              <p className="type-section-label">Account</p>
              <h1 className="font-display text-3xl text-[var(--ink)]">
                Notifications {unread > 0 && <span className="text-[var(--terracotta)]">({unread})</span>}
              </h1>
            </div>
          </div>
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className="btn-ink text-xs">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        <OrnamentDivider className="mb-8" />

        {loading ? (
          <div className="flex justify-center py-12">
            <div style={{ width: 36, height: 36, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You'll be notified here about submission updates, new publications, and community activity."
            action={<Link href="/submit" className="btn-sacred btn-gold">Submit Work</Link>}
          />
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <ParchmentCard key={n.id} className={`p-4 flex gap-4 ${!n.read ? "border-[var(--border-gold)]" : ""}`}>
                <div className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] || <Bell size={18} />}</div>
                <div className="flex-1 min-w-0">
                  <p className={`font-body text-sm leading-6 ${!n.read ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
                    {n.message}
                  </p>
                  <p className="font-ui text-[10px] text-[var(--muted)] mt-1">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
                {!n.read && (
                  <div className="h-2 w-2 rounded-full bg-[var(--terracotta)] mt-2 shrink-0" />
                )}
              </ParchmentCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
