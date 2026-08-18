import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Recording a voice note, in place of the composer.
 *
 * It takes over the composer row rather than opening a panel above it. The
 * first attempt was a popup anchored to the toolbar, which was invisible: the
 * toolbar clips its own contents to keep its corners square, so the panel was
 * cut away the moment it appeared. Replacing the row sidesteps that, and is
 * the right shape anyway — while recording there is nothing else to do here.
 *
 * Everything is one tap: throw it away, hold it, or send it. Sending stops the
 * recorder first, so there is no separate "stop, then send" step to discover.
 *
 * The microphone opens when recording starts and is released the moment it
 * ends, in every path out of this component — sent, discarded, or unmounted.
 * A tab holding a microphone open shows a recording indicator the whole time,
 * and it should never be showing one when nobody is recording.
 */

const MAX_SECONDS = 10 * 60;

function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find(type => MediaRecorder.isTypeSupported?.(type));
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VoiceRecorder({
  onSend,
  onCancel,
  busy,
}: {
  onSend: (file: File) => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [starting, setStarting] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const audioCtxRef = useRef<AudioContext | null>(null);
  /** Set when the recording is being sent, so onstop knows what to do. */
  const sendOnStopRef = useRef(false);

  const releaseEverything = () => {
    window.clearInterval(tickRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  // Recording begins as soon as this appears — the tap on the microphone was
  // the decision, and asking for a second one is a step too many.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mimeType = pickMimeType();
      if (!mimeType) {
        toast.error("This browser cannot record audio.");
        onCancel();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType });
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          releaseEverything();
          if (!sendOnStopRef.current || blob.size === 0) return;
          const file = new File([blob], `voice-note.${extensionFor(mimeType)}`, { type: mimeType });
          await onSend(file);
          onCancel();
        };

        recorder.start(250);
        setStarting(false);

        tickRef.current = window.setInterval(() => {
          setSeconds(value => {
            if (value + 1 >= MAX_SECONDS) {
              sendOnStopRef.current = false;
              if (recorder.state !== "inactive") recorder.stop();
              toast.info("Ten minutes reached — recording stopped.");
            }
            return value + 1;
          });
        }, 1000);

        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaStreamSource(stream);
            // Connect ONLY to analyser for volume meter — NEVER to destination/speakers
            source.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);

            const sample = () => {
              if (!analyser) return;
              analyser.getByteTimeDomainData(data);
              let peak = 0;
              for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
              setLevel(Math.min(1, peak / 55));
              rafRef.current = requestAnimationFrame(sample);
            };
            sample();
          }
        } catch {
          // Audio level meter fallback (silent)
        }
      } catch (err: any) {
        if (cancelled) return;
        toast.error(
          err?.name === "NotAllowedError"
            ? "Your browser is blocking the microphone for this site."
            : "Could not start recording.",
        );
        releaseEverything();
        onCancel();
      }
    })();

    return () => {
      cancelled = true;
      sendOnStopRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      releaseEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setPaused(true);
      window.clearInterval(tickRef.current);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setPaused(false);
      tickRef.current = window.setInterval(() => setSeconds(v => v + 1), 1000);
    }
  };

  const discard = () => {
    sendOnStopRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    releaseEverything();
    onCancel();
  };

  const send = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    sendOnStopRef.current = true;
    // Resume first: a paused recorder does not always flush its final chunk.
    if (recorder.state === "paused") recorder.resume();
    recorder.stop();
  };

  return (
    <div
      className="flex flex-col gap-1.5 rounded-[4px] border px-3 py-2"
      style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
      role="group"
      aria-label="Recording a voice note"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={discard}
          className="composer-tool shrink-0 rounded-[2px] border"
          style={{ borderColor: "var(--hairline)", color: "var(--state-error)" }}
          aria-label="Delete this recording"
          disabled={busy}
        >
          <Trash2 size={15} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* A dot that stops blinking when held, so paused is unmistakable. */}
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              background: paused ? "var(--ink-faint)" : "#ef4444",
              animation: paused || starting ? undefined : "pulse 1.2s ease-in-out infinite",
            }}
          />
          <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-[var(--ink)]">
            {clock(seconds)}
          </span>

          <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            <span
              className="block h-full transition-[width] duration-75 rounded-full"
              style={{
                width: paused ? "0%" : `${Math.max(level * 100, 6)}%`,
                background: "#f59e0b",
              }}
            />
          </span>
        </div>

        <button
          type="button"
          onClick={togglePause}
          className="composer-tool shrink-0 rounded-[2px] border"
          style={{ borderColor: "var(--hairline)" }}
          aria-label={paused ? "Resume recording" : "Pause recording"}
          disabled={busy || starting}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>

        <button
          type="button"
          onClick={send}
          className="btn-terracotta shrink-0"
          aria-label="Send this voice note"
          disabled={busy || starting || seconds < 1}
        >
          {busy ? <span className="spinner-editorial" aria-hidden="true" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

/** The idle button that starts a recording. */
export function VoiceNoteButton({ onStart, disabled }: { onStart: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="composer-tool" onClick={onStart} aria-label="Record a voice note" disabled={disabled}>
      <Mic size={15} />
    </button>
  );
}
