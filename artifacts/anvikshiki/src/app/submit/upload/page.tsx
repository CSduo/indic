import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, ArrowLeft, CheckCircle, Image as ImageIcon, Lock, Upload, X } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { SubmissionStepper } from "@/components/manuscript/SubmissionStepper";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const fmt = (n: number) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;

export default function SubmitUploadPage() {
  const [, navigate] = useLocation();
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [declared, setDeclared] = useState(false);
  const [dragging, setDragging] = useState<"main" | "img" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const mainRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const pickMain = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setError("File must be under 50 MB");
      return;
    }
    const ok = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type);
    if (!ok) {
      setError("Please upload PDF, DOC, DOCX, or TXT");
      return;
    }
    setMainFile(file);
    setError("");
  };

  const pickImg = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError("Image must be under 20 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload a JPG, PNG, or WEBP image");
      return;
    }
    setImgFile(file);
    setError("");
  };

  const submit = async () => {
    if (!mainFile) {
      setError("Please upload your manuscript file");
      return;
    }
    if (!declared) {
      setError("Please confirm the declaration");
      return;
    }
    setError("");
    setSubmitting(true);
    setProgress(15);

    const detailsRaw = sessionStorage.getItem("anvikshiki_submit_details");
    const typeRaw = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
    const details = detailsRaw ? JSON.parse(detailsRaw) : {};
    const typeMap: Record<string, string> = { essay: "ESSAY", paper: "PAPER", review: "REVIEW", commentary: "COMMENTARY", "book-review": "COMMENTARY", translation: "ESSAY" };
    const type = typeMap[typeRaw.toLowerCase()] || "ESSAY";

    if (!details.fullName && !details.name) {
      setError("Submission details are missing. Please go back to Details.");
      setSubmitting(false);
      setProgress(0);
      return;
    }
    if (!details.email || !details.title) {
      setError("Submission details are missing. Please go back to Details.");
      setSubmitting(false);
      setProgress(0);
      return;
    }

    try {
      const sim = window.setInterval(() => setProgress((value) => Math.min(value + 10, 85)), 400);
      const formData = new FormData();
      formData.append("manuscript", mainFile);
      if (imgFile) formData.append("coverImage", imgFile);
      formData.append("submitterName", details.fullName || details.name || "");
      formData.append("submitterEmail", details.email || "");
      formData.append("title", details.title || "");
      formData.append("abstract", details.abstract || "See attached manuscript.");
      formData.append("type", type);
      formData.append("consent", "true");
      if (details.domain) formData.append("domain", details.domain);
      if (details.keywords) formData.append("keywords", details.keywords);
      if (details.notes) formData.append("notes", details.notes);

      const response = await fetch(`${base()}/api/submissions/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      window.clearInterval(sim);
      setProgress(100);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");
      sessionStorage.setItem("anvikshiki_submit_id", data.submission?.id || "");
      sessionStorage.removeItem("anvikshiki_submit_details");
      sessionStorage.removeItem("anvikshiki_submit_type");
      navigate("/submit/success");
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/submit/details" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)]"><ArrowLeft size={13} /> Details</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Upload</span>
        </nav>
        <HeroPanel
          image={asset("/images/heroes/submit-hero.jpg")}
          imageAlt="Illustrated manuscript submission"
          eyebrow="Upload Manuscript"
          title="Send the manuscript."
          description="Attach your file, add an optional cover image, confirm the declaration, and submit for editorial review."
          glyph="submit"
          focal="center"
        />
      </section>

      <section className="container-anv pb-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ParchmentCard className="p-5 md:p-7">
            <SubmissionStepper active={1} className="mb-7" />

            <div className="grid gap-6">
              <div>
                <div className="upload-section-label">Manuscript File *</div>
                <UploadZone
                  file={mainFile}
                  dragging={dragging === "main"}
                  onDragOver={(event) => { event.preventDefault(); setDragging("main"); }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={(event) => { event.preventDefault(); setDragging(null); const file = event.dataTransfer.files[0]; if (file) pickMain(file); }}
                  onClick={() => mainRef.current?.click()}
                  icon={<Upload size={38} className="text-[var(--gold)]" />}
                  accept=".pdf,.doc,.docx,.txt"
                  formatHint="PDF, DOC, DOCX, TXT - Max 50 MB"
                  browseLabel="Browse Files"
                  onRemove={() => setMainFile(null)}
                  inputRef={mainRef}
                  onFileChange={pickMain}
                />
              </div>

              <div>
                <div className="upload-section-label">Cover / Supporting Image <span className="normal-case tracking-normal text-[var(--ink-faint)]">(optional)</span></div>
                <UploadZone
                  file={imgFile}
                  dragging={dragging === "img"}
                  onDragOver={(event) => { event.preventDefault(); setDragging("img"); }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={(event) => { event.preventDefault(); setDragging(null); const file = event.dataTransfer.files[0]; if (file) pickImg(file); }}
                  onClick={() => imgRef.current?.click()}
                  icon={<ImageIcon size={38} className="text-[var(--gold)]" />}
                  accept="image/jpeg,image/png,image/webp,.jpg,.png,.webp"
                  formatHint="JPG, PNG, WEBP - Max 20 MB"
                  browseLabel="Browse Images"
                  onRemove={() => setImgFile(null)}
                  inputRef={imgRef}
                  onFileChange={pickImg}
                />
              </div>
            </div>

            <OrnamentDivider className="my-7" />

            <label className="mb-6 flex cursor-pointer items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={declared}
                onClick={() => setDeclared((value) => !value)}
                className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border"
                style={{ borderColor: declared ? "var(--terracotta)" : "var(--border-ink)", background: declared ? "var(--terracotta)" : "var(--surface)" }}
              >
                {declared ? <CheckCircle size={13} className="text-[var(--surface)]" /> : null}
              </button>
              <span className="font-body text-sm leading-6 text-[var(--ink-soft)]">I confirm this work is mine or I have permission to submit it, and that the manuscript follows the submission guidelines.</span>
            </label>

            {submitting ? (
              <div className="mb-5">
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ink-wash)]">
                  <div className="h-full bg-gradient-to-r from-[var(--terracotta)] to-[var(--gold)] transition-all" style={{ width: `${progress}%` }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
                </div>
                <p className="mt-2 text-center font-ui text-xs uppercase tracking-[0.14em] text-[var(--ink-faint)]">{progress < 100 ? `Uploading ${progress}%` : "Complete"}</p>
              </div>
            ) : null}

            {error ? (
              <div className="mb-5 flex items-start gap-2 rounded-[8px] border border-[var(--border-terracotta)] bg-[var(--terracotta-pale)] p-3" role="alert">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--terracotta)]" />
                <p className="font-ui text-xs text-[var(--terracotta)]">{error}</p>
              </div>
            ) : null}

            <button type="button" onClick={submit} disabled={submitting} className="btn-terracotta w-full justify-center py-4">
              {submitting ? `Uploading ${progress}%...` : <>Submit for Review <ArrowRight size={14} /></>}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 font-ui text-xs text-[var(--ink-faint)]">
              <Lock size={12} /> Your manuscript is uploaded securely and kept confidential.
            </div>
          </ParchmentCard>

          <aside className="space-y-4">
            <ParchmentCard className="p-5">
              <p className="type-section-label mb-4">Submission Checklist</p>
              <ul className="space-y-3 font-body text-sm leading-6 text-[var(--ink-soft)]">
                <li>Abstract completed</li>
                <li>Keywords and domain selected</li>
                <li>Manuscript file attached</li>
                <li>References included</li>
              </ul>
            </ParchmentCard>
            <ParchmentCard className="p-5 text-center">
              <AnimalGlyph domain="archive" size={54} className="mx-auto mb-3 text-[var(--gold)]" />
              <p className="font-display text-2xl text-[var(--ink)]">A living archive receives carefully.</p>
            </ParchmentCard>
          </aside>
        </div>
      </section>
    </div>
  );
}

function UploadZone({ file, dragging, onDragOver, onDragLeave, onDrop, onClick, icon, accept, formatHint, browseLabel, onRemove, inputRef, onFileChange }: {
  file: File | null;
  dragging: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onClick: () => void;
  icon: React.ReactNode;
  accept: string;
  formatHint: string;
  browseLabel: string;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (file: File) => void;
}) {
  return (
    <div
      className={`upload-zone${dragging ? " active" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={!file ? onClick : undefined}
      role={!file ? "button" : undefined}
      tabIndex={!file ? 0 : undefined}
      aria-label={!file ? browseLabel : undefined}
      onKeyDown={!file ? ((event) => event.key === "Enter" && onClick()) : undefined}
      style={{ cursor: !file ? "pointer" : "default" }}
    >
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={(event) => event.target.files?.[0] && onFileChange(event.target.files[0])} />
      {file ? (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle size={30} className="text-[var(--sage)]" />
          <div className="font-ui text-sm font-bold text-[var(--ink)]">{file.name}</div>
          <div className="font-ui text-xs text-[var(--muted)]">{fmt(file.size)}</div>
          <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(); }} className="mt-1 flex items-center gap-1 font-ui text-xs text-[var(--terracotta)]">
            <X size={12} /> Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {icon}
          <div className="text-center">
            <div className="font-ui text-sm font-bold text-[var(--ink)]">Drag and drop your file here</div>
            <div className="mt-1 font-ui text-xs text-[var(--muted)]">or tap to browse</div>
          </div>
          <div className="font-ui text-xs text-[var(--ink-faint)]">{formatHint}</div>
          <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} className="btn-ink min-h-0 px-4 py-2">
            {browseLabel}
          </button>
        </div>
      )}
    </div>
  );
}
