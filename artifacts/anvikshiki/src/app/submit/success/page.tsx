import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { LotusDivider, LotusIcon, MandalaRing } from "@/components/sacred/LotusIcon";
import { Emblem } from "@/components/brand/Emblem";

export default function SubmitSuccessPage() {
  const [subId, setSubId] = useState("");

  useEffect(() => {
    setSubId(sessionStorage.getItem("anvikshiki_submit_id") || "");
    sessionStorage.removeItem("anvikshiki_submit_id");
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh", display: "flex", alignItems: "center" }}>
      {/* Cosmic bg */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(74,40,120,0.20) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 60%, rgba(139,26,74,0.15) 0%, transparent 50%)" }} />
      </div>

      <div className="container-anv relative z-10 flex flex-col items-center text-center py-20 max-w-xl mx-auto">
        {/* Spinning mandala ring */}
        <div className="relative mb-6" aria-hidden="true">
          <MandalaRing size={120} className="animate-spin-slow" style={{ color: "var(--gold)", opacity: 0.25, position: "absolute", top: -12, left: -12 }} />
          <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Emblem size={72} />
          </div>
        </div>

        <LotusIcon size={24} className="mb-4 animate-float" style={{ color: "var(--gold)", opacity: 0.8 }} />

        <div className="section-label mb-3" style={{ color: "var(--gold-bright)" }}>Submission Received</div>

        <h1 className="font-display mb-4" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--gold-bright)", letterSpacing: "0.1em" }}>
          Your Work Has Been<br />Received
        </h1>

        <LotusDivider className="w-48 my-4" />

        <p className="font-body text-base mb-2" style={{ color: "var(--ink-soft)" }}>
          Thank you for your submission to Ānvīkṣikī.
        </p>
        <p className="font-body text-sm mb-6" style={{ color: "var(--ink-faint)" }}>
          Our editorial team will review your manuscript carefully. You will receive a response at the email address you provided.
        </p>

        {subId && (
          <div className="mb-6 px-5 py-3 rounded-lg" style={{ background: "var(--surface-2)", border: "1px solid var(--border-gold)" }}>
            <div className="font-ui text-[10px] tracking-[0.15em] uppercase mb-1" style={{ color: "var(--muted)" }}>Reference ID</div>
            <div className="font-ui text-sm font-semibold" style={{ color: "var(--gold-bright)" }}>{subId}</div>
          </div>
        )}

        {/* Steps */}
        <div className="card-sacred p-5 w-full max-w-sm mb-8">
          <div className="section-label mb-3">What Happens Next</div>
          {[
            { n: "1", t: "Editorial Review", d: "Our team carefully reads your submission" },
            { n: "2", t: "Decision", d: "You'll receive acceptance, revision, or feedback" },
            { n: "3", t: "Publication", d: "Accepted works are prepared and published" },
          ].map(s => (
            <div key={s.n} className="flex gap-3 mb-3 last:mb-0">
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", fontSize: "0.75rem", flexShrink: 0 }}>{s.n}</div>
              <div>
                <div className="font-ui text-xs font-semibold" style={{ color: "var(--gold-bright)" }}>{s.t}</div>
                <div className="font-body text-xs" style={{ color: "var(--ink-faint)" }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/" className="btn-sacred btn-gold">Return Home <ArrowRight size={14} /></Link>
          <Link href="/submit" className="btn-sacred btn-ghost">Submit Another</Link>
        </div>
      </div>
    </div>
  );
}
