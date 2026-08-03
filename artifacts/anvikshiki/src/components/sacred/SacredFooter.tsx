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
      <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-500">
        <div className="flex items-center gap-2 rounded-[8px] border border-[var(--gold)] bg-[var(--surface)] px-4 py-3 text-[var(--gold)] shadow-sm">
          <span className="font-display text-sm animate-pulse">✦</span>
          <span className="font-ui text-xs font-bold uppercase tracking-[0.12em]">Connected</span>
        </div>
        <p className="font-body text-xs text-[var(--ink-soft)] font-medium text-center mt-1 animate-in slide-in-from-bottom-2">Thank you for subscribing!</p>
      </div>
    );
  }

  const isInvalid = email.length > 0 && !/^[^@]+@[^@]+\.[^@]+$/.test(email);

  return (
    <form onSubmit={join} className="flex gap-2">
      <input
        type="email"
        placeholder="Email address"
        className={`input-sacred transition-colors ${isInvalid ? 'border-[var(--terracotta)] text-[var(--terracotta)]' : ''}`}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        aria-label="Email for newsletter"
      />
      <button className="btn-terracotta shrink-0 px-3 transition-transform hover:scale-105 active:scale-95" type="submit" disabled={status === "loading" || isInvalid}>
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

        <div className="grid grid-cols-2 md:grid-cols-[1.25fr_.8fr_.8fr_1fr] gap-6 text-[var(--ink)]">
          <section className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <div className="font-display text-xl font-bold tracking-[0.18em] text-[var(--ink)]">ĀNVĪKṢIKĪ</div>
              <div className="font-ui text-[0.62rem] font-extrabold uppercase tracking-[0.24em] text-[var(--ink)] opacity-90">Journal &amp; Research Platform</div>
            </div>
            <p className="max-w-sm font-body text-xs md:text-sm leading-6 text-[var(--ink-soft)] font-medium">
              A living archive of inquiry across philosophy, history, science, and civilizational thought.
            </p>
          </section>

          <section>
            <h2 className="type-section-label mb-3 text-[var(--ink)] font-extrabold uppercase tracking-wider text-xs md:text-sm">Explore</h2>
            <ul className="space-y-2 font-ui text-xs md:text-sm text-[var(--ink)] font-medium">
              {[["Browse", "/browse"], ["Archive", "/archive"], ["Papers", "/papers"], ["Search", "/search"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="text-[var(--ink)] hover:text-[var(--gold)] font-bold">{label}</Link></li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="type-section-label mb-3 text-[var(--ink)] font-extrabold uppercase tracking-wider text-xs md:text-sm">Community</h2>
            <ul className="space-y-2 font-ui text-xs md:text-sm text-[var(--ink)] font-medium">
              {[["About", "/about"], ["Submit Work", "/submit"], ["Community", "/community"], ["Account", "/account"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="text-[var(--ink)] hover:text-[var(--gold)] font-bold">{label}</Link></li>
              ))}
            </ul>
          </section>

          <section id="newsletter-subscribe" className="col-span-2 md:col-span-1 scroll-m-20">
            <h2 className="type-section-label mb-3 text-[var(--ink)] font-extrabold uppercase tracking-wider text-xs md:text-sm">Stay Connected</h2>
            <p className="mb-3 font-body text-xs md:text-sm leading-5 text-[var(--ink-soft)] font-medium">No noise. Only inquiry, new essays, and notes from the archive.</p>
            <FooterNewsletter />
          </section>
        </div>

        <div className="my-8 h-px bg-[var(--border)] opacity-60" aria-hidden="true" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-ui text-xs md:text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--ink)] pt-2">
          <p className="text-[var(--ink)] font-extrabold">COPYRIGHT {year} ANVIKSHIKI</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[var(--ink)] font-extrabold">
            <Link href="/privacy" className="text-[var(--ink)] hover:text-[var(--gold)] font-extrabold">PRIVACY</Link>
            <Link href="/terms" className="text-[var(--ink)] hover:text-[var(--gold)] font-extrabold">TERMS</Link>
            <span className="text-[var(--ink)] font-extrabold tracking-widest">INQUIRY · WISDOM · TRUTH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

