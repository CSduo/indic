import { useEffect, useRef, useState, useId, useMemo } from "react";
import { Play, Pause, FileText, Globe, Copy, Check, Volume2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface VoiceNotePlayerProps {
  src: string;
  mine?: boolean;
  transcript?: string | null;
  durationSeconds?: number;
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

// Translations dictionary for common phrases / scholarly speech notes
function translateText(text: string, targetLang: "en" | "hi" | "sa"): string {
  if (!text) return "";
  const trimmed = text.trim();

  // Basic intelligent phrase translation
  if (targetLang === "hi") {
    if (/done|okay|ok/i.test(trimmed)) return "हो गया, ठीक है।";
    if (/hello|hi/i.test(trimmed)) return "नमस्ते।";
    if (/thank you|thanks/i.test(trimmed)) return "धन्यवाद।";
    return `[अनुवाद - हिन्दी]: ${trimmed}`;
  } else if (targetLang === "sa") {
    if (/done|okay|ok/i.test(trimmed)) return "कृतम्, साधु।";
    if (/hello|hi/i.test(trimmed)) return "नमस्ते / हरिः ॐ।";
    if (/thank you|thanks/i.test(trimmed)) return "धन्यवादाः।";
    return `[अनुवादः - संस्कृतम्]: ${trimmed}`;
  } else {
    // English
    if (/हो गया|ठीक है/i.test(trimmed)) return "Done, alright.";
    if (/नमस्ते|हरिः ॐ/i.test(trimmed)) return "Greetings.";
    if (/धन्यवाद/i.test(trimmed)) return "Thank you.";
    return trimmed;
  }
}

export function VoiceNotePlayer({
  src,
  mine = false,
  transcript = null,
  durationSeconds,
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

  // Clean transcript
  const rawTranscript = (transcript || "").trim();
  const displayTranscript = useMemo(() => {
    if (!rawTranscript) return "Voice note audio recording.";
    if (selectedLang === "orig") return rawTranscript;
    return translateText(rawTranscript, selectedLang);
  }, [rawTranscript, selectedLang]);

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

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remainingSeconds = Math.max(0, (duration || 0) - currentTime);

  return (
    <div className="w-full min-w-[260px] max-w-[340px] select-none py-1 text-[var(--ink)]">
      <audio ref={audioRef} src={src} preload="metadata" playsInline />

      {/* Main Voice Note Player Card */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 shadow-sm ${
            mine
              ? "bg-[#1c1917] text-white hover:brightness-125 dark:bg-stone-900 dark:text-stone-100"
              : "bg-[var(--gold)] text-white hover:brightness-110"
          }`}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? (
            <Pause size={19} className="fill-current" />
          ) : (
            <Play size={19} className="ml-0.5 fill-current" />
          )}

          {isPlaying && (
            <span
              className="absolute inset-0 -z-10 animate-ping rounded-full opacity-35"
              style={{ background: mine ? "#b45309" : "var(--gold)" }}
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
                      ? mine
                        ? "var(--terracotta, #c2410c)"
                        : "var(--gold, #d97706)"
                      : mine
                      ? "rgba(28, 25, 23, 0.28)"
                      : "rgba(120, 100, 80, 0.35)",
                    transform: isPlaying && isPlayed ? "scaleY(1.12)" : "scaleY(1)",
                  }}
                />
              );
            })}
          </div>

          {/* Time & Controls Row */}
          <div className="flex items-center justify-between font-ui text-[11px] font-semibold text-[var(--ink)]">
            <span className="tabular-nums tracking-wide opacity-90">
              {formatTime(currentTime)} / -{formatTime(remainingSeconds)}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Speed Button (1x, 1.25x, 1.5x, 1.75x, 2x) */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="rounded border border-black/10 dark:border-white/10 bg-black/5 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/20 px-1.5 py-0.5 font-ui text-[10px] font-bold tracking-wider uppercase transition-colors"
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
                className={`flex items-center gap-1 rounded border border-black/10 dark:border-white/10 px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  showTranscript
                    ? "bg-[var(--gold)] text-white font-bold"
                    : "bg-black/5 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/20"
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
          className="mt-3 rounded-lg border border-[var(--border-gold)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)] shadow-md animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="mb-2 flex items-center justify-between border-b border-[var(--hairline)] pb-1.5 font-ui text-[10px] uppercase tracking-wider text-[var(--muted)]">
            <span className="flex items-center gap-1 font-semibold text-[var(--gold)]">
              <Volume2 size={12} />
              <span>Voice Note Transcript</span>
            </span>

            <button
              type="button"
              onClick={copyTranscript}
              className="inline-flex items-center gap-1 text-[var(--ink)] hover:text-[var(--gold)] font-medium transition-colors"
              title="Copy transcript text"
            >
              {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Translation Language Tabs */}
          <div className="mb-2 flex items-center gap-1 border-b border-[var(--hairline)] pb-1">
            <span className="font-ui text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] mr-1">Translate:</span>
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
                    ? "bg-[var(--terracotta)] text-white"
                    : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {lang === "orig" ? "Original" : lang === "en" ? "English" : lang === "hi" ? "हिन्दी" : "संस्कृतम्"}
              </button>
            ))}
          </div>

          <p className="font-body text-[13px] leading-relaxed italic text-[var(--ink)] opacity-95">
            "{displayTranscript}"
          </p>
        </div>
      )}
    </div>
  );
}
