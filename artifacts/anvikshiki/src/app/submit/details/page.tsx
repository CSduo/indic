import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { SubmissionStepper } from "@/components/manuscript/SubmissionStepper";

const DOMAINS = ["Philosophy", "History", "Psychology", "Sociology", "Science", "Geopolitics", "Civilizational Thought", "Aesthetics", "Sanskrit Studies", "Political Theory"];
const LENGTHS = ["Short (< 3,000 words)", "Medium (3,000-7,000 words)", "Long (7,000-15,000 words)", "Extended (> 15,000 words)"];
const AUDIENCES = ["Academic / Scholarly", "Informed General", "Interdisciplinary", "Open to All"];
const LANGUAGES = ["English", "Sanskrit", "Hindi", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Gujarati", "Marathi", "Odia", "Punjabi", "Assamese", "Urdu", "Nepali", "Maithili", "Dogri", "Konkani", "Santhali", "Bodo", "Sindhi", "Manipuri", "Kashmiri", "Sharada Script", "Grantha Script"];
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

interface FormData {
  manuscriptType: string;
  fullName: string;
  email: string;
  institution: string;
  title: string;
  domain: string;
  length: string;
  abstract: string;
  keywords: string;
  notes: string;
  audience: string;
  language: string;
}

const EMPTY: FormData = {
  manuscriptType: "",
  fullName: "",
  email: "",
  institution: "",
  title: "",
  domain: "",
  length: "",
  abstract: "",
  keywords: "",
  notes: "",
  audience: "",
  language: "English",
};

function Field({ label, id, required, error, children }: { label: string; id: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>{label}{required ? " *" : ""}</label>
      {children}
      {error ? <p className="mt-1 font-ui text-xs text-[var(--terracotta)]">{error}</p> : null}
    </div>
  );
}

export default function SubmitDetailsPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    const type = sessionStorage.getItem("anvikshiki_submit_type") || "";
    const saved = sessionStorage.getItem("anvikshiki_submit_details");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm({ ...EMPTY, ...parsed, manuscriptType: type || parsed.manuscriptType });
      } catch {}
    } else if (type) {
      setForm((current) => ({ ...current, manuscriptType: type }));
    }
  }, []);

  const set = (key: keyof FormData, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      sessionStorage.setItem("anvikshiki_submit_details", JSON.stringify(next));
      return next;
    });
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Name is required";
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) nextErrors.email = "Valid email required";
    if (!form.title.trim()) nextErrors.title = "Title is required";
    if (!form.domain) nextErrors.domain = "Domain is required";
    if (!form.abstract.trim() || form.abstract.length < 50) nextErrors.abstract = "Abstract must be at least 50 characters";
    return nextErrors;
  };

  const next = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    navigate("/submit/upload");
  };

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/submit" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)]"><ArrowLeft size={13} /> Submit</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Details</span>
        </nav>
        <HeroPanel
          image={asset("/images/heroes/submit-hero.jpg")}
          imageAlt="Illustrated submission journey"
          eyebrow="Submission Details"
          title="Name the thread."
          description="Add the details that help the editorial team understand the shape, domain, and intention of your work."
          glyph="submit"
          focal="center"
        />
      </section>

      <section className="container-anv pb-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ParchmentCard className="p-5 md:p-7">
            <SubmissionStepper active={0} className="mb-7" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Manuscript Type" id="type" required>
                <input id="type" className="input-sacred" value={form.manuscriptType} readOnly />
              </Field>
              <Field label="Language" id="lang">
                <select id="lang" className="select-sacred" value={form.language} onChange={(event) => set("language", event.target.value)}>
                  {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
                </select>
              </Field>
              <Field label="Full Name" id="name" required error={errors.fullName}>
                <input id="name" className="input-sacred" type="text" placeholder="Your full name" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} aria-required="true" />
              </Field>
              <Field label="Email Address" id="email" required error={errors.email}>
                <input id="email" className="input-sacred" type="email" placeholder="you@institution.edu" value={form.email} onChange={(event) => set("email", event.target.value)} aria-required="true" />
              </Field>
              <Field label="Institution / Affiliation" id="inst">
                <input id="inst" className="input-sacred" type="text" placeholder="University, research group, independent..." value={form.institution} onChange={(event) => set("institution", event.target.value)} />
              </Field>
              <Field label="Focus Area / Domain" id="domain" required error={errors.domain}>
                <select id="domain" className="select-sacred" value={form.domain} onChange={(event) => set("domain", event.target.value)} aria-required="true">
                  <option value="">Select domain...</option>
                  {DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                </select>
              </Field>
              <Field label="Title" id="title" required error={errors.title}>
                <input id="title" className="input-sacred" type="text" placeholder="Full title of your manuscript" value={form.title} onChange={(event) => set("title", event.target.value)} aria-required="true" />
              </Field>
              <Field label="Length" id="len">
                <select id="len" className="select-sacred" value={form.length} onChange={(event) => set("length", event.target.value)}>
                  <option value="">Select length...</option>
                  {LENGTHS.map((length) => <option key={length} value={length}>{length}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Abstract" id="abstract" required error={errors.abstract}>
                  <textarea id="abstract" className="textarea-sacred" placeholder="A clear summary of your work (100-500 words recommended)..." value={form.abstract} onChange={(event) => set("abstract", event.target.value)} rows={5} aria-required="true" />
                </Field>
              </div>
              <Field label="Keywords" id="kw">
                <input id="kw" className="input-sacred" type="text" placeholder="philosophy, history, ritual, ecology..." value={form.keywords} onChange={(event) => set("keywords", event.target.value)} />
              </Field>
              <Field label="Intended Readership" id="aud">
                <select id="aud" className="select-sacred" value={form.audience} onChange={(event) => set("audience", event.target.value)}>
                  <option value="">Select audience...</option>
                  {AUDIENCES.map((audience) => <option key={audience} value={audience}>{audience}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Additional Notes" id="notes">
                  <textarea id="notes" className="textarea-sacred" placeholder="Any context, co-authors, or notes for the editorial team..." value={form.notes} onChange={(event) => set("notes", event.target.value)} rows={3} />
                </Field>
              </div>
            </div>

            <OrnamentDivider className="my-7" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/submit" className="btn-ink"><ArrowLeft size={14} /> Back</Link>
              <button type="button" onClick={next} className="btn-terracotta">
                Continue to Upload <ArrowRight size={14} />
              </button>
            </div>
          </ParchmentCard>

          <aside className="space-y-4">
            <ParchmentCard className="p-5">
              <p className="type-section-label mb-4">Guidance</p>
              <div className="space-y-4">
                {[
                  ["philosophy", "Core Idea", "Make the central question unmistakable."],
                  ["archive", "Context", "Tell us the tradition, field, or archive your work enters."],
                  ["science", "Clarity", "Short, precise abstracts help the editorial review."],
                ].map(([domain, title, desc]) => (
                  <div key={title} className="flex gap-3">
                    <AnimalGlyph domain={domain} size={26} className="shrink-0 text-[var(--gold)]" />
                    <div>
                      <h3 className="font-ui text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]">{title}</h3>
                      <p className="mt-1 font-body text-sm leading-6 text-[var(--ink-soft)]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ParchmentCard>
          </aside>
        </div>
      </section>
    </div>
  );
}
