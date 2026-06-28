import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, ScrollText, Inbox, Mail, Settings, LogOut, Users } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const links = [
  { href: "/admin",             icon: <LayoutDashboard size={15} />, label: "Dashboard" },
  { href: "/admin/submissions", icon: <Inbox size={15} />,           label: "Submissions" },
  { href: "/admin/articles",    icon: <FileText size={15} />,        label: "Articles" },
  { href: "/admin/papers",      icon: <ScrollText size={15} />,      label: "Papers" },
  { href: "/admin/newsletter",  icon: <Mail size={15} />,            label: "Newsletter" },
  { href: "/admin/users",       icon: <Users size={15} />,           label: "Users" },
  { href: "/admin/settings",    icon: <Settings size={15} />,        label: "Settings" },
];

export function AdminSidebar({ active }: { active: string }) {
  const [, navigate] = useLocation();

  const logout = async () => {
    await fetch(`${base()}/api/admin/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    navigate("/admin/login");
  };

  return (
    <header className="admin-topnav">
      {/* Logo */}
      <Link href="/" className="admin-topnav-logo">
        <Emblem size={28} />
        <div className="leading-none">
          <div className="font-display text-xs tracking-[0.14em]" style={{ color: "var(--gold-bright)" }}>ĀNVĪKṢIKĪ</div>
          <div className="font-ui text-[8px] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>Admin</div>
        </div>
      </Link>

      {/* Nav links — centered */}
      <nav className="admin-topnav-links" role="navigation" aria-label="Admin navigation">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`admin-topnav-item${active === l.href ? " active" : ""}`}
          >
            {l.icon}
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout — far right */}
      <button
        type="button"
        onClick={logout}
        className="admin-topnav-logout"
        title="Sign out"
      >
        <LogOut size={15} />
        <span>Sign Out</span>
      </button>
    </header>
  );
}
