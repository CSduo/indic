import { useLocation } from 'wouter';
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Inbox, FileText, Calendar, ChevronDown, LayoutDashboard, ScrollText,
  Mail, Settings, LogOut, HelpCircle, Eye, Save, Pencil, X, Check
} from "lucide-react";
import { toast } from "sonner";

const SIDEBAR_NAV = [
  { href: "/admin/submissions", label: "Submissions", icon: Inbox, active: true },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/papers", label: "Papers", icon: ScrollText },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const STATUS_OPTS = ["RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "ACCEPTED", "REJECTED", "PUBLISHED"];

export default function AdminSubmissionsPage() {
  const [, navigate] = useLocation();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusNote, setStatusNote] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/submissions`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { navigate("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setSubmissions(d.submissions || []); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSelect = (s: any) => {
    setSelected(s);
    setCurrentStatus(s.status);
    setStatusNote("");
  };

  const updateStatus = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/submissions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: currentStatus, notes: statusNote }),
      });
      if (res.ok) {
        toast.success("Submission updated");
        setSubmissions(submissions.map((s) => s.id === selected.id ? { ...s, status: currentStatus } : s));
      }
    } catch { toast.error("Failed to update"); }
  };

  const handleLogout = async () => {
    await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/logout`, { method: "POST", credentials: "include" });
    navigate("/admin/login");
  };

  const statusColor = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      RECEIVED: { bg: "rgba(168,124,43,0.12)", color: "var(--gold)" },
      UNDER_REVIEW: { bg: "rgba(21,116,109,0.12)", color: "#15746d" },
      REVISION_REQUESTED: { bg: "rgba(168,124,43,0.12)", color: "#b98b3c" },
      ACCEPTED: { bg: "rgba(111,134,91,0.15)", color: "var(--sage)" },
      REJECTED: { bg: "rgba(169,59,90,0.12)", color: "var(--rose)" },
      PUBLISHED: { bg: "rgba(111,134,91,0.2)", color: "var(--sage)" },
    };
    return map[status] || { bg: "rgba(150,150,150,0.1)", color: "var(--muted)" };
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex" style={{ background: "var(--bg)" }}>

      {/* Sidebar */}
      <aside
        className="w-48 shrink-0 hidden md:flex flex-col h-screen sticky top-0"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Brand */}
        <div className="p-4 pb-2">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-display text-base" style={{ color: "var(--ink)" }}>Ānvīkṣikī</span>
          </Link>
          <p className="font-ui text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>Journal &amp; Research Platform</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-ui text-sm transition-all"
                style={{
                  background: item.active ? "rgba(168,124,43,0.12)" : "transparent",
                  color: item.active ? "var(--gold)" : "var(--ink)",
                  fontWeight: item.active ? 600 : 400,
                }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Peacock archway image card */}
        <div className="p-3">
          <div
            className="rounded-xl h-40 bg-cover bg-center"
            style={{ backgroundImage: "url('/admin_sidebar_bg2.jpg')" }}
          />
        </div>

        {/* Logout */}
        <div className="p-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-ui text-sm w-full transition-colors hover:bg-[var(--surface-soft)]"
            style={{ color: "var(--muted)" }}
          >
            <HelpCircle size={15} /> Help &amp; Support
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top bar */}
        <div
          className="flex items-center gap-4 px-6 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <Link
            href="/admin"
            className="font-ui text-sm flex items-center gap-1.5 transition-colors hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ← Back to Submissions
          </Link>
          {selected && (
            <>
              <div className="flex-1" />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search submissions..."
                  className="input-anv py-1.5 px-3 text-sm w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}>
                  <Eye size={14} style={{ color: "var(--muted)" }} />
                </button>
                <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}>
                  <Save size={14} style={{ color: "var(--muted)" }} />
                </button>
                <button
                  onClick={updateStatus}
                  className="btn-primary py-1.5 px-4 text-sm"
                >
                  Update
                </button>
              </div>
            </>
          )}
        </div>

        {/* Split panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Detail form - left */}
          <div className="flex-1 overflow-auto p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <Inbox size={48} className="mb-4 opacity-20" style={{ color: "var(--muted)" }} />
                <p className="font-body" style={{ color: "var(--muted)" }}>Select a submission to review</p>
              </div>
            ) : (
              <div className="max-w-2xl">
                {/* Title + ID */}
                <h1 className="font-display text-2xl mb-1" style={{ color: "var(--ink)" }}>{selected.title}</h1>
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-ui text-xs" style={{ color: "var(--muted)" }}>
                    SUB-{selected.id?.slice(0, 8).toUpperCase()} · Submitted on {new Date(selected.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span
                    className="status-badge text-[10px]"
                    style={statusColor(selected.status)}
                  >
                    ● {selected.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Tabs (display only) */}
                <div className="flex gap-0 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
                  {["Details", "Abstract", "Body", "Metadata", "Categories & Tags", "SEO", "References"].map((tab, i) => (
                    <button
                      key={tab}
                      className="px-3 py-2 font-ui text-xs font-medium transition-colors whitespace-nowrap"
                      style={{
                        color: i === 0 ? "var(--gold)" : "var(--muted)",
                        borderBottom: i === 0 ? "2px solid var(--gold)" : "2px solid transparent",
                        marginBottom: "-1px",
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Article Title field */}
                <div className="mb-4">
                  <label className="font-ui text-xs font-semibold mb-2 block" style={{ color: "var(--ink)" }}>
                    Article Title <span style={{ color: "var(--rose)" }}>*</span>
                  </label>
                  <div className="input-anv text-sm" style={{ color: "var(--ink)" }}>
                    {selected.title}
                  </div>
                  <div className="text-right font-ui text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {selected.title?.length || 0} / 300
                  </div>
                </div>

                {/* Subtitle */}
                <div className="mb-4">
                  <label className="font-ui text-xs font-semibold mb-2 block" style={{ color: "var(--ink)" }}>
                    Subtitle <span className="font-normal" style={{ color: "var(--muted)" }}>(Optional)</span>
                  </label>
                  <div
                    className="input-anv text-sm text-opacity-50"
                    style={{ color: "var(--muted)", minHeight: "44px" }}
                  >
                    Enter subtitle or short description
                  </div>
                  <div className="text-right font-ui text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>0 / 300</div>
                </div>

                {/* Author chips */}
                <div className="mb-4">
                  <label className="font-ui text-xs font-semibold mb-2 block" style={{ color: "var(--ink)" }}>
                    Authors <span style={{ color: "var(--rose)" }}>*</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full font-ui text-sm"
                      style={{ background: "rgba(168,124,43,0.12)", color: "var(--ink)", border: "1px solid var(--border)" }}
                    >
                      {selected.submitterName}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--gold)", color: "#1a1108", fontWeight: 600 }}
                      >
                        Corresponding Author
                      </span>
                      <X size={12} style={{ color: "var(--muted)" }} />
                    </span>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full font-ui text-sm transition-colors"
                      style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}
                    >
                      + Add Author
                    </button>
                  </div>
                </div>

                {/* File upload areas */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Manuscript */}
                  <div>
                    <label className="font-ui text-xs font-semibold mb-2 block" style={{ color: "var(--ink)" }}>
                      Manuscript File <span style={{ color: "var(--rose)" }}>*</span>
                    </label>
                    <div
                      className="border-2 border-dashed rounded-xl p-4 text-center"
                      style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
                    >
                      <FileText size={24} className="mx-auto mb-1" style={{ color: "var(--muted)" }} />
                      <p className="font-ui text-xs" style={{ color: "var(--muted)" }}>Drag &amp; drop or click to upload</p>
                      <p className="font-ui text-[10px]" style={{ color: "var(--muted)" }}>PDF, DOCX format only (Max 20MB)</p>
                    </div>
                    {/* Uploaded file indicator */}
                    {selected.files?.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}>
                        <FileText size={14} style={{ color: "var(--gold)" }} />
                        <span className="font-ui text-xs flex-1 truncate" style={{ color: "var(--ink)" }}>
                          {selected.files[0]?.originalName}
                        </span>
                        <Check size={14} style={{ color: "var(--sage)" }} />
                      </div>
                    )}
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="font-ui text-xs font-semibold mb-2 block" style={{ color: "var(--ink)" }}>
                      Cover Image <span className="font-normal" style={{ color: "var(--muted)" }}>(Optional)</span>
                    </label>
                    <div
                      className="border-2 border-dashed rounded-xl p-4 text-center"
                      style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-1" style={{ color: "var(--muted)" }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      <p className="font-ui text-xs" style={{ color: "var(--muted)" }}>Drag &amp; drop or click to upload</p>
                      <p className="font-ui text-[10px]" style={{ color: "var(--muted)" }}>JPG or PNG (Max 5MB)</p>
                    </div>
                  </div>
                </div>

                {/* Abstract / Excerpt */}
                <div className="mb-4">
                  <label className="font-ui text-xs font-semibold mb-2 block" style={{ color: "var(--ink)" }}>
                    Excerpt / Short Description
                  </label>
                  <div
                    className="input-anv text-sm leading-relaxed"
                    style={{ minHeight: "80px", color: "var(--ink)" }}
                  >
                    {selected.abstract}
                  </div>
                  <div className="text-right font-ui text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {selected.abstract?.length || 0} / 500 characters
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right review panel */}
          {selected && (
            <div
              className="w-72 shrink-0 overflow-auto p-4 space-y-4"
              style={{ borderLeft: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <h3 className="font-ui text-sm font-semibold" style={{ color: "var(--ink)" }}>Submission Review</h3>

              {/* Metadata */}
              <div className="space-y-2 text-xs font-ui">
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Submission ID</span>
                  <span style={{ color: "var(--ink)" }}>SUB-{selected.id?.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Submitted On</span>
                  <span style={{ color: "var(--ink)" }}>{new Date(selected.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--muted)" }}>Submitted By</span>
                  <span style={{ color: "var(--ink)" }} className="truncate max-w-[140px]">{selected.submitterEmail}</span>
                </div>
              </div>

              {/* Current status */}
              <div>
                <label className="font-ui text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>Current Status</label>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-ui text-sm"
                  style={statusColor(selected.status)}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: "currentColor" }} />
                  {selected.status.replace(/_/g, " ")}
                </div>
              </div>

              {/* Update status */}
              <div>
                <label className="font-ui text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>Update Status</label>
                <div className="space-y-1">
                  {STATUS_OPTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setCurrentStatus(s)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-ui text-xs transition-all text-left"
                      style={{
                        background: currentStatus === s ? "var(--gold)" : "var(--surface-soft)",
                        color: currentStatus === s ? "#1a1108" : "var(--ink)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="font-ui text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Priority</label>
                <div className="flex items-center gap-2 font-ui text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--gold)" }} />
                  <span style={{ color: "var(--ink)" }}>Medium</span>
                </div>
              </div>

              {/* Editorial Notes */}
              <div>
                <label className="font-ui text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>Editorial Notes</label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Add internal notes about this submission..."
                  className="input-anv resize-none text-xs"
                  rows={4}
                />
                <div className="text-right font-ui text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                  {statusNote.length} / 1000
                </div>
              </div>

              <button onClick={updateStatus} className="btn-primary w-full text-sm">
                Update Submission
              </button>
            </div>
          )}

        </div>

        {/* Submissions list if none selected */}
        {!selected && !loading && (
          <div className="p-6">
            <h2 className="font-display text-xl mb-4" style={{ color: "var(--ink)" }}>All Submissions</h2>
            <div className="space-y-3">
              {submissions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className="w-full text-left rounded-2xl p-4 transition-all hover:translate-y-[-1px]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-ui text-[10px] uppercase tracking-wider" style={{ color: "var(--gold)" }}>{s.type}</span>
                    <span
                      className="status-badge text-[9px]"
                      style={statusColor(s.status)}
                    >
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h4 className="font-display text-sm" style={{ color: "var(--ink)" }}>{s.title}</h4>
                  <p className="font-ui text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {s.submitterName} · {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
              {submissions.length === 0 && (
                <p className="text-center py-8 font-body" style={{ color: "var(--muted)" }}>No submissions yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
