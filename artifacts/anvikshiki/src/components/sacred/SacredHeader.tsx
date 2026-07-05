import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookMarked, LogOut, Menu, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { GlobalSidebar } from "@/components/sacred/GlobalSidebar";
import { useAuthContext } from "@/contexts/AuthContext";

export function SacredHeader() {
  const [loc, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    setSidebarOpen(false);
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

            {/* Hamburger menu trigger — visible on ALL breakpoints */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="sacred-icon-btn"
              aria-label="Open navigation"
            >
              <Menu size={22} strokeWidth={1.6} />
            </button>

            {/* Brand identity — text only, no emblem */}
            <Link href="/" className="sacred-brand" aria-label="Ānvīkṣikī home">
              <span className="sacred-brand-text">
                <span className="sacred-brand-name">ĀNVĪKṢIKĪ</span>
                <span className="sacred-brand-sub">Journal &amp; Research Platform</span>
              </span>
            </Link>

            {/* Right actions — Search, Sign In, Theme toggle */}
            <div className="sacred-actions">
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
                            <Search size={13} /> Admin
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
                <Link href="/login" className="sacred-account-icon-btn" aria-label="Sign in or create account">
                  <User size={20} strokeWidth={1.6} />
                </Link>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* ── Global sidebar/drawer ── */}
      <GlobalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
