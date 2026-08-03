import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";
import { Search } from "lucide-react";

/**
 * Checks if the URL path contains only invisible/non-printable Unicode characters
 * (e.g. U+2060 Word Joiner = %E2%81%A0, zero-width spaces, etc.)
 * This happens when messaging apps (WhatsApp, Telegram) attach invisible chars to links.
 */
function isInvisiblePath(path: string): boolean {
  // Strip leading slash, then check if remaining chars are all invisible
  const stripped = path.replace(/^\/+/, "");
  if (stripped.length === 0) return false;
  // Remove all invisible/formatting Unicode characters
  const visible = stripped.replace(/[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\u034F\u115F\u1160\u17B4\u17B5\u3164\uFFA0]/g, "");
  return visible.length === 0;
}

export default function NotFound() {
  const [location, navigate] = useLocation();

  // Auto-redirect to home if the path is only invisible characters
  useEffect(() => {
    if (isInvisiblePath(location)) {
      navigate("/", { replace: true });
    }
  }, [location, navigate]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh", display: "flex", alignItems: "center" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(139,26,74,0.05) 0%, transparent 60%)" }} />
      </div>
      <div className="container-anv relative z-10 flex flex-col items-center text-center py-20">
        <LotusIcon size={56} className="mb-6 animate-float" style={{ color: "var(--gold)", opacity: 0.8 }} />
        <div className="font-display text-[12rem] leading-none mb-4 font-bold" style={{ color: "var(--ink)", opacity: 0.05, userSelect: "none" }}>404</div>
        <div className="-mt-16 mb-4">
          <LotusDivider className="w-48 mx-auto" />
        </div>
        <h1 className="font-display text-4xl mb-4 font-bold" style={{ color: "var(--ink)" }}>Page Not Found</h1>
        <p className="font-body text-base mb-8 max-w-md mx-auto leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          The page you seek does not exist, or has been moved. Return to the archive and begin again.
        </p>
        
        <form onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${(e.currentTarget.elements.namedItem('q') as HTMLInputElement).value}`); }} className="relative max-w-md w-full mb-10">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input 
            type="search" 
            name="q"
            placeholder="Search the archive..." 
            className="w-full h-12 pl-12 pr-4 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:border-[var(--border-gold)] font-body shadow-sm"
          />
        </form>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/" className="btn-sacred text-[var(--bg)] bg-[var(--gold)] border-[var(--gold)] hover:bg-[var(--ink)] hover:border-[var(--ink)]">Return Home</Link>
          <Link href="/browse" className="btn-sacred btn-ghost border-[var(--border)] text-[var(--ink)] hover:border-[var(--border-gold)]">Browse Journal</Link>
        </div>
      </div>
    </div>
  );
}
