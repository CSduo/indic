import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Check, X, Trash2, Globe, ArchiveRestore, Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_MAP: Record<string, string> = {
  approve: "ACCEPTED", reject: "REJECTED", publish: "PUBLISHED", unpublish: "ACCEPTED",
};

const CATEGORIES = [
  { slug: "philosophy",            label: "Philosophy" },
  { slug: "history",               label: "History" },
  { slug: "psychology",            label: "Psychology" },
  { slug: "sociology",             label: "Sociology" },
  { slug: "science",               label: "Science" },
  { slug: "geopolitics",           label: "Geopolitics" },
  { slug: "civilizational-thought",label: "Civilizational Thought" },
  { slug: "aesthetics",            label: "Aesthetics" },
  { slug: "sanskrit-studies",      label: "Sanskrit Studies" },
  { slug: "political-theory",      label: "Political Theory" },
  { slug: "translations",          label: "Translations" },
  { slug: "multimedia",            label: "Multimedia" },
  { slug: "papers",                label: "Papers" },
  { slug: "archive",               label: "Archive" },
];

function Confirm({ msg, onYes, onNo }: { msg: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} role="dialog" aria-modal="true">
      <div className="card-sacred p-6 max-w-sm w-full mx-4" style={{ background: "var(--surface-2)" }}>
        <p className="font-body text-base mb-5" style={{ color: "var(--ink-soft)" }}>{msg}</p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onNo} className="btn-sacred btn-ghost text-xs">Cancel</button>
          <button type="button" onClick={onYes} className="btn-sacred btn-rose text-xs">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  const s = (status || "received").toLowerCase();
  if (s === "accepted") return "approved";
  if (s === "received" || s === "under_review") return "pending";
  if (s === "rejected") return "rejected";
  if (s === "published") return "published";
  return "draft";
}

/** Parse a Cloudinary URL or /api/uploads/... from notes */
function extractCoverFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/Cover(?:\s*image)?(?:\s*URL)?:\s*(https?:\/\/\S+|\/api\/uploads\/\S+)/i);
  return m ? m[1].trim() : null;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; action: () => void } | null>(null);
  const [publishCategory, setPublishCategory] = useState("philosophy");
  const [, navigate] = useLocation();

  const load = () => {
    fetch(`${base()}/api/admin/submissions?limit=100`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then(d => d && (setSubmissions(d.submissions || []), setLoading(false)))
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const patchAction = async (id: string, act: string, extra?: Record<string, any>) => {
    const status = STATUS_MAP[act] || act.toUpperCase();
    const body: Record<string, any> = { status, ...extra };
    const r = await fetch(`${base()}/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    if (r.ok) {
      toast.success(`Submission ${act}ed successfully`);
      load();
      setSelected((prev: any) => prev?.id === id ? { ...prev, status } : prev);
    } else toast.error(`Failed to ${act} submission`);
  };

  const del = (id: string) => {
    setConfirm({ msg: "Delete this submission permanently? This cannot be undone.", action: async () => {
      const r = await fetch(`${base()}/api/admin/submissions/${id}`, { method: "DELETE", credentials: "include" });
      if (r.ok) { toast.success("Deleted"); load(); setConfirm(null); setSelected(null); }
      else toast.error("Delete failed");
    }});
  };

  const FILTER_OPTS = ["all","received","accepted","rejected","published"];
  const filtered = filter === "all" ? submissions : submissions.filter(s => (s.status || "RECEIVED").toLowerCase() === filter || (filter === "received" && !s.status));

  return (
    <div className="admin-layout">
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.action} onNo={() => setConfirm(null)} />}
      <AdminSidebar active="/admin/submissions" />
      <main className="admin-main">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Submissions</h1>
            <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>{submissions.length} total · {submissions.filter(s => !s.status || s.status === "RECEIVED").length} pending review</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_OPTS.map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)} className="text-xs py-1 px-3 rounded-lg transition-all" style={{ background: filter === f ? "rgba(201,152,58,0.15)" : "transparent", border: `1px solid ${filter === f ? "var(--border-gold)" : "var(--border)"}`, color: filter === f ? "var(--gold-bright)" : "var(--muted)", fontFamily: "var(--font-ui)", fontWeight: 500, cursor: "pointer" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6" style={{ minHeight: "60vh" }}>
          {/* List */}
          <div className="lg:col-span-2">
            <div className="card-sacred" style={{ overflow: "hidden", maxHeight: "75vh", overflowY: "auto" }}>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading submissions" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <LotusIcon size={32} style={{ color: "var(--gold)", opacity: 0.3 }} />
                  <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>No {filter === "all" ? "" : filter} submissions</p>
                </div>
              ) : filtered.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSelected(s); setPublishCategory("philosophy"); }}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{ borderBottom: "1px solid var(--border)", background: selected?.id === s.id ? "rgba(201,152,58,0.07)" : "transparent" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-ui text-sm font-medium leading-tight line-clamp-1" style={{ color: "var(--ink-soft)" }}>{s.title}</div>
                    <span className={`badge badge-${statusBadge(s.status)} shrink-0 text-[0.6rem]`}>{s.status || "received"}</span>
                  </div>
                  <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>{s.submitterName} · {s.type}</div>
                  <div className="font-ui text-[10px] mt-0.5" style={{ color: "var(--ink-faint)" }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="card-sacred p-6" style={{ background: "var(--surface-2)", maxHeight: "82vh", overflowY: "auto" }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 mr-3">
                    <h2 className="font-display text-xl mb-2 leading-tight" style={{ color: "var(--ink)" }}>{selected.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge badge-${statusBadge(selected.status)}`}>{selected.status || "received"}</span>
                      <span className="badge badge-draft text-[0.6rem]">{selected.type}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="font-ui text-sm shrink-0" style={{ color: "var(--muted)" }}>✕</button>
                </div>

                {/* Cover image */}
                {(() => {
                  const imgUrl = selected.coverImageUrl || extractCoverFromNotes(selected.notes);
                  return imgUrl ? (
                    <div className="mb-5 rounded-lg overflow-hidden" style={{ maxHeight: 220 }}>
                      <img
                        src={imgUrl.startsWith("/api/") ? `${base()}${imgUrl}` : imgUrl}
                        alt={selected.title}
                        style={{ width: "100%", objectFit: "cover", maxHeight: 220 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : null;
                })()}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-5">
                  {[["Author", selected.submitterName], ["Email", selected.submitterEmail], ["Institution", selected.institution || "—"], ["Submitted", selected.createdAt ? new Date(selected.createdAt).toLocaleString("en-IN") : "—"]].map(([k, v]) => (
                    <div key={k}>
                      <div className="font-ui text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--gold)" }}>{k}</div>
                      <div className="font-body text-sm break-all" style={{ color: "var(--ink-soft)" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Abstract */}
                {selected.abstract && (
                  <div className="mb-4">
                    <div className="form-label mb-1">Abstract</div>
                    <div className="font-body text-sm leading-relaxed p-3 rounded-lg" style={{ background: "var(--surface-3)", color: "var(--ink-soft)" }}>{selected.abstract}</div>
                  </div>
                )}

                {/* Full body / essay content */}
                {selected.body && (
                  <div className="mb-4">
                    <div className="form-label mb-1">Full Essay Content</div>
                    <div
                      className="font-body text-sm leading-relaxed p-3 rounded-lg prose-editor-content"
                      style={{ background: "var(--surface-3)", color: "var(--ink-soft)", maxHeight: 400, overflowY: "auto" }}
                      dangerouslySetInnerHTML={{ __html: selected.body }}
                    />
                  </div>
                )}

                {/* Notes */}
                {selected.notes && (
                  <div className="mb-4">
                    <div className="form-label mb-1">Notes</div>
                    <div className="font-body text-sm p-3 rounded-lg" style={{ background: "var(--surface-3)", color: "var(--ink-faint)", whiteSpace: "pre-wrap" }}>{selected.notes}</div>
                  </div>
                )}

                {/* Manuscript download */}
                {(selected.manuscriptUrl || selected.fileUrl) && (
                  <div className="mb-4">
                    <div className="form-label mb-1">Manuscript</div>
                    <a href={selected.manuscriptUrl || selected.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-sacred btn-ghost text-xs inline-flex items-center gap-2">
                      <Download size={13} /> Download Manuscript
                    </a>
                  </div>
                )}

                {/* Category selector — shown when about to publish */}
                {selected.status === "ACCEPTED" && (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(201,152,58,0.08)", border: "1px solid var(--border-gold)" }}>
                    <div className="form-label mb-2" style={{ color: "var(--gold)" }}>Category for Publication</div>
                    <p className="font-ui text-xs mb-2" style={{ color: "var(--muted)" }}>
                      Choose the section where this article will appear on the website.
                    </p>
                    <div className="relative">
                      <select
                        id="publish-category-select"
                        value={publishCategory}
                        onChange={e => setPublishCategory(e.target.value)}
                        className="input-sacred w-full pr-8 text-sm appearance-none"
                        style={{ color: "var(--ink-soft)", background: "var(--surface-3)", cursor: "pointer" }}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.slug} value={c.slug}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  {(!selected.status || selected.status === "RECEIVED" || selected.status === "UNDER_REVIEW") && (<>
                    <button type="button" onClick={() => patchAction(selected.id, "approve")} className="btn-sacred text-xs py-1.5 px-3 inline-flex items-center gap-1.5" style={{ background: "rgba(26,74,56,0.3)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                      <Check size={12} /> Approve
                    </button>
                    <button type="button" onClick={() => patchAction(selected.id, "reject")} className="btn-sacred text-xs py-1.5 px-3 inline-flex items-center gap-1.5" style={{ background: "rgba(139,26,74,0.2)", border: "1px solid var(--border-rose)", color: "var(--lotus)" }}>
                      <X size={12} /> Reject
                    </button>
                  </>)}
                  {selected.status === "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={() => patchAction(selected.id, "publish", { categorySlug: publishCategory })}
                      className="btn-sacred btn-gold text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                    >
                      <Globe size={12} /> Publish as Article
                    </button>
                  )}
                  {selected.status === "PUBLISHED" && (
                    <button type="button" onClick={() => patchAction(selected.id, "unpublish")} className="btn-sacred btn-ghost text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
                      <ArchiveRestore size={12} /> Unpublish
                    </button>
                  )}
                  <button type="button" onClick={() => del(selected.id)} className="btn-sacred text-xs py-1.5 px-3 ml-auto inline-flex items-center gap-1.5" style={{ background: "rgba(139,26,74,0.12)", border: "1px solid rgba(139,26,74,0.3)", color: "var(--rose-bright)" }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-sacred flex flex-col items-center justify-center py-20 text-center h-full">
                <LotusIcon size={40} style={{ color: "var(--gold)", opacity: 0.2, marginBottom: "1rem" }} />
                <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>Select a submission to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
