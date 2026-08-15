import { useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Image as ImageIcon, Mic, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default function EditArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();
  const { user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<"article" | "paper">("article");
  const [article, setArticle] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");

  // Rich text editor references
  const editorRef = useRef<HTMLDivElement>(null);
  const inlineImgInputRef = useRef<HTMLInputElement>(null);
  const inlineAudioInputRef = useRef<HTMLInputElement>(null);
  const inlineMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inlineAudioChunksRef = useRef<Blob[]>([]);
  const inlineTimerRef = useRef<any>(null);

  // States for inline audio/VN and images
  const [inlineRecording, setInlineRecording] = useState(false);
  const [inlineRecordTime, setInlineRecordTime] = useState(0);
  const [showInlineVNRecorder, setShowInlineVNRecorder] = useState(false);
  const [uploadingInlineAudio, setUploadingInlineAudio] = useState(false);
  const [insertingImage, setInsertingImage] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Cover image states
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string>("");
  const [imgDragging, setImgDragging] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const pickImg = (file: File) => {
    if (!IMAGE_MIME_TYPES.has(file.type)) { toast.error("Please upload a JPG, PNG, WEBP, or GIF image"); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast.error("Image must be 10 MB or smaller"); return; }
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  // The account desk links here for both essays and papers. Loading only
  // /api/articles meant every paper landed on "Article not found" and could
  // never be edited, so resolve the work from whichever collection holds it.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const load = async () => {
      const preferPaper = new URLSearchParams(window.location.search).get("type") === "paper";
      const order: Array<"paper" | "article"> = preferPaper ? ["paper", "article"] : ["article", "paper"];

      for (const kind of order) {
        try {
          const res = await fetch(`${base()}/api/${kind === "paper" ? "papers" : "articles"}/${slug}`, {
            credentials: "include",
          });
          if (!res.ok) continue;
          const data = await res.json();
          const record = kind === "paper" ? data.paper : data.article;
          if (!record) continue;
          if (cancelled) return;

          setKind(kind);
          setArticle(record);
          setTitle(record.title || "");
          setAuthorName(record.authorName || "");
          setExcerpt((kind === "paper" ? record.abstract : record.excerpt) || "");
          setBody(record.body || "");
          setImgPreview((kind === "paper" ? record.coverImageUrl : record.heroImageUrl) || "");
          setLoading(false);
          return;
        } catch {
          // Try the next collection.
        }
      }

      if (!cancelled) {
        toast.error("Could not load this work");
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [slug]);

  // Sync editor content on first load
  const editorInitializedRef = useRef(false);
  useEffect(() => {
    if (editorRef.current && !editorInitializedRef.current && !loading && article) {
      editorRef.current.innerHTML = article.body || "";
      editorInitializedRef.current = true;
    }
  }, [article, loading]);

  useEffect(() => {
    return () => {
      if (inlineTimerRef.current) clearInterval(inlineTimerRef.current);
    };
  }, []);

  // Inline recording handlers
  const startInlineRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/ogg";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      inlineMediaRecorderRef.current = recorder;
      inlineAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) inlineAudioChunksRef.current.push(e.data);
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
          if (prev >= 300) {
            stopInlineRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      setErrorText("");
    } catch (err: any) {
      setErrorText("Microphone access denied or not supported on your browser/device.");
    }
  };

  const stopInlineRecording = () => {
    if (inlineMediaRecorderRef.current && inlineMediaRecorderRef.current.state !== "inactive") {
      inlineMediaRecorderRef.current.stop();
    }
    if (inlineTimerRef.current) clearInterval(inlineTimerRef.current);
    setInlineRecording(false);
  };

  const uploadAndInsertInlineAudio = async (file: File) => {
    if (file.size > 30 * 1024 * 1024) {
      setErrorText("Audio file must be under 30 MB");
      return;
    }

    setUploadingInlineAudio(true);
    setErrorText("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "voice_note");

      const res = await fetch(`${base()}/api/media/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload voice note");
      }

      const data = await res.json();
      const audioUrl = data.url;
      if (typeof audioUrl !== "string" || !audioUrl) {
        throw new Error("Audio storage did not return a URL");
      }

      if (editorRef.current) {
        editorRef.current.focus();
        const audioHtml = `<audio src="${audioUrl}" controls class="article-body-audio" style="width: 100%; max-width: 500px; margin: 1.5rem auto; display: block;" data-vn-id="${data.mediaAsset?.storageKey || ''}"></audio><p><br></p>`;
        document.execCommand("insertHTML", false, audioHtml);
        setBody(editorRef.current.innerHTML);
      }
      setShowInlineVNRecorder(false);
    } catch (err: any) {
      setErrorText(err.message || "Failed to insert voice note. Please try again.");
    } finally {
      setUploadingInlineAudio(false);
    }
  };

  const handleInlineAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndInsertInlineAudio(file);
    if (inlineAudioInputRef.current) inlineAudioInputRef.current.value = "";
  };

  // Editor rich text command executor
  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!IMAGE_MIME_TYPES.has(file.type)) {
      setErrorText("Inline images must be JPG, PNG, WEBP, or GIF files");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorText("Inline image must be 10 MB or smaller");
      return;
    }

    setInsertingImage(true);
    setErrorText("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "article_inline");

      const res = await fetch(`${base()}/api/media/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload inline image");
      }

      const data = await res.json();
      const imageUrl = data.url;
      if (typeof imageUrl !== "string" || !imageUrl) {
        throw new Error("Image storage did not return a URL");
      }

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
        setBody(editorRef.current.innerHTML);
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed to insert image. Please try again.");
    } finally {
      setInsertingImage(false);
      if (inlineImgInputRef.current) inlineImgInputRef.current.value = "";
    }
  };

  const isPaper = kind === "paper";
  const noun = isPaper ? "paper" : "article";
  const readHref = `/${isPaper ? "papers" : "articles"}/${slug}`;

  const handleSave = async () => {
    const currentBody = editorRef.current ? editorRef.current.innerHTML : body;
    if (!title.trim()) { toast.error("Title cannot be empty"); return; }
    if (!isPaper && !imgPreview) { toast.error("Choosing a cover image is compulsory for articles"); return; }
    setSaving(true);
    try {
      let finalCover = imgPreview;
      if (imgFile) {
        const fd = new FormData();
        fd.append("file", imgFile);
        fd.append("context", "submission_cover");
        const imgRes = await fetch(`${base()}/api/media/upload`, { method: "POST", credentials: "include", body: fd });
        if (!imgRes.ok) {
          const imgErr = await imgRes.json().catch(() => ({}));
          throw new Error(imgErr.error || "Failed to upload cover image");
        }
        const imgData = await imgRes.json();
        finalCover = imgData.url || "";
      }

      const payload = isPaper
        ? { title, authorName, abstract: excerpt, body: currentBody, coverImageUrl: finalCover || null }
        : { title, authorName, excerpt, body: currentBody, heroImageUrl: finalCover };

      const res = await fetch(`${base()}/api/${isPaper ? "papers" : "articles"}/${slug}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to save (${res.status})`);

      // Clear the cached copies the reader pages serve from, then tell every
      // open view to refetch — otherwise the author is sent back to a page
      // still rendering the text they just replaced.
      try {
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith("anv_article_") || key.startsWith("anv_paper_")) sessionStorage.removeItem(key);
        }
      } catch {}

      toast.success(`${isPaper ? "Paper" : "Article"} updated successfully!`);
      window.dispatchEvent(new Event("anv:content-changed"));
      navigate(readHref);
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <p className="font-ui text-sm text-[var(--muted)]">You must be signed in to edit posts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <div className="h-9 w-9 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)] px-4 text-center">
        <div>
          <p className="font-display text-2xl text-[var(--ink)] mb-3">Work not found</p>
          <p className="font-ui text-sm text-[var(--muted)] mb-4">
            This piece may have been moved to Trash, or it is published under a different name than your account.
          </p>
          <Link href="/account" className="btn-terracotta">Back to Account</Link>
        </div>
      </div>
    );
  }

  const plainText = body.replace(/<[^>]*>/g, " ").trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = body.replace(/<[^>]*>/g, "").length;

  return (
    <div className="bg-[var(--bg)] min-h-screen pb-24">
      <div className="container-anv py-10 max-w-3xl mx-auto">

        {/* Back */}
        <div className="mb-6">
          <Link href="/account" className="btn-ink inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={15} /> Back to Account
          </Link>
        </div>

        <div className="mb-6">
          <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-[var(--gold-soft)] opacity-70 mb-1">Editing Post</p>
          <h1 className="font-display text-3xl text-[var(--ink)]">{isPaper ? "Edit Paper" : "Edit Article"}</h1>
        </div>

        <OrnamentDivider className="mb-8" />

        <ParchmentCard className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="form-label mb-1" htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              type="text"
              className="input-sacred w-full text-sm"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={500}
              placeholder="Article title…"
            />
          </div>

          {/* Author Name */}
          <div>
            <label className="form-label mb-1" htmlFor="edit-author">Author / Submitter Name</label>
            <input
              id="edit-author"
              type="text"
              className="input-sacred w-full text-sm"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              maxLength={160}
              readOnly={Boolean(user?.name)}
              placeholder="Author name…"
            />
            {user?.name ? (
              <p className="mt-1 font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>
                Published under your account name. Change it in{" "}
                <Link href="/account/profile" className="underline">account settings</Link>.
              </p>
            ) : null}
          </div>

          {/* Abstract / Excerpt */}
          <div>
            <label className="form-label mb-1" htmlFor="edit-excerpt">
              Abstract <span className="font-ui text-[10px] text-[var(--muted)] font-normal">(short summary shown below the title)</span>
            </label>
            <textarea
              id="edit-excerpt"
              className="textarea-sacred w-full text-sm"
              style={{ minHeight: "100px" }}
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              maxLength={1000}
              placeholder="Brief abstract or summary…"
            />
          </div>

          {/* Cover image */}
          <div>
            <label className="form-label mb-1">Cover / Header Image{isPaper ? "" : " *"}</label>
            <p className="font-body text-[11px] mb-3" style={{ color: "var(--ink-faint)" }}>
              {isPaper ? "Optional for papers." : "Choosing a cover image is compulsory for articles."}
            </p>

            {imgPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border)]" style={{ aspectRatio: "16/9", maxWidth: "360px" }}>
                <img src={imgPreview} alt="Cover preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImgFile(null); setImgPreview(""); }}
                  className="absolute top-2 right-2 p-1 rounded-full"
                  style={{ background: "var(--ink)", color: "var(--surface)" }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                className={`upload-zone${imgDragging ? " active" : ""}`}
                style={{ padding: "1.5rem", minHeight: 100, maxWidth: "360px", border: "1px dashed var(--border)" }}
                onDragOver={e => { e.preventDefault(); setImgDragging(true); }}
                onDragLeave={() => setImgDragging(false)}
                onDrop={e => { e.preventDefault(); setImgDragging(false); const f = e.dataTransfer.files[0]; if (f) pickImg(f); }}
                onClick={() => imgRef.current?.click()}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === "Enter" && imgRef.current?.click()}
              >
                <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) pickImg(f); }} />
                <ImageIcon size={24} style={{ color: "var(--ink-soft)", opacity: 0.5, margin: "0 auto 8px" }} />
                <p className="font-ui text-xs text-center" style={{ color: "var(--ink-faint)" }}>Drop or click to upload</p>
                <p className="font-ui text-[10px] text-center mt-1" style={{ color: "var(--ink-faint)", opacity: 0.6 }}>JPG, PNG, WEBP, GIF · Max 10 MB</p>
              </div>
            )}
          </div>

          {/* Error Banner if any */}
          {errorText && (
            <div className="p-3 rounded bg-rose-950/20 border border-rose-900/50">
              <p className="font-ui text-xs text-rose-400">{errorText}</p>
            </div>
          )}

          {/* Premium Rich Text Editor Body */}
          <div className="card-sacred" style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(139,90,20,0.15)" }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Article Body *</span>
              <span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>
                {wordCount > 0 ? `${wordCount.toLocaleString()} words · ${charCount.toLocaleString()} chars` : "Start writing below"}
              </span>
            </div>

            {/* Sticky Top Toolbar */}
            <div className="flex items-center gap-2 p-2.5 bg-[var(--surface-elevated)] border-b border-[rgba(201,152,58,0.15)] sticky top-0 z-10 select-none shadow-sm overflow-x-auto max-w-full whitespace-nowrap flex-nowrap sm:flex-wrap">
              {/* Font Selector */}
              <select
                className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                onChange={e => execCmd("fontName", e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                defaultValue="Garamond"
              >
                <option value="Garamond">Garamond (Default)</option>
                <option value="'Noto Serif Devanagari', serif">Devanagari</option>
                <option value="'Noto Serif Sharada', serif">Sharada</option>
                <option value="'Noto Serif Tamil', serif">Tamil</option>
                <option value="'Noto Serif Telugu', serif">Telugu</option>
                <option value="'Noto Serif Gurmukhi', serif">Gurmukhi</option>
              </select>

              {/* Block Format */}
              <select
                className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                onChange={e => execCmd("formatBlock", e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                defaultValue="p"
              >
                <option value="p">Paragraph</option>
                <option value="h1">Main Heading (H1)</option>
                <option value="h2">Subheading (H2)</option>
                <option value="h3">Third Heading (H3)</option>
                <option value="h4">Fourth Heading (H4)</option>
                <option value="blockquote">Quote block</option>
              </select>

              <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

              {/* Basic styles */}
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); execCmd("bold"); }}
                onTouchStart={e => { e.preventDefault(); execCmd("bold"); }}
                className="p-1 px-2.5 rounded hover:bg-white/5 font-bold text-xs border-none bg-transparent cursor-pointer"
                style={{ color: "var(--ink-soft)" }}
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); execCmd("italic"); }}
                onTouchStart={e => { e.preventDefault(); execCmd("italic"); }}
                className="p-1 px-2.5 rounded hover:bg-white/5 italic text-xs border-none bg-transparent cursor-pointer"
                style={{ color: "var(--ink-soft)" }}
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); execCmd("underline"); }}
                onTouchStart={e => { e.preventDefault(); execCmd("underline"); }}
                className="p-1 px-2.5 rounded hover:bg-white/5 underline text-xs border-none bg-transparent cursor-pointer"
                style={{ color: "var(--ink-soft)" }}
                title="Underline"
              >
                U
              </button>

              <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

              {/* Colors */}
              <select
                className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                onChange={e => execCmd("foreColor", e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                defaultValue=""
              >
                <option value="">Text Color</option>
                <option value="#ffffff">White</option>
                <option value="#a3a3a3">Muted Gray</option>
              </select>

              {/* Highlights */}
              <select
                className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                onChange={e => execCmd("hiliteColor", e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                defaultValue=""
              >
                <option value="">Highlight</option>
                <option value="rgba(255,255,255,0.15)">White glow</option>
                <option value="transparent">None</option>
              </select>

              <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

              {/* Image upload inline */}
              <input
                type="file"
                ref={inlineImgInputRef}
                onChange={handleInlineImageUpload}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
              />
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); inlineImgInputRef.current?.click(); }}
                onTouchStart={e => { e.preventDefault(); inlineImgInputRef.current?.click(); }}
                disabled={insertingImage}
                className="flex items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent"
                style={{ color: "var(--gold-soft)" }}
                title="Insert Inline Image"
              >
                <ImageIcon size={13} />
                <span>{insertingImage ? "Uploading…" : "Add Image"}</span>
              </button>

              {/* Voice Note inline recorder toggle */}
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setShowInlineVNRecorder(prev => !prev); }}
                onTouchStart={e => { e.preventDefault(); setShowInlineVNRecorder(prev => !prev); }}
                className="flex items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent animate-none"
                style={{ color: "var(--gold-soft)" }}
                title="Add Voice Note"
              >
                <Mic size={13} />
                <span>Voice Note</span>
              </button>
            </div>

            {/* Inline Audio Upload Hidden Input */}
            <input
              type="file"
              ref={inlineAudioInputRef}
              onChange={handleInlineAudioUpload}
              accept="audio/*"
              className="sr-only"
            />

            {/* Inline VN Recorder Strip */}
            {showInlineVNRecorder && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--surface-elevated)] border-b border-[rgba(201,152,58,0.15)]">
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

            {/* Editable area */}
            <div
              ref={editorRef}
              contentEditable
              onInput={e => setBody(e.currentTarget.innerHTML)}
              onBlur={e => setBody(e.currentTarget.innerHTML)}
              className="w-full p-6 min-h-[420px] max-h-[600px] outline-none bg-transparent text-[var(--ink)] font-body leading-[1.85] overflow-y-auto prose-editor"
              data-placeholder="Begin writing your sacred manuscript here..."
              style={{ boxSizing: "border-box" }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            <Link href={readHref} className="btn-ink text-sm w-full sm:w-auto justify-center" target="_blank" rel="noopener">
              View Live {isPaper ? "Paper" : "Article"} ↗
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-terracotta inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </ParchmentCard>

        <p className="mt-4 font-ui text-[10px] text-[var(--muted)] text-center">
          Note: Major structural changes (images, PDF, cover) should be requested via the admin panel.
        </p>
      </div>
    </div>
  );
}
