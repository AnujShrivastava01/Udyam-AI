/**
 * The pure rendering layer.
 *
 * Deliberately NOT a client module: the WhatsApp worker, the webhook route and any server render
 * need the same dictionary the UI uses. If this carried "use client", a borrower on WhatsApp and
 * a borrower on the web could drift into different wording for the same verdict.
 */

import { EN } from "./keys";
import { HI } from "./dict.hi";
import { HINGLISH } from "./dict.hinglish";
import type { Dictionary, Locale, MessageKey } from "./keys";

export const DICTS: Record<Locale, Dictionary> = {
  en: EN as unknown as Dictionary,
  hi: HI,
  hinglish: HINGLISH,
};

/**
 * Format a rupee amount.
 *
 * Always `en-IN` grouping regardless of interface language — a lakh groups the same way whether
 * the label around it is Hindi or English, and a borrower reading the figure aloud needs it to
 * look like every other rupee figure they have seen. Devanagari numerals would be a regression in
 * legibility, not a localisation win.
 */
export function money(n: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

export function num(n: number, dp = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}

export function pct(fraction: number, dp = 1): string {
  return `${(fraction * 100).toFixed(dp)}%`;
}

/**
 * Render a message.
 *
 * Parameters are substituted verbatim — they arrive already formatted, and this function never
 * parses, rounds or re-formats them. That is the whole guarantee: templates get translated,
 * numbers do not.
 */
export function renderMessage(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const dict = DICTS[locale] ?? DICTS.en;
  // locale -> English -> the key itself. A string missing from one language shows English, which
  // is a translation gap; falling through to the key means it is missing EVERYWHERE, which is a
  // bug, and the user sees a machine identifier like "agent.listening" on screen. That is quiet
  // in production and easy to ship, so it is made loud in development instead.
  const template = dict[key] ?? DICTS.en[key] ?? key;
  if (process.env.NODE_ENV !== "production" && dict[key] == null && DICTS.en[key] == null) {
    console.warn(`[i18n] no string for "${key}" in any dictionary — the raw key will render`);
  }
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * Abbreviated month names per locale.
 *
 * Lives here rather than in a component because three screens format dates and they were drifting
 * — the dashboard had its own table while the khata and the marketplace printed en-US months into
 * Hindi sentences. Numerals stay Western for the same reason `money` does: a date read aloud from
 * a phone should look like every other date the reader has seen.
 */
export const MONTHS_SHORT: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hinglish: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: [
    "जन",
    "फ़र",
    "मार्च",
    "अप्रैल",
    "मई",
    "जून",
    "जुल",
    "अग",
    "सित",
    "अक्ट",
    "नव",
    "दिस",
  ],
};

/** "6 Sep 2026" in the reader's own script. */
export function shortDate(locale: Locale, d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[locale][d.getMonth()]} ${d.getFullYear()}`;
}

export function normaliseLocale(value: unknown): Locale {
  return value === "hi" || value === "hinglish" || value === "en" ? value : "en";
}
