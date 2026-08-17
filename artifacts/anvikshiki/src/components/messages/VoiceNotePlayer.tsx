import { useEffect, useRef, useState, useId, useMemo } from "react";
import { Play, Pause, FileText, Globe, Copy, Check, Volume2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { messagesApi } from "@/lib/messagesApi";

interface VoiceNotePlayerProps {
  src: string;
  mine?: boolean;
  transcript?: string | null;
  durationSeconds?: number;
  messageId?: string;
  onTranscriptUpdate?: (transcript: string) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

const BAR_COUNT = 36;

// Organic human speech waveform fallback
const FALLBACK_WAVEFORM = [
  25, 38, 55, 75, 45, 82, 95, 62, 42, 68, 88, 100, 78, 52, 70, 92,
  96, 74, 50, 65, 82, 90, 60, 45, 62, 78, 92, 70, 48, 58, 38, 28,
  45, 65, 40, 22
];

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0 || !isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceNotePlayer({
  src,
  mine = false,
  transcript = null,
  durationSeconds,
  messageId,
  onTranscriptUpdate,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const playerId = useId();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [speedIndex, setSpeedIndex] = useState<number>(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(FALLBACK_WAVEFORM);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedLang, setSelectedLang] = useState<"orig" | "en" | "hi" | "sa">("orig");
  const [copied, setCopied] = useState(false);
  const [customTranscript, setCustomTranscript] = useState<string | null>(transcript || null);
  const [serverTranslations, setServerTranslations] = useState<{ english?: string; hindi?: string; sanskrit?: string } | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  // Clean transcript
  const activeTranscript = customTranscript?.trim() || "";
  const hasValidTranscript = Boolean(activeTranscript);

  /*
    A translation is shown only when one was actually produced. This used to
    fall back to a keyword table — "hello" became a Hindi sentence meaning
    "Greetings, I have shared my thoughts in this voice note" — and otherwise
    prefixed a label to the untranslated English. Both put words in somebody's
    mouth. If a translation is missing, the panel says so.
  */
  const displayTranscript = useMemo(() => {
    if (!activeTranscript) return "";
    if (selectedLang === "orig") return activeTranscript;
    const translated =
      selectedLang === "en" ? serverTranslations?.english
      : selectedLang === "hi" ? serverTranslations?.hindi
      : serverTranslations?.sanskrit;
    return (translated || "").trim();
  }, [activeTranscript, selectedLang, serverTranslations]);

  const currentSpeed = SPEED_OPTIONS[speedIndex];

  // Sync speed changes to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = currentSpeed;
    }
  }, [currentSpeed]);

  // Extract actual audio waveform using Web Audio API
  useEffect(() => {
    let cancelled = false;
    if (!src) return;

    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        if (audioBuffer.duration && (!duration || duration <= 0)) {
          setDuration(audioBuffer.duration);
        }

        const rawData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(rawData.length / BAR_COUNT);
        const peaks: number[] = [];

        for (let i = 0; i < BAR_COUNT; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j += 4) {
            sum += Math.abs(rawData[start + j] || 0);
          }
          const avg = sum / (blockSize / 4);
          peaks.push(avg);
        }

        const maxPeak = Math.max(...peaks, 0.01);
        const normalized = peaks.map((p) => Math.max(18, Math.min(100, Math.round((p / maxPeak) * 95 + 5))));

        if (!cancelled && normalized.length === BAR_COUNT) {
          setWaveformBars(normalized);
        }
        audioCtx.close().catch(() => {});
      } catch {
        // Keep organic fallback if decode fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, duration]);

  // Handle HTML Audio element lifecycle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && (!duration || duration <= 0)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [src, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audio && !el.paused) el.pause();
      });
      audio.play().catch((err) => {
        console.warn("Playback error:", err);
      });
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeedIndex((prev) => (prev + 1) % SPEED_OPTIONS.length);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = waveformRef.current?.getBoundingClientRect();
    const audio = audioRef.current;
    if (!rect || !audio || !duration) return;

    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = progress * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const copyTranscript = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(displayTranscript).then(() => {
      setCopied(true);
      toast.success("Transcript copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /**
   * Ask the server for a transcript.
   *
   * There is deliberately no fallback. The previous version, when the server
   * could not transcribe, switched on the browser's live speech recognition —
   * which listens to the microphone, not to the recording, so it captured
   * whatever was happening in the room — and failing that, opened a prompt
   * asking the reader to type the transcript themselves. Both produce text
   * that is then shown as what the sender said.
   *
   * If a transcript cannot be produced, that is what gets said.
   */
  const triggerTranscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!messageId) return;

    setTranscribing(true);
    try {
      const data = await messagesApi.transcribe(messageId);
      if (!data?.transcript) {
        toast.error("No speech could be made out in this recording.");
        return;
      }
      setCustomTranscript(data.transcript);
      setServerTranslations(data.translations || null);
      onTranscriptUpdate?.(data.transcript);
      setShowTranscript(true);
    } catch (err: any) {
      toast.error(err?.message || "Could not transcribe this recording.");
    } finally {
      setTranscribing(false);
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remainingSeconds = Math.max(0, (duration || 0) - currentTime);

  return (
    <div className="w-full min-w-[260px] max-w-[340px] select-none text-[#f3f4f6]">
      <audio ref={audioRef} src={src} preload="metadata" playsInline />

      {/* Main Voice Note Player Card — Unified Dark Gray */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d97706] text-white hover:bg-[#b45309] transition-all active:scale-95 shadow-md"
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? (
            <Pause size={19} className="fill-current" />
          ) : (
            <Play size={19} className="ml-0.5 fill-current" />
          )}

          {isPlaying && (
            <span
              className="absolute inset-0 -z-10 animate-ping rounded-full opacity-35 bg-[#f59e0b]"
            />
          )}
        </button>

        {/* Waveform & Scrubber */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            className="group relative flex h-8 cursor-pointer items-center gap-[2.5px] py-1"
            title="Click to seek"
          >
            {waveformBars.map((height, i) => {
              const barPercent = (i / waveformBars.length) * 100;
              const isPlayed = barPercent <= progressPercent;

              return (
                <span
                  key={`${playerId}-bar-${i}`}
                  className="flex-1 rounded-full transition-all duration-150"
                  style={{
                    height: `${height}%`,
                    minHeight: "4px",
                    background: isPlayed
                      ? "#f59e0b"
                      : "rgba(255, 255, 255, 0.28)",
                    transform: isPlaying && isPlayed ? "scaleY(1.12)" : "scaleY(1)",
                  }}
                />
              );
            })}
          </div>

          {/* Time & Controls Row */}
          <div className="flex items-center justify-between font-mono text-[11px] text-[#e5e7eb]">
            <span className="tabular-nums tracking-wide text-[#9ca3af]">
              {formatTime(currentTime)} / -{formatTime(remainingSeconds)}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Speed Button (1x, 1.25x, 1.5x, 1.75x, 2x) */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="rounded border border-[#444b54] bg-[#2a2e33] hover:bg-[#383e45] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase text-[#f3f4f6] transition-colors"
                title="Change playback speed"
              >
                {currentSpeed}x
              </button>

              {/* Transcript & Translate Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTranscript(!showTranscript);
                }}
                className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  showTranscript
                    ? "border-[#d97706] bg-[#d97706] text-white font-bold"
                    : "border-[#444b54] bg-[#2a2e33] hover:bg-[#383e45] text-[#f3f4f6]"
                }`}
                title="View Transcript & Translation"
              >
                <FileText size={11} />
                <span>Text</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Transcript & Translation Box */}
      {showTranscript && (
        <div
          className="mt-3 rounded-lg border border-[#363a40] bg-[#141618] p-3 text-xs text-[#f3f4f6] shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="mb-2 flex items-center justify-between border-b border-[#2d3137] pb-1.5 font-ui text-[10px] uppercase tracking-wider text-[#9ca3af]">
            <span className="flex items-center gap-1 font-semibold text-[#f59e0b]">
              <Volume2 size={12} />
              <span>Voice Note Transcript</span>
            </span>

            <div className="flex items-center gap-2">
              {!hasValidTranscript && (
                <button
                  type="button"
                  onClick={triggerTranscribe}
                  disabled={transcribing}
                  className="inline-flex items-center gap-1 text-[#f59e0b] hover:underline font-semibold"
                >
                  {transcribing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  <span>{transcribing ? "Transcribing…" : "Transcribe"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={copyTranscript}
                className="inline-flex items-center gap-1 text-[#9ca3af] hover:text-[#f59e0b] font-medium transition-colors"
                title="Copy transcript text"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Translation Language Tabs */}
          <div className="mb-2 flex items-center gap-1 border-b border-[#2d3137] pb-1">
            <span className="font-ui text-[9px] font-bold uppercase tracking-wider text-[#9ca3af] mr-1">Translate:</span>
            {(["orig", "en", "hi", "sa"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLang(lang);
                }}
                className={`rounded px-1.5 py-0.5 font-ui text-[10px] font-semibold transition-colors ${
                  selectedLang === lang
                    ? "bg-[#d97706] text-white"
                    : "text-[#9ca3af] hover:bg-[#25282c]"
                }`}
              >
                {lang === "orig" ? "Original" : lang === "en" ? "English" : lang === "hi" ? "हिन्दी" : "संस्कृतम्"}
              </button>
            ))}
          </div>

          {/* An absent translation says so. Showing the original under a
              "हिन्दी" tab, or an empty pair of quotation marks, would both read
              as a translation that had been produced. */}
          {displayTranscript ? (
            <p className="font-body text-[13px] leading-relaxed italic text-[#e5e7eb] opacity-95">
              "{displayTranscript}"
            </p>
          ) : (
            <p className="font-body text-[13px] leading-relaxed text-[#9ca3af]">
              No translation available for this recording.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
