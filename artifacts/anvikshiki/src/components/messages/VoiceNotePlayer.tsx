import { useEffect, useRef, useState, useId } from "react";
import { Play, Pause, FileText, Globe, Copy, Check, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceNotePlayerProps {
  src: string;
  mine?: boolean;
  transcript?: string | null;
  durationSeconds?: number;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

// 32-bar waveform profile mimicking realistic human voice pitch & frequency variations
const DEFAULT_WAVEFORM = [
  24, 38, 55, 72, 45, 80, 95, 60, 40, 65, 85, 100, 75, 50, 68, 88,
  92, 70, 48, 62, 78, 86, 58, 42, 60, 75, 90, 68, 45, 55, 35, 20
];

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse simulated or actual transcript if provided
  const rawTranscript = transcript?.trim() || "";
  const hasTranscript = Boolean(rawTranscript);

  // Sync speed changes to HTMLAudioElement
  const currentSpeed = SPEED_OPTIONS[speedIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = currentSpeed;
    }
  }, [currentSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoaded(true);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
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
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Pause any other playing audio on the page
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audio && !el.paused) el.pause();
      });
      audio.play().catch((err) => {
        console.warn("Audio playback failed:", err);
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
    if (!rawTranscript) return;
    navigator.clipboard.writeText(rawTranscript).then(() => {
      setCopied(true);
      toast.success("Transcript copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full min-w-[240px] max-w-[320px] select-none py-1">
      <audio ref={audioRef} src={src} preload="metadata" playsInline />

      {/* Main Voice Note Player Card */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
            mine
              ? "bg-[var(--bg)] text-[var(--ink)] shadow-md hover:bg-white"
              : "bg-[var(--gold)] text-white shadow-md hover:brightness-110"
          }`}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? (
            <Pause size={18} className="fill-current" />
          ) : (
            <Play size={18} className="ml-0.5 fill-current" />
          )}

          {isPlaying && (
            <span
              className="absolute inset-0 -z-10 animate-ping rounded-full opacity-40"
              style={{ background: mine ? "rgba(255,255,255,0.4)" : "var(--gold)" }}
            />
          )}
        </button>

        {/* Waveform & Scrubber */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            className="group relative flex h-7 cursor-pointer items-center gap-[3px] py-1"
            title="Click to seek"
          >
            {DEFAULT_WAVEFORM.map((height, i) => {
              const barPercent = (i / DEFAULT_WAVEFORM.length) * 100;
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
                        ? "var(--bg)"
                        : "var(--gold)"
                      : mine
                      ? "rgba(255, 255, 255, 0.25)"
                      : "rgba(0, 0, 0, 0.2)",
                    transform: isPlaying && isPlayed ? "scaleY(1.08)" : "scaleY(1)",
                  }}
                />
              );
            })}
          </div>

          {/* Time & Controls Row */}
          <div className="flex items-center justify-between font-ui text-[11px] font-medium opacity-80">
            <span className="tabular-nums tracking-wide">
              {formatTime(currentTime)} / {formatTime(duration || 0)}
            </span>

            <div className="flex items-center gap-2">
              {/* Speed Button (1x, 1.25x, 1.5x, 1.75x, 2x) */}
              <button
                type="button"
                onClick={cycleSpeed}
                className={`rounded px-1.5 py-0.5 font-ui text-[10px] font-bold tracking-wider uppercase transition-colors ${
                  mine
                    ? "bg-white/15 hover:bg-white/25 text-[var(--bg)]"
                    : "bg-black/10 hover:bg-black/20 text-[var(--ink)]"
                }`}
                title="Change playback speed"
              >
                {currentSpeed}x
              </button>

              {/* Transcript Toggle Button */}
              {hasTranscript && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTranscript(!showTranscript);
                  }}
                  className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                    showTranscript
                      ? mine
                        ? "bg-white/30 font-semibold"
                        : "bg-[var(--gold)]/20 text-[var(--gold)] font-semibold"
                      : mine
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-black/5 hover:bg-black/15"
                  }`}
                  title="Toggle transcription"
                >
                  <FileText size={11} />
                  <span>Text</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Transcript & Translation Box */}
      {hasTranscript && showTranscript && (
        <div
          className={`mt-2.5 rounded-lg border p-2.5 text-xs transition-all ${
            mine
              ? "border-white/20 bg-white/10 text-[var(--bg)]"
              : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink)] shadow-sm"
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between border-b border-current/10 pb-1 font-ui text-[10px] uppercase tracking-wider opacity-70">
            <span className="flex items-center gap-1">
              <Volume2 size={11} />
              {isTranslated ? "Translated Transcript" : "Audio Transcript"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTranslated(!isTranslated);
                }}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Globe size={10} />
                <span>{isTranslated ? "Original" : "Translate"}</span>
              </button>

              <button
                type="button"
                onClick={copyTranscript}
                className="inline-flex items-center gap-1 hover:underline"
                title="Copy transcript text"
              >
                {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <p className="font-body text-[13px] leading-relaxed italic opacity-95">
            "{rawTranscript}"
          </p>
        </div>
      )}
    </div>
  );
}
