import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookMarked, LogOut, Menu, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { useAuthContext } from "@/contexts/AuthContext";

const newEmblemSrc = `${import.meta.env.BASE_URL}brand-emblem.png`;

const NAV_LINKS = [
  { label: "Home", href: "/", glyph: "archive" },
  { label: "Explore", href: "/browse", glyph: "philosophy" },
  { label: "Papers", href: "/papers", glyph: "papers" },
  { label: "Archive", href: "/archive", glyph: "archive" },
  { label: "Submit", href: "/submit", glyph: "submit" },
  { label: "Community", href: "/community", glyph: "community" },
  { label: "About", href: "/about", glyph: "civilizational-thought" },
] as const;

function isActive(current: string, href: string) {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

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
      <header className="sticky top-0 z-50 border-b border-[var(--border-gold)] backdrop-blur-md" style={{ background: "var(--bg-deep)", boxShadow: "0 1px 0 var(--border-gold)" }}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:text-[var(--ink)]">
          Skip to main content
        </a>
        <div className="container-anv">
          <div className="flex min-h-[80px] items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Anvikshiki home">
              <img
                src={newEmblemSrc}
                alt="Ānvīkṣikī emblem"
                className="shrink-0 object-contain"
                style={{ width: "72px", height: "72px" }}
              />
              <span className="min-w-0">
                <span className="block truncate font-display leading-none tracking-[0.22em] text-[var(--ink)]" style={{ fontSize: "clamp(1.15rem, 2vw, 1.55rem)" }}>
                  ĀNVĪKṢIKĪ
                </span>
                <span className="mt-[5px] block truncate font-ui font-bold uppercase text-[var(--ink-faint)]" style={{ fontSize: "0.54rem", letterSpacing: "0.26em" }}>
                  Journal &amp; Research Platform
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
              {NAV_LINKS.map((item) => {
                const active = isActive(loc, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="relative rounded-sm px-3 py-2 font-ui text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
                    style={{ color: active ? "var(--terracotta)" : undefined }}
                  >
                    {item.label}
                    {active ? <span className="absolute inset-x-3 -bottom-[1px] h-[1.5px] bg-[var(--terracotta)]" aria-hidden="true" /> : null}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5">
              <Link href="/search" className="grid h-10 w-10 place-items-center rounded-sm text-[var(--ink)] hover:bg-[var(--ink-wash)]" aria-label="Search">
                <Search size={20} />
              </Link>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              {user ? (
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((v) => !v)}
                    className="flex h-10 items-center gap-2 rounded-sm border border-[var(--border-ink)] bg-[var(--surface)] px-3 font-ui text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]"
                    aria-expanded={accountOpen}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--terracotta-pale)] text-[var(--terracotta)]">
                      <User size={14} />
                    </span>
                    {user.name?.split(" ")[0] || "Account"}
                  </button>
                  {accountOpen ? (
                    <>
                      <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] p-1 shadow-[var(--shadow-lg)]">
                        <Link href="/account" className="flex items-center gap-2 rounded px-3 py-2 font-ui text-xs text-[var(--ink)] hover:bg-[var(--ink-wash)]" onClick={() => setAccountOpen(false)}>
                          <User size={14} /> Account
                        </Link>
                        <Link href="/saved" className="flex items-center gap-2 rounded px-3 py-2 font-ui text-xs text-[var(--ink)] hover:bg-[var(--ink-wash)]" onClick={() => setAccountOpen(false)}>
                          <BookMarked size={14} /> Saved Items
                        </Link>
                        {user.role === "ADMIN" ? (
                          <Link href="/admin" className="flex items-center gap-2 rounded px-3 py-2 font-ui text-xs text-[var(--ink)] hover:bg-[var(--ink-wash)]" onClick={() => setAccountOpen(false)}>
                            <AnimalGlyph domain="archive" size={14} /> Admin
                          </Link>
                        ) : null}
                        <div className="my-1 h-px bg-[var(--border)]" />
                        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left font-ui text-xs text-[var(--terracotta)] hover:bg-[var(--terracotta-pale)]">
                          <LogOut size={14} /> Sign Out
                        </button>
                      </div>
                      <button className="fixed inset-0 z-40 cursor-default" aria-label="Close account menu" onClick={() => setAccountOpen(false)} />
                    </>
                  ) : null}
                </div>
              ) : (
                <Link href="/login" className="hidden h-10 items-center rounded-sm border border-[var(--border-ink)] px-3 font-ui text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[var(--ink-wash)] md:flex">
                  Sign In
                </Link>
              )}

              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-sm text-[var(--ink)] hover:bg-[var(--ink-wash)] lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(42,31,14,0.42)] backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation" onClick={() => setMenuOpen(false)}>
          <aside className="absolute right-0 top-0 flex h-full w-[min(86vw,320px)] flex-col border-l border-[var(--border-ink)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-7 flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                <img
                  src={newEmblemSrc}
                  alt=""
                  className="h-11 w-11 object-contain"
                  style={{ borderRadius: "6px" }}
                />
                <span className="font-display text-lg tracking-[0.18em] text-[var(--ink)]">ĀNVĪKṢIKĪ</span>
              </Link>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-sm text-[var(--ink)] hover:bg-[var(--ink-wash)]" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((item) => {
                const active = isActive(loc, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 border-b border-[var(--border)] px-2 py-3 font-ui text-sm font-bold uppercase tracking-[0.12em] text-[var(--ink)]"
                    style={{ color: active ? "var(--terracotta)" : undefined }}
                  >
                    <AnimalGlyph domain={item.glyph} size={22} />
                    {item.label}
                  </Link>
                );
              })}
              <Link href="/search" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 border-b border-[var(--border)] px-2 py-3 font-ui text-sm font-bold uppercase tracking-[0.12em] text-[var(--ink)]">
                <Search size={22} /> Search
              </Link>
            </nav>

            <div className="mt-5 space-y-3">
              <ThemeToggle />
              {user ? (
                <>
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="btn-ink w-full justify-center">
                    <User size={14} /> {user.name?.split(" ")[0] || "Account"}
                  </Link>
                  <button type="button" onClick={handleLogout} className="btn-ink w-full justify-center text-[var(--terracotta)]">
                    <LogOut size={14} /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-terracotta w-full justify-center">
                  Sign In
                </Link>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
