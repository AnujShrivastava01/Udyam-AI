/**
 * Voice — Bhashini (ULCA), the Government of India language stack.
 *
 * This is the most important accessibility gap in the product. Many of the people it is built for
 * cannot read either script. A rural borrower can hold a conversation about a loan; they may not
 * be able to read a repayment schedule.
 *
 * Bhashini is the right provider rather than a commercial one: it is the National Language
 * Translation Mission's own stack, it covers the scheduled languages, and for a ministry-facing
 * product "runs on Bhashini" is an adoption argument, not just a technical choice.
 *
 * ── THE NUMERIC FIREWALL EXTENDS TO SPEECH ──────────────────────────────────────────────────
 * A misheard rupee amount is worse than a mistyped one, because the user has no chance to
 * proof-read it. So:
 *   • Numbers are NEVER spoken by a model. They are spoken from the kernel's own values.
 *   • Any number the user SPEAKS is read back for confirmation before it is acted on.
 *   • Rupee amounts are expanded into words the way a person would say them — "ek lakh", not
 *     "one zero zero zero zero zero" — because a TTS engine reading digits is unusable.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Bhashini's pipeline is two-step: ask the config endpoint which service to use, then call the
 * compute endpoint it names. Both need credentials this repository does not ship. Without them
 * every function here degrades to a stated, non-throwing "unavailable" — the product stays
 * usable, exactly as it does without Gemini.
 */

import type { Locale } from "@/lib/i18n/keys";

export type BhashiniLanguage = "hi" | "en" | "bn" | "mr" | "ta" | "te" | "gu" | "kn" | "ml" | "pa";

/** Hinglish has no ASR/TTS model of its own; Hindi acoustics carry it. */
export function toBhashiniLanguage(locale: Locale): BhashiniLanguage {
  return locale === "en" ? "en" : "hi";
}

export interface VoiceResult<T> {
  ok: boolean;
  value?: T;
  /** Why it is unavailable, in words a developer can act on. */
  reason?: string;
}

export function isVoiceConfigured(): boolean {
  return Boolean(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY);
}

const CONFIG_URL =
  process.env.BHASHINI_CONFIG_URL ??
  "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";

const PIPELINE_ID = process.env.BHASHINI_PIPELINE_ID ?? "64392f96daac500b55c543cd";

// ── number speech ───────────────────────────────────────────────────────────

/**
 * Digit names per script.
 *
 * Hinglish is ROMAN script — that is what makes it Hinglish. Emitting Devanagari into an otherwise
 * Roman sentence produces "Maine 1 लाख रुपये suna", which is unreadable to exactly the user who
 * chose Hinglish because they cannot read Devanagari comfortably.
 */
const UNITS: Record<Locale, string[]> = {
  en: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  hi: ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ"],
  hinglish: ["shunya", "ek", "do", "teen", "chaar", "paanch", "chhah", "saat", "aath", "nau"],
};

/** Spoken "zero". Distinct from UNITS[locale][0] because English spells digits but speaks "zero". */
const ZERO_WORD: Record<Locale, string> = { en: "zero", hi: "शून्य", hinglish: "shunya" };

const SCALE_WORDS: Record<Locale, { crore: string; lakh: string; thousand: string; rupees: string }> = {
  en: { crore: "crore", lakh: "lakh", thousand: "thousand", rupees: "rupees" },
  hi: { crore: "करोड़", lakh: "लाख", thousand: "हज़ार", rupees: "रुपये" },
  hinglish: { crore: "crore", lakh: "lakh", thousand: "hazaar", rupees: "rupaye" },
};

/**
 * Say a rupee amount the way a person says it.
 *
 * "₹46,467" must be spoken as "छियालीस हज़ार चार सौ सरसठ" — not as a digit string. We do not
 * attempt full Hindi numeral grammar here; we decompose into lakh / hazaar / sau groups, which is
 * how these figures are actually said, and leave the group values as digits for the TTS engine to
 * voice. That is a deliberate limitation, and it is stated rather than hidden.
 */
export function speakAmount(rupees: number, locale: Locale): string {
  const n = Math.round(Math.abs(rupees));

  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;

  const word = SCALE_WORDS[locale];
  const parts: string[] = [];

  if (crore) parts.push(`${crore} ${word.crore}`);
  if (lakh) parts.push(`${lakh} ${word.lakh}`);
  if (thousand) parts.push(`${thousand} ${word.thousand}`);
  if (rest) parts.push(String(rest));

  if (parts.length === 0) parts.push(ZERO_WORD[locale]);
  return `${parts.join(" ")} ${word.rupees}`;
}

/** Read a number back digit by digit, for confirming something the user spoke. */
export function spellDigits(value: number | string, locale: Locale): string {
  const digits = String(value).replace(/\D/g, "").split("");
  const units = UNITS[locale];
  return digits.map((d) => units[Number(d)] ?? d).join(" ");
}

/**
 * Pull a rupee amount out of spoken input.
 *
 * People say "ek lakh", "1 lakh", "एक लाख", "50 hazaar". Returns null when it cannot be read
 * confidently — the caller must then ask again rather than guess, because guessing a loan amount
 * is exactly the failure this product exists to prevent.
 */
export function parseSpokenAmount(text: string): number | null {
  const t = text.toLowerCase().trim();

  const WORD_NUM: Record<string, number> = {
    ek: 1, "एक": 1, do: 2, "दो": 2, teen: 3, "तीन": 3, char: 4, "चार": 4,
    paanch: 5, panch: 5, "पाँच": 5, "पांच": 5, chah: 6, "छह": 6,
    saat: 7, "सात": 7, aath: 8, "आठ": 8, nau: 9, "नौ": 9, das: 10, "दस": 10,
    bees: 20, "बीस": 20, pachas: 50, "पचास": 50,
  };

  const scale = (unit: string) =>
    /lakh|लाख/.test(unit) ? 100_000 : /hazaar|hazar|हज़ार|हजार|thousand/.test(unit) ? 1_000 : 1;

  // "1 lakh" / "50 hazaar" / "1.5 lakh"
  const numeric = t.match(/(\d+(?:\.\d+)?)\s*(lakh|लाख|hazaar|hazar|हज़ार|हजार|thousand)?/);
  if (numeric) {
    const base = parseFloat(numeric[1]);
    const mult = numeric[2] ? scale(numeric[2]) : 1;
    const value = base * mult;
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  }

  // "ek lakh" / "एक लाख"
  const worded = t.match(/([a-zऀ-ॿ]+)\s*(lakh|लाख|hazaar|hazar|हज़ार|हजार)/);
  if (worded && WORD_NUM[worded[1]] != null) {
    return Math.round(WORD_NUM[worded[1]] * scale(worded[2]));
  }

  return null;
}

// ── the gateway ─────────────────────────────────────────────────────────────

interface PipelineTask {
  taskType: "asr" | "tts" | "translation";
  config: Record<string, unknown>;
}

async function resolvePipeline(tasks: PipelineTask[]): Promise<VoiceResult<{
  endpoint: string;
  headerName: string;
  headerValue: string;
  config: unknown;
}>> {
  if (!isVoiceConfigured()) {
    return { ok: false, reason: "BHASHINI_USER_ID / BHASHINI_API_KEY are not set" };
  }
  try {
    const res = await fetch(CONFIG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        userID: process.env.BHASHINI_USER_ID!,
        ulcaApiKey: process.env.BHASHINI_API_KEY!,
      },
      body: JSON.stringify({
        pipelineTasks: tasks,
        pipelineRequestConfig: { pipelineId: PIPELINE_ID },
      }),
    });
    if (!res.ok) return { ok: false, reason: `config ${res.status}` };
    const data = await res.json();
    const cb = data?.pipelineInferenceAPIEndPoint;
    if (!cb?.callbackUrl) return { ok: false, reason: "config returned no callbackUrl" };
    return {
      ok: true,
      value: {
        endpoint: cb.callbackUrl,
        headerName: cb.inferenceApiKey?.name,
        headerValue: cb.inferenceApiKey?.value,
        config: data.pipelineResponseConfig,
      },
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Speech to text. Returns the transcript; the caller must confirm any number in it. */
export async function transcribe(
  audioBase64: string,
  locale: Locale,
): Promise<VoiceResult<string>> {
  const lang = toBhashiniLanguage(locale);
  const pipeline = await resolvePipeline([
    { taskType: "asr", config: { language: { sourceLanguage: lang } } },
  ]);
  if (!pipeline.ok) return { ok: false, reason: pipeline.reason };

  try {
    const res = await fetch(pipeline.value!.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [pipeline.value!.headerName]: pipeline.value!.headerValue,
      },
      body: JSON.stringify({
        pipelineTasks: [
          { taskType: "asr", config: { language: { sourceLanguage: lang }, audioFormat: "wav" } },
        ],
        inputData: { audio: [{ audioContent: audioBase64 }] },
      }),
    });
    if (!res.ok) return { ok: false, reason: `asr ${res.status}` };
    const data = await res.json();
    const text = data?.pipelineResponse?.[0]?.output?.[0]?.source;
    return text ? { ok: true, value: text } : { ok: false, reason: "empty transcript" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Text to speech. Returns base64 audio. */
export async function synthesise(text: string, locale: Locale): Promise<VoiceResult<string>> {
  const lang = toBhashiniLanguage(locale);
  const pipeline = await resolvePipeline([
    { taskType: "tts", config: { language: { sourceLanguage: lang } } },
  ]);
  if (!pipeline.ok) return { ok: false, reason: pipeline.reason };

  try {
    const res = await fetch(pipeline.value!.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [pipeline.value!.headerName]: pipeline.value!.headerValue,
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: "tts",
            config: { language: { sourceLanguage: lang }, gender: "female", samplingRate: 8000 },
          },
        ],
        inputData: { input: [{ source: text }] },
      }),
    });
    if (!res.ok) return { ok: false, reason: `tts ${res.status}` };
    const data = await res.json();
    const audio = data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
    return audio ? { ok: true, value: audio } : { ok: false, reason: "empty audio" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export const VOICE_STATUS = {
  configured: isVoiceConfigured,
  note:
    "Bhashini needs a ULCA user id and API key from bhashini.gov.in. Without them speech is " +
    "unavailable and the product falls back to text — no figure changes, and nothing throws.",
};
