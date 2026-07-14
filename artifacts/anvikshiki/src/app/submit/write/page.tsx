import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { ArrowLeft, Image as ImageIcon, X, CheckCircle, AlertCircle, Lock, Cloud, Save, FileText, Mic, Square, Play, Pause, Trash2, Volume2, Upload } from "lucide-react";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";
import { useAuth } from "@/hooks/useAuth";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "anvikshiki_write_draft";

const DOMAINS = ["Philosophy","History","Psychology","Sociology","Science","Geopolitics","Civilizational Thought","Aesthetics","Sanskrit Studies","Political Theory"];
const LANGUAGES = ["English", "Sanskrit", "Hindi", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Gujarati", "Marathi", "Odia", "Punjabi", "Assamese", "Urdu", "Nepali", "Maithili", "Dogri", "Konkani", "Santhali", "Bodo", "Sindhi", "Manipuri", "Kashmiri", "Sharada Script", "Grantha Script"];

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
  audioUrl?: string | null;
  audioPublicId?: string | null;
}

const EMPTY: Draft = {
  type: "", fullName: "", email: "", institution: "", language: "English",
  title: "", domain: "", abstract: "", keywords: "", body: "", notes: "",
  audioUrl: null, audioPublicId: null,
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
  const search = useSearch();
  const { user } = useAuth();
  const draftIdParam = new URLSearchParams(search).get("draftId");

  const [draft, setDraft] = useState<Draft>(() => {
    const d = loadDraft();
    const type = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
    return { ...d, type, fullName: d.fullName || user?.name || "", email: d.email || user?.email || "" };
  });
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!draftIdParam);

  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved">("idle");
  const [savingDraft, setSavingDraft] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string>("");
  const [imgDragging, setImgDragging] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Voice note recording states
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Choose supported mimetype
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ""; // Browser default fallback
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        const file = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, { type: mimeType || "audio/webm" });
        setAudioFile(file);
        setAudioPreview(URL.createObjectURL(file));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setRecording(true);
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev >= 300) { // 5-minute cap
            stopRecording();
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setRecording(false);
  };

  const deleteRecording = () => {
    setAudioFile(null);
    setAudioPreview("");
    setRecordTime(0);
    setDraft(prev => {
      const next = { ...prev, audioUrl: null, audioPublicId: null };
      saveDraft(next);
      return next;
    });
  };

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
        set("body", editorRef.current.innerHTML);
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
    if (!file) return;
    await uploadAndInsertInlineAudio(file);
    if (inlineAudioInputRef.current) inlineAudioInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (inlineTimerRef.current) clearInterval(inlineTimerRef.current);
    };
  }, []);

  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const imgRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const inlineImgInputRef = useRef<HTMLInputElement>(null);
  const [insertingImage, setInsertingImage] = useState(false);

  const [importingDoc, setImportingDoc] = useState(false);
  const importDocInputRef = useRef<HTMLInputElement>(null);

  const handleDocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTxt = file.name.endsWith(".txt");
    const isDocx = file.name.endsWith(".docx") || file.name.endsWith(".doc");

    if (!isTxt && !isDocx) {
      setError("Please upload a .docx, .doc, or .txt file");
      if (importDocInputRef.current) importDocInputRef.current.value = "";
      return;
    }

    setImportingDoc(true);
    setError("");

    try {
      let htmlContent = "";

      if (isTxt) {
        // Read plain text directly in browser
        const text = await file.text();
        // Convert plain text to basic HTML paragraphs
        htmlContent = text
          .split(/\n{2,}/)
          .filter(p => p.trim())
          .map(p => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
          .join("");
      } else {
        // Upload docx to server for extraction
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

      if (!htmlContent) {
        setError("Could not extract any text from this document");
        return;
      }

      // Insert into editor
      if (editorRef.current) {
        editorRef.current.focus();
        const existing = editorRef.current.innerHTML.trim();
        if (existing && existing !== "<br>") {
          // Append after existing content
          editorRef.current.innerHTML = existing + "<hr style=\"border-color:rgba(201,152,58,0.2);margin:2rem 0\">" + htmlContent;
        } else {
          editorRef.current.innerHTML = htmlContent;
        }
        set("body", editorRef.current.innerHTML);
      }
    } catch (err: any) {
      setError(err.message || "Failed to import document");
    } finally {
      setImportingDoc(false);
      if (importDocInputRef.current) importDocInputRef.current.value = "";
    }
  };

  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      set("body", editorRef.current.innerHTML);
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("Inline image must be under 20 MB");
      return;
    }

    setInsertingImage(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(`${base()}/api/media/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload inline image");
      }

      const data = await res.json();
      const imageUrl = data.url;

      if (editorRef.current) {
        editorRef.current.focus();
        // Insert image wrapped in a figure + a guaranteed empty paragraph after
        // so the user can always click/tap below the image and continue writing
        const imgHtml = `<figure style="margin:2rem 0;text-align:center;"><img src="${imageUrl}" alt="Inline image" style="max-width:100%;height:auto;border-radius:8px;display:inline-block;" /></figure><p><br></p>`;
        document.execCommand("insertHTML", false, imgHtml);
        // Move cursor into the paragraph after the image
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
        set("body", editorRef.current.innerHTML);
      }
    } catch (err: any) {
      setError(err.message || "Failed to insert image. Please try again.");
    } finally {
      setInsertingImage(false);
      if (inlineImgInputRef.current) inlineImgInputRef.current.value = "";
    }
  };

  // Resume an existing server-saved draft when arriving via ?draftId=
  useEffect(() => {
    if (!draftIdParam) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${base()}/api/submissions/${draftIdParam}`, { credentials: "include" });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load draft");
        const s = data.submission;
        if (cancelled) return;
        const typeMap: Record<string, string> = { ESSAY: "essay", PAPER: "paper", REVIEW: "review", COMMENTARY: "commentary" };
        const notesLines: string = s.notes || "";
        const pick = (label: string) => {
          const m = notesLines.match(new RegExp(`^${label}: (.*)$`, "m"));
          return m ? m[1] : "";
        };
        const coverImg = pick("Cover image") || s.coverImageUrl || "";
        if (coverImg) {
          setImgPreview(coverImg);
        }
        setDraft((prev) => ({
          ...prev,
          type: typeMap[s.type] || "essay",
          fullName: s.submitterName || prev.fullName,
          email: s.submitterEmail || prev.email,
          institution: pick("Institution") || prev.institution,
          domain: pick("Domain") || prev.domain,
          keywords: pick("Keywords") || prev.keywords,
          notes: pick("Author notes") || "",
          title: s.title || "",
          abstract: s.abstract || "",
          body: s.body || "",
        }));
        setServerDraftId(s.id);

      } catch (err: any) {
        setError(err.message || "Could not load draft");
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => { cancelled = true; };
  }, [draftIdParam]);

  // Sync editor content on first load or when draft parameter loads
  const editorInitializedRef = useRef(false);
  useEffect(() => {
    if (editorRef.current && !editorInitializedRef.current && !loadingDraft) {
      editorRef.current.innerHTML = draft.body || "";
      editorInitializedRef.current = true;
    }
  }, [loadingDraft, draft.body]);

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
    if (!draft.body.trim()) e.body = "Essay content is required";
    if (!imgPreview) {
      setError("Choosing a cover image for the article is compulsory.");
      return false;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildNotes = (imageUrl: string) => {
    const finalCover = imageUrl || (imgPreview && (imgPreview.startsWith("http") || imgPreview.startsWith("/api/")) ? imgPreview : "");
    return [
      draft.institution ? `Institution: ${draft.institution}` : "",
      draft.domain ? `Domain: ${draft.domain}` : "",
      draft.keywords ? `Keywords: ${draft.keywords}` : "",
      draft.language !== "English" ? `Language: ${draft.language}` : "",
      draft.notes ? `Author notes: ${draft.notes}` : "",
      finalCover ? `Cover image: ${finalCover}` : "",
    ].filter(Boolean).join("\n");
  };

  const uploadCoverIfNeeded = async (): Promise<string> => {
    if (!imgFile) return "";
    const fd = new FormData();
    fd.append("file", imgFile);
    fd.append("context", "submission_cover");
    const imgRes = await fetch(`${base()}/api/media/upload`, { method: "POST", credentials: "include", body: fd });
    if (imgRes.ok) {
      const d = await imgRes.json();
      return d.url || "";
    }
    return "";
  };

  const uploadAudioIfNeeded = async (): Promise<{ url: string; publicId: string } | null> => {
    if (draft.audioUrl && draft.audioPublicId) {
      return { url: draft.audioUrl, publicId: draft.audioPublicId };
    }
    if (!audioFile) return null;
    setUploadingAudio(true);
    const fd = new FormData();
    fd.append("file", audioFile);
    fd.append("context", "voice_note");
    try {
      const audioRes = await fetch(`${base()}/api/media/upload`, { method: "POST", credentials: "include", body: fd });
      if (audioRes.ok) {
        const d = await audioRes.json();
        return { url: d.url, publicId: d.mediaAsset?.storageKey || "" };
      }
    } catch (err) {
      console.error("Audio upload error:", err);
    } finally {
      setUploadingAudio(false);
    }
    return null;
  };

  const saveDraftToServer = async () => {
    if (!user) { setError("Please sign in to save a draft."); return; }
    if (!draft.title.trim() && !draft.body.trim()) { setError("Write a title or some content before saving a draft."); return; }
    setError(""); setSavingDraft(true);
    try {
      const typeMap: Record<string, string> = { essay: "ESSAY", paper: "PAPER", review: "REVIEW", commentary: "COMMENTARY", "book-review": "COMMENTARY", translation: "ESSAY" };
      const type = typeMap[(draft.type || "essay").toLowerCase()] || "ESSAY";
      const imageUrl = await uploadCoverIfNeeded();
      const audioResult = await uploadAudioIfNeeded();

      const audioUrlVal = audioResult ? audioResult.url : draft.audioUrl || null;
      const audioPublicIdVal = audioResult ? audioResult.publicId : draft.audioPublicId || null;

      if (serverDraftId) {
        const r = await fetch(`${base()}/api/submissions/${serverDraftId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type, submitterName: draft.fullName, submitterEmail: draft.email,
            title: draft.title || "Untitled draft", abstract: draft.abstract, body: draft.body,
            domain: draft.domain, notes: buildNotes(imageUrl), status: "DRAFT",
            audioUrl: audioUrlVal, audioPublicId: audioPublicIdVal,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not save draft");
      } else {
        const r = await fetch(`${base()}/api/submissions/write`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type, submitterName: draft.fullName || user.name || "Draft author", submitterEmail: draft.email || user.email,
            title: draft.title || "Untitled draft", abstract: draft.abstract, body: draft.body,
            domain: draft.domain, notes: buildNotes(imageUrl), status: "DRAFT",
            audioUrl: audioUrlVal, audioPublicId: audioPublicIdVal,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not save draft");
        setServerDraftId(data.submission?.id || null);
      }

      if (audioResult) {
        setDraft(prev => {
          const next = { ...prev, audioUrl: audioResult.url, audioPublicId: audioResult.publicId };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }

      setSaveStatus("saved");
    } catch (err: any) {
      setError(err.message || "Could not save draft. Please try again.");
    }
    setSavingDraft(false);
  };

  const submit = async () => {
    if (!validate()) { setError("Please fix the highlighted fields before submitting."); return; }
    if (!declared) { setError("Please confirm the declaration before submitting."); return; }
    setError(""); setSubmitting(true);

    try {
      const typeMap: Record<string, string> = { essay: "ESSAY", paper: "PAPER", review: "REVIEW", commentary: "COMMENTARY", "book-review": "COMMENTARY", translation: "ESSAY" };
      const type = typeMap[(draft.type || "essay").toLowerCase()] || "ESSAY";

      // Upload files
      const imageUrl = await uploadCoverIfNeeded();
      const audioResult = await uploadAudioIfNeeded();

      const audioUrlVal = audioResult ? audioResult.url : draft.audioUrl || null;
      const audioPublicIdVal = audioResult ? audioResult.publicId : draft.audioPublicId || null;

      const notes = buildNotes(imageUrl);

      let r: Response;
      if (serverDraftId) {
        r = await fetch(`${base()}/api/submissions/${serverDraftId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type, submitterName: draft.fullName, submitterEmail: draft.email,
            title: draft.title, abstract: draft.abstract || "See essay body.", body: draft.body,
            domain: draft.domain, notes, consent: true, status: "RECEIVED",
            audioUrl: audioUrlVal, audioPublicId: audioPublicIdVal,
          }),
        });
      } else {
        r = await fetch(`${base()}/api/submissions/write`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type, submitterName: draft.fullName, submitterEmail: draft.email,
            title: draft.title, abstract: draft.abstract || "See essay body.", body: draft.body,
            domain: draft.domain, notes, consent: true,
            audioUrl: audioUrlVal, audioPublicId: audioPublicIdVal,
          }),
        });
      }

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

  const cleanBodyText = draft.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = cleanBodyText ? cleanBodyText.split(/\s+/).length : 0;
  const charCount = cleanBodyText.length;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ══ Header ══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, var(--bg-deep) 0%, var(--bg-alt) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, var(--ink-wash-strong) 0%, transparent 55%)" }} />
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
                    style={{ background: "var(--ink)", color: "var(--surface)" }}
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

            {/* Voice note recorder */}
            <div className="card-sacred p-5 space-y-4">
              <div className="section-label mb-1">Voice Note / Audio Reading</div>
              <p className="font-body text-[11px]" style={{ color: "var(--ink-faint)", lineHeight: 1.5 }}>
                Optional — Record or upload a voice note (up to 5 minutes) reading your essay so listeners can hear it in your voice.
              </p>

              {audioPreview ? (
                <div className="p-4 rounded-lg space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-gold)" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-ui text-xs font-semibold" style={{ color: "var(--gold-soft)" }}>Voice Note Recorded</span>
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="p-1.5 rounded-full hover:bg-rose-500/10 transition-colors"
                      style={{ color: "var(--lotus)" }}
                      title="Delete recording"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <audio src={audioPreview} controls className="w-full" style={{ filter: "sepia(0.3) invert(0.9)" }} />
                  {uploadingAudio && (
                    <p className="font-ui text-[10px] text-center" style={{ color: "var(--gold-bright)" }}>Uploading audio file…</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {recording ? (
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed" style={{ borderColor: "var(--lotus)", background: "rgba(139,26,74,0.02)" }}>
                      <div className="w-3 h-3 rounded-full bg-rose-600 animate-pulse mb-2" />
                      <div className="font-ui text-xs font-semibold mb-3" style={{ color: "var(--ink)" }}>
                        Recording: {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, "0")} / 5:00
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full font-ui text-[11px] font-bold tracking-wider"
                        style={{ background: "var(--lotus)", color: "var(--surface)" }}
                      >
                        <Square size={12} /> STOP RECORDING
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all hover:bg-white/5"
                        style={{ borderColor: "rgba(201,152,58,0.3)", color: "var(--gold-bright)" }}
                      >
                        <Mic size={14} />
                        <span className="font-ui text-xs font-semibold">Record Mic</span>
                      </button>
                      <label
                        className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/5"
                        style={{ borderColor: "rgba(201,152,58,0.3)", color: "var(--ink-soft)" }}
                      >
                        <input
                          type="file"
                          accept="audio/*"
                          className="sr-only"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) {
                              if (f.size > 30 * 1024 * 1024) { setError("Audio must be under 30 MB"); return; }
                              setAudioFile(f);
                              setAudioPreview(URL.createObjectURL(f));
                            }
                          }}
                        />
                        <span className="font-ui text-xs font-semibold">Upload Audio</span>
                      </label>
                    </div>
                  )}
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

              {/* Editable area */}
              <div
                ref={editorRef}
                contentEditable
                onInput={e => set("body", e.currentTarget.innerHTML)}
                onBlur={e => set("body", e.currentTarget.innerHTML)}
                className="w-full p-6 min-h-[450px] outline-none bg-transparent text-[var(--ink)] font-body leading-[1.85] overflow-y-auto prose-editor"
                data-placeholder="Begin writing your sacred manuscript here..."
                style={{ boxSizing: "border-box" }}
              />

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

              {/* Rich Text Toolbar (placed at the bottom) */}
              <div className="flex flex-wrap items-center gap-2 p-2 bg-[var(--surface-elevated)] border-t border-[rgba(201,152,58,0.15)] select-none">
                {/* Font Selector */}
                <select
                  className="font-ui text-xs bg-[var(--surface)] border border-[rgba(201,152,58,0.25)] rounded px-2 py-1 text-[var(--ink-soft)] outline-none cursor-pointer animate-none"
                  onChange={e => execCmd("fontName", e.target.value)}
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
                  onClick={() => execCmd("bold")}
                  className="p-1 px-2.5 rounded hover:bg-white/5 font-bold text-xs border-none bg-transparent cursor-pointer"
                  style={{ color: "var(--ink-soft)" }}
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => execCmd("italic")}
                  className="p-1 px-2.5 rounded hover:bg-white/5 italic text-xs border-none bg-transparent cursor-pointer"
                  style={{ color: "var(--ink-soft)" }}
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => execCmd("underline")}
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
                  accept="image/*"
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => inlineImgInputRef.current?.click()}
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
                  onClick={() => setShowInlineVNRecorder(v => !v)}
                  disabled={uploadingInlineAudio}
                  className="flex items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent"
                  style={{ color: "var(--gold-soft)" }}
                  title="Insert Voice Note"
                >
                  <Mic size={13} />
                  <span>{uploadingInlineAudio ? "Uploading…" : "Add VN"}</span>
                </button>

                <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

                {/* Import Document */}
                <input
                  type="file"
                  ref={importDocInputRef}
                  onChange={handleDocImport}
                  accept=".docx,.doc,.txt"
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => importDocInputRef.current?.click()}
                  disabled={importingDoc}
                  className="flex items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent"
                  style={{ color: "var(--gold-soft)" }}
                  title="Import content from .docx or .txt file"
                >
                  <Upload size={13} />
                  <span>{importingDoc ? "Importing…" : "Import Doc"}</span>
                </button>
              </div>

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
                  {declared && <CheckCircle size={12} style={{ color: "var(--surface)" }} />}
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

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={saveDraftToServer}
                  disabled={savingDraft || !user}
                  title={!user ? "Sign in to save drafts to your account" : undefined}
                  className="w-full sm:w-auto btn-sacred flex items-center justify-center gap-2"
                  style={{ borderRadius: 6, padding: "1rem 1.25rem", fontSize: "0.75rem", letterSpacing: "0.14em", border: "1px solid rgba(201,152,58,0.4)", background: "transparent", color: "var(--gold-bright)" }}
                >
                  <FileText size={14} /> {savingDraft ? "SAVING…" : "SAVE AS DRAFT"}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="w-full flex-1 btn-sacred btn-gold flex items-center justify-center gap-2"
                  style={{ borderRadius: 6, padding: "1rem", fontSize: "0.8rem", letterSpacing: "0.18em" }}
                >
                  {submitting ? "Submitting…" : "SUBMIT FOR REVIEW"}
                </button>
              </div>

              {!user && (
                <p className="font-ui text-[10px] mt-3 text-center" style={{ color: "var(--ink-faint)", opacity: 0.7 }}>
                  Sign in to save multiple drafts and resume them later from your account.
                </p>
              )}
              {serverDraftId && (
                <p className="font-ui text-[10px] mt-3 text-center" style={{ color: "var(--ink-faint)", opacity: 0.7 }}>
                  This draft is saved to your account and only visible to you until you submit it.
                </p>
              )}

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
