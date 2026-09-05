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
 */

import type { Locale } from "@/lib/i18n/keys";
import type { VoiceResult } from "./bhashini";

/** Sarvam uses BCP-47-ish codes. Hinglish rides on Hindi acoustics. */
export type SarvamLanguage = "hi-IN" | "en-IN" | "bn-IN" | "mr-IN" | "ta-IN" | "te-IN" | "gu-IN";

export function toSarvamLanguage(locale: Locale): SarvamLanguage {
  return locale === "en" ? "en-IN" : "hi-IN";
}

const BASE = process.env.SARVAM_BASE_URL ?? "https://api.sarvam.ai";

export function isSarvamConfigured(): boolean {
  return Boolean(process.env.SARVAM_API_KEY);
}

async function call<T>(
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
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": process.env.SARVAM_API_KEY!,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      // Never echo the key back into a log line.
      return { ok: false, reason: `${res.status} ${text.slice(0, 200)}` };
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
  return call(
    "/text-to-speech",
    {
      inputs: [text],
      target_language_code: toSarvamLanguage(locale),
      speaker: "meera",
      pitch: 0,
      pace: 0.95, // slightly slower — these are financial figures, not chat
      loudness: 1.2,
      speech_sample_rate: 8000, // phone-grade; this is going down a rural connection
      enable_preprocessing: true,
      model: "bulbul:v1",
    },
    (d) => (d.audios as string[] | undefined)?.[0],
  );
}

/** Speech to text. `audioBase64` should be WAV. */
export async function sarvamTranscribe(
  audioBase64: string,
  locale: Locale,
): Promise<VoiceResult<string>> {
  return call(
    "/speech-to-text",
    {
      audio: audioBase64,
      language_code: toSarvamLanguage(locale),
      model: "saarika:v2",
    },
    (d) => d.transcript as string | undefined,
  );
}

/**
 * Narration through Sarvam's chat model.
 *
 * Offered as a fallback for the Gemini narrator, subject to the identical numeric firewall — the
 * caller must still run `verifyNumericFidelity` on whatever comes back. No provider is trusted to
 * respect "do not invent a number"; every one of them is checked.
 */
export async function sarvamNarrate(prompt: string): Promise<VoiceResult<string>> {
  return call(
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
  note:
    "Sarvam needs one key from dashboard.sarvam.ai — free starting credit, no billing account. " +
    "Without it speech is unavailable and the product falls back to text; no figure changes.",
};
