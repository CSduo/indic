import { motion } from "framer-motion";
import { Mail, Download } from "lucide-react";
import { useListNewsletterSubscribers } from "@workspace/api-client-react";

export function AdminNewsletter() {
  const { data: subscribers = [], isLoading } = useListNewsletterSubscribers();

  const active = subscribers.filter((s) => s.active);

  function exportCSV() {
    const csv = ["Email,Subscribed,Active", ...subscribers.map((s) => `${s.email},${s.createdAt},${s.active}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Newsletter</h1>
          <p className="text-sm" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
            {active.length} active subscriber{active.length !== 1 ? "s" : ""}
          </p>
        </div>
        {subscribers.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--surface)", color: "var(--ink)", fontFamily: "var(--font-ui)", border: "1px solid var(--line)" }}
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Mail size={16} style={{ color: "var(--gold)" }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>Total</span>
          </div>
          <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{subscribers.length}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Mail size={16} style={{ color: "var(--rose)" }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>Active</span>
          </div>
          <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{active.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--surface-2)", height: 44 }} />)}</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>No subscribers yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          {subscribers.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 px-4 py-3"
              style={{ background: "var(--surface)", borderBottom: i < subscribers.length - 1 ? "1px solid var(--line)" : "none" }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.active ? "var(--gold)" : "var(--muted-text)" }} />
              <span className="flex-1 text-sm" style={{ fontFamily: "var(--font-ui)", color: "var(--ink)" }}>{s.email}</span>
              <span className="text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                {new Date(s.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
