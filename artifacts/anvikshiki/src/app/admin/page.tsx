import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, ScrollText, Inbox, Mail, Plus, Trash2 } from "lucide-react";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    articles: 0,
    papers: 0,
    pending: 0,
    subscribers: 0,
    trash: { articles: 0, papers: 0, submissions: 0 },
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [error, setError] = useState<string|null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const b = base();
    fetch(`${b}/api/admin/stats`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(d => d && setStats({
        articles: d.articles?.total || 0,
        papers: d.papers?.total || 0,
        pending: d.submissions?.new || 0,
        subscribers: d.newsletter?.subscribers || 0,
        trash: {
          articles: d.trash?.articles || 0,
          papers: d.trash?.papers || 0,
          submissions: d.trash?.submissions || 0,
        },
      }))
      .catch(() => setError("Failed to load dashboard stats."));

    fetch(`${b}/api/admin/submissions?limit=5`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(d => d && setRecent(d.submissions || []))
      .catch(() => setError("Failed to load recent submissions."));
  }, []);

  const STAT_CARDS = [
    { label: "Articles",  value: stats.articles,    color: "var(--gold)",    icon: <FileText size={20} /> },
    { label: "Papers",    value: stats.papers,      color: "var(--moon)",    icon: <ScrollText size={20} /> },
    { label: "Pending",   value: stats.pending,     color: "var(--lotus)",   icon: <Inbox size={20} /> },
    { label: "Subscribers", value: stats.subscribers, color: "#4ade80",      icon: <Mail size={20} /> },
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin" />
      <main className="admin-main">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Dashboard</h1>
            <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>Ānvīkṣikī editorial control panel</p>
          </div>
          <Link href="/admin/articles/new" className="btn-sacred btn-gold text-xs">
            <Plus size={14} /> New Article
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.3)", color: "var(--rose-bright)" }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="card-sacred p-5">
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: s.color }}>{s.icon}</div>
                <div className="font-display text-3xl" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { href: "/admin/submissions", label: "Review Submissions", icon: <Inbox size={16} /> },
            { href: "/admin/articles/new", label: "Write Article", icon: <FileText size={16} /> },
            { href: "/admin/newsletter", label: "Newsletter", icon: <Mail size={16} /> },
            { href: "/admin/settings", label: "Settings", icon: <ScrollText size={16} /> },
          ].map(q => (
            <Link key={q.href} href={q.href} className="card-sacred p-4 flex items-center gap-2 cursor-pointer hover:border-gold transition-all">
              <span style={{ color: "var(--gold)" }}>{q.icon}</span>
              <span className="font-ui text-xs" style={{ color: "var(--ink-soft)" }}>{q.label}</span>
            </Link>
          ))}
        </div>

        <section className="card-sacred p-4 sm:p-6 mb-8" aria-labelledby="trash-heading">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <p className="section-label mb-1">Deleted Items</p>
              <h2 id="trash-heading" className="font-display text-xl" style={{ color: "var(--gold-bright)" }}>Trash</h2>
              <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>Restore an item or delete it permanently from its content desk.</p>
            </div>
            <Trash2 size={20} aria-hidden="true" style={{ color: "var(--gold)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/admin/articles?view=trash", label: "Article Trash", count: stats.trash.articles, icon: <FileText size={16} /> },
              { href: "/admin/papers?view=trash", label: "Paper Trash", count: stats.trash.papers, icon: <ScrollText size={16} /> },
              { href: "/admin/submissions?view=trash", label: "Submission Trash", count: stats.trash.submissions, icon: <Inbox size={16} /> },
            ].map(item => (
              <Link key={item.href} href={item.href} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4 hover:border-[var(--border-gold)] transition-colors">
                <span className="flex min-w-0 items-center gap-2 font-ui text-sm" style={{ color: "var(--ink-soft)" }}>
                  <span className="shrink-0" style={{ color: "var(--gold)" }}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="badge badge-draft shrink-0">{item.count}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent submissions */}
        <div className="card-sacred p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="section-label">Recent Submissions</div>
            <Link href="/admin/submissions" className="font-ui text-xs" style={{ color: "var(--gold)" }}>View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8">
              <LotusIcon size={32} style={{ color: "var(--gold)", opacity: 0.3, margin: "0 auto 0.75rem" }} />
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="sacred-table min-w-[640px]" role="table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Author</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--gold-bright)", maxWidth: 200 }}>{s.title}</td>
                    <td>{s.submitterName}</td>
                    <td><span className="badge badge-draft" style={{ fontSize: "0.625rem" }}>{s.type}</span></td>
                    <td><span className={`badge badge-${(s.status||"pending").toLowerCase() === "received" ? "pending" : (s.status||"pending").toLowerCase()}`} style={{ fontSize: "0.625rem" }}>{s.status || "received"}</span></td>
                    <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
