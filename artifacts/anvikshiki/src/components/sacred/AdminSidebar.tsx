import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, ScrollText, Inbox, Mail, Settings, LogOut, Users } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const links = [
  { href: "/admin",             icon: <LayoutDashboard size={16} />, label: "Dashboard" },
  { href: "/admin/submissions", icon: <Inbox size={16} />,           label: "Submissions" },
  { href: "/admin/articles",    icon: <FileText size={16} />,        label: "Articles" },
  { href: "/admin/papers",      icon: <ScrollText size={16} />,      label: "Papers" },
  { href: "/admin/newsletter",  icon: <Mail size={16} />,            label: "Newsletter" },
  { href: "/admin/users",       icon: <Users size={16} />,           label: "Users" },
  { href: "/admin/settings",    icon: <Settings size={16} />,        label: "Settings" },
];

export function AdminSidebar({ active }: { active: string }) {
  const [, navigate] = useLocation();

  const logout = async () => {
    await fetch(`${base()}/api/admin/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    navigate("/admin/login");
  };

  return (
    <div className="admin-sidebar">
      <Link href="/" className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <Emblem size={32} />
        <div>
          <div className="font-display text-sm tracking-[0.12em]" style={{ color: "var(--gold-bright)" }}>ĀNVĪKṢIKĪ</div>
          <div className="font-ui text-[9px] tracking-[0.15em] uppercase" style={{ color: "var(--muted)" }}>Admin Panel</div>
        </div>
      </Link>
      <nav className="flex-1 space-y-0.5" role="navigation" aria-label="Admin navigation">
        {links.map(l => (
          <Link key={l.href} href={l.href} className={`admin-nav-item ${active === l.href ? "active" : ""}`}>
            {l.icon}
            {l.label}
          </Link>
        ))}
      </nav>
      <button type="button" onClick={logout} className="admin-nav-item w-full mt-4" style={{ color: "var(--lotus)" }}>
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
}
