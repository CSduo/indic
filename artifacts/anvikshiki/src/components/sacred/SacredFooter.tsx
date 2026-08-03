import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok">("idle");

  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch(`${base()}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.status === 409) {
        setStatus("ok");
        toast.info("You are already subscribed");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Failed");
      setStatus("ok");
      toast.success("You have joined the conversation");
    } catch {
      setStatus("idle");
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (status === "ok") {
    return (
      <div className="flex items-center gap-2 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] px-3 py-2 text-[var(--gold)]">
        <span className="font-display text-sm" style={{ color: 'var(--gold)' }}>✦</span>
        <span className="font-ui text-xs font-bold uppercase tracking-[0.12em]">Connected</span>
      </div>
    );
  }

  return (
    <form onSubmit={join} className="flex gap-2">
      <input
        type="email"
        placeholder="Email address"
        className="input-sacred"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        aria-label="Email for newsletter"
      />
      <button className="btn-terracotta shrink-0 px-3" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "..." : <ArrowRight size={15} />}
      </button>
    </form>
  );
}

export function SacredFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-[var(--border)] bg-[var(--bg)] overflow-hidden" role="contentinfo">
      <div className="container-anv py-8 relative z-10">
        <div className="mb-8 h-px bg-[var(--border)] opacity-60" aria-hidden="true" />

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-[1.25fr_.8fr_.8fr_1fr] gap-6 text-white">
          <section>
            <div className="mb-4">
              <div className="font-display text-xl font-bold tracking-[0.18em] text-white" style={{ color: "#FFFFFF" }}>ĀNVĪKṢIKĪ</div>
              <div className="font-ui text-[0.62rem] font-extrabold uppercase tracking-[0.24em] text-white opacity-90" style={{ color: "#FFFFFF" }}>Journal &amp; Research Platform</div>
            </div>
            <p className="max-w-sm font-body text-sm leading-7 text-white font-medium opacity-95" style={{ color: "#FFFFFF" }}>
              A living archive of inquiry across philosophy, history, science, and civilizational thought.
            </p>
          </section>

          <section>
            <h2 className="type-section-label mb-4 text-white font-bold uppercase tracking-wider" style={{ color: "#FFFFFF" }}>Explore</h2>
            <ul className="space-y-2 font-ui text-sm text-white font-medium" style={{ color: "#FFFFFF" }}>
              {[["Browse", "/browse"], ["Archive", "/archive"], ["Papers", "/papers"], ["Search", "/search"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="text-white hover:text-[var(--gold)] font-medium" style={{ color: "#FFFFFF" }}>{label}</Link></li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="type-section-label mb-4 text-white font-bold uppercase tracking-wider" style={{ color: "#FFFFFF" }}>Community</h2>
            <ul className="space-y-2 font-ui text-sm text-white font-medium" style={{ color: "#FFFFFF" }}>
              {[["Submit Work", "/submit"], ["Community", "/community"], ["Account", "/account"], ["About", "/about"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="text-white hover:text-[var(--gold)] font-medium" style={{ color: "#FFFFFF" }}>{label}</Link></li>
              ))}
            </ul>
          </section>

          <section className="col-span-2 sm:col-span-1">
            <h2 className="type-section-label mb-4 text-white font-bold uppercase tracking-wider" style={{ color: "#FFFFFF" }}>Stay Connected</h2>
            <p className="mb-3 font-body text-sm leading-6 text-white font-medium" style={{ color: "#FFFFFF" }}>No noise. Only inquiry, new essays, and notes from the archive.</p>
            <FooterNewsletter />
          </section>
        </div>

        <div className="my-8 h-px bg-[var(--border)] opacity-60" aria-hidden="true" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-ui text-[0.75rem] font-bold uppercase tracking-[0.12em] text-white" style={{ color: "#FFFFFF" }}>
          <p style={{ color: "#FFFFFF" }}>Copyright {year} Anvikshiki</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-white" style={{ color: "#FFFFFF" }}>
            <Link href="/privacy" className="text-white hover:text-[var(--gold)]" style={{ color: "#FFFFFF" }}>Privacy</Link>
            <Link href="/terms" className="text-white hover:text-[var(--gold)]" style={{ color: "#FFFFFF" }}>Terms</Link>
            <span className="text-white font-bold" style={{ color: "#FFFFFF" }}>Inquiry · Wisdom · Truth</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

