import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";

const DOMAINS = ["Philosophy","History","Psychology","Sociology","Science","Geopolitics","Civilizational Thought","Aesthetics","Sanskrit Studies","Political Theory","Other"];
const LENGTHS = ["Short (< 3,000 words)","Medium (3,000–7,000 words)","Long (7,000–15,000 words)","Extended (> 15,000 words)"];
const AUDIENCES = ["Academic / Scholarly","Informed General","Interdisciplinary","Open to All"];
const LANGUAGES = ["English","Sanskrit","Hindi","Bengali","Tamil","Telugu","Other"];

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
  manuscriptType: "", fullName: "", email: "", institution: "", title: "", domain: "", length: "", abstract: "", keywords: "", notes: "", audience: "", language: "English",
};

export default function SubmitDetailsPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    const t = sessionStorage.getItem("anvikshiki_submit_type") || "";
    const saved = sessionStorage.getItem("anvikshiki_submit_details");
    if (saved) { try { setForm({ ...EMPTY, ...JSON.parse(saved), manuscriptType: t || JSON.parse(saved).manuscriptType }); } catch {} }
    else if (t) setForm(f => ({ ...f, manuscriptType: t }));
  }, []);

  const set = (k: keyof FormData, v: string) => {
    setForm(f => { const n = { ...f, [k]: v }; sessionStorage.setItem("anvikshiki_submit_details", JSON.stringify(n)); return n; });
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Name is required";
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.domain) e.domain = "Domain is required";
    if (!form.abstract.trim() || form.abstract.length < 50) e.abstract = "Abstract must be at least 50 characters";
    return e;
  };

  const next = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    navigate("/submit/upload");
  };

  const Field = ({ label, id, required, error, children }: { label: string; id: string; required?: boolean; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="form-label" htmlFor={id}>{label}{required && " *"}</label>
      {children}
      {error && <p className="font-ui text-xs mt-1" style={{ color: "var(--lotus)" }}>{error}</p>}
    </div>
  );

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0f0820 0%, #12081a 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(74,40,120,0.25) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-14">
          <Link href="/submit" className="flex items-center gap-1.5 mb-6 font-ui text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--ink-faint)" }}>
            <ArrowLeft size={12} /> Back
          </Link>
          <LotusIcon size={24} className="mb-3" style={{ color: "var(--gold)", opacity: 0.7 }} />
          <h1 className="font-display" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", color: "var(--gold-bright)", letterSpacing: "0.08em" }}>Manuscript Details</h1>
          <p className="font-body text-sm mt-2" style={{ color: "var(--ink-faint)" }}>Share the essence of your work with clarity and intention</p>
        </div>
      </div>

      <div className="container-anv py-10 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card-sacred p-6 md:p-8" style={{ background: "var(--surface-2)" }}>
              <LotusDivider className="mb-6" />
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Manuscript Type" id="type" required>
                  <input id="type" className="input-sacred" value={form.manuscriptType} readOnly style={{ opacity: 0.7 }} />
                </Field>
                <Field label="Language" id="lang">
                  <select id="lang" className="select-sacred" value={form.language} onChange={e => set("language", e.target.value)}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Full Name" id="name" required error={errors.fullName}>
                  <input id="name" className="input-sacred" type="text" placeholder="Your full name" value={form.fullName} onChange={e => set("fullName", e.target.value)} aria-required="true" />
                </Field>
                <Field label="Email Address" id="email" required error={errors.email}>
                  <input id="email" className="input-sacred" type="email" placeholder="you@institution.edu" value={form.email} onChange={e => set("email", e.target.value)} aria-required="true" />
                </Field>
                <Field label="Institution / Affiliation" id="inst">
                  <input id="inst" className="input-sacred" type="text" placeholder="University, think-tank, independent…" value={form.institution} onChange={e => set("institution", e.target.value)} />
                </Field>
                <Field label="Focus Area / Domain" id="domain" required error={errors.domain}>
                  <select id="domain" className="select-sacred" value={form.domain} onChange={e => set("domain", e.target.value)} aria-required="true">
                    <option value="">Select domain…</option>
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Title" id="title" required error={errors.title}>
                  <input id="title" className="input-sacred" type="text" placeholder="Full title of your manuscript" value={form.title} onChange={e => set("title", e.target.value)} aria-required="true" />
                </Field>
                <Field label="Length" id="len">
                  <select id="len" className="select-sacred" value={form.length} onChange={e => set("length", e.target.value)}>
                    <option value="">Select length…</option>
                    {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Abstract" id="abstract" required error={errors.abstract}>
                    <textarea id="abstract" className="textarea-sacred" placeholder="A clear, concise summary of your work (100–500 words recommended)…" value={form.abstract} onChange={e => set("abstract", e.target.value)} rows={5} aria-required="true" />
                  </Field>
                </div>
                <Field label="Keywords" id="kw">
                  <input id="kw" className="input-sacred" type="text" placeholder="philosophy, consciousness, vedanta…" value={form.keywords} onChange={e => set("keywords", e.target.value)} />
                </Field>
                <Field label="Intended Readership" id="aud">
                  <select id="aud" className="select-sacred" value={form.audience} onChange={e => set("audience", e.target.value)}>
                    <option value="">Select audience…</option>
                    {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Additional Notes" id="notes">
                    <textarea id="notes" className="textarea-sacred" placeholder="Any context, co-authors, or notes for the editorial team…" value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
                  </Field>
                </div>
              </div>

              <LotusDivider className="my-6" />
              <div className="flex justify-between items-center">
                <Link href="/submit" className="btn-sacred btn-ghost text-xs"><ArrowLeft size={14} /> Back</Link>
                <button type="button" onClick={next} className="btn-sacred btn-gold">
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar guidance */}
          <div className="space-y-4">
            <div className="card-sacred p-5">
              <div className="section-label mb-3">Guidance</div>
              <ul className="space-y-4">
                {[
                  { icon: "🕉️", t: "Core Idea", d: "Share the core idea of your manuscript with clarity." },
                  { icon: "📜", t: "Sufficient Detail", d: "Provide enough information to help our readers understand its essence." },
                  { icon: "✨", t: "Refine Later", d: "You can refine details and upload files in the next steps." },
                ].map(g => (
                  <li key={g.t} className="flex gap-3">
                    <span style={{ fontSize: "1.125rem" }}>{g.icon}</span>
                    <div>
                      <div className="font-ui text-xs font-semibold mb-0.5" style={{ color: "var(--gold-bright)" }}>{g.t}</div>
                      <div className="font-body text-xs" style={{ color: "var(--ink-faint)" }}>{g.d}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-sacred p-5">
              <div className="section-label mb-3">Notes</div>
              <div style={{ minHeight: 80, opacity: 0.4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LotusIcon size={24} style={{ color: "var(--gold)" }} />
              </div>
              <p className="font-body text-xs text-center" style={{ color: "var(--ink-faint)" }}>Editorial notes will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
