import { useState } from "react";
import { ArrowRight, Mail, MapPin, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const INQUIRY_TYPES = [
  { value: "submission", label: "Submission Enquiry" },
  { value: "editorial", label: "Editorial Matter" },
  { value: "partnership", label: "Partnership / Collaboration" },
  { value: "technical", label: "Technical Issue" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", type: "submission", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setStatus("sending");
    try {
      const r = await fetch(`${base()}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Failed");
      setStatus("ok");
      toast.success("Message sent. We'll respond within 3–5 days.");
    } catch {
      setStatus("err");
      toast.error("Failed to send. Please try emailing us directly.");
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      {/* Header */}
      <section className="container-anv py-12 md:py-16">
        <div className="max-w-xl">
          <p className="type-section-label mb-3">Get in Touch</p>
          <h1 className="font-display text-5xl text-[var(--ink)]">Contact the Journal</h1>
          <p className="mt-4 font-body text-base leading-7 text-[var(--ink-soft)]">
            We read every message carefully. Responses may take a few days — the editorial process benefits from patience.
          </p>
        </div>
      </section>

      <OrnamentDivider />

      <section className="container-anv py-10 pb-16">
        <div className="grid gap-10 md:grid-cols-[1fr_340px]">
          {/* Form */}
          <div>
            {status === "ok" ? (
              <ParchmentCard className="p-10 text-center">
                <AnimalGlyph domain="community" size={56} className="mx-auto mb-4 text-[var(--gold)]" />
                <h2 className="font-display text-3xl text-[var(--ink)] mb-3">Message Received</h2>
                <p className="font-body text-base leading-7 text-[var(--ink-soft)]">
                  We'll respond to <strong>{form.email}</strong> within 3–5 working days.
                </p>
                <button
                  type="button"
                  onClick={() => { setStatus("idle"); setForm({ name: "", email: "", type: "submission", subject: "", message: "" }); }}
                  className="btn-ink mt-6"
                >
                  Send Another
                </button>
              </ParchmentCard>
            ) : (
              <ParchmentCard className="p-7">
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="form-label mb-1" htmlFor="c-name">Your Name *</label>
                      <input id="c-name" className="input-sacred" type="text" value={form.name} onChange={set("name")} placeholder="Scholar's name" required />
                    </div>
                    <div>
                      <label className="form-label mb-1" htmlFor="c-email">Email Address *</label>
                      <input id="c-email" className="input-sacred" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="form-label mb-1" htmlFor="c-type">Nature of Enquiry</label>
                    <select id="c-type" className="input-sacred" value={form.type} onChange={set("type")}>
                      {INQUIRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label mb-1" htmlFor="c-subject">Subject</label>
                    <input id="c-subject" className="input-sacred" type="text" value={form.subject} onChange={set("subject")} placeholder="Brief summary of your message" />
                  </div>
                  <div>
                    <label className="form-label mb-1" htmlFor="c-message">Message *</label>
                    <textarea
                      id="c-message"
                      className="input-sacred min-h-[140px] resize-y"
                      value={form.message}
                      onChange={set("message")}
                      placeholder="Write your message here…"
                      required
                    />
                  </div>
                  <button type="submit" disabled={status === "sending"} className="btn-terracotta w-full justify-center">
                    {status === "sending" ? "Sending…" : <><ArrowRight size={14} /> Send Message</>}
                  </button>
                  {status === "err" && (
                    <p className="font-ui text-xs text-[var(--lotus)] text-center">
                      Submission failed. Email us directly at <a href="mailto:journal@anvikshiki.in" className="underline">journal@anvikshiki.in</a>
                    </p>
                  )}
                </form>
              </ParchmentCard>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <ParchmentCard className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Mail size={18} className="text-[var(--gold)]" />
                <h3 className="font-display text-xl text-[var(--ink)]">Editorial</h3>
              </div>
              <a href="mailto:journal@anvikshiki.in" className="font-ui text-sm text-[var(--gold)] hover:underline">
                journal@anvikshiki.in
              </a>
              <p className="mt-2 font-body text-xs leading-5 text-[var(--muted)]">
                For submissions, editorial queries, and review-related correspondence.
              </p>
            </ParchmentCard>

            <ParchmentCard className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <ScrollText size={18} className="text-[var(--gold)]" />
                <h3 className="font-display text-xl text-[var(--ink)]">Submissions</h3>
              </div>
              <p className="font-body text-xs leading-5 text-[var(--ink-soft)]">
                For manuscript submissions, please use the online portal. It allows file uploads
                and tracks your submission status automatically.
              </p>
              <a href="/submit" className="btn-ink mt-4 inline-flex">Submit Portal</a>
            </ParchmentCard>

            <ParchmentCard className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <MapPin size={18} className="text-[var(--gold)]" />
                <h3 className="font-display text-xl text-[var(--ink)]">Response Time</h3>
              </div>
              <p className="font-body text-xs leading-5 text-[var(--muted)]">
                General enquiries: 3–5 working days.<br />
                Submission acknowledgements: 7–10 working days.<br />
                Full editorial decisions: 6–10 weeks.
              </p>
            </ParchmentCard>
          </div>
        </div>
      </section>
    </div>
  );
}
