import { Link } from "wouter";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";

export default function NotFound() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh", display: "flex", alignItems: "center" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(139,26,74,0.12) 0%, transparent 60%)" }} />
      </div>
      <div className="container-anv relative z-10 flex flex-col items-center text-center py-20">
        <LotusIcon size={48} className="mb-6 animate-float" style={{ color: "var(--gold)", opacity: 0.4 }} />
        <div className="font-display text-8xl mb-2" style={{ color: "var(--gold)", opacity: 0.2 }}>404</div>
        <LotusDivider className="w-48 my-4" />
        <h1 className="font-display text-3xl mb-3" style={{ color: "var(--gold-bright)" }}>Page Not Found</h1>
        <p className="font-body text-sm mb-8 max-w-sm" style={{ color: "var(--ink-faint)" }}>
          The page you seek does not exist, or has been moved. Return to the archive and begin again.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/" className="btn-sacred btn-gold">Return Home</Link>
          <Link href="/browse" className="btn-sacred btn-ghost">Browse Journal</Link>
        </div>
      </div>
    </div>
  );
}
