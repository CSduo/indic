import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, User, LogOut, BookMarked } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const NAV_LINKS = [
  { label: "Home",      href: "/" },
  { label: "Explore",   href: "/browse" },
  { label: "Domains",   href: "/browse" },
  { label: "Papers",    href: "/papers" },
  { label: "Archive",   href: "/archive" },
  { label: "Submit",    href: "/submit" },
  { label: "Community", href: "/community" },
  { label: "About",     href: "/about" },
];

function LeafEmblem({ size = 44 }: { size?: number }) {
  const s = size;
  return (
    <div style={{
      width: s, height: s,
      border: "1.5px solid #3a2a1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "transparent",
      flexShrink: 0,
      position: "relative",
    }}>
      {/* Corner dots */}
      {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([dx,dy],i) => (
        <div key={i} style={{
          position: "absolute",
          width: 3, height: 3, borderRadius: "50%",
          background: "#3a2a1a", opacity: 0.45,
          left: dx < 0 ? 4 : undefined, right: dx > 0 ? 4 : undefined,
          top: dy < 0 ? 4 : undefined, bottom: dy > 0 ? 4 : undefined,
        }} />
      ))}
      <svg width={s * 0.58} height={s * 0.58} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {/* Stem */}
        <line x1="16" y1="27" x2="16" y2="11" stroke="#3a2a1a" strokeWidth="1" strokeLinecap="round"/>
        {/* Main central petal / bud */}
        <path d="M16 11 C13 8 13 4 16 3 C19 4 19 8 16 11Z" fill="#3a2a1a" fillOpacity="0.75"/>
        {/* Left petal */}
        <path d="M16 16 C13 14 10 11 10 8 C12 9 15 13 16 16Z" fill="#3a2a1a" fillOpacity="0.4"/>
        {/* Right petal */}
        <path d="M16 16 C19 14 22 11 22 8 C20 9 17 13 16 16Z" fill="#3a2a1a" fillOpacity="0.4"/>
        {/* Lower left leaf */}
        <path d="M16 20 C13 19 11 17 10 14 C12 15 15 18 16 20Z" fill="#3a2a1a" fillOpacity="0.25"/>
        {/* Lower right leaf */}
        <path d="M16 20 C19 19 21 17 22 14 C20 15 17 18 16 20Z" fill="#3a2a1a" fillOpacity="0.25"/>
        {/* Base curve */}
        <path d="M13 27 Q16 29 19 27" stroke="#3a2a1a" strokeWidth="0.9" fill="none" opacity="0.5"/>
      </svg>
    </div>
  );
}

export function ParchmentHeader() {
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
      <header style={{
        background: "#f5f0e8",
        borderBottom: "1.5px solid #3a2a1a",
        position: "relative",
        zIndex: 50,
      }}>
        {/* Top thin accent line */}
        <div style={{ height: "1.5px", background: "#3a2a1a" }} aria-hidden="true" />

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.25rem", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, overflow: "hidden" }}>

            {/* Left: Logo */}
            <Link href="/" aria-label="Ānvīkṣikī Home"
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
              <LeafEmblem size={44} />
              <div>
                <div style={{
                  fontFamily: "var(--font-display, 'Cinzel Decorative', serif)",
                  fontSize: "1.05rem",
                  letterSpacing: "0.14em",
                  color: "#2a1a0e",
                  lineHeight: 1.1,
                  fontWeight: 400,
                }}>
                  ĀNVĪKṢIKĪ
                </div>
                <div style={{
                  fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                  fontSize: "0.48rem",
                  letterSpacing: "0.14em",
                  color: "#6b4c30",
                  textTransform: "uppercase",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                }}>
                  Journal &amp; Research Platform
                </div>
              </div>
            </Link>

            {/* Right: actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>

              {/* Search */}
              <Link href="/search"
                aria-label="Search"
                style={{
                  width: 38, height: 38,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#3a2a1a", textDecoration: "none",
                  borderRadius: 4,
                }}>
                <Search size={18} strokeWidth={1.6} />
              </Link>

              {/* Account (desktop only when logged in) */}
              {user && (
                <div style={{ position: "relative" }} className="hidden md:block">
                  <button
                    type="button"
                    onClick={() => setAccountOpen(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 10px", border: "1px solid #3a2a1a",
                      background: "transparent", cursor: "pointer",
                      fontFamily: "var(--font-ui)", fontSize: "0.7rem",
                      letterSpacing: "0.06em", color: "#3a2a1a",
                      borderRadius: 3,
                    }}
                  >
                    <User size={12} />
                    {user.name?.split(" ")[0] || "Account"}
                  </button>
                  {accountOpen && (
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 4px)",
                      width: 168, background: "#f5f0e8",
                      border: "1.5px solid #3a2a1a", borderRadius: 4,
                      padding: "4px 0", zIndex: 60,
                      boxShadow: "0 4px 16px rgba(58,42,26,0.12)",
                    }}>
                      <Link href="/account"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#3a2a1a", textDecoration: "none", fontSize: "0.75rem", fontFamily: "var(--font-ui)" }}
                        onClick={() => setAccountOpen(false)}>
                        <User size={12} /> My Account
                      </Link>
                      <Link href="/saved"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#3a2a1a", textDecoration: "none", fontSize: "0.75rem", fontFamily: "var(--font-ui)" }}
                        onClick={() => setAccountOpen(false)}>
                        <BookMarked size={12} /> Saved Items
                      </Link>
                      <div style={{ height: 1, background: "rgba(58,42,26,0.15)", margin: "3px 0" }} />
                      <button type="button" onClick={handleLogout}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-ui)", color: "#8b1a4a", textAlign: "left" }}>
                        <LogOut size={12} /> Sign Out
                      </button>
                    </div>
                  )}
                  {accountOpen && <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setAccountOpen(false)} />}
                </div>
              )}

              {/* Hamburger */}
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
                aria-label="Toggle navigation menu"
                style={{
                  width: 38, height: 38,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#3a2a1a", background: "none", border: "none", cursor: "pointer",
                  borderRadius: 4,
                }}
              >
                {menuOpen ? <X size={20} strokeWidth={1.6} /> : <Menu size={20} strokeWidth={1.6} />}
              </button>
            </div>

          </div>
        </div>

        {/* Bottom border */}
        <div style={{ height: "1.5px", background: "#3a2a1a" }} aria-hidden="true" />
      </header>

      {/* Navigation Drawer */}
      {menuOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(30,18,8,0.55)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setMenuOpen(false)}
          role="dialog" aria-modal="true" aria-label="Navigation menu"
        >
          <div
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: 280,
              background: "#f5f0e8",
              borderLeft: "1.5px solid #3a2a1a",
              padding: "5.5rem 1.5rem 2rem",
              display: "flex", flexDirection: "column",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              style={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                background: "none", border: "none", cursor: "pointer", color: "#3a2a1a",
              }}
              aria-label="Close menu"
            >
              <X size={20} strokeWidth={1.6} />
            </button>

            {/* Drawer logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "2rem", position: "absolute", top: 18, left: 20 }}>
              <LeafEmblem size={34} />
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", letterSpacing: "0.14em", color: "#2a1a0e" }}>
                ĀNVĪKṢIKĪ
              </span>
            </div>

            <nav style={{ flex: 1 }} aria-label="Main navigation">
              {NAV_LINKS.map(l => (
                <Link
                  key={`${l.label}-${l.href}`}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "0.85rem 0.5rem",
                    fontFamily: "var(--font-ui)", fontSize: "0.8rem",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: loc === l.href ? "#6b3a1f" : "#3a2a1a",
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(58,42,26,0.12)",
                    fontWeight: loc === l.href ? 600 : 400,
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {user ? (
                <>
                  <Link href="/account"
                    onClick={() => setMenuOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.65rem 0.75rem", border: "1px solid #3a2a1a", color: "#3a2a1a", textDecoration: "none", fontFamily: "var(--font-ui)", fontSize: "0.72rem", letterSpacing: "0.06em", borderRadius: 3 }}>
                    <User size={13} /> {user.name?.split(" ")[0] || "My Account"}
                  </Link>
                  <button type="button" onClick={handleLogout}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.65rem 0.75rem", border: "1px solid rgba(139,26,74,0.35)", color: "#8b1a4a", background: "none", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: "0.72rem", letterSpacing: "0.06em", borderRadius: 3, textAlign: "left" }}>
                    <LogOut size={13} /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login"
                  onClick={() => setMenuOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.7rem", border: "1px solid #3a2a1a", color: "#3a2a1a", textDecoration: "none", fontFamily: "var(--font-ui)", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 3 }}>
                  Sign In
                </Link>
              )}
            </div>

            {/* Ornamental bottom */}
            <div style={{ marginTop: "1.5rem", textAlign: "center", opacity: 0.3 }}>
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M14 4C14 4 8 8 8 14C8 18.4 10.8 21.6 14 23C17.2 21.6 20 18.4 20 14C20 8 14 4 14 4Z"
                  stroke="#3a2a1a" strokeWidth="1.2" fill="#3a2a1a" fillOpacity="0.2"/>
                <line x1="14" y1="4" x2="14" y2="23" stroke="#3a2a1a" strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
