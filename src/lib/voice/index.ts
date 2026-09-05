/**
 * The voice layer — provider-agnostic.
 *
 * Two providers are implemented and either can serve. The product does not care which, and neither
 * should the rest of the codebase:
 *
 *   Sarvam    one key from dashboard.sarvam.ai, free starting credit, Indic-first models.
 *             The pragmatic choice, and an Indian model stack — a real pitch line for an
 *             Indian government submission.
 *   Bhashini  the Government of India's own stack. The right long-term answer for a ministry
 *             deployment, but it needs ULCA onboarding rather than a signup form.
 *
 * Selection is by whichever key is present, Sarvam first because it is the one you can actually
 * get in two minutes. With neither, every call returns `{ ok: false, reason }` — nothing throws,
 * and the product falls back to text with no figure changed.
 */

import type { Locale } from "@/lib/i18n/keys";

import {
  isVoiceConfigured as isBhashiniConfigured,
  speakAmount,
  spellDigits,
  parseSpokenAmount,
  synthesise as bhashiniSynthesise,
  transcribe as bhashiniTranscribe,
  type VoiceResult,
} from "./bhashini";
import { isSarvamConfigured, sarvamSynthesise, sarvamTranscribe } from "./sarvam";

export * from "./bhashini";
export * from "./sarvam";

export type VoiceProvider = "sarvam" | "bhashini" | "none";

export function activeProvider(): VoiceProvider {
  if (isSarvamConfigured()) return "sarvam";
  if (isBhashiniConfigured()) return "bhashini";
  return "none";
}

const NOT_CONFIGURED: VoiceResult<never> = {
  ok: false,
  reason:
    "No voice provider configured. Set SARVAM_API_KEY (dashboard.sarvam.ai, free credit) or " +
    "BHASHINI_USER_ID + BHASHINI_API_KEY.",
};

export async function speak(text: string, locale: Locale): Promise<VoiceResult<string>> {
  switch (activeProvider()) {
    case "sarvam":
      return sarvamSynthesise(text, locale);
    case "bhashini":
      return bhashiniSynthesise(text, locale);
    default:
      return NOT_CONFIGURED;
  }
}

export async function listen(
  audioBase64: string,
  locale: Locale,
): Promise<VoiceResult<string>> {
  switch (activeProvider()) {
    case "sarvam":
      return sarvamTranscribe(audioBase64, locale);
    case "bhashini":
      return bhashiniTranscribe(audioBase64, locale);
    default:
      return NOT_CONFIGURED;
  }
}

/**
 * Turn a solvency verdict into something worth hearing.
 *
 * Rupee amounts are expanded into spoken words from the kernel's own values — a TTS engine
 * reading "46467" as digits is unusable, and a model rewriting the figure is unsafe. This is the
 * numeric firewall applied to speech.
 */
export function verdictAsSpeech(
  opts: {
    preIncomeObligation: number;
    gestationMonths: number;
    firstInstalmentMonth: number;
    quarterlyInstalment: number;
  },
  locale: Locale,
): string {
  const amount = speakAmount(opts.preIncomeObligation, locale);
  const instalment = speakAmount(opts.quarterlyInstalment, locale);

  if (locale === "en") {
    return (
      `This work earns nothing for ${opts.gestationMonths} months, but your first instalment is due in month ` +
      `${opts.firstInstalmentMonth}. That means ${amount} has to be paid before you earn anything. ` +
      `Each quarter you must pay ${instalment}.`
    );
  }
  if (locale === "hi") {
    return (
      `इस काम से ${opts.gestationMonths} महीने तक कोई कमाई नहीं होगी, लेकिन पहली किस्त ${opts.firstInstalmentMonth}वें महीने में देनी है। ` +
      `मतलब ${amount} कमाई शुरू होने से पहले ही देना पड़ेगा। हर तिमाही ${instalment} देने होंगे।`
    );
  }
  return (
    `Is kaam se ${opts.gestationMonths} mahine tak koi kamai nahi hogi, lekin pehli instalment ${opts.firstInstalmentMonth}ve mahine mein deni hai. ` +
    `Matlab ${amount} kamai shuru hone se pehle hi dena padega. Har quarter ${instalment} dene honge.`
  );
}

/**
 * Confirm a number the user spoke, before acting on it.
 *
 * Never skip this. A misheard margin silently changes every downstream figure, and the borrower
 * has no way to proof-read speech.
 */
export function confirmationPrompt(amount: number, locale: Locale): string {
  const spoken = speakAmount(amount, locale);
  const digits = spellDigits(amount, locale);
  if (locale === "en") return `I heard ${spoken}, that is ${digits}. Is that right? Say yes or no.`;
  if (locale === "hi") return `मैंने ${spoken} सुना, यानी ${digits}। क्या यह सही है? हाँ या ना कहें।`;
  return `Maine ${spoken} suna, matlab ${digits}. Kya yeh sahi hai? Haan ya na kahein.`;
}

export { speakAmount, spellDigits, parseSpokenAmount };
export type { VoiceResult };
