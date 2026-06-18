import { Link, useLocation } from "wouter";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { type Theme } from "../lib/theme";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/papers", label: "Papers" },
  { href: "/search", label: "Search" },
  { href: "/submit", label: "Submit" },
  { href: "/about", label: "About" },
];

interface NavbarProps {
  theme: Theme;
  onThemeToggle: () => void;
}

export function Navbar({ theme, onThemeToggle }: NavbarProps) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 w-full hidden md:flex flex-col"
      style={{
        background: "var(--glass)",
        borderBottom: "1px solid var(--line)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-7xl mx-auto w-full px-6 py-3 flex items-center justify-between">
        <Link href="/">
          <Wordmark size="sm" />
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors duration-150"
              style={{
                fontFamily: "var(--font-ui)",
                color: location === l.href ? "var(--gold)" : "var(--ink-2)",
                borderBottom: location === l.href ? "1.5px solid var(--gold)" : "1.5px solid transparent",
                paddingBottom: "2px",
                letterSpacing: "0.04em",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        </div>
      </div>
    </header>
  );
}
