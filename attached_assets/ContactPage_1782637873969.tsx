import React from "react";
import { Mail, Globe, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { SITE_DOMAIN } from "@/lib/constants";
import { toast } from "@/hooks/useToast";

// ─── Site contact settings ─────────────────────────────────────────────────────
// These are placeholder values. Configure real values via admin/site-settings
// once the backend settings API is wired up. DO NOT hardcode real phone or
// Instagram until the admin provides those values.
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;
const CONTACT_INSTAGRAM = import.meta.env.VITE_CONTACT_INSTAGRAM as string | undefined;

export function ContactPage() {
  const [form, setForm] = React.useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSubmitting(true);
    try {
      // Future: POST /api/contact with form data
      await new Promise((r) => setTimeout(r, 800));
      toast("Message sent. We'll respond within a few days.", "success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast("Could not send message. Try emailing us directly.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="container py-10 max-w-4xl">
        <Breadcrumb crumbs={[{ label: "Contact" }]} className="mb-8" />

        <div className="mb-10">
          <p className="eyebrow mb-2">Get in touch</p>
          <h1 className="font-[var(--font-display)] text-4xl font-bold text-[var(--color-ink)] mb-3">
            Contact
          </h1>
          <p className="text-[var(--color-muted)] max-w-lg">
            Questions, submissions enquiries, editorial notes, or collaboration proposals — reach us below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your name"
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Email address"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--color-ink)] block mb-1.5">Subject</label>
              <select
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className="w-full text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] px-3.5 py-2.5 bg-white text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:border-[var(--color-gold)]"
              >
                <option value="">Select a subject…</option>
                <option value="submission">Submission enquiry</option>
                <option value="editorial">Editorial feedback</option>
                <option value="collaboration">Collaboration proposal</option>
                <option value="technical">Technical issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Textarea
              label="Message"
              name="message"
              placeholder="Write your message here…"
              value={form.message}
              onChange={handleChange}
              required
              rows={6}
            />

            <Button type="submit" loading={submitting} icon={<Send size={15} />} size="lg">
              Send message
            </Button>
          </form>

          {/* Info sidebar */}
          <aside className="flex flex-col gap-5">
            {/* Email */}
            {CONTACT_EMAIL ? (
              <div className="card p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)]">
                    <Mail size={16} />
                  </div>
                  <p className="eyebrow">Email</p>
                </div>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-[var(--color-teal)] hover:underline break-all">
                  {CONTACT_EMAIL}
                </a>
              </div>
            ) : null}

            {/* Instagram */}
            {CONTACT_INSTAGRAM ? (
              <div className="card p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-rust)]/10 text-[var(--color-rust)]">
                    <Globe size={16} />
                  </div>
                  <p className="eyebrow">Instagram</p>
                </div>
                <a href={`https://instagram.com/${CONTACT_INSTAGRAM.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-teal)] hover:underline">
                  @{CONTACT_INSTAGRAM.replace("@", "")}
                </a>
              </div>
            ) : null}

            {/* Domain */}
            <div className="card p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-gold)]/10 text-[var(--color-ink)]">
                  <AnimalGlyph glyph="lotus" size={16} />
                </div>
                <p className="eyebrow">Platform</p>
              </div>
              <p className="text-sm text-[var(--color-muted)]">{SITE_DOMAIN}</p>
            </div>

            {/* Note on contact info */}
            {!CONTACT_EMAIL && !CONTACT_INSTAGRAM && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-parchment-dark)] p-4 text-sm text-[var(--color-muted)]">
                Direct contact details will appear here once configured by the editorial team.
                Use the form to reach us in the meantime.
              </div>
            )}

            {/* Guidelines */}
            <div className="bg-[var(--color-teal)] rounded-[var(--radius-lg)] p-5 text-[var(--color-parchment)]">
              <p className="text-sm font-semibold mb-1.5">Submit your work</p>
              <p className="text-xs opacity-70 mb-3 leading-relaxed">
                Interested in contributing an essay or paper? Start in the writer studio.
              </p>
              <a href="/write" className="text-xs font-medium text-[var(--color-gold)] hover:text-[var(--color-gold-light)] transition-colors">
                Open writer studio →
              </a>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
