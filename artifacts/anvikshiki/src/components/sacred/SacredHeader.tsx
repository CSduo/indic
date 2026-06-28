import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookMarked, LogOut, Menu, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { useAuthContext } from "@/contexts/AuthContext";

const EMBLEM_SRC = `${import.meta.env.BASE_URL}brand-emblem.png`;

/* Exact cream of the emblem image background — light mode only.
   Dark mode falls back to the theme's --surface variable. */
const HEADER_BG_LIGHT = "#f9f4e8";

const NAV_LINKS = [
  { label: "Explore",   href: "/browse",    glyph: "philosophy" },
  { label: "Papers",    href: "/papers",     glyph: "papers" },
  { label: "Archive",   href: "/archive",    glyph: "archive" },
  { label: "Submit",    href: "/submit",     glyph: "submit" },
  { label: "Community", href: "/community",  glyph: "community" },
  { label: "About",     href: "/about",      glyph: "civilizational-thought" },
] as const;

function isActive(current: string, href: string) {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

export function SacredHeader() {
  const [loc, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuthContext();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setAccountOpen(false);
    setMenuOpen(false);
    toast.success("You have been signed out");
    navigate("/");
  };

  return (
    <>
      {/* ── Main header ── */}
      <header className={`sticky top-0 z-50 sacred-header-outer ${scrolled ? "sacred-header-scrolled" : ""}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:text-[var(--ink)]"
        >
          Skip to main content
        </a>

        <div className="container-anv">
          <div className="sacred-header-row">

            {/* Brand identity */}
            <Link href="/" className="sacred-brand" aria-label="Ānvīkṣikī home">
              <span className="sacred-emblem-box">
                <img
                  src={EMBLEM_SRC}
                  alt="Ānvīkṣikī emblem"
                  className="sacred-emblem-img"
                />
              </span>
              <span className="sacred-brand-text">
                <span className="sacred-brand-name">ĀNVĪKṢIKĪ</span>
                <span className="sacred-brand-sub">Journal &amp; Research Platform</span>
              </span>
            </Link>

            {/* Right actions — Search, Sign In, Theme toggle, Mobile Menu */}
            <div className="sacred-actions">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="sacred-icon-btn lg:hidden"
                aria-expanded={menuOpen}
                aria-label="Toggle main menu"
              >
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>

              <Link
                href="/search"
                className="sacred-icon-btn hidden sm:inline-flex"
                aria-label="Search the journal"
              >
                <Search size={19} strokeWidth={1.6} />
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((v) => !v)}
                    className="sacred-account-btn"
                    aria-expanded={accountOpen}
                  >
                    <span className="sacred-account-avatar">
                      <User size={13} />
                    </span>
                    {user.name?.split(" ")[0] || "Account"}
                  </button>

                  {accountOpen ? (
                    <>
                      <div className="sacred-dropdown">
                        <Link href="/account" className="sacred-dropdown-item" onClick={() => setAccountOpen(false)}>
                          <User size={13} /> Account
                        </Link>
                        <Link href="/saved" className="sacred-dropdown-item" onClick={() => setAccountOpen(false)}>
                          <BookMarked size={13} /> Saved Items
                        </Link>
                        {user.role === "ADMIN" && (
                          <Link href="/admin" className="sacred-dropdown-item" onClick={() => setAccountOpen(false)}>
                            <AnimalGlyph domain="archive" size={13} /> Admin
                          </Link>
                        )}
                        <div className="sacred-dropdown-divider" />
                        <button type="button" onClick={handleLogout} className="sacred-dropdown-item sacred-dropdown-danger">
                          <LogOut size={13} /> Sign Out
                        </button>
                      </div>
                      <button className="fixed inset-0 z-40 cursor-default" aria-label="Close account menu" onClick={() => setAccountOpen(false)} />
                    </>
                  ) : null}
                </div>
              ) : (
                <Link href="/login" className="sacred-signin-btn">
                  Sign In
                </Link>
              )}

              <ThemeToggle />
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-sm lg:hidden"
          style={{ background: "rgba(30,22,12,0.45)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="sacred-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="sacred-drawer-head">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
                <img src={EMBLEM_SRC} alt="" className="h-12 w-12 object-contain" />
                <span className="font-display text-xl tracking-[0.2em]" style={{ color: "var(--ink)" }}>ĀNVĪKṢIKĪ</span>
              </Link>
              <button
                type="button"
                className="sacred-icon-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 py-2" aria-label="Mobile navigation">
              {[{ label: "Home", href: "/", glyph: "archive" }, ...NAV_LINKS].map((item) => {
                const active = isActive(loc, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className="sacred-drawer-link"
                    style={{ color: active ? "var(--terracotta)" : "var(--ink)" }}
                  >
                    <AnimalGlyph domain={item.glyph} size={20} />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/search"
                onClick={() => setMenuOpen(false)}
                className="sacred-drawer-link"
                style={{ color: "var(--ink)" }}
              >
                <Search size={20} strokeWidth={1.5} />
                Search
              </Link>
            </nav>

            {/* Drawer footer */}
            <div className="sacred-drawer-footer">
              <ThemeToggle />
              {user ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="btn-ink w-full justify-center"
                  >
                    <User size={14} /> {user.name?.split(" ")[0] || "Account"}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-ink w-full justify-center"
                    style={{ color: "var(--terracotta)" }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="btn-terracotta w-full justify-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
