/**
 * Voice and Indic language — Sarvam AI.
 *
 * An alternative provider to Bhashini behind the same interface. Sarvam is the pragmatic choice
 * for a hackathon: a single API key from dashboard.sarvam.ai with free starting credit, no
 * government onboarding, no OAuth, no billing account. Its models are Indic-first, which matters
 * — a general multilingual TTS reading a Hindi rupee figure aloud is not the same thing as a model
 * built for it.
 *
 * It is also a defensible pitch line for an Indian government submission: an Indian model stack,
 * not a US one.
 *
 * Same firewall as everywhere else: numbers are spoken from the kernel's own values, and any
 * number the user speaks is read back before it is acted on.
 *
 * ── VERIFIED AGAINST THE LIVE API, 2026-09-05 ──────────────────────────────────────────────
 * This file was originally written from documentation and never executed. Three things in it were
 * wrong, and all three were hard 400s — the module could not have worked as shipped:
 *
 *   1. `speaker: "meera"` is not a speaker any more. bulbul:v3 serves aditya, ritu, ashutosh,
 *      priya, neha, rahul, pooja, rohan, simran, kavya, … — the error lists them all, which is
 *      the fastest way to re-check when this drifts again.
 *   2. `bulbul:v1` and `bulbul:v2` are both deprecated. The error names the replacement outright:
 *      "Model 'bulbul:v2' has been deprecated. Please use 'bulbul:v3' instead."
 *   3. Speech-to-text is **multipart/form-data with a `file` part**, not the JSON base64 body this
 *      module was sending. JSON gets `body.file : Field required`. `saarika:v2` is also deprecated;
 *      saarika:v2.5 and saaras:v3 both serve.
 *
 * Round-trip proof, live: synthesising "Aapko har quarter nau hazaar rupaye dene honge" and feeding
 * the WAV straight back to STT returns "आपको हर क्वार्टर ₹9000 देने होंगे।" — the figure survives
 * the loop, which is the property the numeric firewall exists to protect.
 *
 * Every model and speaker below is env-overridable, because this contract has now drifted twice.
 * ───────────────────────────────────────────────────────────────────────────────────────────
 */

import type { Locale } from "@/lib/i18n/keys";
import type { VoiceResult } from "./bhashini";

/** Sarvam uses BCP-47-ish codes. Hinglish rides on Hindi acoustics. */
export type SarvamLanguage = "hi-IN" | "en-IN" | "bn-IN" | "mr-IN" | "ta-IN" | "te-IN" | "gu-IN";

export function toSarvamLanguage(locale: Locale): SarvamLanguage {
  return locale === "en" ? "en-IN" : "hi-IN";
}

const BASE = process.env.SARVAM_BASE_URL ?? "https://api.sarvam.ai";

/** Speaker and models, all overridable — see the drift note above. */
const TTS_MODEL = process.env.SARVAM_TTS_MODEL ?? "bulbul:v3";
// rupali serves bulbul:v3 only — she is absent from v2's speaker list, so a model downgrade is a
// hard 400 rather than a different voice.
const TTS_SPEAKER = process.env.SARVAM_TTS_SPEAKER ?? "rupali";
const STT_MODEL = process.env.SARVAM_STT_MODEL ?? "saarika:v2.5";

export function isSarvamConfigured(): boolean {
  return Boolean(process.env.SARVAM_API_KEY);
}

function authHeader(): Record<string, string> {
  return { "api-subscription-key": process.env.SARVAM_API_KEY! };
}

async function callJson<T>(
  path: string,
  body: unknown,
  pick: (data: Record<string, unknown>) => T | undefined,
): Promise<VoiceResult<T>> {
  if (!isSarvamConfigured()) {
    return { ok: false, reason: "SARVAM_API_KEY is not set" };
  }
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      // Never echo the key back into a log line. Sarvam's 400s name the valid values, so the
      // body is worth keeping — it is how you find out a model was deprecated under you.
      return { ok: false, reason: `${res.status} ${text.slice(0, 300)}` };
    }
    const data = (await res.json()) as Record<string, unknown>;
    const value = pick(data);
    return value != null ? { ok: true, value } : { ok: false, reason: "empty response" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Text to speech. Returns base64 WAV. */
export async function sarvamSynthesise(
  text: string,
  locale: Locale,
): Promise<VoiceResult<string>> {
  return callJson(
    "/text-to-speech",
    {
      inputs: [text],
      target_language_code: toSarvamLanguage(locale),
      speaker: TTS_SPEAKER,
      model: TTS_MODEL,
      pitch: 0,
      pace: 0.95, // slightly slower — these are financial figures, not chat
      loudness: 1.2,
      // Phone-grade would be 8000; this is going to a browser, where the extra bytes are cheap
      // and the difference in intelligibility on a rupee figure is not.
      speech_sample_rate: 22050,
      enable_preprocessing: true,
    },
    (d) => (d.audios as string[] | undefined)?.[0],
  );
}

/**
 * Speech to text.
 *
 * Takes base64 so the interface matches Bhashini's, and posts it as a file part — this endpoint
 * does not accept a JSON body.
 */
export async function sarvamTranscribe(
  audioBase64: string,
  locale: Locale,
): Promise<VoiceResult<string>> {
  if (!isSarvamConfigured()) {
    return { ok: false, reason: "SARVAM_API_KEY is not set" };
  }
  try {
    const bytes = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "audio/wav" }), "audio.wav");
    form.append("language_code", toSarvamLanguage(locale));
    form.append("model", STT_MODEL);

    const res = await fetch(`${BASE}/speech-to-text`, {
      method: "POST",
      headers: authHeader(), // no Content-Type: fetch sets the multipart boundary itself
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: `${res.status} ${text.slice(0, 300)}` };
    }
    const data = (await res.json()) as { transcript?: string };
    return data.transcript
      ? { ok: true, value: data.transcript }
      : { ok: false, reason: "empty transcript" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Narration through Sarvam's chat model.
 *
 * Offered as a fallback for the Gemini narrator, subject to the identical numeric firewall — the
 * caller must still run `verifyNumericFidelity` on whatever comes back. No provider is trusted to
 * respect "do not invent a number"; every one of them is checked.
 */
export async function sarvamNarrate(prompt: string): Promise<VoiceResult<string>> {
  return callJson(
    "/v1/chat/completions",
    {
      model: process.env.SARVAM_CHAT_MODEL ?? "sarvam-m",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 300,
    },
    (d) => {
      const choices = d.choices as { message?: { content?: string } }[] | undefined;
      return choices?.[0]?.message?.content?.trim();
    },
  );
}

export const SARVAM_STATUS = {
  configured: isSarvamConfigured,
  models: { tts: TTS_MODEL, speaker: TTS_SPEAKER, stt: STT_MODEL },
  note:
    "Sarvam needs one key from dashboard.sarvam.ai — free starting credit, no billing account. " +
    "Without it speech is unavailable and the product falls back to text; no figure changes.",
};
