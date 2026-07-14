import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Image as ImageIcon,
  Link2, Lock, Upload, X, FileText, Mic, Square, Play, Pause, Trash2, Volume2,
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

/* ── Text/HTML extraction helpers ────────────────────────────────── */

/** Convert plain text (newlines) to HTML paragraphs */
function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter(p => p.trim())
    .map(p => `<p>${p.trim().replace(/\s*\n\s*/g, " ")}</p>`)
    .join("");
}

async function extractPdfAsHtml(file: File): Promise<string> {
  // Dynamically import pdfjs-dist to keep initial bundle small
  const pdfjsLib = await import("pdfjs-dist");
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
    // Group items by Y position to approximate paragraphs
    const items = content.items as any[];
    let pageText = "";
    let lastY: number | null = null;
    for (const item of items) {
      if ("str" in item) {
        const y = item.transform?.[5] ?? null;
        if (lastY !== null && Math.abs(y - lastY) > 20) {
          pageText += "\n\n";
        } else if (lastY !== null && item.hasEOL) {
          pageText += "\n";
        }
        pageText += item.str;
        lastY = y;
      }
    }
    pages.push(pageText);
  }
  return plainTextToHtml(pages.join("\n\n"));
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

  // Inline Voice Note recording states
  const [inlineRecording, setInlineRecording] = useState(false);
  const [inlineRecordTime, setInlineRecordTime] = useState(0);
  const [showInlineVNRecorder, setShowInlineVNRecorder] = useState(false);
  const [uploadingInlineAudio, setUploadingInlineAudio] = useState(false);
  
  const inlineMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inlineAudioChunksRef = useRef<Blob[]>([]);
  const inlineTimerRef = useRef<any>(null);
  const inlineAudioInputRef = useRef<HTMLInputElement>(null);

  const startInlineRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ""; // Browser default fallback
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      inlineMediaRecorderRef.current = recorder;
      inlineAudioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          inlineAudioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const audioBlob = new Blob(inlineAudioChunksRef.current, { type: mimeType || "audio/webm" });
        const file = new File([audioBlob], `inline-voice-note-${Date.now()}.${ext}`, { type: mimeType || "audio/webm" });
        
        await uploadAndInsertInlineAudio(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setInlineRecording(true);
      setInlineRecordTime(0);

      inlineTimerRef.current = setInterval(() => {
        setInlineRecordTime(prev => {
          if (prev >= 300) { // 5-minute cap
            stopInlineRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      setError("");
    } catch (err: any) {
      setError("Microphone access denied or not supported on your browser/device.");
    }
  };

  const stopInlineRecording = () => {
    if (inlineMediaRecorderRef.current && inlineMediaRecorderRef.current.state !== "inactive") {
      inlineMediaRecorderRef.current.stop();
    }
    if (inlineTimerRef.current) {
      clearInterval(inlineTimerRef.current);
    }
    setInlineRecording(false);
  };

  const uploadAndInsertInlineAudio = async (file: File) => {
    if (file.size > 30 * 1024 * 1024) {
      setError("Audio file must be under 30 MB");
      return;
    }

    setUploadingInlineAudio(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "voice_note");

      const res = await fetch(`${base()}/api/media/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload voice note");
      }

      const data = await res.json();
      const audioUrl = data.url;

      if (editorRef.current) {
        editorRef.current.focus();
        const audioHtml = `<audio src="${audioUrl}" controls class="article-body-audio" style="width: 100%; max-width: 500px; margin: 1.5rem auto; display: block;" data-vn-id="${data.mediaAsset?.storageKey || ''}"></audio><p><br></p>`;
        document.execCommand("insertHTML", false, audioHtml);
        setEditorBody(editorRef.current.innerHTML);
      }
      setShowInlineVNRecorder(false);
    } catch (err: any) {
      setError(err.message || "Failed to insert voice note. Please try again.");
    } finally {
      setUploadingInlineAudio(false);
    }
  };

  const handleInlineAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAndInsertInlineAudio(file);
    }
  };

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

  /* ── Extract HTML from file and navigate to write editor ────────── */
  const extractAndWrite = async (file: File) => {
    setExtracting(true);
    setError("");
    try {
      let htmlContent = "";

      const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const isDocx =
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword" ||
        file.name.endsWith(".docx") ||
        file.name.endsWith(".doc");

      if (isTxt) {
        // Browser-side: plain text → HTML paragraphs
        const text = await file.text();
        htmlContent = plainTextToHtml(text);
      } else if (isPdf) {
        // Browser-side PDF → HTML paragraphs (text layer only)
        htmlContent = await extractPdfAsHtml(file);
      } else if (isDocx) {
        // Server-side mammoth → full HTML with embedded images uploaded to Cloudinary
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${base()}/api/media/extract-doc`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to extract document content");
        }
        const data = await res.json();
        htmlContent = data.html || "";
      }
      if (htmlContent && htmlContent.trim().length > 0) {
        setEditorBody(htmlContent);
        setEditorInitialized(false);
        setError("");
      } else {
        setError("Could not extract content from this file. Try uploading as .txt or paste via URL.");
      }
    } catch (err: any) {
      setError(`Extraction failed: ${err.message}. You can still upload the file directly.`);
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
      const html: string = data.html || (data.text
        ? data.text.split(/\n{2,}/).filter((p: string) => p.trim()).map((p: string) => `<p>${p.trim()}</p>`).join("")
        : "");
      if (!html) throw new Error("No content could be extracted from this URL.");
      setEditorBody(html);
      setEditorInitialized(false);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to fetch content from URL.");
    } finally {
      setUrlFetching(false);
    }
  };

  // Rich Text Editor states and handlers
  const [editorBody, setEditorBody] = useState("");
  const [editorInitialized, setEditorInitialized] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const inlineImgInputRef = useRef<HTMLInputElement>(null);
  const [insertingInlineImage, setInsertingInlineImage] = useState(false);

  useEffect(() => {
    if (editorRef.current && !editorInitialized && editorBody) {
      editorRef.current.innerHTML = editorBody;
      setEditorInitialized(true);
    }
  }, [editorBody, editorInitialized]);

  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorBody(editorRef.current.innerHTML);
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("Inline image must be under 20 MB");
      return;
    }

    setInsertingInlineImage(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${base()}/api/media/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload inline image");
      }

      const data = await res.json();
      const imageUrl = data.url;

      if (editorRef.current) {
        editorRef.current.focus();
        const imgHtml = `<figure style="margin:2rem 0;text-align:center;"><img src="${imageUrl}" alt="Inline image" style="max-width:100%;height:auto;border-radius:8px;display:inline-block;" /></figure><p><br></p>`;
        document.execCommand("insertHTML", false, imgHtml);
        const paras = editorRef.current.querySelectorAll("p");
        const lastPara = paras[paras.length - 1];
        if (lastPara) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(lastPara, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        setEditorBody(editorRef.current.innerHTML);
      }
    } catch (err: any) {
      setError(err.message || "Failed to insert image. Please try again.");
    } finally {
      setInsertingInlineImage(false);
      if (inlineImgInputRef.current) inlineImgInputRef.current.value = "";
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
          setProgress(50);
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

  const submitEdited = async () => {
    if (!declared) { setError("Please confirm the declaration"); return; }
    if (!editorBody.trim()) { setError("Essay content cannot be empty"); return; }
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

    try {
      const sim = window.setInterval(() => setProgress((v) => Math.min(v + 10, 85)), 400);

      // Check if Cloudinary is configured
      const healthRes = await fetch(`${base()}/api/health`);
      let isCloudinary = false;
      if (healthRes.ok) {
        const health = await healthRes.json();
        isCloudinary = health?.environment?.storageProvider === "cloudinary";
      }

      let coverUrl = null;

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

          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`, {
            method: "POST",
            body: cloudData,
          });

          if (!uploadRes.ok) throw new Error("Failed to upload file to Cloudinary cloud storage.");
          const resData = await uploadRes.json();
          return resData.secure_url;
        };

        if (imgFile) {
          setProgress(40);
          coverUrl = await uploadToCloudinary(imgFile, "submissions/covers", "image");
        }
      } else {
        // Fallback local upload first
        const uploadLocal = async (file: File, context: string) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("context", context);
          const res = await fetch(`${base()}/api/media/upload`, { method: "POST", credentials: "include", body: fd });
          if (!res.ok) throw new Error("Local upload failed");
          const d = await res.json();
          return d.url || "";
        };

        if (imgFile) {
          setProgress(40);
          coverUrl = await uploadLocal(imgFile, "submission_cover");
        }
      }

      setProgress(85);
      const finalNotes = [
        details.institution ? `Institution: ${details.institution}` : "",
        details.domain ? `Domain: ${details.domain}` : "",
        details.keywords ? `Keywords: ${details.keywords}` : "",
        details.notes ? `Author notes: ${details.notes}` : "",
        coverUrl ? `Cover image: ${coverUrl}` : "",
      ].filter(Boolean).join("\n");

      const response = await fetch(`${base()}/api/submissions/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type,
          submitterName: details.fullName || details.name || "",
          submitterEmail: details.email || "",
          title: details.title || "",
          domain: details.domain,
          abstract: details.abstract || "Submitted via editor.",
          body: editorBody,
          notes: finalNotes,
          consent: true,
        }),
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

            {editorBody ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[rgba(201,152,58,0.15)] pb-3">
                  <div>
                    <h3 className="font-display text-xl text-[var(--ink)]">Review & Edit Content</h3>
                    <p className="font-ui text-[10px] text-[var(--muted)] mt-1">Review the extracted document. You can edit paragraphs, align text, and add/remove images.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorBody("");
                      setEditorInitialized(false);
                    }}
                    className="btn-ink text-[11px] uppercase tracking-wider px-3 py-1.5"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-gold)", cursor: "pointer" }}
                  >
                    ✕ Discard & Re-Upload
                  </button>
                </div>

                <div className="card-sacred" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(201,152,58,0.15)" }}>
                    <span className="section-label" style={{ marginBottom: 0 }}>Manuscript Body *</span>
                    <span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>
                      Rich Text Editor
                    </span>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={e => setEditorBody(e.currentTarget.innerHTML)}
                    onBlur={e => setEditorBody(e.currentTarget.innerHTML)}
                    className="w-full p-6 min-h-[400px] max-h-[600px] outline-none bg-transparent text-[var(--ink)] font-body leading-[1.85] overflow-y-auto prose-editor"
                    style={{ boxSizing: "border-box" }}
                  />

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-[var(--surface-elevated)] border-t border-[rgba(201,152,58,0.15)] select-none">
                    <select
                      className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                      onChange={e => execCmd("fontName", e.target.value)}
                      defaultValue="Garamond"
                    >
                      <option value="Garamond">Garamond (Default)</option>
                      <option value="'Noto Serif Devanagari', serif">Devanagari</option>
                      <option value="'Noto Serif Sharada', serif">Sharada</option>
                    </select>

                    <select
                      className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                      onChange={e => execCmd("formatBlock", e.target.value)}
                      defaultValue="p"
                    >
                      <option value="p">Paragraph</option>
                      <option value="h1">Main Heading (H1)</option>
                      <option value="h2">Subheading (H2)</option>
                      <option value="h3">Third Heading (H3)</option>
                      <option value="blockquote">Quote block</option>
                    </select>

                    <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

                    <button
                      type="button"
                      onClick={() => execCmd("bold")}
                      className="p-1 px-2.5 rounded hover:bg-white/5 font-bold text-xs border-none bg-transparent cursor-pointer text-[var(--ink-soft)]"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd("italic")}
                      className="p-1 px-2.5 rounded hover:bg-white/5 italic text-xs border-none bg-transparent cursor-pointer text-[var(--ink-soft)]"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd("underline")}
                      className="p-1 px-2.5 rounded hover:bg-white/5 underline text-xs border-none bg-transparent cursor-pointer text-[var(--ink-soft)]"
                      title="Underline"
                    >
                      U
                    </button>

                    <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

                    <select
                      className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                      onChange={e => execCmd("foreColor", e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Text Color</option>
                      <option value="#ffffff">White</option>
                      <option value="#a3a3a3">Muted Gray</option>
                    </select>

                    <select
                      className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                      onChange={e => execCmd("hiliteColor", e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Highlight</option>
                      <option value="rgba(255,255,255,0.15)">White glow</option>
                      <option value="transparent">None</option>
                    </select>

                    <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

                    <input
                      type="file"
                      ref={inlineImgInputRef}
                      onChange={handleInlineImageUpload}
                      accept="image/*"
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => inlineImgInputRef.current?.click()}
                      disabled={insertingInlineImage}
                      className="flex items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent text-[var(--gold-soft)]"
                      title="Insert Inline Image"
                    >
                      <ImageIcon size={13} />
                      <span>{insertingInlineImage ? "Uploading…" : "Add Image"}</span>
                    </button>

                    <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

                    {/* Inline VN Recorder input and button */}
                    <input
                      type="file"
                      ref={inlineAudioInputRef}
                      onChange={handleInlineAudioUpload}
                      accept="audio/*"
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInlineVNRecorder(v => !v)}
                      disabled={uploadingInlineAudio}
                      className="flex items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent text-[var(--gold-soft)]"
                      title="Insert Voice Note"
                    >
                      <Mic size={13} />
                      <span>{uploadingInlineAudio ? "Uploading…" : "Add VN"}</span>
                    </button>
                  </div>

                  {/* Inline VN Recorder Strip */}
                  {showInlineVNRecorder && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--surface-elevated)] border-t border-[rgba(201,152,58,0.15)]">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${inlineRecording ? 'bg-rose-500 animate-pulse' : 'bg-[var(--gold)]'}`} />
                        <span className="font-ui text-xs text-[var(--ink-soft)]">
                          {inlineRecording 
                            ? `Recording: ${Math.floor(inlineRecordTime / 60)}:${(inlineRecordTime % 60).toString().padStart(2, '0')} / 5:00` 
                            : uploadingInlineAudio 
                            ? 'Uploading voice note…' 
                            : 'Record or upload a voice note to insert at cursor'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!inlineRecording && !uploadingInlineAudio && (
                          <>
                            <button
                              type="button"
                              onClick={startInlineRecording}
                              className="px-2.5 py-1 rounded bg-[rgba(201,152,58,0.15)] hover:bg-[rgba(201,152,58,0.25)] text-xs text-[var(--gold-bright)] font-ui font-semibold cursor-pointer border-none"
                            >
                              Record
                            </button>
                            <button
                              type="button"
                              onClick={() => inlineAudioInputRef.current?.click()}
                              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-[var(--ink-soft)] font-ui font-semibold cursor-pointer border-none"
                            >
                              Upload File
                            </button>
                          </>
                        )}
                        {inlineRecording && (
                          <button
                            type="button"
                            onClick={stopInlineRecording}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-xs text-white font-ui font-semibold animate-pulse cursor-pointer border-none"
                          >
                            Stop & Insert
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (inlineRecording) stopInlineRecording();
                            setShowInlineVNRecorder(false);
                          }}
                          disabled={uploadingInlineAudio}
                          className="px-2.5 py-1 rounded hover:bg-white/5 text-xs text-[var(--ink-faint)] font-ui cursor-pointer border-none bg-transparent"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cover Image Selection (Compulsory!) */}
                <div className="mt-6">
                  <div className="upload-section-label">
                    Cover / Article Header Image * <span className="text-[var(--terracotta)] font-bold">(Compulsory)</span>
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
              <div>
                {/* ── Source tabs ───────────────────────────────────────── */}
                <div className="mb-6 flex rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] p-1">
                  {(["file", "url"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTab(t); setError(""); }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-[6px] py-2 font-ui text-xs font-bold uppercase tracking-[0.1em] transition cursor-pointer"
                      style={{
                        background: tab === t ? "var(--terracotta)" : "transparent",
                        color: tab === t ? "var(--surface)" : "var(--muted)",
                        border: "none",
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
                          className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface-elevated)] px-4 py-2 font-ui text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold)] transition hover:bg-[var(--surface)] cursor-pointer"
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
            </div>
          )}

            <OrnamentDivider className="my-7" />            {/* Declaration */}
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

            {editorBody ? (
              <button
                type="button"
                onClick={() => {
                  if (!imgFile) {
                    setError("Choosing a cover image is compulsory for articles.");
                    return;
                  }
                  submitEdited();
                }}
                disabled={submitting}
                className="btn-terracotta w-full justify-center py-4 mt-6"
              >
                {submitting
                  ? `Uploading ${progress}%…`
                  : <>Submit Edited Article <ArrowRight size={14} /></>}
              </button>
            ) : (
              tab === "file" && (
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
              )
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
