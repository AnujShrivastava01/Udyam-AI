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

/**
 * A discriminated union, so `if (!r.ok) return` actually narrows.
 *
 * This was `{ ok: boolean; value?: T; reason?: string }`, which type-checks every construction
 * site and narrows at none of them: after an `ok` guard, `value` was still `T | undefined`, so
 * callers reached for `!` and the compiler stopped helping. On the union below, a success must
 * carry a value and a failure must carry a reason — both are enforced where the result is built,
 * which is the only place that knows.
 */
export type VoiceResult<T> =
  | { ok: true; value: T }
  /** Why it is unavailable, in words a developer can act on. */
  | { ok: false; reason: string };

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
 * ── WHY THIS IS FUSSY ────────────────────────────────────────────────────────────────────────
 * The previous implementation took the FIRST number-and-scale it matched and returned it, which
 * produced two silent errors on ordinary input:
 *
 *   "46 hazaar 467 rupaye"  ->  46000   (the 467 was thrown away)
 *   "\u20b946,467"                ->  46      (\d+ stopped at the comma)
 *
 * The second is a factor of a thousand, on a rupee figure, with no error raised. In a product
 * whose entire claim is that its numbers are traceable, a parser that quietly returns \u20b946 when the
 * user said forty-six thousand four hundred and sixty-seven is worse than no parser at all.
 *
 * This version tokenises the whole string and accumulates over every group, the way a person
 * reads a number: units and tens build a running value, "hundred" scales it, and "thousand",
 * "lakh" and "crore" flush it into the total.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────────
 * It does not carry a full Devanagari numeral table. Real ASR output looks like this, live from
 * Sarvam on 2026-09-05:
 *
 *   "\u0906\u092a\u0915\u094b \u091b\u093f\u092f\u093e\u0932\u0940\u0938 \u0939\u091c\u093c\u093e\u0930 \u091a\u093e\u0930 \u0938\u094c \u0938\u0921\u093c\u0938\u0920 \u0930\u0941\u092a\u092f\u0947 ..."
 *
 * Hindi numerals 0\u201399 are irregular \u2014 46 is \u091b\u093f\u092f\u093e\u0932\u0940\u0938 and 67 is \u0938\u0921\u093c\u0938\u0920, neither derivable from
 * their parts. A hand-typed hundred-row table is exactly the kind of thing that carries a typo
 * into a loan amount, and there is no way to verify one here. So the vocabulary covers what can be
 * stated with confidence, and everything else returns null.
 *
 * null means "ask again". It never means zero, and the caller must never treat it as a value.
 * Any amount that does parse must still be read back with `confirmationPrompt` before it is acted
 * on \u2014 a borrower cannot proof-read speech, and a misheard margin changes every figure downstream.
 */
const WORD_VALUE: Record<string, number> = {
  // Hinglish / Latin, 0\u201320 plus tens \u2014 the forms `speakAmount` itself emits and the ones people
  // actually say for money.
  zero: 0, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chah: 6, chhah: 6,
  saat: 7, aath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
  solah: 16, satrah: 17, atharah: 18, unnees: 19, bees: 20, tees: 30, chalees: 40, pachas: 50,
  saath: 60, sattar: 70, assi: 80, nabbe: 90,

  // Devanagari, same range.
  "\u0936\u0942\u0928\u094d\u092f": 0, "\u090f\u0915": 1, "\u0926\u094b": 2, "\u0924\u0940\u0928": 3, "\u091a\u093e\u0930": 4, "\u092a\u093e\u0901\u091a": 5, "\u092a\u093e\u0902\u091a": 5, "\u091b\u0939": 6,
  "\u0938\u093e\u0924": 7, "\u0906\u0920": 8, "\u0928\u094c": 9, "\u0926\u0938": 10, "\u0917\u094d\u092f\u093e\u0930\u0939": 11, "\u092c\u093e\u0930\u0939": 12, "\u0924\u0947\u0930\u0939": 13, "\u091a\u094c\u0926\u0939": 14,
  "\u092a\u0902\u0926\u094d\u0930\u0939": 15, "\u0938\u094b\u0932\u0939": 16, "\u0938\u0924\u094d\u0930\u0939": 17, "\u0905\u0920\u093e\u0930\u0939": 18, "\u0909\u0928\u094d\u0928\u0940\u0938": 19, "\u092c\u0940\u0938": 20, "\u0924\u0940\u0938": 30,
  "\u091a\u093e\u0932\u0940\u0938": 40, "\u092a\u091a\u093e\u0938": 50, "\u0938\u093e\u0920": 60, "\u0938\u0924\u094d\u0924\u0930": 70, "\u0905\u0938\u094d\u0938\u0940": 80, "\u0928\u092c\u094d\u092c\u0947": 90,

  // English, compositional and therefore safe to write out.
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

/** Scales that multiply what came before them. */
const SCALE_VALUE: Record<string, number> = {
  sau: 100, "\u0938\u094c": 100, hundred: 100,
  hazaar: 1_000, hazar: 1_000, hajaar: 1_000, "\u0939\u091c\u093c\u093e\u0930": 1_000, "\u0939\u091c\u093e\u0930": 1_000, thousand: 1_000,
  lakh: 100_000, lac: 100_000, "\u0932\u093e\u0916": 100_000,
  crore: 10_000_000, karod: 10_000_000, "\u0915\u0930\u094b\u0921\u093c": 10_000_000,
};

const DEVANAGARI_DIGITS = "\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f";

export function parseSpokenAmount(text: string): number | null {
  const normalised = text
    .toLowerCase()
    .replace(/[\u0966-\u096f]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)))
    // Digit-group separators, Indian or Western: 46,467 and 1,00,000 are ONE number. Only commas
    // sitting between digits are removed, so "do lakh, teen hazaar" still tokenises as two groups.
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/[\u20b9$,]/g, " ");

  const tokens = normalised.split(/[^0-9a-z.\u0900-\u097f]+/).filter(Boolean);

  let total = 0;
  let current = 0;
  let sawNumber = false;

  for (const token of tokens) {
    const scale = SCALE_VALUE[token];
    if (scale != null) {
      if (!sawNumber) return null; // a scale word with nothing in front of it: "lakh rupaye"
      if (scale >= 1_000) {
        total += (current || 1) * scale;
        current = 0;
      } else {
        current = (current || 1) * scale;
      }
      continue;
    }

    const word = WORD_VALUE[token];
    if (word != null) {
      current += word;
      sawNumber = true;
      continue;
    }

    if (/^\d+(?:\.\d+)?$/.test(token)) {
      current += parseFloat(token);
      sawNumber = true;
      continue;
    }

    // Anything else is ordinary speech around the number \u2014 "rupaye", "chahiye", "mujhe".
  }

  if (!sawNumber) return null;
  const value = total + current;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
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
