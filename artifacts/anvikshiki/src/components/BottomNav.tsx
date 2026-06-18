import { Link, useLocation } from "wouter";
import { Home, BookOpen, FileText, Search, Info } from "lucide-react";

const TABS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/papers", icon: FileText, label: "Papers" },
  { href: "/submit", icon: BookOpen, label: "Submit" },
  { href: "/about", icon: Info, label: "About" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden"
      style={{
        background: "var(--glass)",
        borderTop: "1px solid var(--line)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = href === "/" ? location === "/" : location.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all duration-150"
            style={{ color: active ? "var(--gold)" : "var(--muted-text)" }}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.5} />
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
