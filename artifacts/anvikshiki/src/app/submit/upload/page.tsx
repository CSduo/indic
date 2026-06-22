import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, X, CheckCircle, AlertCircle, Upload, Image as ImageIcon, Lock } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const fmt = (n: number) => n < 1024 ? n + " B" : n < 1024*1024 ? (n/1024).toFixed(1) + " KB" : (n/(1024*1024)).toFixed(1) + " MB";

export default function SubmitUploadPage() {
  const [, navigate] = useLocation();
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [declared, setDeclared] = useState(false);
  const [dragging, setDragging] = useState<"main"|"img"|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const mainRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const pickMain = (file: File) => {
    if (file.size > 50*1024*1024) { setError("File must be under 50 MB"); return; }
    const ok = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"].includes(file.type);
    if (!ok) { setError("Please upload PDF, DOC, DOCX, or TXT"); return; }
    setMainFile(file); setError("");
  };

  const pickImg = (file: File) => {
    if (file.size > 20*1024*1024) { setError("Image must be under 20 MB"); return; }
    const ok = file.type.startsWith("image/");
    if (!ok) { setError("Please upload a JPG, PNG, or WEBP image"); return; }
    setImgFile(file); setError("");
  };

  const submit = async () => {
    if (!mainFile) { setError("Please upload your manuscript file"); return; }
    if (!declared) { setError("Please confirm the declaration"); return; }
    setError(""); setSubmitting(true); setProgress(15);

    const detailsRaw = sessionStorage.getItem("anvikshiki_submit_details");
    const typeRaw = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
    const details = detailsRaw ? JSON.parse(detailsRaw) : {};
    const typeMap: Record<string,string> = { essay:"ESSAY", paper:"PAPER", review:"REVIEW", commentary:"COMMENTARY", "book-review":"COMMENTARY", translation:"ESSAY" };
    const type = typeMap[typeRaw.toLowerCase()] || "ESSAY";

    const fileNote = [
      `File: ${mainFile.name} (${fmt(mainFile.size)})`,
      imgFile ? `Cover image: ${imgFile.name} (${fmt(imgFile.size)})` : "",
      details.domain ? `Domain: ${details.domain}` : "",
      details.keywords ? `Keywords: ${details.keywords}` : "",
      details.audience ? `Audience: ${details.audience}` : "",
      details.notes ? `Notes: ${details.notes}` : "",
    ].filter(Boolean).join("\n");

    const payload = {
      submitterName: details.fullName || details.name || "",
      submitterEmail: details.email || "",
      title: details.title || "",
      abstract: details.abstract || "See attached manuscript.",
      notes: fileNote, type, consent: true,
    };

    if (!payload.submitterName || !payload.submitterEmail || !payload.title) {
      setError("Submission details are missing. Please go back to Step 2."); setSubmitting(false); setProgress(0); return;
    }

    try {
      const sim = setInterval(() => setProgress(p => Math.min(p + 12, 88)), 320);
      const r = await fetch(`${base()}/api/submissions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      });
      clearInterval(sim); setProgress(100);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Submission failed");
      sessionStorage.setItem("anvikshiki_submit_id", data.submission?.id || "");
      sessionStorage.removeItem("anvikshiki_submit_details");
      sessionStorage.removeItem("anvikshiki_submit_type");
      navigate("/submit/success");
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again."); setSubmitting(false); setProgress(0);
    }
  };

  return (
    <div style={{ background: "#06020f", minHeight: "100vh" }}>
      {/* ══ Header area ══ */}
      <div className="relative overflow-hidden" style={{ paddingTop: "2.5rem", paddingBottom: "3rem", textAlign: "center" }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0a0420 0%, #06020f 100%)" }} />
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 500, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(74,40,120,0.28) 0%, transparent 65%)" }} />
        </div>

        <div className="container-anv relative z-10">
          <Link href="/submit/details" className="inline-flex items-center gap-1.5 mb-6 font-ui text-xs transition-opacity hover:opacity-70" style={{ color: "var(--ink-faint)" }}>
            <ArrowLeft size={12} /> Back to Details
          </Link>

          {/* Emblem */}
          <div className="flex justify-center mb-4">
            <div style={{ filter: "drop-shadow(0 0 20px rgba(201,152,58,0.35))" }}>
              <Emblem size={64} />
            </div>
          </div>

          <h1 className="font-display mb-2" style={{ fontSize: "clamp(1.8rem, 5vw, 3.2rem)", color: "var(--gold-bright)", letterSpacing: "0.08em" }}>Submit Your Work</h1>
          <div style={{ height: 1, width: 48, background: "var(--border-gold)", margin: "0.75rem auto" }} />
          <p className="font-body text-sm italic" style={{ color: "var(--ink-faint)", maxWidth: 340, margin: "0 auto" }}>
            Share your research. Contribute to the archive of<br/>inquiry &amp; civilizational wisdom.
          </p>
        </div>
      </div>

      {/* ══ Upload form ══ */}
      <div className="container-anv pb-20" style={{ maxWidth: 600 }}>

        {/* 1. Paper upload */}
        <div className="mb-6">
          <div className="upload-section-label">1. Upload Your Paper *</div>
          <UploadZone
            file={mainFile}
            dragging={dragging === "main"}
            onDragOver={e => { e.preventDefault(); setDragging("main"); }}
            onDragLeave={() => setDragging(null)}
            onDrop={e => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) pickMain(f); }}
            onClick={() => mainRef.current?.click()}
            icon={<Upload size={36} style={{ color: "var(--gold)", opacity: 0.55 }} />}
            accept=".pdf,.doc,.docx,.txt"
            formatHint="PDF, DOC, DOCX · Max 50 MB"
            browseLabel="Browse Files"
            onRemove={() => setMainFile(null)}
            inputRef={mainRef}
            onFileChange={f => pickMain(f)}
          />
        </div>

        {/* 2. Cover image upload */}
        <div className="mb-8">
          <div className="upload-section-label">2. Upload Cover / Supporting Image <span style={{ opacity: 0.5, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
          <UploadZone
            file={imgFile}
            dragging={dragging === "img"}
            onDragOver={e => { e.preventDefault(); setDragging("img"); }}
            onDragLeave={() => setDragging(null)}
            onDrop={e => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) pickImg(f); }}
            onClick={() => imgRef.current?.click()}
            icon={<ImageIcon size={36} style={{ color: "var(--gold)", opacity: 0.55 }} />}
            accept="image/jpeg,image/png,image/webp,.jpg,.png,.webp"
            formatHint="JPG, PNG, WEBP · Max 20 MB"
            browseLabel="Browse Images"
            onRemove={() => setImgFile(null)}
            inputRef={imgRef}
            onFileChange={f => pickImg(f)}
          />
        </div>

        {/* Lotus divider */}
        <LotusDivider className="mb-6" />

        {/* Declaration checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-7" style={{ userSelect: "none" }}>
          <button
            type="button"
            role="checkbox"
            aria-checked={declared}
            onClick={() => setDeclared(v => !v)}
            style={{
              width: 20, height: 20, flexShrink: 0, borderRadius: 4, marginTop: 1,
              border: `1.5px solid ${declared ? "var(--gold)" : "rgba(201,152,58,0.4)"}`,
              background: declared ? "var(--gold)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", cursor: "pointer",
            }}
          >
            {declared && <CheckCircle size={12} style={{ color: "#06020f" }} />}
          </button>
          <span className="font-body text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            I confirm this work is mine or I have permission to submit it.
          </span>
        </label>

        {/* Progress bar */}
        {submitting && (
          <div className="mb-5">
            <div style={{ height: 2, background: "rgba(201,152,58,0.15)", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, var(--rose-bright), var(--gold), var(--gold-bright))", transition: "width 0.35s ease", boxShadow: "0 0 10px rgba(201,152,58,0.5)" }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
            </div>
            <p className="font-ui text-[10px] text-center mt-2 tracking-[0.15em]" style={{ color: "var(--ink-faint)" }}>
              {progress < 100 ? `Submitting… ${progress}%` : "Complete"}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg mb-5" style={{ background: "rgba(139,26,74,0.12)", border: "1px solid var(--border-rose)" }} role="alert">
            <AlertCircle size={14} style={{ color: "var(--lotus)", flexShrink: 0, marginTop: 1 }} />
            <p className="font-ui text-xs" style={{ color: "var(--lotus)" }}>{error}</p>
          </div>
        )}

        {/* Submit CTA */}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full btn-sacred btn-gold flex items-center justify-center gap-2"
          style={{ borderRadius: 6, padding: "1rem", fontSize: "0.8rem", letterSpacing: "0.18em" }}
        >
          {submitting ? `Submitting ${progress}%…` : (<>SUBMIT FOR REVIEW <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} /></>)}
        </button>

        {/* Security note */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <Lock size={11} style={{ color: "var(--ink-faint)", opacity: 0.5 }} />
          <p className="font-ui text-[10px]" style={{ color: "var(--ink-faint)", opacity: 0.55 }}>Your submission is secure and confidential.</p>
        </div>
      </div>
    </div>
  );
}

function UploadZone({ file, dragging, onDragOver, onDragLeave, onDrop, onClick, icon, accept, formatHint, browseLabel, onRemove, inputRef, onFileChange }: {
  file: File | null; dragging: boolean;
  onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void; onDrop: (e: React.DragEvent) => void;
  onClick: () => void; icon: React.ReactNode; accept: string; formatHint: string; browseLabel: string;
  onRemove: () => void; inputRef: React.RefObject<HTMLInputElement>; onFileChange: (f: File) => void;
}) {
  return (
    <div
      className={`upload-zone${dragging ? " active" : ""}`}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      onClick={!file ? onClick : undefined}
      role={!file ? "button" : undefined}
      tabIndex={!file ? 0 : undefined}
      aria-label={!file ? browseLabel : undefined}
      onKeyDown={!file ? (e => e.key === "Enter" && onClick()) : undefined}
      style={{ cursor: !file ? "pointer" : "default" }}
    >
      <input ref={inputRef} type="file" accept={accept} className="sr-only"
        onChange={e => e.target.files?.[0] && onFileChange(e.target.files[0])} />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle size={28} style={{ color: "#4ade80" }} />
          <div className="font-ui text-sm font-semibold" style={{ color: "var(--gold-bright)" }}>{file.name}</div>
          <div className="font-ui text-xs" style={{ color: "var(--muted)" }}>{fmt(file.size)}</div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="flex items-center gap-1 font-ui text-xs mt-1"
            style={{ color: "var(--lotus)", opacity: 0.8 }}
          >
            <X size={11} /> Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {icon}
          <div className="text-center">
            <div className="font-ui text-sm font-medium" style={{ color: "var(--ink-soft)" }}>Drag &amp; drop your file here</div>
            <div className="font-ui text-xs mt-0.5" style={{ color: "var(--muted)" }}>or tap to browse</div>
          </div>
          <div className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>{formatHint}</div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="mt-1 px-5 py-2 rounded font-ui text-xs"
            style={{ border: "1px solid rgba(201,152,58,0.45)", color: "var(--gold)", background: "transparent", cursor: "pointer", letterSpacing: "0.08em" }}
          >
            {browseLabel}
          </button>
        </div>
      )}
    </div>
  );
}
