import { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2, Square } from "lucide-react";
import { toast } from "sonner";

/**
 * Recording a voice note.
 *
 * The microphone is opened when recording starts and released the moment it
 * stops — not held for the life of the page. A browser tab that keeps a
 * microphone open shows a recording indicator the whole time, which is alarming
 * and rightly so.
 *
 * Nothing leaves the device until it is sent. The recording is held in memory,
 * can be played back, and can be thrown away — a voice note is the easiest kind
 * of message to regret, so discarding one is a single obvious button rather
 * than something to hunt for.
 */

const MAX_SECONDS = 10 * 60;

/** The first container the browser admits to supporting. */
function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find(type => MediaRecorder.isTypeSupported?.(type));
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceRecorder({
  onSend,
  onClose,
  busy,
}: {
  onSend: (file: File) => Promise<void> | void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const tickRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const audioCtxRef = useRef<AudioContext | null>(null);

  /** Release the microphone and every timer, whatever state we are in. */
  const teardown = () => {
    window.clearInterval(tickRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  useEffect(() => () => {
    teardown();
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    const mimeType = pickMimeType();
    if (!mimeType) {
      toast.error("This browser cannot record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        setClipUrl(URL.createObjectURL(blob));
        teardown();
      };

      recorder.start(250);
      setRecording(true);
      setSeconds(0);

      tickRef.current = window.setInterval(() => {
        setSeconds(value => {
          // Ten minutes is the ceiling. Stopping on its own is kinder than
          // discovering afterwards that the tail was thrown away.
          if (value + 1 >= MAX_SECONDS) {
            recorder.state === "recording" && recorder.stop();
            setRecording(false);
            toast.info("Ten minutes reached — recording stopped.");
          }
          return value + 1;
        });
      }, 1000);

      // A moving level is the only honest signal that the microphone is
      // actually hearing something; a static "recording" label is not.
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 60));
        rafRef.current = requestAnimationFrame(sample);
      };
      sample();
    } catch (err: any) {
      toast.error(
        err?.name === "NotAllowedError"
          ? "Your browser is blocking the microphone for this site."
          : "Could not start recording.",
      );
      teardown();
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
    window.clearInterval(tickRef.current);
  };

  const discard = () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    setClipUrl(null);
    blobRef.current = null;
    setSeconds(0);
  };

  const send = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    const mimeType = blob.type || "audio/webm";
    const file = new File([blob], `voice-note.${extensionFor(mimeType)}`, { type: mimeType });
    await onSend(file);
    discard();
    onClose();
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-[90] cursor-default" aria-label="Close" onClick={onClose} />
      <div
        className="absolute bottom-full right-0 z-[95] mb-2 w-[min(19rem,calc(100vw-2rem))] rounded-[4px] border p-3 shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
        role="dialog"
        aria-label="Record a voice note"
      >
        <div className="mb-3 flex items-baseline justify-between">
          <p className="mono-label">Voice note</p>
          <span className="font-ui text-[11px] tabular-nums text-[var(--ink-meta)]">
            {clock(seconds)} <span className="opacity-50">/ 10:00</span>
          </span>
        </div>

        {clipUrl ? (
          <>
            <audio src={clipUrl} controls className="w-full" />
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={discard} className="btn-ink flex-1 justify-center text-[11px]" disabled={busy}>
                <Trash2 size={13} /> Discard
              </button>
              <button type="button" onClick={send} className="btn-terracotta flex-1 justify-center text-[11px]" disabled={busy}>
                <Send size={13} /> Send
              </button>
            </div>
          </>
        ) : (
          <>
            {/* The bar answers "is it hearing me?", which no label can. */}
            <div className="h-2 w-full overflow-hidden rounded-[2px]" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full transition-[width] duration-75"
                style={{
                  width: recording ? `${Math.max(level * 100, 3)}%` : "0%",
                  background: recording ? "var(--accent)" : "transparent",
                }}
              />
            </div>

            <button
              type="button"
              onClick={recording ? stop : start}
              className={recording ? "btn-ink mt-3 w-full justify-center text-[11px]" : "btn-terracotta mt-3 w-full justify-center text-[11px]"}
            >
              {recording ? <><Square size={12} /> Stop</> : <><Mic size={13} /> Start recording</>}
            </button>

            <p className="mt-2 font-ui text-[10px] leading-4 text-[var(--ink-faint)]">
              {recording
                ? "Recording. Nothing is sent until you choose to send it."
                : "Up to ten minutes. You can listen back before sending."}
            </p>
          </>
        )}
      </div>
    </>
  );
}
