import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Image as ImageIcon, X, CheckCircle, AlertCircle, Lock, Cloud, Save } from "lucide-react";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";
import { useAuth } from "@/hooks/useAuth";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "anvikshiki_write_draft";

const DOMAINS = ["Philosophy","History","Psychology","Sociology","Science","Geopolitics","Civilizational Thought","Aesthetics","Sanskrit Studies","Political Theory","Economics","Other"];
const LANGUAGES = ["English","Sanskrit","Hindi","Bengali","Tamil","Telugu","Other"];

interface Draft {
  type: string;
  fullName: string;
  email: string;
  institution: string;
  language: string;
  title: string;
  domain: string;
  abstract: string;
  keywords: string;
  body: string;
  notes: string;
}

const EMPTY: Draft = {
  type: "", fullName: "", email: "", institution: "", language: "English",
  title: "", domain: "", abstract: "", keywords: "", body: "", notes: "",
};

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return EMPTY;
}

export default function SubmitWritePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [draft, setDraft] = useState<Draft>(() => {
    const d = loadDraft();
    const type = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
    return { ...d, type, fullName: d.fullName || user?.name || "", email: d.email || user?.email || "" };
  });

  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved">("idle");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string>("");
  const [imgDragging, setImgDragging] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const imgRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = bodyRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.max(400, ta.scrollHeight) + "px";
  }, [draft.body]);

  const saveDraft = useCallback((d: Draft) => {
    setSaveStatus("saving");
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveStatus("saved"), 600);
  }, []);

  const set = (k: keyof Draft, v: string) => {
    setDraft(prev => {
      const next = { ...prev, [k]: v };
      saveDraft(next);
      return next;
    });
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const pickImg = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please upload a JPG, PNG, or WEBP image"); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Image must be under 20 MB"); return; }
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setError("");
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof Draft, string>> = {};
    if (!draft.fullName.trim()) e.fullName = "Name is required";
    if (!draft.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(draft.email)) e.email = "Valid email required";
    if (!draft.title.trim()) e.title = "Title is required";
    if (!draft.domain) e.domain = "Domain is required";
    if (!draft.abstract.trim() || draft.abstract.length < 30) e.abstract = "Please write a brief abstract (30+ characters)";
    if (!draft.body.trim() || draft.body.length < 100) e.body = "Essay body must be at least 100 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) { setError("Please fix the highlighted fields before submitting."); return; }
    if (!declared) { setError("Please confirm the declaration before submitting."); return; }
    setError(""); setSubmitting(true);

    try {
      const typeMap: Record<string, string> = { essay: "ESSAY", paper: "PAPER", review: "REVIEW", commentary: "COMMENTARY", "book-review": "COMMENTARY", translation: "ESSAY" };
      const type = typeMap[(draft.type || "essay").toLowerCase()] || "ESSAY";

      // If there's an image, upload it first via the upload endpoint,
      // then submit the write form with the image URL in notes.
      let imageUrl = "";
      if (imgFile) {
        const fd = new FormData();
        fd.append("coverImage", imgFile);
        fd.append("submitterName", draft.fullName);
        fd.append("submitterEmail", draft.email);
        fd.append("title", draft.title);
        fd.append("abstract", draft.abstract || "See body.");
        fd.append("type", type);
        fd.append("consent", "true");
        const imgRes = await fetch(`${base()}/api/submissions/upload`, { method: "POST", credentials: "include", body: fd });
        if (imgRes.ok) {
          const d = await imgRes.json();
          imageUrl = d.submission?.coverImageUrl || "";
          // We'll use the actual text-write endpoint now
        }
      }

      const body = {
        type,
        submitterName: draft.fullName,
        submitterEmail: draft.email,
        title: draft.title,
        abstract: draft.abstract || "See essay body.",
        body: draft.body,
        notes: [
          draft.institution ? `Institution: ${draft.institution}` : "",
          draft.domain ? `Domain: ${draft.domain}` : "",
          draft.keywords ? `Keywords: ${draft.keywords}` : "",
          draft.language !== "English" ? `Language: ${draft.language}` : "",
          draft.notes ? `Author notes: ${draft.notes}` : "",
          imageUrl ? `Cover image: ${imageUrl}` : "",
        ].filter(Boolean).join("\n"),
        consent: true,
      };

      const r = await fetch(`${base()}/api/submissions/write`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Submission failed");

      sessionStorage.setItem("anvikshiki_submit_id", data.submission?.id || "");
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("anvikshiki_submit_type");
      navigate("/submit/success");
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const wordCount = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;
  const charCount = draft.body.length;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ══ Header ══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0f0820 0%, #12081a 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(74,40,120,0.25) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-12">
          <Link href="/submit" className="flex items-center gap-1.5 mb-5 font-ui text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--ink-faint)" }}>
            <ArrowLeft size={12} /> Back to Submission Portal
          </Link>
          <LotusIcon size={22} className="mb-3" style={{ color: "var(--gold)", opacity: 0.7 }} />
          <h1 className="font-display" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", color: "var(--gold-bright)", letterSpacing: "0.08em" }}>Write Your Essay</h1>
          <p className="font-body text-sm mt-2" style={{ color: "var(--ink-faint)" }}>Your draft is saved automatically as you write</p>
        </div>
      </div>

      <div className="container-anv pb-24" style={{ maxWidth: 900 }}>
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left: Metadata ── */}
          <div className="space-y-4">

            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,90,20,0.15)" }}>
              {saveStatus === "saved"
                ? <><Cloud size={13} style={{ color: "#4ade80", flexShrink: 0 }} /><span className="font-ui text-[10px]" style={{ color: "#4ade80" }}>Draft saved</span></>
                : saveStatus === "saving"
                ? <><Save size={13} style={{ color: "var(--gold)", flexShrink: 0, opacity: 0.6 }} /><span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>Saving…</span></>
                : <><Save size={13} style={{ color: "var(--gold)", flexShrink: 0, opacity: 0.4 }} /><span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>Auto-save on</span></>
              }
            </div>

            <div className="card-sacred p-5 space-y-4">
              <div className="section-label mb-1">Your Details</div>

              <F label="Full Name *" error={errors.fullName}>
                <input className="input-sacred" type="text" placeholder="Your full name" value={draft.fullName} onChange={e => set("fullName", e.target.value)} />
              </F>
              <F label="Email Address *" error={errors.email}>
                <input className="input-sacred" type="email" placeholder="you@institution.edu" value={draft.email} onChange={e => set("email", e.target.value)} />
              </F>
              <F label="Institution">
                <input className="input-sacred" type="text" placeholder="University, think-tank…" value={draft.institution} onChange={e => set("institution", e.target.value)} />
              </F>
              <F label="Language">
                <select className="select-sacred" value={draft.language} onChange={e => set("language", e.target.value)}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </F>
            </div>

            <div className="card-sacred p-5 space-y-4">
              <div className="section-label mb-1">About Your Essay</div>

              <F label="Domain / Category *" error={errors.domain}>
                <select className="select-sacred" value={draft.domain} onChange={e => set("domain", e.target.value)}>
                  <option value="">Select domain…</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </F>
              <F label="Keywords">
                <input className="input-sacred" type="text" placeholder="philosophy, vedanta, consciousness…" value={draft.keywords} onChange={e => set("keywords", e.target.value)} />
              </F>
              <F label="Notes for Editors">
                <textarea className="textarea-sacred" placeholder="Any context, co-authors, or notes…" rows={3} value={draft.notes} onChange={e => set("notes", e.target.value)} />
              </F>
            </div>

            {/* Image upload */}
            <div className="card-sacred p-5">
              <div className="section-label mb-3">Cover / Header Image</div>
              <p className="font-body text-[11px] mb-3" style={{ color: "var(--ink-faint)" }}>Optional — attach a supporting image for your essay.</p>

              {imgPreview ? (
                <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img src={imgPreview} alt="Cover preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImgFile(null); setImgPreview(""); }}
                    className="absolute top-2 right-2 p-1 rounded-full"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className={`upload-zone${imgDragging ? " active" : ""}`}
                  style={{ padding: "1.5rem", minHeight: 100 }}
                  onDragOver={e => { e.preventDefault(); setImgDragging(true); }}
                  onDragLeave={() => setImgDragging(false)}
                  onDrop={e => { e.preventDefault(); setImgDragging(false); const f = e.dataTransfer.files[0]; if (f) pickImg(f); }}
                  onClick={() => imgRef.current?.click()}
                  role="button" tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && imgRef.current?.click()}
                >
                  <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickImg(f); }} />
                  <ImageIcon size={24} style={{ color: "var(--gold)", opacity: 0.5, margin: "0 auto 8px" }} />
                  <p className="font-ui text-xs text-center" style={{ color: "var(--ink-faint)" }}>Drop or click to upload</p>
                  <p className="font-ui text-[10px] text-center mt-1" style={{ color: "var(--ink-faint)", opacity: 0.6 }}>JPG, PNG, WEBP · Max 20 MB</p>
                </div>
              )}
            </div>

          </div>

          {/* ── Right: Writing area ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Title */}
            <div className="card-sacred p-5">
              <F label="Title *" error={errors.title}>
                <input
                  className="input-sacred"
                  type="text"
                  placeholder="Title of your essay or paper…"
                  value={draft.title}
                  onChange={e => set("title", e.target.value)}
                  style={{ fontSize: "1rem", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
                />
              </F>
            </div>

            {/* Abstract */}
            <div className="card-sacred p-5">
              <F label="Abstract *" error={errors.abstract}>
                <textarea
                  className="textarea-sacred"
                  placeholder="A concise summary of your essay — what it argues, how it proceeds, and why it matters (100–500 words recommended)…"
                  rows={4}
                  value={draft.abstract}
                  onChange={e => set("abstract", e.target.value)}
                />
              </F>
            </div>

            {/* Body */}
            <div className="card-sacred" style={{ padding: 0, overflow: "hidden" }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(139,90,20,0.15)" }}>
                <span className="section-label" style={{ marginBottom: 0 }}>Essay Body *</span>
                <span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>
                  {wordCount > 0 ? `${wordCount.toLocaleString()} words · ${charCount.toLocaleString()} chars` : "Start writing below"}
                </span>
              </div>
              {errors.body && (
                <div className="px-5 py-2" style={{ background: "rgba(139,26,74,0.08)", borderBottom: "1px solid rgba(139,26,74,0.15)" }}>
                  <p className="font-ui text-xs" style={{ color: "var(--lotus)" }}>{errors.body}</p>
                </div>
              )}
              <textarea
                ref={bodyRef}
                value={draft.body}
                onChange={e => set("body", e.target.value)}
                placeholder={`Begin your essay here…\n\nYour draft is saved automatically after every keystroke. Take your time — nothing will be lost.\n\nYou can write plain text or use basic HTML for structure:\n  <h2>Section Heading</h2>\n  <p>Paragraph text here.</p>\n  <em>italic</em>, <strong>bold</strong>`}
                style={{
                  width: "100%",
                  minHeight: 400,
                  padding: "1.5rem",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.95rem",
                  lineHeight: 1.85,
                  color: "var(--ink)",
                  display: "block",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Declaration + Submit */}
            <div className="card-sacred p-5">
              <LotusDivider className="mb-5" style={{ opacity: 0.4 }} />

              <label className="flex items-start gap-3 cursor-pointer mb-5" style={{ userSelect: "none" }}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={declared}
                  onClick={() => setDeclared(v => !v)}
                  style={{
                    width: 20, height: 20, flexShrink: 0, borderRadius: 4, marginTop: 2,
                    border: `1.5px solid ${declared ? "var(--gold)" : "rgba(201,152,58,0.4)"}`,
                    background: declared ? "var(--gold)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s", cursor: "pointer",
                  }}
                >
                  {declared && <CheckCircle size={12} style={{ color: "#06020f" }} />}
                </button>
                <span className="font-body text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                  I confirm this work is my own (or I have permission to submit it) and has not been published elsewhere in this form.
                </span>
              </label>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ background: "rgba(139,26,74,0.12)", border: "1px solid var(--border-rose)" }} role="alert">
                  <AlertCircle size={14} style={{ color: "var(--lotus)", flexShrink: 0, marginTop: 1 }} />
                  <p className="font-ui text-xs" style={{ color: "var(--lotus)" }}>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="w-full btn-sacred btn-gold flex items-center justify-center gap-2"
                style={{ borderRadius: 6, padding: "1rem", fontSize: "0.8rem", letterSpacing: "0.18em" }}
              >
                {submitting ? "Submitting…" : "SUBMIT FOR REVIEW"}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-4">
                <Lock size={11} style={{ color: "var(--ink-faint)", opacity: 0.5 }} />
                <p className="font-ui text-[10px]" style={{ color: "var(--ink-faint)", opacity: 0.55 }}>
                  Your manuscript is encrypted in transit and kept strictly confidential.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {error && <p className="font-ui text-xs mt-1" style={{ color: "var(--lotus)" }}>{error}</p>}
    </div>
  );
}
