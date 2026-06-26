import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, ScrollText, Inbox, Mail, Plus } from "lucide-react";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ articles: 0, papers: 0, pending: 0, subscribers: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    const b = base();
    fetch(`${b}/api/admin/stats`, { credentials: "include" })
      .then(r => { if (r.status === 401) { navigate("/admin/login"); return null; } return r.json(); })
      .then(d => d && setStats({
        articles: d.articles?.total || 0,
        papers: d.papers?.total || 0,
        pending: d.submissions?.new || 0,
        subscribers: d.newsletter?.subscribers || 0,
      }))
      .catch(() => {});
    fetch(`${b}/api/admin/submissions?limit=5`, { credentials: "include" })
      .then(r => r.json()).then(d => setRecent(d.submissions || [])).catch(() => {});
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Dashboard</h1>
            <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>Ānvīkṣikī editorial control panel</p>
          </div>
          <Link href="/admin/articles/new" className="btn-sacred btn-gold text-xs">
            <Plus size={14} /> New Article
          </Link>
        </div>

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
            <table className="sacred-table" role="table">
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
          )}
        </div>
      </main>
    </div>
  );
}
