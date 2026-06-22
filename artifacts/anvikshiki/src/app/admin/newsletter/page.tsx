import { useLocation } from 'wouter';
import { useEffect, useState } from "react";
import { Mail, Users, Download } from "lucide-react";
import { toast } from "sonner";

export default function AdminNewsletterPage() {
  const [, navigate] = useLocation();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/submissions`, { credentials: "include" })
      .then((r) => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then(() => {
        // Fetch subscribers - use a simple endpoint
        return fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/newsletter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "check" }) });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8">
        <h1 className="font-display text-2xl mb-6" style={{ color: "var(--ink)" }}>Newsletter</h1>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="card-anv p-5 text-center">
            <Users size={24} className="mx-auto mb-2" style={{ color: "var(--gold)" }} />
            <p className="font-display text-3xl" style={{ color: "var(--ink)" }}>{subscribers.length}</p>
            <p className="font-ui text-xs" style={{ color: "var(--muted)" }}>Subscribers</p>
          </div>
        </div>

        <div className="card-anv p-6">
          <h2 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--gold)" }}>
            Subscriber List
          </h2>
          <p className="font-body text-sm" style={{ color: "var(--muted)" }}>
            Newsletter subscriber management will be available once the first subscribers join.
          </p>
          <div className="mt-4">
            <button
              onClick={() => toast.info("Export feature coming soon")}
              className="btn-secondary"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
