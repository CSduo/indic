import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Image as ImageIcon,
  Link2, Lock, Upload, X, FileText,
} from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { SubmissionStepper } from "@/components/manuscript/SubmissionStepper";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const fmt = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;

const STORAGE_KEY = "anvikshiki_write_draft";

/* ── Text extraction helpers ─────────────────────────────────────── */
async function extractTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file, "utf-8");
  });
}

async function extractPdf(file: File): Promise<string> {
  // Dynamically import pdfjs-dist to keep initial bundle small
  const pdfjsLib = await import("pdfjs-dist");
  // Point to the worker shipped with the package
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractText(file: File): Promise<string | null> {
  if (file.type === "text/plain") return extractTxt(file);
  if (file.type === "application/pdf") return extractPdf(file);
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  )
    return extractDocx(file);
  return null;
}

export default function SubmitUploadPage() {
  const [, navigate] = useLocation();

  // "file" or "url" tab
  const [tab, setTab] = useState<"file" | "url">("file");

  // File upload state
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState<"main" | "img" | null>(null);
  const mainRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  // URL state
  const [urlValue, setUrlValue] = useState("");
  const [urlFetching, setUrlFetching] = useState(false);

  // Shared
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);

  /* ── File validation ─────────────────────────────────────────────── */
  const pickMain = (file: File) => {
    if (file.size > 50 * 1024 * 1024) { setError("File must be under 50 MB"); return; }
    const ok = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ].includes(file.type);
    if (!ok) { setError("Please upload PDF, DOC, DOCX, or TXT"); return; }
    setMainFile(file);
    setError("");
  };

  const pickImg = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { setError("Image must be under 20 MB"); return; }
    if (!file.type.startsWith("image/")) { setError("Please upload a JPG, PNG, or WEBP image"); return; }
    setImgFile(file);
    setError("");
  };

  /* ── Extract text from file and navigate to write editor ─────────── */
  const extractAndWrite = async (file: File) => {
    setExtracting(true);
    setError("");
    try {
      const text = await extractText(file);
      if (text && text.trim().length > 0) {
        // Merge into the write draft
        const existing: any = {};
        try { Object.assign(existing, JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}")); } catch {}
        const type = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, type, body: text.trim() }));
        navigate("/submit/write");
      } else {
        setError("Could not extract text from this file. Try uploading as .txt or paste via URL.");
      }
    } catch (err: any) {
      setError(`Text extraction failed: ${err.message}. You can still upload the file directly.`);
    } finally {
      setExtracting(false);
    }
  };

  /* ── Fetch text from URL ─────────────────────────────────────────── */
  const fetchUrl = async () => {
    if (!urlValue.trim()) { setError("Please enter a URL"); return; }
    let url: string;
    try { url = new URL(urlValue.trim()).href; } catch { setError("Please enter a valid URL (include https://)"); return; }
    setUrlFetching(true);
    setError("");
    try {
      const res = await fetch(`${base()}/api/extract-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch URL");
      const text: string = data.text || "";
      const existing: any = {};
      try { Object.assign(existing, JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}")); } catch {}
      const type = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, type, body: text.trim() }));
      navigate("/submit/write");
    } catch (err: any) {
      setError(err.message || "Failed to fetch content from URL.");
    } finally {
      setUrlFetching(false);
    }
  };

  /* ── Traditional file upload (sends to API) ──────────────────────── */
  const submit = async () => {
    if (!mainFile) { setError("Please upload your manuscript file"); return; }
    if (!declared) { setError("Please confirm the declaration"); return; }
    setError("");
    setSubmitting(true);
    setProgress(15);

    const detailsRaw = sessionStorage.getItem("anvikshiki_submit_details");
    const typeRaw = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
    const details = detailsRaw ? JSON.parse(detailsRaw) : {};
    const typeMap: Record<string, string> = {
      essay: "ESSAY", paper: "PAPER", review: "REVIEW",
      commentary: "COMMENTARY", "book-review": "COMMENTARY", translation: "ESSAY",
    };
    const type = typeMap[typeRaw.toLowerCase()] || "ESSAY";

    if (!details.fullName && !details.name) {
      setError("Submission details are missing. Please go back to Details.");
      setSubmitting(false); setProgress(0); return;
    }
    if (!details.email || !details.title) {
      setError("Submission details are missing. Please go back to Details.");
      setSubmitting(false); setProgress(0); return;
    }

    try {
      const sim = window.setInterval(() => setProgress((v) => Math.min(v + 10, 85)), 400);

      // Check if Cloudinary is configured
      const healthRes = await fetch(`${base()}/api/health`);
      let isCloudinary = false;
      if (healthRes.ok) {
        const health = await healthRes.json();
        isCloudinary = health?.environment?.storageProvider === "cloudinary";
      }

      if (isCloudinary) {
        const uploadToCloudinary = async (file: File, folder: string, resourceType: string) => {
          const sigRes = await fetch(`${base()}/api/uploads/cloudinary-signature`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder }),
          });
          if (!sigRes.ok) {
            const errData = await sigRes.json();
            throw new Error(errData.error || "Failed to generate upload signature");
          }
          const sigData = await sigRes.json();

          const cloudData = new FormData();
          cloudData.append("file", file);
          cloudData.append("api_key", sigData.apiKey);
          cloudData.append("timestamp", String(sigData.timestamp));
          cloudData.append("signature", sigData.signature);
          cloudData.append("folder", sigData.folder);

          const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`;
          const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            body: cloudData,
          });

          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error("Cloudinary upload failure response:", errText);
            throw new Error("Failed to upload file to Cloudinary cloud storage.");
          }

          const resData = await uploadRes.json();
          return {
            secureUrl: resData.secure_url,
            publicId: resData.public_id,
            resourceType: resData.resource_type || resourceType,
          };
        };

        setProgress(30);
        const manuscriptResult = await uploadToCloudinary(mainFile, "submissions/manuscripts", "auto");

        let coverImageUrl = null;
        let coverImagePublicId = null;
        let coverImageResourceType = null;

        if (imgFile) {
          setProgress(65);
          const coverResult = await uploadToCloudinary(imgFile, "submissions/covers", "image");
          coverImageUrl = coverResult.secureUrl;
          coverImagePublicId = coverResult.publicId;
          coverImageResourceType = coverResult.resourceType;
        }

        setProgress(85);
        const payload = {
          submitterName: details.fullName || details.name || "",
          submitterEmail: details.email || "",
          title: details.title || "",
          abstract: details.abstract || "See attached manuscript.",
          type,
          consent: true,
          domain: details.domain,
          keywords: details.keywords,
          notes: details.notes,
          manuscriptUrl: manuscriptResult.secureUrl,
          manuscriptPublicId: manuscriptResult.publicId,
          manuscriptResourceType: manuscriptResult.resourceType,
          coverUrl: coverImageUrl,
          coverPublicId: coverImagePublicId,
          coverResourceType: coverImageResourceType,
        };

        const response = await fetch(`${base()}/api/submissions/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        window.clearInterval(sim);
        setProgress(100);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Submission failed");
        sessionStorage.setItem("anvikshiki_submit_id", data.submission?.id || "");
      } else {
        // Fallback to local multipart form upload
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
      }

      sessionStorage.removeItem("anvikshiki_submit_details");
      sessionStorage.removeItem("anvikshiki_submit_type");
      navigate("/submit/success");
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
      setSubmitting(false); setProgress(0);
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <nav
          className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]"
          aria-label="Breadcrumb"
        >
          <Link href="/submit/details" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)]">
            <ArrowLeft size={13} /> Details
          </Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Upload</span>
        </nav>
        <HeroPanel
          image={asset("/images/heroes/submit-hero.jpg")}
          imageAlt="Illustrated manuscript submission"
          eyebrow="Upload Manuscript"
          title="Send the manuscript."
          description="Attach your file or paste a URL — your content flows directly into the editor."
          glyph="submit"
          focal="center"
        />
      </section>

      <section className="container-anv pb-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ParchmentCard className="p-5 md:p-7">
            <SubmissionStepper active={1} className="mb-7" />

            {/* ── Source tabs ───────────────────────────────────────── */}
            <div className="mb-6 flex rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] p-1">
              {(["file", "url"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(""); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[6px] py-2 font-ui text-xs font-bold uppercase tracking-[0.1em] transition"
                  style={{
                    background: tab === t ? "var(--terracotta)" : "transparent",
                    color: tab === t ? "var(--surface)" : "var(--muted)",
                  }}
                >
                  {t === "file" ? <><Upload size={13} /> Upload File</> : <><Link2 size={13} /> From URL</>}
                </button>
              ))}
            </div>

            {tab === "file" ? (
              <div className="grid gap-6">
                {/* Manuscript upload */}
                <div>
                  <div className="upload-section-label">Manuscript File *</div>
                  <UploadZone
                    file={mainFile}
                    dragging={dragging === "main"}
                    onDragOver={(e) => { e.preventDefault(); setDragging("main"); }}
                    onDragLeave={() => setDragging(null)}
                    onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) pickMain(f); }}
                    icon={<Upload size={38} className="text-[var(--gold)]" />}
                    accept=".pdf,.doc,.docx,.txt"
                    formatHint="PDF, DOC, DOCX, TXT · Max 50 MB"
                    browseLabel="Browse Files"
                    onRemove={() => setMainFile(null)}
                    inputRef={mainRef}
                    onFileChange={pickMain}
                  />

                  {/* Extract to editor button */}
                  {mainFile && (
                    <button
                      type="button"
                      onClick={() => extractAndWrite(mainFile)}
                      disabled={extracting}
                      className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface-elevated)] px-4 py-2 font-ui text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold)] transition hover:bg-[var(--surface)]"
                    >
                      <FileText size={13} />
                      {extracting ? "Extracting text…" : "Extract text into Editor →"}
                    </button>
                  )}
                </div>

                {/* Cover image */}
                <div>
                  <div className="upload-section-label">
                    Cover / Supporting Image{" "}
                    <span className="normal-case tracking-normal text-[var(--ink-faint)]">(optional)</span>
                  </div>
                  <UploadZone
                    file={imgFile}
                    dragging={dragging === "img"}
                    onDragOver={(e) => { e.preventDefault(); setDragging("img"); }}
                    onDragLeave={() => setDragging(null)}
                    onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) pickImg(f); }}
                    icon={<ImageIcon size={38} className="text-[var(--gold)]" />}
                    accept="image/jpeg,image/png,image/webp,.jpg,.png,.webp"
                    formatHint="JPG, PNG, WEBP · Max 20 MB"
                    browseLabel="Browse Images"
                    onRemove={() => setImgFile(null)}
                    inputRef={imgRef}
                    onFileChange={pickImg}
                  />
                </div>
              </div>
            ) : (
              /* ── URL tab ─────────────────────────────────────────── */
              <div className="space-y-4">
                <p className="font-body text-sm leading-6 text-[var(--ink-soft)]">
                  Paste the URL of a web article, blog post, or publicly accessible document. The text will
                  be extracted and loaded into the editor where you can review and edit before submitting.
                </p>
                <div>
                  <label className="form-label" htmlFor="url-input">Article / Document URL *</label>
                  <div className="flex gap-2">
                    <input
                      id="url-input"
                      type="url"
                      className="input-sacred flex-1"
                      placeholder="https://example.com/article"
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchUrl()}
                    />
                    <button
                      type="button"
                      onClick={fetchUrl}
                      disabled={urlFetching || !urlValue.trim()}
                      className="btn-terracotta shrink-0 px-4"
                    >
                      {urlFetching ? "Fetching…" : "Fetch"}
                    </button>
                  </div>
                </div>
                <p className="font-ui text-xs text-[var(--ink-faint)]">
                  Supports public web pages. Paywalled or login-protected pages cannot be fetched.
                </p>
              </div>
            )}

            <OrnamentDivider className="my-7" />

            {/* Declaration */}
            <label className="mb-6 flex cursor-pointer items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={declared}
                onClick={() => setDeclared((v) => !v)}
                className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border transition"
                style={{
                  borderColor: declared ? "var(--terracotta)" : "var(--border-ink)",
                  background: declared ? "var(--terracotta)" : "var(--surface)",
                }}
              >
                {declared ? <CheckCircle size={13} className="text-[var(--surface)]" /> : null}
              </button>
              <span className="font-body text-sm leading-6 text-[var(--ink-soft)]">
                I confirm this work is my own (or I have permission to submit it) and has not been published
                elsewhere in this form.
              </span>
            </label>

            {/* Progress bar */}
            {submitting ? (
              <div className="mb-5">
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ink-wash)]">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--terracotta)] to-[var(--gold)] transition-all"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="mt-2 text-center font-ui text-xs uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {progress < 100 ? `Uploading ${progress}%` : "Complete"}
                </p>
              </div>
            ) : null}

            {/* Error */}
            {error ? (
              <div
                className="mb-5 flex items-start gap-2 rounded-[8px] border border-[var(--border-terracotta)] bg-[var(--terracotta-pale)] p-3"
                role="alert"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--terracotta)]" />
                <p className="font-ui text-xs text-[var(--terracotta)]">{error}</p>
              </div>
            ) : null}

            {/* Submit (only for file tab) */}
            {tab === "file" && (
              <button
                type="button"
                onClick={submit}
                disabled={submitting || extracting}
                className="btn-terracotta w-full justify-center py-4"
              >
                {submitting
                  ? `Uploading ${progress}%…`
                  : <>Submit for Review <ArrowRight size={14} /></>}
              </button>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 font-ui text-xs text-[var(--ink-faint)]">
              <Lock size={12} /> Your manuscript is encrypted in transit and kept strictly confidential.
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

/* ── UploadZone — uses overlay input for reliable mobile taps ─────── */
function UploadZone({
  file, dragging, onDragOver, onDragLeave, onDrop,
  icon, accept, formatHint, browseLabel, onRemove, inputRef, onFileChange,
}: {
  file: File | null;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
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
      className={`upload-zone relative${dragging ? " active" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Invisible full-zone file input — catches taps on mobile */}
      {!file && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label={browseLabel}
          onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
            zIndex: 2,
          }}
        />
      )}

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle size={30} className="text-[var(--sage)]" />
          <div className="font-ui text-sm font-bold text-[var(--ink)]">{file.name}</div>
          <div className="font-ui text-xs text-[var(--muted)]">{fmt(file.size)}</div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="mt-1 flex items-center gap-1 font-ui text-xs text-[var(--terracotta)]"
          >
            <X size={12} /> Remove
          </button>
        </div>
      ) : (
        <div className="pointer-events-none flex flex-col items-center gap-3">
          {icon}
          <div className="text-center">
            <div className="font-ui text-sm font-bold text-[var(--ink)]">Drag and drop your file here</div>
            <div className="mt-1 font-ui text-xs text-[var(--muted)]">or tap to browse</div>
          </div>
          <div className="font-ui text-xs text-[var(--ink-faint)]">{formatHint}</div>
          <span className="btn-ink min-h-0 px-4 py-2">{browseLabel}</span>
        </div>
      )}
    </div>
  );
}
