import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { SubmissionStepper } from "@/components/manuscript/SubmissionStepper";

export default function SubmitSuccessPage() {
  const [subId, setSubId] = useState("");

  useEffect(() => {
    setSubId(sessionStorage.getItem("anvikshiki_submit_id") || "");
    sessionStorage.removeItem("anvikshiki_submit_id");
  }, []);

  return (
    <div className="grid min-h-[80vh] place-items-center bg-[var(--bg)] px-4 py-16">
      <ParchmentCard className="w-full max-w-3xl p-7 text-center md:p-10">
        <SubmissionStepper active={2} className="mx-auto mb-8 max-w-xl" />
        <div className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full border border-[var(--border-gold)] bg-[var(--surface)] text-[var(--gold)]">
          <AnimalGlyph domain="community" size={62} />
        </div>
        <p className="type-section-label mb-3">Submission Received</p>
        <h1 className="font-display text-[clamp(2.5rem,6vw,4.8rem)] leading-none text-[var(--ink)]">Received</h1>
        <OrnamentDivider className="my-7" />
        <p className="mx-auto max-w-xl font-body text-lg leading-8 text-[var(--ink-soft)]">
          Your manuscript has been received. Our editorial team will review it carefully and respond at the email address you provided.
        </p>

        {subId ? (
          <div className="mx-auto mt-6 w-fit rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] px-5 py-3">
            <div className="font-ui text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Reference ID</div>
            <div className="mt-1 font-ui text-sm font-bold text-[var(--gold)]">{subId}</div>
          </div>
        ) : null}

        <div className="mx-auto mt-8 grid max-w-lg gap-3 text-left sm:grid-cols-3">
          {[
            ["1", "Editorial Review"],
            ["2", "Decision"],
            ["3", "Publication"],
          ].map(([number, label]) => (
            <div key={number} className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
              <div className="mx-auto mb-2 grid h-7 w-7 place-items-center rounded-full border border-[var(--border-gold)] font-ui text-xs font-bold text-[var(--gold)]">{number}</div>
              <div className="font-ui text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-terracotta">Return Home <ArrowRight size={14} /></Link>
          <Link href="/submit" className="btn-ink">Submit Another</Link>
          <Link href="/account" className="btn-ink">View Account</Link>
        </div>
      </ParchmentCard>
    </div>
  );
}
