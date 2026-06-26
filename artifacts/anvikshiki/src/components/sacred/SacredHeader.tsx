import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, X, Menu, User, LogOut, BookMarked } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";
import { LotusIcon } from "./LotusIcon";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const NAV_LINKS = [
  { label: "Home",      href: "/" },
  { label: "Browse",    href: "/browse" },
  { label: "Archive",   href: "/archive" },
  { label: "Submit",    href: "/submit" },
  { label: "Community", href: "/community" },
];

export function SacredHeader() {
  const [loc, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, logout } = useAuthContext();

  const handleLogout = async () => {
    await logout();
    setAccountOpen(false);
    setMenuOpen(false);
    toast.success("You have been signed out");
    navigate("/");
  };

  return (
    <>
      <header
        className="relative z-50"
        style={{
          background: "linear-gradient(180deg, rgba(7,4,10,0.98) 0%, rgba(7,4,10,0.94) 100%)",
          borderBottom: "1px solid rgba(201,152,58,0.18)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Gold accent line top */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, var(--gold) 40%, var(--gold-bright) 60%, transparent 100%)", opacity: 0.55 }} aria-hidden="true" />

        <div className="container-anv">
          <div className="flex items-center justify-between" style={{ paddingTop: "0.6rem", paddingBottom: "0.6rem" }}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0 group" aria-label="Ānvīkṣikī Home">
              <div className="group-hover:opacity-90 transition-opacity">
                <Emblem size={46} />
              </div>
              <div>
                <div className="font-display leading-none tracking-[0.14em]"
                  style={{ fontSize: "1.125rem", color: "var(--gold-bright)" }}>
                  ĀNVĪKṢIKĪ
                </div>
                <div className="font-ui tracking-[0.28em] uppercase"
                  style={{ fontSize: "0.5rem", color: "var(--ink-faint)", marginTop: 2 }}>
                  Journal &amp; Research Platform
                </div>
              </div>
            </Link>

            {/* Desktop nav — center */}
            <nav className="hidden md:flex items-center gap-0.5" role="navigation" aria-label="Main navigation">
              {NAV_LINKS.map(l => (
                <Link
                  key={l.href} href={l.href}
                  className="px-3.5 py-1.5 rounded-md font-ui text-xs transition-all"
                  style={{
                    color: loc === l.href ? "var(--gold-bright)" : "var(--ink-faint)",
                    background: loc === l.href ? "rgba(201,152,58,0.1)" : "transparent",
                    letterSpacing: "0.08em",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1 relative">
              <Link
                href="/search"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{ color: "var(--gold)", opacity: 0.7 }}
                aria-label="Search"
              >
                <Search size={17} />
              </Link>

              {/* Auth button (desktop) */}
              {user ? (
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setAccountOpen(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-ui text-xs transition-all"
                    style={{ color: "var(--gold-bright)", border: "1px solid rgba(201,152,58,0.35)", letterSpacing: "0.06em", background: "rgba(201,152,58,0.07)" }}
                  >
                    <User size={13} />
                    {user.name?.split(" ")[0] || "Account"}
                  </button>
                  {accountOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 w-44 rounded-lg py-1 z-50"
                      style={{ background: "#0e0a18", border: "1px solid rgba(201,152,58,0.25)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                    >
                      <Link href="/account" className="flex items-center gap-2 px-3 py-2 font-ui text-xs hover:bg-[rgba(201,152,58,0.08)] transition-colors"
                        style={{ color: "var(--ink-soft)" }} onClick={() => setAccountOpen(false)}>
                        <User size={12} /> My Account
                      </Link>
                      <Link href="/saved" className="flex items-center gap-2 px-3 py-2 font-ui text-xs hover:bg-[rgba(201,152,58,0.08)] transition-colors"
                        style={{ color: "var(--ink-soft)" }} onClick={() => setAccountOpen(false)}>
                        <BookMarked size={12} /> Saved Items
                      </Link>
                      <div style={{ height: 1, background: "rgba(201,152,58,0.1)", margin: "0.25rem 0" }} />
                      <button type="button" onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 w-full font-ui text-xs hover:bg-[rgba(139,26,74,0.12)] transition-colors text-left"
                        style={{ color: "var(--lotus)" }}>
                        <LogOut size={12} /> Sign Out
                      </button>
                    </div>
                  )}
                  {accountOpen && <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md font-ui text-xs transition-all"
                  style={{ color: "var(--ink-faint)", border: "1px solid rgba(201,152,58,0.22)", letterSpacing: "0.06em" }}
                >
                  Sign in
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ color: "var(--gold)", opacity: 0.75 }}
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
                aria-label="Toggle menu"
                type="button"
              >
                {menuOpen ? <X size={18} /> : <Menu size={19} />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom hairline */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,152,58,0.12), transparent)" }} aria-hidden="true" />
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(4,2,8,0.93)", backdropFilter: "blur(10px)" }}
          onClick={() => setMenuOpen(false)}
          role="dialog" aria-modal="true" aria-label="Mobile navigation"
        >
          <div
            className="absolute top-0 right-0 bottom-0 w-72 flex flex-col"
            style={{ background: "#080412", borderLeft: "1px solid rgba(201,152,58,0.2)", padding: "4.5rem 1.75rem 2rem" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <Emblem size={36} />
              <span className="font-display text-base tracking-[0.14em]" style={{ color: "var(--gold-bright)" }}>ĀNVĪKṢIKĪ</span>
            </div>

            <div className="space-y-1 flex-1">
              {NAV_LINKS.map(l => (
                <Link
                  key={l.href} href={l.href}
                  className="flex items-center py-3 px-2 rounded-lg font-ui text-sm transition-all"
                  style={{
                    color: loc === l.href ? "var(--gold-bright)" : "var(--ink-soft)",
                    background: loc === l.href ? "rgba(201,152,58,0.08)" : "transparent",
                    borderBottom: "1px solid rgba(201,152,58,0.07)",
                    letterSpacing: "0.06em",
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <Link href="/search" className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg font-ui text-xs"
                style={{ background: "rgba(201,152,58,0.08)", color: "var(--gold)", border: "1px solid rgba(201,152,58,0.2)" }}
                onClick={() => setMenuOpen(false)}>
                <Search size={14} /> Search
              </Link>

              {user ? (
                <>
                  <Link href="/account" className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg font-ui text-xs"
                    style={{ background: "rgba(201,152,58,0.07)", color: "var(--gold-bright)", border: "1px solid rgba(201,152,58,0.2)" }}
                    onClick={() => setMenuOpen(false)}>
                    <User size={14} /> {user.name?.split(" ")[0] || "My Account"}
                  </Link>
                  <button type="button" onClick={handleLogout} className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg font-ui text-xs text-left"
                    style={{ background: "rgba(139,26,74,0.08)", color: "var(--lotus)", border: "1px solid rgba(139,26,74,0.2)" }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="flex w-full items-center justify-center py-2.5 rounded-lg font-ui text-xs"
                  style={{ background: "transparent", color: "var(--ink-faint)", border: "1px solid rgba(201,152,58,0.15)" }}
                  onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <LotusIcon size={20} style={{ color: "var(--gold)", opacity: 0.25 }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
