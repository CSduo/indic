import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Mail, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { SubmissionStepper } from "@/components/manuscript/SubmissionStepper";

export default function SubmitSuccessPage() {
  const [subId, setSubId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSubId(sessionStorage.getItem("anvikshiki_submit_id") || "");
    sessionStorage.removeItem("anvikshiki_submit_id");
  }, []);

  const adminEmail = "editor@anvikshikijournal.in";

  const copyEmail = () => {
    navigator.clipboard.writeText(adminEmail);
    setCopied(true);
    toast.success(`Copied admin email: ${adminEmail}`);
    setTimeout(() => setCopied(false), 3000);
  };

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

        {/* Email Admin Automation / Expedite Action Card */}
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-[var(--border-gold)] bg-[var(--surface-2)] p-6 text-left shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(201,152,58,0.15)] text-[var(--gold-bright)]">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="font-display text-lg text-[var(--ink)]">Notify Admin to Expedite Review</h3>
              <p className="font-ui text-xs text-[var(--muted)]">Speed up your submission acceptance by sending an email directly to the Editor</p>
            </div>
          </div>

          <p className="font-body text-sm leading-relaxed text-[var(--ink-soft)] mb-4">
            Please write an email to the admin so your request can be accepted sooner. Click the button below to pre-fill an email with your submission details:
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <a
              href={`mailto:${adminEmail}?subject=${encodeURIComponent(`New Submission Notification: ${subId ? `[ID: ${subId}]` : 'Manuscript Submission'}`)}&body=${encodeURIComponent(`Dear Editor,\n\nI have submitted my work to Ānvīkṣikī Journal.\n\nSubmission Reference ID: ${subId || 'N/A'}\n\nPlease review my submission at your earliest convenience so it can be accepted sooner.\n\nThank you!`)}`}
              className="w-full sm:w-auto btn-sacred btn-gold flex-1 py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Mail size={15} /> Send Email to Admin Now ↗
            </a>
            <button
              type="button"
              onClick={copyEmail}
              className="w-full sm:w-auto px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-xs font-ui font-semibold text-[var(--ink-soft)] hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? "Copied Email!" : "Copy Admin Email"}
            </button>
          </div>
          <p className="font-ui text-[11px] text-[var(--muted)] mt-2.5 text-center sm:text-left">
            Direct Admin Email: <span className="font-mono text-[var(--gold)] font-semibold">{adminEmail}</span>
          </p>
        </div>

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
