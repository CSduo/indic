import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useListSubmissions, useUpdateSubmission } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSubmissionsQueryKey } from "@workspace/api-client-react";

export function AdminSubmissions() {
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "accepted" | "rejected">("");
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading } = useListSubmissions(
    statusFilter ? { status: statusFilter } : {},
  );

  const updateMutation = useUpdateSubmission();

  function updateStatus(id: number, status: "accepted" | "rejected") {
    updateMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }),
      },
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: "var(--gold)",
    accepted: "#2b7c5e",
    rejected: "var(--rose)",
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Submissions</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>{submissions.length} total</p>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(["", "pending", "accepted", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: statusFilter === s ? "var(--gold)" : "var(--surface)",
              color: statusFilter === s ? "var(--bg)" : "var(--muted-text)",
              border: "1px solid var(--line-2)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--surface-2)", height: 100 }} />)}</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>No submissions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{s.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                    {s.name} · {s.email} · {s.type === "article" ? "Essay" : "Paper"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: "var(--surface-2)",
                      color: STATUS_COLORS[s.status] ?? "var(--muted-text)",
                      fontFamily: "var(--font-ui)",
                      border: `1px solid ${STATUS_COLORS[s.status] ?? "var(--line)"}40`,
                    }}
                  >
                    {s.status}
                  </span>
                </div>
              </div>

              {s.abstract && (
                <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
                  {s.abstract}
                </p>
              )}

              {s.status === "pending" && (
                <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
                  <button
                    onClick={() => updateStatus(s.id, "accepted")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "#2b7c5e", color: "white", fontFamily: "var(--font-ui)" }}
                  >
                    <Check size={12} /> Accept
                  </button>
                  <button
                    onClick={() => updateStatus(s.id, "rejected")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "var(--rose)", color: "white", fontFamily: "var(--font-ui)" }}
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              )}

              <p className="text-[10px] mt-2" style={{ color: "var(--muted-2)", fontFamily: "var(--font-ui)" }}>
                Submitted {new Date(s.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
