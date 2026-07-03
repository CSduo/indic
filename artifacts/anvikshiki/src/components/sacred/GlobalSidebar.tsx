import { useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Compass, Grid3X3, FileText, Archive, Search, Send,
  Users, Info, Mail, User, BookMarked, ShieldCheck, X,
} from "lucide-react";
import { PUBLIC_NAV_LINKS, ACCOUNT_NAV_LINKS, ADMIN_NAV_LINK } from "@/lib/navigation";
import { useAuthContext } from "@/contexts/AuthContext";

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
  const [loc] = useLocation();
  const { user } = useAuthContext();
  const drawerRef = useRef<HTMLElement>(null);

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
      // Focus the drawer
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

        {/* Footer */}
        <div className="global-sidebar-footer">
          <p className="global-sidebar-motto">Inquiry · Wisdom · Truth</p>
        </div>
      </aside>
    </div>
  );
}
