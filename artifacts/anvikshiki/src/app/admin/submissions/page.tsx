import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Check, X, Trash2, Globe, ArchiveRestore, Download, ChevronDown, Clock, Edit3, ExternalLink, Eye, FileText, Image as ImageIcon, Link2, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_MAP: Record<string, string> = {
  approve: "ACCEPTED", reject: "REJECTED", publish: "PUBLISHED", unpublish: "ACCEPTED",
  under_review: "UNDER_REVIEW", revision_requested: "REVISION_REQUESTED",
};

function Confirm({ msg, onYes, onNo }: { msg: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", zIndex: 110 }} role="dialog" aria-modal="true">
      <div className="card-sacred p-6 max-w-sm w-full mx-4" style={{ background: "var(--surface-2)" }}>
        <p className="font-body text-base mb-5" style={{ color: "var(--ink-soft)" }}>{msg}</p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onNo} className="btn-sacred btn-ghost min-h-11 text-xs">Cancel</button>
          <button type="button" onClick={onYes} className="btn-sacred btn-rose min-h-11 text-xs">Confirm</button>
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
  if (s === "revision_requested") return "draft";
  return "draft";
}

/**
 * Parse a cover reference out of the submission notes. Accepts absolute URLs,
 * site-relative paths, and inline base64 data URIs â€” the last is what the
 * upload pipeline produces when no blob or CDN provider is configured, and
 * omitting it made those covers look absent to the desk.
 */
function extractCoverFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/Cover(?:\s*image)?(?:\s*URL)?:\s*(data:image\/\S+|https?:\/\/\S+|\/\S+)/i);
  return m ? m[1].trim() : null;
}

interface ExtractedAsset {
  id: string;
  url: string;
  label: string;
  type: "pdf" | "image" | "audio" | "link";
}

function extractAllAssets(submission: any): ExtractedAsset[] {
  if (!submission) return [];
  const assets: ExtractedAsset[] = [];
  const seen = new Set<string>();

  const add = (url: string | null | undefined, label: string) => {
    if (!url || typeof url !== "string") return;
    const clean = url.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);

    let type: "pdf" | "image" | "audio" | "link" = "link";
    const lower = clean.toLowerCase();
    if (lower.endsWith(".pdf") || lower.includes("/pdf/") || lower.includes("format=pdf")) {
      type = "pdf";
    } else if (/\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(lower) || lower.includes("/image/upload/")) {
      type = "image";
    } else if (/\.(mp3|wav|ogg|m4a|webm)($|\?)/i.test(lower) || lower.includes("/video/upload/")) {
      type = "audio";
    }

    const resolvedUrl = clean.startsWith("/api/") ? `${base()}${clean}` : clean;
    assets.push({ id: `${label}-${assets.length}`, url: resolvedUrl, label, type });
  };

  add(submission.manuscriptUrl, "Uploaded Manuscript File");
  add(submission.fileUrl, "Uploaded Document");
  add(submission.pdfUrl, "PDF File");
  add(submission.coverImageUrl, "Cover Image");

  // Extract from notes
  if (submission.notes) {
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    const matches = submission.notes.match(urlRegex) || [];
    matches.forEach((u: string, idx: number) => {
      add(u, `Link in Notes #${idx + 1}`);
    });
  }

  // Extract inline images & audio from body
  if (submission.body) {
    const imgRegex = /<img\b[^>]*src=["']([^"']+)["']/gi;
    let match;
    let idx = 1;
    while ((match = imgRegex.exec(submission.body)) !== null) {
      if (match[1]) {
        add(match[1], `Inline Image #${idx++}`);
      }
    }
    const audioRegex = /<audio\b[^>]*src=["']([^"']+)["']/gi;
    let audioMatch;
    let aIdx = 1;
    while ((audioMatch = audioRegex.exec(submission.body)) !== null) {
      if (audioMatch[1]) {
        add(audioMatch[1], `Voice Note #${aIdx++}`);
      }
    }
  }

  return assets;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [categories, setCategories] = useState<{slug: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "trash" ? "trash" : "all",
  );
  const [selected, setSelected] = useState<any | null>(null);
  const [editorNotes, setEditorNotes] = useState("");
  const [confirm, setConfirm] = useState<{ msg: string; action: () => void } | null>(null);

  // Document & Lightbox preview states
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewType, setActivePreviewType] = useState<"pdf" | "image" | "link" | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [, navigate] = useLocation();

  const load = (trashed = filter === "trash") => {
    setLoading(true);
    fetch(`${base()}/api/admin/submissions?limit=100${trashed ? "&trashed=true" : ""}`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(d => d && setSubmissions(d.submissions || []))
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoading(false));
  };

  const runPublicSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch(`${base()}/api/admin/submissions/sync-public-archives`, {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json();
      if (r.ok) {
          toast.success(data.message || "Linked public publications reconciled successfully.");
        load();
      } else {
          toast.error(data.error || "Publication reconciliation failed");
      }
    } catch {
        toast.error("Network error reconciling public publications");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load(filter === "trash");
  }, [filter]);

  useEffect(() => {
    fetch(`${base()}/api/admin/categories`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.categories) setCategories(d.categories); })
      .catch(() => {});
  }, []);

  const patchAction = async (id: string, act: string, extra?: Record<string, any>) => {
    setActionLoading(act);
    const status = STATUS_MAP[act] || act.toUpperCase();
    const body: Record<string, any> = { status, editorNotes, ...extra };
    try {
      const r = await fetch(`${base()}/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (r.ok) {
        toast.success(`Submission ${act.replace(/_/g, " ")}ed successfully`);
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status, editorNotes } : s));
        setSelected((prev: any) => prev?.id === id ? { ...prev, status, editorNotes } : prev);
        load();
        // Publishing changes what the public site should show. Without this the
        // home page kept serving its cached listing and the newly published
        // work did not appear until that cache expired.
        window.dispatchEvent(new Event("anv:content-changed"));
      } else {
        const errData = await r.json().catch(() => ({}));
        // A failed publish carries the underlying cause in `reason`. Showing
        // only the headline left an editor with "could not be published" and
        // nothing to act on, when the real cause is usually a specific
        // database or category problem that names itself.
        const headline = errData.error || `Failed to ${act.replace(/_/g, " ")} submission`;
        const detail = errData.reason && errData.reason !== "unknown" ? `\n\nReason: ${errData.reason}` : "";
        toast.error(`${headline}${detail}`, { duration: detail ? 12000 : 5000 });
        if (detail) console.error("Publish failure detail:", errData);
      }
    } catch (err) {
      toast.error(`Network error: Failed to ${act.replace(/_/g, " ")} submission`);
    } finally {
      setActionLoading(null);
      if (confirm) setConfirm(null);
    }
  };

  const del = (id: string) => {
    setConfirm({ msg: "Move this submission to Trash? You can restore it or delete it permanently later.", action: async () => {
      setActionLoading("delete");
      try {
        const r = await fetch(`${base()}/api/admin/submissions/${id}`, { method: "DELETE", credentials: "include" });
        if (r.ok) { toast.success("Submission moved to Trash"); load(); setConfirm(null); setSelected(null); }
        else {
          const errData = await r.json().catch(() => ({}));
          toast.error(errData.error || "Delete failed");
        }
      } catch (err) {
        toast.error("Network error: Delete failed");
      } finally {
        setActionLoading(null);
      }
    }});
  };

  const restore = async (id: string) => {
    setActionLoading("restore");
    try {
      const r = await fetch(`${base()}/api/admin/submissions/${id}/restore`, { method: "POST", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to restore submission");
      toast.success("Submission restored");
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore submission");
    } finally {
      setActionLoading(null);
    }
  };

  const permanentlyDelete = async (id: string) => {
    setActionLoading("permanent-delete");
    try {
      const r = await fetch(`${base()}/api/admin/submissions/${id}/permanent`, { method: "DELETE", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to permanently delete submission");
      toast.success("Submission permanently deleted");
      setConfirm(null);
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete submission");
    } finally {
      setActionLoading(null);
    }
  };

  const FILTER_OPTS = ["all","received","under_review","revision_requested","accepted","rejected","published","trash"];
  const filtered = filter === "all" || filter === "trash" ? submissions : submissions.filter(s => (s.status || "RECEIVED").toLowerCase() === filter || (filter === "received" && !s.status));

  return (
    <div className="admin-layout">
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.action} onNo={() => setConfirm(null)} />}
      
      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          style={{ zIndex: 110 }}
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute -top-11 right-0 min-h-11 min-w-11 text-white/80 hover:text-white p-2 text-sm font-ui"
            >
              âœ• Close Lightbox
            </button>
            <img src={lightboxImg} alt="Enlarged preview" className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/20 shadow-2xl" />
          </div>
        </div>
      )}

      <AdminSidebar active="/admin/submissions" />
      <main className="admin-main">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Submissions</h1>
            <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>{submissions.length} total Â· {submissions.filter(s => !s.status || s.status === "RECEIVED").length} pending review</p>
          </div>
          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center">
            <button
              type="button"
              disabled={syncing}
              onClick={runPublicSync}
              className="admin-submission-filter min-h-11 px-3 rounded-lg bg-[rgba(201,152,58,0.15)] hover:bg-[rgba(201,152,58,0.25)] border border-[var(--border-gold)] text-xs text-[var(--gold-bright)] font-ui font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {syncing ? <span className="animate-spin text-xs">â†»</span> : <Globe size={12} />}
              {syncing ? "Reconciling..." : "Reconcile Publications"}
            </button>
            {FILTER_OPTS.map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)} className="admin-submission-filter min-h-11 px-3 rounded-lg text-xs transition-all capitalize" style={{ background: filter === f ? "rgba(201,152,58,0.15)" : "transparent", border: `1px solid ${filter === f ? "var(--border-gold)" : "var(--border)"}`, color: filter === f ? "var(--gold-bright)" : "var(--muted)", fontFamily: "var(--font-ui)", fontWeight: 500, cursor: "pointer" }}>
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6" style={{ minHeight: "60vh" }}>
          {/* List */}
          <div className="lg:col-span-2 min-w-0">
            <div className="card-sacred admin-submission-list">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading submissions" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <LotusIcon size={32} style={{ color: "var(--gold)", opacity: 0.3 }} />
                  <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>No {filter === "all" ? "" : filter.replace(/_/g, " ")} submissions</p>
                </div>
              ) : filtered.map(s => {
                const assets = extractAllAssets(s);
                const hasDoc = assets.some(a => a.type === "pdf" || a.label.includes("Manuscript") || a.label.includes("Document"));
                const hasLink = assets.some(a => a.type === "link");
                const hasImg = assets.some(a => a.type === "image");
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setEditorNotes(s.editorNotes || "");
                                      const pdfAsset = assets.find(a => a.type === "pdf");
                      if (pdfAsset) {
                        setActivePreviewUrl(pdfAsset.url);
                        setActivePreviewType("pdf");
                      } else {
                        setActivePreviewUrl(null);
                        setActivePreviewType(null);
                      }
                    }}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{ borderBottom: "1px solid var(--border)", background: selected?.id === s.id ? "rgba(201,152,58,0.07)" : "transparent" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-ui text-sm font-medium leading-tight line-clamp-1" style={{ color: "var(--ink-soft)" }}>{s.title}</div>
                      <span className={`badge badge-${s.deletedAt ? "draft" : statusBadge(s.status)} shrink-0 text-[0.6rem]`}>{s.deletedAt ? "trash" : s.status || "received"}</span>
                    </div>
                    <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>{s.submitterName} Â· {s.type}</div>
                    
                    {/* Visual Asset Badges before selecting */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {hasDoc && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--gold)] border border-[rgba(201,152,58,0.3)]">
                          <FileText size={10} /> Document
                        </span>
                      )}
                      {hasLink && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-sky-400 border border-sky-900/40">
                          <Link2 size={10} /> Link
                        </span>
                      )}
                      {hasImg && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-emerald-400 border border-emerald-900/40">
                          <ImageIcon size={10} /> Images
                        </span>
                      )}
                    </div>

                    <div className="font-ui text-[10px] mt-1" style={{ color: "var(--ink-faint)" }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "â€”"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {/* min-w-0: a grid track sizes to its widest child by default, so one
              long unbroken string in the detail panel stretched the whole
              layout past the screen edge instead of wrapping inside it. */}
          <div className="lg:col-span-3 min-w-0">
            {selected ? (() => {
              const allAssets = extractAllAssets(selected);
              const coverImg = selected.coverImageUrl || extractCoverFromNotes(selected.notes);
              const imageAssets = allAssets.filter(a => a.type === "image");
              const linkAssets = allAssets.filter(a => a.type === "link" || a.type === "pdf");

              return (
                <div
                  className="card-sacred admin-submission-detail p-4 sm:p-6"
                  style={{ background: "var(--surface-2)", minWidth: 0, maxWidth: "100%", overflowX: "hidden" }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-3">
                      <h2 className="font-display text-xl mb-2 leading-tight" style={{ color: "var(--ink)" }}>{selected.title}</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge badge-${selected.deletedAt ? "draft" : statusBadge(selected.status)}`}>{selected.deletedAt ? "trash" : selected.status || "received"}</span>
                        <span className="badge badge-draft text-[0.6rem]">{selected.type}</span>
                        {selected.domain && <span className="badge badge-draft text-[0.6rem]">{selected.domain}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelected(null)} className="admin-submission-close grid min-h-11 min-w-11 shrink-0 place-items-center font-ui text-sm" style={{ color: "var(--muted)" }} aria-label="Close submission details">âœ•</button>
                  </div>

                  {/* Embedded PDF / Document Viewer Frame */}
                  {activePreviewUrl && activePreviewType === "pdf" && (
                    <div className="mb-5 rounded-xl overflow-hidden border border-[var(--border-gold)] bg-[var(--surface-3)]">
                      <div className="flex flex-col gap-2 p-3 bg-[var(--surface-elevated)] border-b border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-ui text-xs text-[var(--gold)] font-semibold flex items-center gap-1.5 min-w-0">
                          <FileText size={14} /> Embedded Document / PDF Viewer
                        </span>
                        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <a href={activePreviewUrl} target="_blank" rel="noopener noreferrer" className="admin-submission-action min-h-11 px-3 text-xs text-[var(--ink-soft)] hover:text-white flex items-center justify-center gap-1 font-ui">
                            <ExternalLink size={12} /> Open Full Frame â†—
                          </a>
                          <button type="button" onClick={() => { setActivePreviewUrl(null); setActivePreviewType(null); }} className="admin-submission-action min-h-11 px-3 text-xs text-[var(--muted)] hover:text-white font-ui">
                            âœ• Close Viewer
                          </button>
                        </div>
                      </div>
                      <iframe src={activePreviewUrl} className="w-full h-[360px] border-none bg-white sm:h-[500px]" title="Uploaded Document Preview" />
                    </div>
                  )}

                  {/* Main Cover Image */}
                  {coverImg && (
                    <div className="mb-5 rounded-lg overflow-hidden relative group cursor-zoom-in" onClick={() => setLightboxImg(coverImg.startsWith("/api/") ? `${base()}${coverImg}` : coverImg)}>
                      <img
                        src={coverImg.startsWith("/api/") ? `${base()}${coverImg}` : coverImg}
                        alt={selected.title}
                        style={{ width: "100%", objectFit: "cover", maxHeight: 240 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-ui text-xs gap-1.5">
                        <Maximize2 size={16} /> Click to View Full Image
                      </div>
                    </div>
                  )}

                  {/* Meta grid */}
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 mb-5 sm:grid-cols-2">
                    {[
                      ["Author", selected.submitterName],
                      ["Email", selected.submitterEmail],
                      ["Institution", selected.institution || "â€”"],
                      ["Submitted", selected.createdAt ? new Date(selected.createdAt).toLocaleString("en-IN") : "â€”"]
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="font-ui text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--gold)" }}>{k}</div>
                        <div className="font-body text-sm break-all" style={{ color: "var(--ink-soft)" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Uploaded Documents & Links Box */}
                  {allAssets.length > 0 && (
                    <div className="mb-5 p-4 rounded-xl border border-[var(--border-gold)] bg-[var(--surface-3)]">
                      <div className="form-label mb-3 text-[var(--gold)] flex items-center gap-1.5">
                        <Link2 size={14} /> Uploaded Documents &amp; External Links ({allAssets.length})
                      </div>
                      <div className="space-y-2.5">
                        {allAssets.map((assetItem) => (
                          <div key={assetItem.id} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {assetItem.type === "pdf" ? <FileText size={14} className="text-[var(--gold)] shrink-0" /> : assetItem.type === "image" ? <ImageIcon size={14} className="text-emerald-400 shrink-0" /> : <ExternalLink size={14} className="text-sky-400 shrink-0" />}
                                <span className="font-ui text-xs font-semibold text-[var(--ink)]">{assetItem.label}</span>
                                <span className="badge badge-draft text-[9px] uppercase">{assetItem.type}</span>
                              </div>
                              <div className="font-mono text-[11px] text-[var(--muted)] break-all">{assetItem.url}</div>
                            </div>
                            <div className="flex w-full flex-col items-stretch gap-2 shrink-0 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                              {assetItem.type === "pdf" && (
                                <button
                                  type="button"
                                  onClick={() => { setActivePreviewUrl(assetItem.url); setActivePreviewType("pdf"); }}
                                  className="admin-submission-action min-h-11 w-full px-3 rounded bg-[rgba(201,152,58,0.15)] hover:bg-[rgba(201,152,58,0.25)] text-xs text-[var(--gold-bright)] font-ui font-semibold inline-flex items-center justify-center gap-1 sm:w-auto"
                                >
                                  <Eye size={12} /> Preview PDF
                                </button>
                              )}
                              {assetItem.type === "image" && (
                                <button
                                  type="button"
                                  onClick={() => setLightboxImg(assetItem.url)}
                                  className="admin-submission-action min-h-11 w-full px-3 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-xs text-emerald-300 font-ui font-semibold inline-flex items-center justify-center gap-1 border border-emerald-800/40 sm:w-auto"
                                >
                                  <Eye size={12} /> View Image
                                </button>
                              )}
                              <a
                                href={assetItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-submission-action min-h-11 w-full px-3 rounded bg-white/5 hover:bg-white/10 text-xs text-[var(--ink-soft)] font-ui font-medium inline-flex items-center justify-center gap-1 sm:w-auto"
                              >
                                <ExternalLink size={12} /> Open â†—
                              </a>
                              <a
                                href={assetItem.url}
                                download
                                className="admin-submission-action min-h-11 w-full px-3 rounded bg-white/5 hover:bg-white/10 text-xs text-[var(--ink-soft)] font-ui font-medium inline-flex items-center justify-center gap-1 sm:w-auto"
                              >
                                <Download size={12} /> Download
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image Gallery Grid */}
                  {imageAssets.length > 0 && (
                    <div className="mb-5">
                      <div className="form-label mb-2 text-[var(--gold)] flex items-center gap-1.5">
                        <ImageIcon size={14} /> Attached Images &amp; Figures ({imageAssets.length})
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {imageAssets.map((imgAsset) => (
                          <div
                            key={imgAsset.id}
                            onClick={() => setLightboxImg(imgAsset.url)}
                            className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface-3)] cursor-zoom-in group"
                          >
                            <img src={imgAsset.url} alt={imgAsset.label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-ui gap-1">
                              <Maximize2 size={14} /> View
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Abstract */}
                  {selected.abstract && (
                    <div className="mb-4">
                      <div className="form-label mb-1">Abstract</div>
                      <div className="font-body text-sm leading-relaxed p-3.5 rounded-lg" style={{ background: "var(--surface-3)", color: "var(--ink-soft)" }}>{selected.abstract}</div>
                    </div>
                  )}

                  {/* Full body / essay content */}
                  {selected.body && (
                    <div className="mb-4">
                      <div className="form-label mb-1 flex items-center justify-between">
                        <span>Full Essay / Article Content</span>
                        <span className="font-ui text-[10px] text-[var(--muted)]">Formatted Preview</span>
                      </div>
                      <div
                        className="font-body text-sm leading-relaxed p-4 rounded-lg prose-editor-content border border-[var(--border)]"
                        style={{
                          background: "var(--surface-3)",
                          color: "var(--ink)",
                          maxHeight: 500,
                          overflowY: "auto",
                          overflowX: "auto",
                          overflowWrap: "anywhere",
                        }}
                        dangerouslySetInnerHTML={{ __html: selected.body }}
                      />
                    </div>
                  )}

                  {/* Notes */}
                  {selected.notes && (
                    <div className="mb-4">
                      <div className="form-label mb-1">Author Notes &amp; Links</div>
                      {/* Notes carry pasted URLs, which contain no spaces and so
                          never wrap on their own. Without an explicit break they
                          pushed the whole detail panel wider than a phone screen
                          and pulled every field out of view to the right. */}
                      <div
                        className="font-body text-sm p-3.5 rounded-lg border border-[var(--border)]"
                        style={{
                          background: "var(--surface-3)",
                          color: "var(--ink-soft)",
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {selected.notes}
                      </div>
                    </div>
                  )}

                  {/* Editor Notes */}
                  <div className="mb-4">
                    <div className="form-label mb-1">Editor Notes (Internal)</div>
                    <textarea
                      value={editorNotes}
                      onChange={(e) => setEditorNotes(e.target.value)}
                      placeholder="Add notes before changing status..."
                      className="input-sacred w-full font-body text-sm"
                      style={{ minHeight: "80px", resize: "vertical", background: "var(--surface-3)", color: "var(--ink-soft)" }}
                    />
                  </div>

                  {/* The section is the author's decision, not the desk's. It
                      is shown here for confirmation but is no longer a choice
                      to make: publishing uses the domain the author selected. */}
                  {!selected.deletedAt && selected.status === "ACCEPTED" && (() => {
                    const imgUrl = selected.coverImageUrl || extractCoverFromNotes(selected.notes);
                    const authorDomain = selected.domain || "";
                    const domainLabel =
                      categories.find(c => c.slug === authorDomain)?.name
                      || (authorDomain ? authorDomain.replace(/-/g, " ") : "Archive (no domain given)");
                    return (
                      <div className="mb-4 p-3.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                        <div className="form-label mb-2" style={{ color: "var(--ink)" }}>Section</div>
                        <p className="font-ui text-xs mb-2" style={{ color: "var(--muted)" }}>
                          Chosen by the author on submission. It will be published here.
                        </p>
                        <p className="mb-3 font-body text-sm capitalize" style={{ color: "var(--ink)" }}>
                          {domainLabel}
                        </p>
                        {!imgUrl && (
                          <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 text-amber-400 font-ui text-[11px] leading-relaxed">
                            This submission has no cover image, so the journal's default cover will be used. You can still publish it.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  <div className="admin-submission-actions flex flex-wrap gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                    {selected.deletedAt && <>
                      <button type="button" disabled={!!actionLoading} onClick={() => restore(selected.id)} className="btn-sacred btn-ghost text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50">
                        {actionLoading === "restore" ? <span className="animate-spin text-xs">Restoring</span> : <ArchiveRestore size={12} />} Restore
                      </button>
                      <button type="button" disabled={!!actionLoading} onClick={() => setConfirm({ msg: "Permanently delete this submission? This cannot be undone.", action: () => permanentlyDelete(selected.id) })} className="btn-sacred text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: "rgba(139,26,74,0.12)", border: "1px solid rgba(139,26,74,0.3)", color: "var(--rose-bright)" }}>
                        {actionLoading === "permanent-delete" ? <span className="animate-spin text-xs">Deleting</span> : <Trash2 size={12} />} Delete Forever
                      </button>
                    </>}
                    {!selected.deletedAt && (!selected.status || selected.status === "RECEIVED" || selected.status === "UNDER_REVIEW") && (<>
                      <button type="button" disabled={!!actionLoading} onClick={() => patchAction(selected.id, "approve")} className="btn-sacred text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: "rgba(26,74,56,0.3)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                        {actionLoading === "approve" ? <span className="animate-spin text-xs">â†»</span> : <Check size={12} />} Approve
                      </button>
                      {(!selected.status || selected.status === "RECEIVED") && (
                        <button type="button" disabled={!!actionLoading} onClick={() => patchAction(selected.id, "under_review")} className="btn-sacred btn-ghost text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50">
                          {actionLoading === "under_review" ? <span className="animate-spin text-xs">â†»</span> : <Clock size={12} />} Under Review
                        </button>
                      )}
                      <button type="button" disabled={!!actionLoading} onClick={() => patchAction(selected.id, "revision_requested")} className="btn-sacred btn-ghost text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50">
                        {actionLoading === "revision_requested" ? <span className="animate-spin text-xs">â†»</span> : <Edit3 size={12} />} Request Revision
                      </button>
                      <button type="button" disabled={!!actionLoading} onClick={() => setConfirm({ msg: 'Reject this submission? The author will be notified.', action: () => patchAction(selected.id, 'reject') })} className="btn-sacred text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: "rgba(139,26,74,0.2)", border: "1px solid var(--border-rose)", color: "var(--lotus)" }}>
                        {actionLoading === "reject" ? <span className="animate-spin text-xs">â†»</span> : <X size={12} />} Reject
                      </button>
                    </>)}
                    {!selected.deletedAt && selected.status === "ACCEPTED" && (() => {
                      const imgUrl = selected.coverImageUrl || extractCoverFromNotes(selected.notes);
                      // A missing cover is a warning, not a blocker. Essays
                      // written in the browser never carry one, so disabling the
                      // button here left approved work permanently unpublishable
                      // â€” the publication step falls back to a default cover.
                      return (
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => patchAction(selected.id, "publish", selected.domain ? { categorySlug: selected.domain } : {})}
                          className="btn-sacred btn-gold text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={imgUrl ? undefined : "No cover image found â€” the journal's default cover will be used"}
                        >
                          {actionLoading === "publish" ? <span className="animate-spin text-xs">â†»</span> : <Globe size={12} />} Publish as Article
                        </button>
                      );
                    })()}
                    {!selected.deletedAt && selected.status === "PUBLISHED" && (
                      <>
                        {/* A submission can read PUBLISHED while its public article
                            is missing or sitting in Trash. Republishing rebuilds the
                            public record, and now reports an error if it cannot. */}
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => patchAction(selected.id, "publish", selected.domain ? { categorySlug: selected.domain } : {})}
                          className="btn-sacred btn-gold text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                          title="Rebuild this work's public article â€” use this if it shows as published but is not on the site"
                        >
                          {actionLoading === "publish" ? <span className="animate-spin text-xs">â†»</span> : <Globe size={12} />} Republish to Site
                        </button>
                        <button type="button" disabled={!!actionLoading} onClick={() => patchAction(selected.id, "unpublish")} className="btn-sacred btn-ghost text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50">
                          {actionLoading === "unpublish" ? <span className="animate-spin text-xs">â†»</span> : <ArchiveRestore size={12} />} Unpublish
                        </button>
                      </>
                    )}
                    {!selected.deletedAt && (
                      <button type="button" disabled={!!actionLoading} onClick={() => del(selected.id)} className="btn-sacred text-xs py-1.5 px-3 ml-auto inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: "rgba(139,26,74,0.12)", border: "1px solid rgba(139,26,74,0.3)", color: "var(--rose-bright)" }}>
                        {actionLoading === "delete" ? <span className="animate-spin text-xs">â†»</span> : <Trash2 size={12} />} Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })() : (
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
