import { motion } from "framer-motion";
import { FileText, BookOpen, Mail, Inbox } from "lucide-react";
import { useGetStats } from "@workspace/api-client-react";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

export function AdminDashboard() {
  const { data: stats } = useGetStats();

  const STATS = [
    { label: "Published Essays", value: stats?.totalArticles ?? 0, icon: FileText, color: "var(--gold)" },
    { label: "Published Papers", value: stats?.totalPapers ?? 0, icon: BookOpen, color: "var(--rose)" },
    { label: "Subscribers", value: stats?.totalSubscribers ?? 0, icon: Mail, color: "var(--blue, #1d5060)" },
    { label: "Submissions", value: stats?.totalSubmissions ?? 0, icon: Inbox, color: "var(--sage, #6e7650)" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Dashboard
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
          Editorial overview
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            variants={stagger.item}
            className="rounded-xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon size={18} style={{ color }} />
            </div>
            <div
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              {value.toLocaleString()}
            </div>
            <div className="text-xs uppercase tracking-widest" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
              {label}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Category breakdown */}
      {stats?.categoryCounts && stats.categoryCounts.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
            Essays by Domain
          </h2>
          <div className="space-y-3">
            {stats.categoryCounts
              .sort((a, b) => b.count - a.count)
              .map(({ categoryName, count }) => {
                const max = Math.max(...stats.categoryCounts.map((c) => c.count));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={categoryName}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: "var(--ink-2)", fontFamily: "var(--font-ui)" }}>
                        {categoryName}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                        {count}
                      </span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ background: "var(--surface-2)", height: 4 }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: "var(--gold)" }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
