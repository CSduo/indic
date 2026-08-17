/**
 * Transcribing and translating voice notes.
 *
 * One rule governs this file: never invent words and attribute them to
 * somebody's voice. The previous version, when no transcription service was
 * configured, returned the sentence "Voice note audio message recorded by
 * scholar." as though it were what the speaker had said, and produced
 * "translations" by matching keywords against a table of canned sentences — so
 * a voice note beginning "hello" was translated into a Hindi sentence meaning
 * "Greetings, I have shared my thoughts in this voice note", which nobody had
 * uttered. In a private conversation that is not a cosmetic failure: somebody
 * may act on it.
 *
 * So a transcript here is either what the speech model heard, or nothing at
 * all with a plain reason why.
 *
 * The audio is sent to Google's Gemini API when a key is configured. That is a
 * third party, and it should be understood as one: the recording leaves this
 * server. Without a key, transcription simply reports that it is unavailable.
 */

export interface TranscriptionResult {
  transcript: string;
  detectedLanguage?: string;
  translations: {
    english: string;
    hindi: string;
    sanskrit: string;
  };
}

export type TranscriptionOutcome =
  | { ok: true; result: TranscriptionResult }
  | { ok: false; reason: string; code: "NOT_CONFIGURED" | "NO_SPEECH" | "PROVIDER_FAILED" };

/** Gemini's audio models change names; the default is overridable without a deploy. */
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function apiKey(): string | null {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  return key || null;
}

/** True when a transcript can actually be produced. */
export function transcriptionIsConfigured(): boolean {
  return apiKey() !== null;
}

async function callGemini(body: unknown): Promise<any | null> {
  const key = apiKey();
  if (!key) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn(`Gemini returned ${res.status}:`, detail.slice(0, 300));
    return null;
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    console.warn("Gemini did not return parseable JSON.");
    return null;
  }
}

/**
 * Transcribe a recording, and translate what was actually heard.
 *
 * The prompt is explicit that silence must come back as an empty transcript.
 * A model asked to transcribe an empty recording will otherwise oblige by
 * imagining something plausible, which is the failure this whole file exists
 * to avoid.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<TranscriptionOutcome> {
  if (!transcriptionIsConfigured()) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      reason: "Transcription is not switched on for this site yet.",
    };
  }

  const parsed = await callGemini({
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType || "audio/webm", data: buffer.toString("base64") } },
        {
          text: [
            "Transcribe the speech in this recording exactly as spoken, with punctuation.",
            "Then translate what was said into English, Hindi and Sanskrit.",
            "",
            "Rules you must follow:",
            "- Transcribe only what is audibly said. Never add, complete or infer words.",
            "- If the recording contains no intelligible speech, return an empty transcript.",
            "- Translations must be of the transcript and nothing else.",
            "- If the speech is already in one of those languages, repeat it unchanged for that language.",
            "",
            'Respond with JSON only: {"transcript": string, "detectedLanguage": string, "translations": {"english": string, "hindi": string, "sanskrit": string}}',
          ].join("\n"),
        },
      ],
    }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  if (!parsed) {
    return {
      ok: false,
      code: "PROVIDER_FAILED",
      reason: "The transcription service could not be reached. Try again in a moment.",
    };
  }

  const transcript = String(parsed.transcript || "").trim();
  if (!transcript) {
    return {
      ok: false,
      code: "NO_SPEECH",
      reason: "No speech could be made out in this recording.",
    };
  }

  // A missing translation falls back to the transcript itself, which is at
  // least true, rather than to a sentence the speaker never said.
  const t = parsed.translations || {};
  return {
    ok: true,
    result: {
      transcript,
      detectedLanguage: String(parsed.detectedLanguage || "").trim() || undefined,
      translations: {
        english: String(t.english || "").trim() || transcript,
        hindi: String(t.hindi || "").trim() || transcript,
        sanskrit: String(t.sanskrit || "").trim() || transcript,
      },
    },
  };
}

/**
 * Translate a transcript that already exists, without sending the audio again.
 *
 * Used when a voice note was transcribed as it was recorded: the words are
 * known, so only the translation is missing, and a text request costs a
 * fraction of an audio one.
 */
export async function translateTranscript(
  transcript: string,
): Promise<{ english: string; hindi: string; sanskrit: string } | null> {
  const text = transcript.trim();
  if (!text || !transcriptionIsConfigured()) return null;

  const parsed = await callGemini({
    contents: [{
      parts: [{
        text: [
          "Translate the passage below into English, Hindi and Sanskrit.",
          "Translate only what is written. Do not add, explain or embellish.",
          "If it is already in one of those languages, repeat it unchanged for that language.",
          "",
          'Respond with JSON only: {"english": string, "hindi": string, "sanskrit": string}',
          "",
          "Passage:",
          text,
        ].join("\n"),
      }],
    }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  if (!parsed) return null;

  return {
    english: String(parsed.english || "").trim() || text,
    hindi: String(parsed.hindi || "").trim() || text,
    sanskrit: String(parsed.sanskrit || "").trim() || text,
  };
}
