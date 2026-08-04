import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookMarked, LogOut, Menu, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { GlobalSidebar } from "@/components/sacred/GlobalSidebar";
import { useAuthContext } from "@/contexts/AuthContext";
import { Emblem } from "@/components/brand/Emblem";

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
          {/* ── ROW 1: Primary Top Header Bar ── */}
          <div className="sacred-header-row flex items-center justify-between py-2.5 md:py-3 px-2 md:px-4">

            {/* Far Left Edge: Hamburger Menu Trigger */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="sacred-icon-btn hover:bg-[var(--surface-soft)] p-2 rounded-lg transition-colors text-[var(--ink)]"
                aria-label="Open navigation sidebar"
                title="Open navigation menu & settings"
              >
                <Menu size={26} strokeWidth={1.8} />
              </button>
            </div>

            {/* Center: Website Name Text */}
            <Link href="/" className="sacred-brand flex-1 flex flex-col items-center justify-center text-center" aria-label="Ānvīkṣikī home">
              <span className="font-display text-3xl md:text-5xl font-bold tracking-tight text-[var(--ink)] leading-none hover:text-[var(--gold)] transition-colors">
                Ānvīkṣikī
              </span>
              <span className="font-ui text-[9px] md:text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold)] mt-1">
                Journal of Encyclopaedic Inquiry
              </span>
            </Link>

            {/* Far Right Edge: Search & Account */}
            <div className="sacred-actions flex items-center justify-end gap-2 md:gap-3 shrink-0">
              <Link
                href="/search"
                className="sacred-icon-btn text-[var(--ink)] hover:text-[var(--gold)] p-1.5"
                aria-label="Search the journal"
              >
                <Search size={20} strokeWidth={1.8} />
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((v) => !v)}
                    className="sacred-account-btn"
                    aria-expanded={accountOpen}
                  >
                  <span className="sacred-account-avatar" style={{ overflow: "hidden" }}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name || "Avatar"} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--terracotta)", fontFamily: "var(--font-ui)", lineHeight: 1 }}>
                        {(user.name || "A").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:inline">{user.name?.split(" ")[0] || "Account"}</span>
                  </button>

                  {accountOpen ? (
                    <>
                      <div className="sacred-dropdown">
                        <Link href="/account" className="sacred-dropdown-item" onClick={() => setAccountOpen(false)}>
                          <User size={13} /> Account
                        </Link>
                        <Link href={`/profile/${user.id}`} className="sacred-dropdown-item" onClick={() => setAccountOpen(false)}>
                          <User size={13} /> Public Profile
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
                <Link href="/login" className="font-ui text-xs font-extrabold uppercase tracking-widest text-[var(--ink)] hover:text-[var(--gold)] px-2 whitespace-nowrap inline-block leading-none" aria-label="Sign in">
                  Sign in
                </Link>
              )}
            </div>

          </div>

          {/* ── ROW 2: Secondary Sub-Header Navigation Bar (Hidden on Mobile) ── */}
          <nav className="sacred-sub-header border-t border-[var(--border-gold)]/40 py-2 hidden md:flex items-center justify-center gap-6 md:gap-10 overflow-x-auto no-scrollbar font-ui text-xs md:text-sm font-extrabold uppercase tracking-[0.16em]">
            <Link href="/" className={`hover:text-[var(--gold)] transition-colors whitespace-nowrap ${loc === "/" ? "text-[var(--gold)] font-black border-b-2 border-[var(--gold)] pb-0.5" : "text-[var(--ink)]"}`}>
              Home
            </Link>
            <Link href="/browse" className={`hover:text-[var(--gold)] transition-colors whitespace-nowrap ${loc === "/browse" ? "text-[var(--gold)] font-black border-b-2 border-[var(--gold)] pb-0.5" : "text-[var(--ink)]"}`}>
              Browse
            </Link>
            <Link href="/archive" className={`hover:text-[var(--gold)] transition-colors whitespace-nowrap ${loc === "/archive" ? "text-[var(--gold)] font-black border-b-2 border-[var(--gold)] pb-0.5" : "text-[var(--ink)]"}`}>
              Archive
            </Link>
            <Link href="/papers" className={`hover:text-[var(--gold)] transition-colors whitespace-nowrap ${loc === "/papers" ? "text-[var(--gold)] font-black border-b-2 border-[var(--gold)] pb-0.5" : "text-[var(--ink)]"}`}>
              Papers
            </Link>
            <Link href="/about" className={`hover:text-[var(--gold)] transition-colors whitespace-nowrap ${loc === "/about" ? "text-[var(--gold)] font-black border-b-2 border-[var(--gold)] pb-0.5" : "text-[var(--ink)]"}`}>
              About
            </Link>
            <Link href="/submit" className={`hover:text-[var(--gold)] transition-colors whitespace-nowrap ${loc === "/submit" ? "text-[var(--gold)] font-black border-b-2 border-[var(--gold)] pb-0.5" : "text-[var(--ink)]"}`}>
              Submit Work
            </Link>
            <Link href="/community" className={`hover:text-[var(--gold)] transition-colors whitespace-nowrap ${loc === "/community" ? "text-[var(--gold)] font-black border-b-2 border-[var(--gold)] pb-0.5" : "text-[var(--ink)]"}`}>
              Community
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Global sidebar/drawer ── */}
      <GlobalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
