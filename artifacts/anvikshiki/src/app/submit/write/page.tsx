import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { ArrowLeft, Image as ImageIcon, X, CheckCircle, AlertCircle, Lock, Save, FileText, Link2, Mic, Square, Play, Pause, Trash2, Volume2, Upload, Maximize2, Minimize2, Quote, List, ListOrdered, Minus, Highlighter, Eraser } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  importedContentMessage,
  isGoogleDocumentUrl,
  summarizeImportedHtml,
  type ImportedContentSummary,
} from "@/lib/documentImport";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "anvikshiki_write_draft";

/**
 * The "this formatting is on" state for a toolbar button.
 *
 * Driven from React rather than a CSS attribute selector: these buttons also
 * carry utility classes, and whether a stylesheet rule or a utility wins here
 * depends on build ordering that is easy to disturb. A writer needs to be able
 * to see at a glance whether bold is on, so it is not worth leaving to the
 * cascade.
 */
function activeToolStyle(active: boolean): React.CSSProperties | undefined {
  if (!active) return undefined;
  return {
    background: "var(--ink)",
    borderColor: "var(--ink)",
    color: "var(--bg)",
  };
}

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

const PERSISTED_IMAGE_SOURCE = /^(?:https?:\/\/|\/(?!\/))/i;

function countUnresolvedImages(html: string): number {
  const tags: string[] = html.match(/<img\b[^>]*>/gi) || [];
  return tags.filter((tag: string) => {
    const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const source = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
    const trimmed = source.trim();
    if (!trimmed) return false; // Ignore empty src (legacy placeholders)
    return !PERSISTED_IMAGE_SOURCE.test(trimmed);
  }).length;
}

function dataImageUrlToFile(source: string, index: number): File | null {
  const match = source.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;

  const binary = atob(match[2].replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let position = 0; position < binary.length; position += 1) {
    bytes[position] = binary.charCodeAt(position);
  }
  const extension = match[1].split("/")[1].replace("jpeg", "jpg");
  return new File([bytes], `pasted-image-${index + 1}.${extension}`, { type: match[1] });
}

export default function SubmitWritePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const draftIdParam = new URLSearchParams(search).get("draftId");

  // A signed-in author is published under the name on their account. That name
  // wins over anything cached in a local draft or carried over from an older
  // submission — the account name is what the desk matches ownership against,
  // so a divergent byline detaches the work from the person who wrote it.
  const accountName = (user?.name || (user as any)?.username || "").trim();

  const [draft, setDraft] = useState<Draft>(() => {
    const d = loadDraft();
    const type = sessionStorage.getItem("anvikshiki_submit_type") || "essay";
    return {
      ...d,
      type,
      fullName: accountName || d.fullName || "",
      email: user?.email || d.email || "",
    };
  });

  useEffect(() => {
    if (user) {
      setDraft((prev) => ({
        ...prev,
        fullName: accountName || prev.fullName || "",
        email: user.email || prev.email || "",
      }));
    }
  }, [user, accountName]);
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!draftIdParam);

  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved">("idle");
  const [savingDraft, setSavingDraft] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string>("");
  const [imgDragging, setImgDragging] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

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

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isQuoteActive, setIsQuoteActive] = useState(false);
  const [currentBlockType, setCurrentBlockType] = useState("p");
  
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
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload voice note");
      }

      const data = await res.json();
      const audioUrl = data.url;
      if (!audioUrl) throw new Error("Voice note storage did not return a URL");

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
  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [importSummary, setImportSummary] = useState<ImportedContentSummary | null>(null);
  const [googleDocImportError, setGoogleDocImportError] = useState("");
  const [metadataNotice, setMetadataNotice] = useState("");

  const insertImportedHtml = (htmlContent: string, sourceLabel: string) => {
    if (!htmlContent.trim()) throw new Error("Could not extract any text from this document");

    if (editorRef.current) {
      editorRef.current.focus();
      const existing = editorRef.current.innerHTML.trim();
      if (existing && existing !== "<br>") {
        editorRef.current.innerHTML = existing + "<hr style=\"border-color:rgba(201,152,58,0.2);margin:2rem 0\">" + htmlContent;
      } else {
        editorRef.current.innerHTML = htmlContent;
      }
      set("body", editorRef.current.innerHTML);
    } else {
      set("body", htmlContent);
    }

    setImportSummary(summarizeImportedHtml(htmlContent, sourceLabel));
  };

  /**
   * Carry across what the imported document already knows — its name, its
   * opening lines, its first stored image. Only fields the author has left
   * empty are filled, so an import never overwrites their own words, and the
   * author is told which fields were touched.
   */
  const applyImportedMetadata = (data: any) => {
    const filled: string[] = [];

    const importedTitle = typeof data?.title === "string" ? data.title.trim() : "";
    if (importedTitle && !draft.title.trim()) {
      set("title", importedTitle.slice(0, 500));
      filled.push("title");
    }

    const importedAbstract = typeof data?.excerpt === "string" ? data.excerpt.trim() : "";
    if (importedAbstract && !draft.abstract.trim()) {
      set("abstract", importedAbstract.slice(0, 10000));
      filled.push("abstract");
    }

    // The server only ever returns a cover it stored in the journal's own
    // media store, so this URL is safe to carry into the submission.
    const importedCover = typeof data?.coverImageUrl === "string" ? data.coverImageUrl : "";
    if (importedCover && /^https:\/\//i.test(importedCover) && !imgFile && !imgPreview) {
      setImgPreview(importedCover);
      filled.push("cover image");
    }

    setMetadataNotice(
      filled.length
        ? `Filled in the ${filled.join(", ")} from the document — edit anything that does not fit.`
        : "",
    );
  };

  const handleDocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const isTxt = lower.endsWith(".txt");
    const isDocx = lower.endsWith(".docx");
    const isLegacyDoc = lower.endsWith(".doc");
    const isPdf = lower.endsWith(".pdf");

    if (!isTxt && !isDocx) {
      // Name the actual problem and the fix. "Please upload a .docx or .txt"
      // told someone holding a .doc nothing about how to proceed.
      setError(
        isLegacyDoc
          ? "This is a Word 97-2003 document (.doc). Open it in Word or Google Docs and save it as .docx, then import that."
          : isPdf
            ? "PDFs cannot be imported as editable text. Export the document as .docx, or paste the text straight into the editor."
            : "Import a .docx or .txt file. If your document came from Word or Google Docs, re-export it as .docx.",
      );
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
          .map(p => `<p>${escapeHtml(p.trim().replace(/\s*\n\s*/g, " "))}</p>`)
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
          throw new Error(err.error || `Failed to extract document content (${res.status})`);
        }
        const data = await res.json();
        htmlContent = data.html || "";
        // Images that could not be stored no longer discard the import, so tell
        // the author what is missing rather than letting them find out later.
        if (data.warning) setMetadataNotice(data.warning);
      }

      insertImportedHtml(htmlContent, isDocx ? "document" : "text file");
    } catch (err: any) {
      setError(err.message || "Failed to import document");
    } finally {
      setImportingDoc(false);
      if (importDocInputRef.current) importDocInputRef.current.value = "";
    }
  };

  const handleGoogleDocImport = async () => {
    const rawUrl = googleDocUrl.trim();
    if (!rawUrl) {
      setGoogleDocImportError("Paste a public Google Docs link first.");
      return;
    }

    let url: string;
    try {
      url = new URL(rawUrl).href;
    } catch {
      setGoogleDocImportError("Please paste a full Google Docs URL, including https://");
      return;
    }

    if (!isGoogleDocumentUrl(url)) {
      setGoogleDocImportError("Paste the share link for a Google Docs document (docs.google.com/document/d/...).");
      return;
    }

    setImportingDoc(true);
    setGoogleDocImportError("");
    setMetadataNotice("");
    setError("");
    try {
      const response = await fetch(`${base()}/api/extract-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to import the Google Doc");
      insertImportedHtml(typeof data.html === "string" ? data.html : "", "Google Doc");
      applyImportedMetadata(data);
      setGoogleDocUrl("");
      setGoogleDocImportError("");
    } catch (err: any) {
      const message = err.message || "Failed to import the Google Doc.";
      setGoogleDocImportError(message);
    } finally {
      setImportingDoc(false);
    }
  };

  const updateEditorStates = () => {
    if (typeof window === "undefined") return;
    setIsBold(document.queryCommandState("bold"));
    setIsItalic(document.queryCommandState("italic"));
    setIsUnderline(document.queryCommandState("underline"));

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let node: Node | null = range.startContainer;
      let insideBq = false;
      let blockType = "p";
      
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as Element).tagName.toLowerCase();
          if (tag === "blockquote") {
            insideBq = true;
          } else if (["p", "h1", "h2", "h3", "h4"].includes(tag)) {
            if (blockType === "p") {
              blockType = tag;
            }
          }
        }
        node = node.parentNode;
      }
      
      setIsQuoteActive(insideBq);
      setCurrentBlockType(blockType);
    }
  };

  const toggleBlockquote = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    
    // Find if we are inside a blockquote
    let isInsideBlockquote = false;
    let bqNode: HTMLElement | null = null;
    let curr: Node | null = range.startContainer;
    while (curr && curr !== editorRef.current) {
      if (curr.nodeType === Node.ELEMENT_NODE && (curr as Element).tagName === 'BLOCKQUOTE') {
        isInsideBlockquote = true;
        bqNode = curr as HTMLElement;
        break;
      }
      curr = curr.parentNode;
    }

    if (isInsideBlockquote && bqNode) {
      // Unwrap
      const children = Array.from(bqNode.childNodes);
      const parent = bqNode.parentNode;
      if (parent) {
        children.forEach(child => {
          parent.insertBefore(child, bqNode);
        });
        parent.removeChild(bqNode);
      }
    } else {
      // Wrap current block node
      let blockNode: HTMLElement | null = null;
      let node: Node | null = range.startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as Element).tagName;
          if (['P', 'H1', 'H2', 'H3', 'DIV'].includes(tag)) {
            blockNode = node as HTMLElement;
            break;
          }
        }
        node = node.parentNode;
      }
      if (blockNode) {
        const bq = document.createElement('blockquote');
        bq.style.borderLeft = '4px solid var(--gold)';
        bq.style.paddingLeft = '1rem';
        bq.style.margin = '1.5rem 0';
        bq.style.color = 'var(--ink-soft)';
        
        const parent = blockNode.parentNode;
        if (parent) {
          const clone = blockNode.cloneNode(true);
          bq.appendChild(clone);
          parent.replaceChild(bq, blockNode);
        }
      } else {
        document.execCommand('formatBlock', false, 'blockquote');
      }
    }

    if (editorRef.current) {
      set("body", editorRef.current.innerHTML);
    }
    updateEditorStates();
  };

  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      set("body", editorRef.current.innerHTML);
    }
    updateEditorStates();
  };

  /**
   * Wrap the selection in a link. `createLink` needs an existing selection, so
   * with nothing selected it would quietly do nothing; inserting the address as
   * its own visible text is what a writer expects instead.
   */
  const insertEditorLink = () => {
    const selected = window.getSelection()?.toString() || "";
    const raw = window.prompt(selected ? `Link "${selected}" to:` : "Paste the link address:", "https://");
    if (!raw) return;
    const href = raw.trim();
    if (!/^https?:\/\/\S+$/i.test(href)) {
      setError("A link must be a full web address starting with http:// or https://");
      return;
    }
    editorRef.current?.focus();
    if (selected) {
      document.execCommand("createLink", false, href);
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>`,
      );
    }
    if (editorRef.current) set("body", editorRef.current.innerHTML);
    updateEditorStates();
  };

  const uploadInlineImageFile = async (file: File): Promise<string> => {
    if (!/^image\/(?:jpeg|png|webp|gif)$/i.test(file.type)) {
      throw new Error("Inline images must be JPG, PNG, WEBP, or GIF files");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Inline image must be under 10 MB");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", "article_inline");

    const res = await fetch(`${base()}/api/media/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to upload inline image");
    }

    const data = await res.json();
    if (!data.url) throw new Error("Image storage did not return a URL");
    return data.url;
  };

  const handleEditorPaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const rawHtml = event.clipboardData.getData("text/html");
    const clipboardImages = Array.from(event.clipboardData.files).filter(file => file.type.startsWith("image/"));
    const parsed = rawHtml ? new DOMParser().parseFromString(rawHtml, "text/html") : null;
    const pastedImages = parsed ? Array.from(parsed.body.querySelectorAll("img")) : [];
    const hasUnresolvedSource = pastedImages.some(image => !PERSISTED_IMAGE_SOURCE.test((image.getAttribute("src") || "").trim()));

    if (clipboardImages.length === 0 && !hasUnresolvedSource) return;
    event.preventDefault();

    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    const savedRange = selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.getRangeAt(0).cloneRange()
      : null;

    setInsertingImage(true);
    setError("");

    try {
      let htmlToInsert = "";
      let skippedImages = 0;

      if (parsed && pastedImages.length > 0) {
        parsed.body.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach(element => element.remove());
        parsed.body.querySelectorAll("*").forEach(element => {
          Array.from(element.attributes).forEach(attribute => {
            if (attribute.name.toLowerCase().startsWith("on") || attribute.name.toLowerCase() === "srcdoc") {
              element.removeAttribute(attribute.name);
            }
          });
        });

        let clipboardIndex = 0;
        for (let index = 0; index < pastedImages.length; index += 1) {
          const image = pastedImages[index];
          const source = (image.getAttribute("src") || "").trim();
          if (PERSISTED_IMAGE_SOURCE.test(source)) continue;

          let file = clipboardImages[clipboardIndex] || null;
          if (file) clipboardIndex += 1;
          if (!file && source.startsWith("data:")) {
            const decodedFile = dataImageUrlToFile(source, index);
            if (decodedFile) file = decodedFile;
          }
          if (!file && source.startsWith("blob:")) {
            const blob = await fetch(source).then(response => response.blob());
            file = new File([blob], `pasted-image-${index + 1}`, { type: blob.type });
          }

          if (!file) {
            image.remove();
            skippedImages += 1;
            continue;
          }

          image.setAttribute("src", await uploadInlineImageFile(file));
          image.removeAttribute("srcset");
        }
        htmlToInsert = parsed.body.innerHTML;
      } else {
        const uploaded = await Promise.all(clipboardImages.map(uploadInlineImageFile));
        htmlToInsert = uploaded
          .map(url => `<figure><img src="${escapeHtml(url)}" alt="Inline image"></figure>`)
          .join("") + "<p><br></p>";
      }

      editor.focus();
      if (savedRange) {
        selection?.removeAllRanges();
        selection?.addRange(savedRange);
      }
      document.execCommand("insertHTML", false, htmlToInsert);
      set("body", editor.innerHTML);

      if (skippedImages > 0) {
        setError(`${skippedImages} pasted image${skippedImages === 1 ? " was" : "s were"} not included because the clipboard did not contain the image data. Import the DOCX or use Insert image.`);
      }
    } catch (err: any) {
      setError(err.message || "Could not store pasted images. Nothing was pasted; please try again.");
    } finally {
      setInsertingImage(false);
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInsertingImage(true);
    setError("");

    try {
      const imageUrl = await uploadInlineImageFile(file);

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
          // Account name still wins when resuming an older draft.
          fullName: accountName || s.submitterName || prev.fullName,
          email: user?.email || s.submitterEmail || prev.email,
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

  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focusMode]);

  useEffect(() => {
    const hasUnpersistedFiles = Boolean(imgFile || audioFile);
    if (!hasUnpersistedFiles && saveStatus !== "saving") return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmInternalNavigation = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (!window.confirm("Your text is saved in this browser, but selected media files are not. Leave this page?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", confirmInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", confirmInternalNavigation, true);
    };
  }, [audioFile, imgFile, saveStatus]);

  const pickImg = (file: File) => {
    if (!/^image\/(?:jpeg|png|webp|gif)$/i.test(file.type)) { setError("Please upload a JPG, PNG, WEBP, or GIF image"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10 MB"); return; }
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
    const unresolvedImages = countUnresolvedImages(draft.body);
    if (unresolvedImages > 0) {
      e.body = `${unresolvedImages} image${unresolvedImages === 1 ? " is" : "s are"} not stored yet. Re-paste the content, import the DOCX, or use Insert image.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const normalizeDraft = (value: Draft): Draft => ({
    ...value,
    type: value.type.trim(),
    fullName: value.fullName.trim(),
    email: value.email.trim(),
    institution: value.institution.trim(),
    language: value.language.trim(),
    title: value.title.trim(),
    domain: value.domain.trim(),
    abstract: value.abstract.trim(),
    keywords: value.keywords.trim(),
    body: value.body.trim(),
    notes: value.notes.trim(),
  });

  const buildNotes = (value: Draft, imageUrl: string) => {
    const finalCover = imageUrl || (imgPreview && (imgPreview.startsWith("http") || imgPreview.startsWith("/api/")) ? imgPreview : "");
    return [
      value.institution ? `Institution: ${value.institution}` : "",
      value.domain ? `Domain: ${value.domain}` : "",
      value.keywords ? `Keywords: ${value.keywords}` : "",
      value.language !== "English" ? `Language: ${value.language}` : "",
      value.notes ? `Author notes: ${value.notes}` : "",
      finalCover ? `Cover image: ${finalCover}` : "",
    ].filter(Boolean).join("\n");
  };

  const uploadCoverIfNeeded = async (): Promise<string> => {
    if (!imgFile) return "";
    const fd = new FormData();
    fd.append("file", imgFile);
    fd.append("context", "submission_cover");
    const imgRes = await fetch(`${base()}/api/media/upload`, { method: "POST", credentials: "include", body: fd });
    const data = await imgRes.json().catch(() => ({}));
    if (!imgRes.ok) throw new Error(data.error || "Failed to upload the cover image");
    if (!data.url) throw new Error("Cover image storage did not return a URL");
    return data.url;
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
      const data = await audioRes.json().catch(() => ({}));
      if (!audioRes.ok) throw new Error(data.error || "Failed to upload the voice note");
      if (!data.url) throw new Error("Voice note storage did not return a URL");
      return { url: data.url, publicId: data.mediaAsset?.storageKey || "" };
    } finally {
      setUploadingAudio(false);
    }
  };

  const saveDraftToServer = async () => {
    if (!user) { setError("Please sign in to save a draft."); return; }
    if (!draft.title.trim() && !draft.body.trim()) { setError("Write a title or some content before saving a draft."); return; }
    const unresolvedImages = countUnresolvedImages(draft.body);
    if (unresolvedImages > 0) {
      setError(`${unresolvedImages} image${unresolvedImages === 1 ? " is" : "s are"} not stored yet. Re-paste the content, import the DOCX, or use Insert image before saving.`);
      return;
    }
    setError(""); setSavingDraft(true);
    try {
      const submissionDraft = normalizeDraft(draft);
      const typeMap: Record<string, string> = { essay: "ESSAY", paper: "PAPER", review: "REVIEW", commentary: "COMMENTARY", "book-review": "COMMENTARY", translation: "ESSAY" };
      const type = typeMap[(submissionDraft.type || "essay").toLowerCase()] || "ESSAY";
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
            type, submitterName: submissionDraft.fullName, submitterEmail: submissionDraft.email,
            title: submissionDraft.title || "Untitled draft", abstract: submissionDraft.abstract, body: submissionDraft.body,
            domain: submissionDraft.domain, notes: buildNotes(submissionDraft, imageUrl), status: "DRAFT",
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
            type, submitterName: submissionDraft.fullName || user.name || "Draft author", submitterEmail: submissionDraft.email || user.email,
            title: submissionDraft.title || "Untitled draft", abstract: submissionDraft.abstract, body: submissionDraft.body,
            domain: submissionDraft.domain, notes: buildNotes(submissionDraft, imageUrl), status: "DRAFT",
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
      const submissionDraft = normalizeDraft(draft);
      const typeMap: Record<string, string> = { essay: "ESSAY", paper: "PAPER", review: "REVIEW", commentary: "COMMENTARY", "book-review": "COMMENTARY", translation: "ESSAY" };
      const type = typeMap[(submissionDraft.type || "essay").toLowerCase()] || "ESSAY";

      // Upload files
      const imageUrl = await uploadCoverIfNeeded();
      const audioResult = await uploadAudioIfNeeded();

      const audioUrlVal = audioResult ? audioResult.url : draft.audioUrl || null;
      const audioPublicIdVal = audioResult ? audioResult.publicId : draft.audioPublicId || null;

      const notes = buildNotes(submissionDraft, imageUrl);

      let r: Response;
      if (serverDraftId) {
        r = await fetch(`${base()}/api/submissions/${serverDraftId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type, submitterName: submissionDraft.fullName, submitterEmail: submissionDraft.email,
            title: submissionDraft.title, abstract: submissionDraft.abstract || "See essay body.", body: submissionDraft.body,
            domain: submissionDraft.domain, notes, consent: true, status: "RECEIVED",
            audioUrl: audioUrlVal, audioPublicId: audioPublicIdVal,
          }),
        });
      } else {
        r = await fetch(`${base()}/api/submissions/write`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type, submitterName: submissionDraft.fullName, submitterEmail: submissionDraft.email,
            title: submissionDraft.title, abstract: submissionDraft.abstract || "See essay body.", body: submissionDraft.body,
            domain: submissionDraft.domain, notes, consent: true,
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
          <h1 className="font-display" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", color: "var(--gold-bright)", letterSpacing: "0.08em" }}>Write Your Essay</h1>
          <p className="font-body text-sm mt-2" style={{ color: "var(--ink-faint)" }}>Your text is kept in this browser as you write</p>
        </div>
      </div>

      <div className={`container-anv pb-24 editor-workspace-wide${focusMode ? " editor-focus-mode" : ""}`}>
        <div className={focusMode ? "grid grid-cols-1 gap-6" : "grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6"}>

          {/* ── Left: Metadata ── */}
          <div className={focusMode ? "hidden" : "space-y-4"}>

            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,90,20,0.15)" }}>
              {saveStatus === "saved"
                ? <><Save size={13} style={{ color: "#4ade80", flexShrink: 0 }} /><span className="font-ui text-[10px]" style={{ color: "#4ade80" }}>Saved in this browser</span></>
                : saveStatus === "saving"
                ? <><Save size={13} style={{ color: "var(--gold)", flexShrink: 0, opacity: 0.6 }} /><span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>Saving…</span></>
                : <><Save size={13} style={{ color: "var(--gold)", flexShrink: 0, opacity: 0.4 }} /><span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>Browser save ready</span></>
              }
            </div>

            <div className="card-sacred p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="section-label">Your Details</div>
                {user && (
                  <span className="font-ui text-[10px] px-2 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-gold)] text-[var(--gold-soft)] font-medium">
                    From Account
                  </span>
                )}
              </div>

              <F label="Full Name *" error={errors.fullName}>
                <input
                  className="input-sacred"
                  type="text"
                  placeholder="Your full name"
                  value={draft.fullName}
                  onChange={e => set("fullName", e.target.value)}
                  readOnly={Boolean(accountName)}
                  title={accountName ? "This work is published under your account name" : undefined}
                />
                {accountName ? (
                  <p className="mt-1 font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>
                    Your work is published under your account name. Change it in{" "}
                    <a href="/account/profile" className="underline">account settings</a>.
                  </p>
                ) : null}
              </F>
              <F label="Email Address *" error={errors.email}>
                <input
                  className="input-sacred"
                  type="email"
                  placeholder="you@institution.edu"
                  value={draft.email}
                  onChange={e => set("email", e.target.value)}
                  readOnly={Boolean(user?.email)}
                />
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
                  <img src={imgPreview} alt="Cover preview" width={640} height={360} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImgFile(null); setImgPreview(""); }}
                    className="absolute top-2 right-2 p-1 rounded-full"
                    style={{ background: "var(--ink)", color: "var(--surface)" }}
                    aria-label="Remove cover image"
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
                  <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickImg(f); }} />
                  <ImageIcon size={24} style={{ color: "var(--gold)", opacity: 0.5, margin: "0 auto 8px" }} />
                  <p className="font-ui text-xs text-center" style={{ color: "var(--ink-faint)" }}>Drop or click to upload</p>
                  <p className="font-ui text-[10px] text-center mt-1" style={{ color: "var(--ink-faint)", opacity: 0.6 }}>JPG, PNG, WEBP, GIF · Max 10 MB</p>
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
          <div className="space-y-4 min-w-0 editor-reading-surface">

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
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(139,90,20,0.15)" }}>
                <span className="section-label" style={{ marginBottom: 0 }}>Essay Body *</span>
                <div className="flex items-center gap-3">
                  <span className="font-ui text-[10px]" style={{ color: "var(--ink-faint)" }}>
                    {wordCount > 0 ? `${wordCount.toLocaleString()} words · ${charCount.toLocaleString()} chars` : "Start writing below"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFocusMode(value => !value)}
                    className="editor-focus-toggle"
                    aria-pressed={focusMode}
                    title={focusMode ? "Exit focus mode (Esc)" : "Open distraction-free editor"}
                  >
                    {focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span>{focusMode ? "Exit focus" : "Focus"}</span>
                  </button>
                </div>
              </div>
              {errors.body && (
                <div className="px-5 py-2" style={{ background: "rgba(139,26,74,0.08)", borderBottom: "1px solid rgba(139,26,74,0.15)" }}>
                  <p className="font-ui text-xs" style={{ color: "var(--lotus)" }}>{errors.body}</p>
                </div>
              )}

              <div className="border-b border-[rgba(201,152,58,0.15)] bg-[var(--surface-3)] px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-ui text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]">Import a public Google Doc</p>
                    <p id="google-doc-import-help" className="mt-1 font-body text-xs leading-5 text-[var(--ink-faint)]">
                      Set sharing to <em>Anyone with link — Viewer</em>, then import its text and available images. Nothing is published automatically.
                    </p>
                  </div>
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:min-w-[22rem] sm:flex-row">
                    <input
                      type="url"
                      value={googleDocUrl}
                      onChange={(event) => { setGoogleDocUrl(event.target.value); setGoogleDocImportError(""); }}
                      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleGoogleDocImport(); } }}
                      placeholder="https://docs.google.com/document/d/..."
                      className="input-sacred min-w-0 flex-1"
                      aria-label="Public Google Docs URL"
                      aria-describedby="google-doc-import-help"
                    />
                    <button
                      type="button"
                      onClick={handleGoogleDocImport}
                      disabled={importingDoc || !googleDocUrl.trim()}
                      className="btn-terracotta min-h-11 shrink-0 justify-center px-4 sm:w-auto"
                    >
                      <Link2 size={14} /> {importingDoc ? "Importing..." : "Import"}
                    </button>
                  </div>
                </div>
                {importSummary ? (
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-xs leading-5 text-[var(--ink-soft)]" role="status" aria-live="polite">
                    <CheckCircle size={15} className="shrink-0 text-[var(--gold)]" />
                    <span>{importedContentMessage(importSummary)}</span>
                  </p>
                ) : null}
                {metadataNotice ? (
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-xs leading-5 text-[var(--ink-soft)]" role="status" aria-live="polite">
                    <CheckCircle size={15} className="shrink-0 text-[var(--gold)]" />
                    <span>{metadataNotice}</span>
                  </p>
                ) : null}
                {googleDocImportError ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--border-rose)] bg-[rgba(139,26,74,0.08)] p-3" role="alert">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--lotus)" }} />
                    <p className="font-ui text-xs leading-5" style={{ color: "var(--lotus)" }}>{googleDocImportError}</p>
                  </div>
                ) : null}
              </div>

              {/* Sticky Top Toolbar */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-[var(--surface-elevated)] border-b border-[rgba(201,152,58,0.15)] sticky top-0 z-10 select-none shadow-sm overflow-x-auto">
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
                  value={currentBlockType}
                >
                  <option value="p">Paragraph</option>
                  <option value="h1">Main Heading (H1)</option>
                  <option value="h2">Subheading (H2)</option>
                  <option value="h3">Third Heading (H3)</option>
                  <option value="h4">Fourth Heading (H4)</option>
                </select>

                <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

                {/* Basic styles */}
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("bold"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("bold"); }}
                  className="editor-tool font-bold"
                  aria-pressed={isBold}
                  style={activeToolStyle(isBold)}
                  title="Bold (Ctrl+B)"
                >
                  B
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("italic"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("italic"); }}
                  className="editor-tool italic"
                  aria-pressed={isItalic}
                  style={activeToolStyle(isItalic)}
                  title="Italic (Ctrl+I)"
                >
                  I
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("underline"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("underline"); }}
                  className="editor-tool underline"
                  aria-pressed={isUnderline}
                  style={activeToolStyle(isUnderline)}
                  title="Underline (Ctrl+U)"
                >
                  U
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); toggleBlockquote(); }}
                  onTouchStart={e => { e.preventDefault(); toggleBlockquote(); }}
                  className="editor-tool"
                  aria-pressed={isQuoteActive}
                  style={activeToolStyle(isQuoteActive)}
                  title="Pull quote"
                >
                  <Quote size={13} />
                </button>

                <div className="h-4 w-px bg-[var(--hairline)] mx-1" />

                {/* Structure — lists, links, and section rules. An essay needs
                    more than bold and italic to be readable; these were the
                    pieces missing from the toolbar. */}
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("insertUnorderedList"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("insertUnorderedList"); }}
                  className="editor-tool"
                  title="Bulleted list"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("insertOrderedList"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("insertOrderedList"); }}
                  className="editor-tool"
                  title="Numbered list"
                >
                  <ListOrdered size={13} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); insertEditorLink(); }}
                  onTouchStart={e => { e.preventDefault(); insertEditorLink(); }}
                  className="editor-tool"
                  title="Add a link"
                >
                  <Link2 size={13} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("insertHorizontalRule"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("insertHorizontalRule"); }}
                  className="editor-tool"
                  title="Section break"
                >
                  <Minus size={13} />
                </button>

                <div className="h-4 w-px bg-[var(--hairline)] mx-1" />

                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("hiliteColor", "var(--accent-wash)"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("hiliteColor", "var(--accent-wash)"); }}
                  className="editor-tool"
                  title="Highlight"
                >
                  <Highlighter size={13} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("removeFormat"); }}
                  onTouchStart={e => { e.preventDefault(); execCmd("removeFormat"); }}
                  className="editor-tool"
                  title="Clear formatting"
                >
                  <Eraser size={13} />
                </button>

                <div className="h-4 w-px bg-[var(--hairline)] mx-1" />

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
                  disabled={uploadingInlineAudio}
                  className="flex items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent animate-none"
                  style={{ color: "var(--gold-soft)" }}
                  title="Add Voice Note"
                >
                  <Mic size={13} />
                  <span>Voice Note</span>
                </button>

                <div className="h-4 w-px bg-[rgba(201,152,58,0.2)] mx-1" />

                {/* Import Document */}
                <input
                  type="file"
                  ref={importDocInputRef}
                  onChange={handleDocImport}
                  accept=".docx,.txt"
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => importDocInputRef.current?.click()}
                  disabled={importingDoc}
                  className="flex min-h-11 items-center gap-1 p-1 px-2 rounded hover:bg-white/5 font-ui text-xs cursor-pointer border-none bg-transparent"
                  style={{ color: "var(--gold-soft)" }}
                  title="Import content from a .docx or .txt file"
                >
                  <Upload size={13} />
                  <span>{importingDoc ? "Importing..." : "Import File"}</span>
                </button>
              </div>

              <input
                type="file"
                ref={inlineAudioInputRef}
                onChange={handleInlineAudioUpload}
                accept="audio/*"
                className="sr-only"
              />

              {showInlineVNRecorder && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--surface-elevated)] border-b border-[rgba(201,152,58,0.15)]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${inlineRecording ? "bg-rose-500 animate-pulse" : "bg-[var(--gold)]"}`} />
                    <span className="font-ui text-xs text-[var(--ink-soft)]">
                      {inlineRecording
                        ? `Recording: ${Math.floor(inlineRecordTime / 60)}:${(inlineRecordTime % 60).toString().padStart(2, "0")} / 5:00`
                        : uploadingInlineAudio
                        ? "Uploading voice note…"
                        : "Record or upload a voice note to insert at the cursor"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!inlineRecording && !uploadingInlineAudio && (
                      <>
                        <button type="button" onClick={startInlineRecording} className="px-2.5 py-1 rounded bg-[rgba(201,152,58,0.15)] hover:bg-[rgba(201,152,58,0.25)] text-xs text-[var(--gold-bright)] font-ui font-semibold cursor-pointer border-none">
                          Record
                        </button>
                        <button type="button" onClick={() => inlineAudioInputRef.current?.click()} className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-[var(--ink-soft)] font-ui font-semibold cursor-pointer border-none">
                          Upload File
                        </button>
                      </>
                    )}
                    {inlineRecording && (
                      <button type="button" onClick={stopInlineRecording} className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-xs text-white font-ui font-semibold animate-pulse cursor-pointer border-none">
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

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Essay body"
                aria-multiline="true"
                aria-busy={loadingDraft}
                onInput={(event) => {
                  set("body", event.currentTarget.innerHTML);
                  updateEditorStates();
                }}
                onBlur={(event) => set("body", event.currentTarget.innerHTML)}
                onKeyUp={updateEditorStates}
                onMouseUp={updateEditorStates}
                onClick={updateEditorStates}
                onFocus={updateEditorStates}
                className="w-full p-6 min-h-[400px] max-h-[600px] outline-none bg-transparent text-[var(--ink)] font-body leading-[1.85] overflow-y-auto prose-editor"
                style={{ boxSizing: "border-box" }}
              />
            </div>

            {/* Declaration + Submit */}
            <div className="card-sacred p-5">

              <label className="mb-5 flex cursor-pointer items-start gap-3.5 p-3.5 rounded-xl border border-[var(--border-gold)] bg-[var(--surface-3)] hover:bg-[rgba(201,152,58,0.08)] transition-all select-none">
                <input
                  type="checkbox"
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-all mt-0.5 ${
                    declared
                      ? "border-[var(--gold)] bg-[var(--gold)] text-white shadow-md scale-105"
                      : "border-[var(--gold)] bg-[var(--surface-2)] text-transparent hover:border-[var(--gold-bright)]"
                  }`}
                >
                  <CheckCircle size={15} className={`transition-transform ${declared ? "scale-100 text-white" : "scale-0"}`} />
                </div>
                <span className="font-body text-sm leading-relaxed text-[var(--ink-soft)] font-medium">
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
