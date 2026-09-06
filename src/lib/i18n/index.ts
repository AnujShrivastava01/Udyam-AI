"use client";

import { useAppStore } from "@/lib/store";

import type { MessageKey } from "./keys";
import { normaliseLocale, renderMessage, money, num, pct, shortDate } from "./render";

export * from "./keys";
export { renderMessage, money, num, pct, normaliseLocale, shortDate, MONTHS_SHORT } from "./render";

/** The translator hook. `t("calc.title")` or `t("solvency.gap.headline", { amount })`. */
export function useT() {
  const language = useAppStore((s) => s.language);
  const locale = normaliseLocale(language);

  const t = (key: MessageKey, params?: Record<string, string | number>) =>
    renderMessage(locale, key, params);

  return { t, locale, money, num, pct, date: (d: Date) => shortDate(locale, d) };
}
