"use client";

import { useAppStore } from "@/lib/store";

import type { MessageKey } from "./keys";
import { normaliseLocale, renderMessage, money, num, pct } from "./render";

export * from "./keys";
export { renderMessage, money, num, pct, normaliseLocale } from "./render";

/** The translator hook. `t("calc.title")` or `t("solvency.gap.headline", { amount })`. */
export function useT() {
  const language = useAppStore((s) => s.language);
  const locale = normaliseLocale(language);

  const t = (key: MessageKey, params?: Record<string, string | number>) =>
    renderMessage(locale, key, params);

  return { t, locale, money, num, pct };
}
