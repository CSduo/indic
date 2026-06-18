"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, ScrollText, Inbox, Mail, Plus, LayoutDashboard,
  Settings, Archive, Users, LogOut, HelpCircle, Upload, TrendingUp, TrendingDown
} from "lucide-react";
import { toast } from "sonner";

const SIDEBAR_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, active: true },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/papers", label: "Papers", icon: ScrollText },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

// Simple sparkline SVG chart
function SparkChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 280, h = 80, pad = 8;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `${pad},${h - pad} ` + pts.join(" ") + ` ${w - pad},${h - pad}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`g${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g${color.replace("#", "")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(",");
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) {
          setAdmin(data.admin);
          fetch("/api/admin/stats", { credentials: "include" })
            .then((r) => r.json())
            .then((s) => setStats(s));
        } else {
          router.push("/admin/login");
        }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    toast.success("Signed out");
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) return null;

  const statCards = [
    {
      label: "Total Articles", sublabel: "Published", value: stats?.articles?.total || 0,
      sub: stats?.articles?.published || 0, icon: FileText, iconBg: "rgba(168,124,43,0.1)",
      iconColor: "var(--gold)", trend: "+12%", up: true, href: "/admin/articles"
    },
    {
      label: "Total Papers", sublabel: "Published", value: stats?.papers?.total || 0,
      sub: stats?.papers?.published || 0, icon: ScrollText, iconBg: "rgba(168,124,43,0.1)",
      iconColor: "var(--gold)", trend: "+8%", up: true, href: "/admin/papers"
    },
    {
      label: "New Submissions", sublabel: "Awaiting Review", value: stats?.submissions?.new || 0,
      sub: stats?.submissions?.total || 0, icon: Inbox, iconBg: "rgba(220,88,124,0.1)",
      iconColor: "var(--rose)", trend: "-5%", up: false, href: "/admin/submissions"
    },
    {
      label: "Newsletter Subscribers", sublabel: "Total Subscribers", value: stats?.newsletter?.subscribers || 0,
      sub: 0, icon: Mail, iconBg: "rgba(168,124,43,0.1)",
      iconColor: "var(--gold)", trend: "+16%", up: true, href: "/admin/newsletter"
    },
  ];

  // Placeholder chart data
  const articleData = [50, 48, 52, 55, 60, 100, 50];
  const paperData = [20, 22, 25, 24, 30, 25, 28];
  const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

  return (
    <div className="min-h-[100dvh] flex" style={{ background: "var(--bg)" }}>

      {/* Sidebar */}
      <aside
        className="w-52 shrink-0 hidden md:flex flex-col h-screen sticky top-0"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Brand */}
        <div className="p-5 pb-3">
          <Link href="/admin" className="block">
            <div className="font-display text-lg leading-tight" style={{ color: "var(--ink)" }}>Ānvīkṣikī</div>
            <div className="font-ui text-[10px] tracking-[0.12em] uppercase mt-0.5" style={{ color: "var(--muted)" }}>Journal &amp; Research Platform</div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-ui text-sm transition-all"
                style={{
                  background: item.active ? "var(--gold)" : "transparent",
                  color: item.active ? "#1a1108" : "var(--ink)",
                  fontWeight: item.active ? 600 : 400,
                }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bookshelf sidebar image */}
        <div className="p-3">
          <div
            className="rounded-2xl h-40 bg-cover bg-center"
            style={{ backgroundImage: "url('/admin_sidebar_bg.jpg')" }}
          />
        </div>

        {/* Footer */}
        <div className="p-3 pt-0 space-y-0.5">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-ui text-sm w-full transition-colors hover:bg-[var(--surface-soft)]"
            style={{ color: "var(--muted)" }}
          >
            <HelpCircle size={15} /> Help &amp; Support
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-ui text-sm w-full transition-colors hover:bg-[var(--surface-soft)]"
            style={{ color: "var(--muted)" }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-5 md:p-7">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--ink)" }}>Dashboard</h1>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-ui text-sm font-bold"
              style={{ background: "var(--gold)", color: "#1a1108" }}
            >
              {admin.name?.charAt(0) || "A"}
            </div>
            <div>
              <div className="font-ui text-sm font-semibold" style={{ color: "var(--ink)" }}>{admin.name || "Admin"}</div>
              <div className="font-ui text-[10px]" style={{ color: "var(--muted)" }}>{admin.role || "Editor-in-Chief"}</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-2xl p-5 hover:translate-y-[-2px] transition-all block"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-ui text-xs" style={{ color: "var(--muted)" }}>{stat.label}</p>
                    <p className="font-display text-3xl mt-1" style={{ color: "var(--ink)" }}>{stat.value.toLocaleString()}</p>
                    <p className="font-ui text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{stat.sublabel}</p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: stat.iconBg }}
                  >
                    <Icon size={18} style={{ color: stat.iconColor }} />
                  </div>
                </div>
                <div className="flex items-center gap-1 font-ui text-[10px]" style={{ color: stat.up ? "var(--sage)" : "var(--rose)" }}>
                  {stat.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {stat.trend} from last month
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          {/* Content chart */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-ui text-sm font-semibold" style={{ color: "var(--ink)" }}>Content Overview</h2>
              <button className="font-ui text-xs flex items-center gap-1" style={{ color: "var(--muted)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: "8px" }}>
                Last 6 Months
              </button>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 font-ui text-[10px]" style={{ color: "var(--muted)" }}>
                <span className="w-3 h-[2px] rounded" style={{ background: "var(--gold)", display: "inline-block" }} /> Articles
              </span>
              <span className="flex items-center gap-1.5 font-ui text-[10px]" style={{ color: "var(--muted)" }}>
                <span className="w-3 h-[2px] rounded" style={{ background: "var(--sage)", display: "inline-block" }} /> Papers
              </span>
            </div>
            <SparkChart data={articleData} color="var(--gold)" />
            <SparkChart data={paperData} color="#6f865b" />
            <div className="flex justify-between mt-2">
              {months.map((m) => (
                <span key={m} className="font-ui text-[9px]" style={{ color: "var(--muted)" }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Recent submissions */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-ui text-sm font-semibold" style={{ color: "var(--ink)" }}>Recent Submissions</h2>
              <Link href="/admin/submissions" className="font-ui text-[10px] font-medium" style={{ color: "var(--gold)" }}>View all</Link>
            </div>
            {stats?.recentSubmissions?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSubmissions.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-ui text-xs font-bold shrink-0"
                      style={{ background: "var(--surface-soft)", color: "var(--gold)" }}
                    >
                      {s.submitterName?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-xs font-medium truncate" style={{ color: "var(--ink)" }}>{s.title}</p>
                      <p className="font-ui text-[10px]" style={{ color: "var(--muted)" }}>
                        {s.submitterName} · {s.category || "Philosophy"}
                      </p>
                    </div>
                    <span
                      className="status-badge text-[9px] shrink-0"
                      style={{
                        background: s.status === "RECEIVED" ? "rgba(168,124,43,0.12)" : "rgba(21,116,109,0.12)",
                        color: s.status === "RECEIVED" ? "var(--gold)" : "#15746d",
                      }}
                    >
                      {s.status === "RECEIVED" ? "New" : s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-sm py-4" style={{ color: "var(--muted)" }}>No recent submissions.</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--gold)" }}>Quick Actions</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { href: "/admin/articles/new", icon: Plus, label: "New Article", color: "var(--gold)" },
              { href: "/admin/papers/new", icon: ScrollText, label: "New Paper", color: "var(--gold)" },
              { href: "/admin/submissions", icon: Inbox, label: "View Submissions", color: "var(--rose)" },
              { href: "#", icon: Upload, label: "Upload Media", color: "var(--sage)" },
              { href: "/admin/newsletter", icon: Mail, label: "Send Newsletter", color: "var(--sage)" },
              { href: "/archive", icon: Archive, label: "Manage Archive", color: "var(--sage)" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl text-center hover:translate-y-[-2px] transition-all"
                  style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
                >
                  <Icon size={18} style={{ color: action.color }} />
                  <span className="font-ui text-[10px] font-medium" style={{ color: "var(--ink)" }}>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
