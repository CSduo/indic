import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Emblem } from "@/components/brand/Emblem";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";

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
        <AnimalGlyph domain="community" size={18} />
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
    <footer className="border-t border-[var(--border-gold)] bg-[var(--bg-deep)]" role="contentinfo">
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" aria-hidden="true" />
      <div className="container-anv py-12">
        <OrnamentDivider className="mb-10" />

        <div className="grid gap-8 md:grid-cols-[1.25fr_.8fr_.8fr_1fr]">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[8px] border border-[var(--border-ink)] bg-[var(--surface)] text-[var(--gold)]">
                <Emblem size={34} />
              </span>
              <div>
                <div className="font-display text-xl tracking-[0.18em] text-[var(--ink)]">ANVIKSIKI</div>
                <div className="font-ui text-[0.58rem] font-bold uppercase tracking-[0.24em] text-[var(--ink-faint)]">Journal & Research Platform</div>
              </div>
            </div>
            <p className="max-w-sm font-body text-sm leading-7 text-[var(--ink-soft)]">
              A living archive of inquiry across philosophy, history, science, and civilizational thought.
            </p>
          </section>

          <section>
            <h2 className="type-section-label mb-4">Explore</h2>
            <ul className="space-y-2 font-ui text-sm text-[var(--ink-faint)]">
              {[["Browse", "/browse"], ["Archive", "/archive"], ["Papers", "/papers"], ["Search", "/search"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-[var(--terracotta)]">{label}</Link></li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="type-section-label mb-4">Community</h2>
            <ul className="space-y-2 font-ui text-sm text-[var(--ink-faint)]">
              {[["Submit Work", "/submit"], ["Community", "/community"], ["Account", "/account"], ["About", "/about"]].map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-[var(--terracotta)]">{label}</Link></li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="type-section-label mb-4">Stay Connected</h2>
            <p className="mb-3 font-body text-sm leading-6 text-[var(--ink-soft)]">No noise. Only inquiry, new essays, and notes from the archive.</p>
            <FooterNewsletter />
          </section>
        </div>

        <OrnamentDivider variant="minimal" className="my-10" />

        <div className="flex flex-col items-center justify-between gap-3 font-ui text-[0.72rem] uppercase tracking-[0.12em] text-[var(--ink-faint)] md:flex-row">
          <p>Copyright {year} Anvikshiki</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-[var(--terracotta)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--terracotta)]">Terms</Link>
            <span className="text-[var(--gold)]">Inquiry · Wisdom · Truth</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
