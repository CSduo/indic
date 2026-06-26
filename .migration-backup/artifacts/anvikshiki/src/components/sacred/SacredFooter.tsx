import { Link } from "wouter";
import { Emblem } from "@/components/brand/Emblem";
import { LotusIcon, LotusDivider } from "./LotusIcon";

export function SacredFooter() {
  return (
    <footer style={{ background: "var(--bg-deep)", borderTop: "1px solid var(--border)" }} role="contentinfo">
      {/* Gold line */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} aria-hidden="true" />

      <div className="container-anv py-10">
        <LotusDivider className="mb-8" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Emblem size={36} />
              <div className="font-display text-lg tracking-[0.1em]" style={{ color: "var(--gold-bright)" }}>ĀNVĪKṢIKĪ</div>
            </div>
            <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ink-faint)" }}>
              A journal of inquiry and civilizational wisdom. Illuminating ideas across philosophy, history, science, and dharmic thought.
            </p>
          </div>

          {/* Explore */}
          <div>
            <div className="section-label mb-3">Explore</div>
            <ul className="space-y-2">
              {[["Browse", "/browse"], ["Archive", "/archive"], ["Papers", "/papers"], ["Search", "/search"]].map(([l, h]) => (
                <li key={h}><Link href={h} className="font-ui text-sm transition-colors hover:text-[var(--gold)]" style={{ color: "var(--ink-faint)" }}>{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <div className="section-label mb-3">Community</div>
            <ul className="space-y-2">
              {[["Community", "/community"], ["Submit Work", "/submit"], ["Login", "/login"], ["About", "/about"]].map(([l, h]) => (
                <li key={h}><Link href={h} className="font-ui text-sm transition-colors hover:text-[var(--gold)]" style={{ color: "var(--ink-faint)" }}>{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <div className="section-label mb-3">Stay Connected</div>
            <p className="font-body text-xs mb-3" style={{ color: "var(--ink-faint)" }}>Receive reflections and resources from the archive.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="input-sacred text-xs py-2"
                style={{ fontSize: "0.8125rem" }}
              />
              <button className="btn-sacred btn-gold px-3 py-2 text-xs shrink-0" type="button">Join</button>
            </div>
          </div>
        </div>

        <LotusDivider className="mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-ui text-[11px]" style={{ color: "var(--ink-faint)" }}>
            © {new Date().getFullYear()} Ānvīkṣikī · All rights reserved
          </p>
          <div className="flex items-center gap-4">
            {[["Privacy", "/privacy"], ["Terms", "/terms"]].map(([l, h]) => (
              <Link key={h} href={h} className="font-ui text-[11px] hover:text-[var(--gold)]" style={{ color: "var(--ink-faint)" }}>{l}</Link>
            ))}
            <div className="flex items-center gap-1.5" style={{ color: "var(--ink-faint)" }}>
              <LotusIcon size={12} className="text-gold" style={{ color: "var(--gold)" }} />
              <span className="font-ui text-[10px] tracking-[0.15em] uppercase">Inquiry · Wisdom · Truth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gold line */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)" }} aria-hidden="true" />
    </footer>
  );
}
