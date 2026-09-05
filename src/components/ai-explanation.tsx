"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpeakVerdict } from "@/components/speak-verdict";
import { useT, money, type MessageKey } from "@/lib/i18n";

interface NarrationResponse {
  aiConfigured: boolean;
  narration: { text: string; source: "gemini" | "template"; rejected: string[]; latencyMs: number };
  facts: {
    verdict: string;
    projectCost: number;
    sanctionedLoan: number;
    quarterlyInstalment: number;
    preIncomeObligation: number;
    gestationMonths: number | null;
    scheme: string;
  };
}

/**
 * The explanation, and the machinery that polices it.
 *
 * The model is the last thing in this product and the smallest. Every figure is computed by the
 * kernel first; Gemini's only job is to say it in a sentence a borrower would actually use. That
 * claim has been true in the code for a while and invisible in the UI — /api/narrate was gated
 * behind a shared secret and called by nothing, so the one thing a judge most wants to poke at
 * could not be poked at.
 *
 * So this panel shows the machinery, not just the output:
 *
 *   - which engine wrote the sentence, named, every time;
 *   - the exact figures the model was allowed to see, so "it never computes a number" is checkable
 *     rather than asserted;
 *   - and when the numeric firewall REJECTS the model's answer, what it rejected and why. That is
 *     the most interesting thing this product does and it used to happen silently in a server log.
 */
export function AiExplanation({
  marginCapital,
  activityId,
  annualHouseholdIncome,
}: {
  marginCapital: number;
  activityId?: string;
  annualHouseholdIncome?: number;
}) {
  const { t, locale } = useT();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<NarrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const explain = async () => {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginCapital, activityId, annualHouseholdIncome, locale }),
      });
      const body = await res.json();
      if (!res.ok) {
        setState("error");
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setData(body);
      setState("done");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "request failed");
    }
  };

  const n = data?.narration;
  const wasRejected = (n?.rejected.length ?? 0) > 0;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              {t("ai.title")}
            </CardTitle>
            <CardDescription className="mt-1">{t("ai.subtitle")}</CardDescription>
          </div>
          <button
            type="button"
            onClick={explain}
            disabled={state === "loading"}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {state === "done" ? t("ai.again") : t("ai.explain")}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {state === "idle" && (
          <p className="text-sm text-muted-foreground leading-relaxed">{t("ai.idle")}</p>
        )}

        {state === "error" && (
          <p role="status" className="text-sm text-amber-800 dark:text-amber-400">
            {t("ai.failed")}
            {error ? ` (${error})` : ""}
          </p>
        )}

        {state === "done" && n && (
          <>
            <p
              className="text-base leading-relaxed"
              lang={locale === "hi" ? "hi" : locale === "hinglish" ? "hi-Latn" : "en"}
            >
              {n.text}
            </p>

            {/* Who wrote it. Named every time, including when the answer is the fallback — a
                product that says "AI" on the box owes the reader the difference. */}
            <div className="flex flex-wrap items-center gap-2">
              {n.source === "gemini" ? (
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/10 text-primary gap-1.5"
                >
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  {t("ai.by.gemini")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1.5">
                  {t("ai.by.template")}
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                {t("ai.checked")}
              </Badge>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {t("ai.latency", { ms: n.latencyMs })}
              </span>
            </div>

            {/* The interesting failure. If the model invented a figure, the sentence above is the
                deterministic one and this says what was thrown away. */}
            {wasRejected && (
              <div className="rounded-xl border-2 border-rose-500/40 bg-rose-500/10 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {t("ai.rejected.title")}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed">{t("ai.rejected.detail")}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {n.rejected.map((r) => (
                    <li
                      key={r}
                      className="rounded-md bg-rose-500/20 px-2 py-0.5 font-mono text-xs text-rose-900 dark:text-rose-200"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What the model was handed. The whole architecture in one list. */}
            {data && (
              <details className="rounded-lg border bg-muted/20 p-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("ai.facts.title")}
                </summary>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("ai.facts.detail")}
                </p>
                <dl className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                  <Fact label={t("calc.projectCost")} value={money(data.facts.projectCost)} />
                  <Fact label={t("calc.sanctionedLoan")} value={money(data.facts.sanctionedLoan)} />
                  <Fact label={t("calc.quarterly")} value={money(data.facts.quarterlyInstalment)} />
                  <Fact
                    label={t("clock.dueBeforeIncome")}
                    value={money(data.facts.preIncomeObligation)}
                  />
                  <Fact
                    label={t("ai.facts.gestation")}
                    value={
                      data.facts.gestationMonths == null
                        ? "—"
                        : `${data.facts.gestationMonths} ${t("clock.months")}`
                    }
                  />
                  <Fact
                    label={t("ai.facts.verdict")}
                    value={t(
                      `solvency.${data.facts.verdict}.label` as MessageKey,
                    )}
                  />
                </dl>
              </details>
            )}

            {/* Hear it, in the same language, from the same figures. */}
            <SpeakVerdict
              key={`${locale}-${marginCapital}-${activityId ?? ""}`}
              marginCapital={marginCapital}
              activityId={activityId}
              annualHouseholdIncome={annualHouseholdIncome}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed pb-1 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums shrink-0">{value}</dd>
    </div>
  );
}
