import { useEffect, useCallback, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Compass, Grid3X3, FileText, Archive, Search, Send,
  Users, Info, Mail, User, BookMarked, ShieldCheck, X, Sun, Moon,
} from "lucide-react";
import { PUBLIC_NAV_LINKS, ACCOUNT_NAV_LINKS, ADMIN_NAV_LINK } from "@/lib/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { DOMAIN_ORDER, DOMAIN_META } from "@/lib/domainMeta";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  "/":          Home,
  "/browse":    Compass,
  "/domains":   Grid3X3,
  "/papers":    FileText,
  "/archive":   Archive,
  "/search":    Search,
  "/submit":    Send,
  "/community": Users,
  "/about":     Info,
  "/contact":   Mail,
  "/account":   User,
  "/saved":     BookMarked,
  "/admin":     ShieldCheck,
};

interface GlobalSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSidebar({ open, onClose }: GlobalSidebarProps) {
  const [loc, setLoc] = useLocation();
  const { user } = useAuthContext();
  const { resolvedTheme, toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [latestPub, setLatestPub] = useState<{ title: string; slug: string } | null>(null);

  useEffect(() => {
    if (open && !latestPub) {
      fetch(`${base}/api/articles?limit=1`)
        .then(r => r.json())
        .then(d => {
          if (d.articles?.[0]) {
            setLatestPub({ title: d.articles[0].title, slug: d.articles[0].slug });
          }
        })
        .catch(() => {});
    }
  }, [open, latestPub]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLoc(`/search?q=${encodeURIComponent(searchQuery)}`);
      onClose();
    }
  };

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      drawerRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  function isActive(href: string) {
    if (href === "/") return loc === "/";
    return loc === href || loc.startsWith(`${href}/`);
  }

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <div
      className="global-sidebar-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
    >
      <aside
        ref={drawerRef}
        className="global-sidebar"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="global-sidebar-header">
          <Link href="/" onClick={handleLinkClick} className="global-sidebar-brand">
            <span className="global-sidebar-brand-name">ĀNVĪKṢIKĪ</span>
            <span className="global-sidebar-brand-sub">Journal &amp; Research Platform</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="global-sidebar-close"
            aria-label="Close navigation"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        {/* Quick Search */}
        <div className="global-sidebar-search">
          <form onSubmit={handleSearch} className="relative">
            <Search size={16} className="global-sidebar-search-icon" />
            <input
              type="text"
              placeholder="Search Anvikshiki..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="global-sidebar-search-input"
            />
          </form>
        </div>

        {/* Navigation */}
        <nav className="global-sidebar-nav" aria-label="Main navigation">
          <div className="global-sidebar-section-label">Navigate</div>
          {PUBLIC_NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            const Icon = ICON_MAP[link.href] || Home;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className={`global-sidebar-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.5} />
                {link.label}
              </Link>
            );
          })}

          {/* Domains */}
          <div className="global-sidebar-divider" />
          <div className="global-sidebar-section-label">Domains</div>
          {DOMAIN_ORDER.slice(0, 5).map(key => {
            const meta = DOMAIN_META[key];
            if (!meta) return null;
            return (
              <Link
                key={key}
                href={meta.route}
                onClick={handleLinkClick}
                className="global-sidebar-link"
              >
                <AnimalGlyph domain={key} size={18} />
                <span className="ml-1">{meta.label}</span>
              </Link>
            )
          })}
          <Link href="/domains" onClick={handleLinkClick} className="global-sidebar-link text-xs uppercase tracking-widest text-[var(--gold)] mt-2">
            View All Domains →
          </Link>

          {/* Appearance / Theme Switcher */}
          <div className="global-sidebar-divider" />
          <div className="global-sidebar-section-label">Theme</div>
          <button
            type="button"
            onClick={() => {
              toggleTheme();
            }}
            className="global-sidebar-link flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-3">
              {resolvedTheme === "dark" ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
              <span>{resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-[var(--border)] tracking-wider">
              {resolvedTheme === "dark" ? "Pitch Dark" : "Pure White"}
            </span>
          </button>

          {/* Account section (signed in only) */}
          {user && (
            <>
              <div className="global-sidebar-divider" />
              <div className="global-sidebar-section-label">Account</div>
              {ACCOUNT_NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                const Icon = ICON_MAP[link.href] || User;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleLinkClick}
                    className={`global-sidebar-link ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={18} strokeWidth={1.5} />
                    {link.label}
                  </Link>
                );
              })}

              {/* Admin (admin only) */}
              {user.role === "ADMIN" && (
                <Link
                  href={ADMIN_NAV_LINK.href}
                  onClick={handleLinkClick}
                  className={`global-sidebar-link ${isActive(ADMIN_NAV_LINK.href) ? "active" : ""}`}
                >
                  <ShieldCheck size={18} strokeWidth={1.5} />
                  {ADMIN_NAV_LINK.label}
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Latest Publication */}
        {latestPub && (
          <Link href={`/articles/${latestPub.slug}`} onClick={handleLinkClick} className="sidebar-latest-card">
            <span className="sidebar-latest-label">Latest Essay</span>
            <span className="sidebar-latest-title">{latestPub.title}</span>
          </Link>
        )}

        {/* Footer */}
        <div className="global-sidebar-footer">
          <p className="global-sidebar-motto">Inquiry · Wisdom · Truth</p>
        </div>
      </aside>
    </div>
  );
}

