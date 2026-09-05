"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Layers, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { optimiseStack, type CapitalStack } from "@/lib/finance/stack";
import type { MoratoriumConvention } from "@/lib/finance/schemes";
import { useT, money } from "@/lib/i18n";

const signed = (n: number) => (n < 0 ? `−${money(Math.abs(n))}` : money(n));

/**
 * The capital stack.
 *
 * The specification routes to one scheme by a threshold. This shows what that costs against the
 * cheapest structure actually available — and names every scheme whose terms we have not yet
 * re-verified, because the saving is only as good as the rails it rests on.
 */
export function CapitalStackCard({
  projectCost,
  marginAvailable,
  convention,
  activityClass,
}: {
  projectCost: number;
  marginAvailable: number;
  /** Must match the convention the structure card on the same page is priced under. */
  convention?: MoratoriumConvention;
  /** Must match the activity the structure card is priced for, so exceptions apply identically. */
  activityClass?: string;
}) {
  const { t } = useT();
  const result = useMemo(
    () => optimiseStack({ projectCost, marginAvailable, convention, activityClass }),
    [projectCost, marginAvailable, convention, activityClass],
  );

  const { best, specRouted, saving } = result;

  // A spec route with zero components is not a route. It used to reach StackColumn anyway and
  // render "Your money ₹1,52,000 / Net cost of capital ₹0" — a 100% amber bar asserting the
  // borrower self-funds the whole project, on the same page where the structure card says the
  // scheme lends 90% of it.
  const usable = (s: CapitalStack | null): s is CapitalStack => s != null && s.components.length > 0;

  if (!usable(best) || !usable(specRouted)) {
    return (
      <Card className="border-2 border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />
            {t("stack.none.title")}
          </CardTitle>
          <CardDescription>
            {result.candidates[0]?.rejectedBecause ?? t("stack.none.detail")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const better = saving != null && saving > 0;

  return (
    <Card className="border-2 overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white">
        <Badge
          variant="outline"
          className="w-fit border-indigo-400/40 bg-indigo-400/15 text-indigo-100 mb-1"
        >
          <Layers className="w-3 h-3 mr-1" aria-hidden="true" /> {t("stack.badge")}
        </Badge>
        <CardTitle className="text-xl font-heading">
          {better ? t("stack.title.cheaper", { amount: money(saving!) }) : t("stack.title.same")}
        </CardTitle>
        <CardDescription className="text-slate-200">{t("stack.description")}</CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <StackColumn title={t("stack.column.spec")} stack={specRouted} tone="muted" />
          <StackColumn title={t("stack.column.best")} stack={best} tone="accent" />
        </div>

        {better && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4"
          >
            <p className="text-2xl font-bold font-heading text-emerald-700 dark:text-emerald-400 flex items-center gap-2 tabular-nums">
              <TrendingDown className="w-6 h-6" aria-hidden="true" />
              {money(saving!)}
            </p>
            <p className="text-sm mt-1 leading-relaxed">{t("stack.savingNote")}</p>
          </motion.div>
        )}

        {result.unverifiedRailsUsed.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {t("stack.unverified.title")}
            </p>
            <p className="text-[11px] mt-1 leading-relaxed text-muted-foreground">
              {t("stack.unverified.detail", { rails: result.unverifiedRailsUsed.join(", ") })}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {best.components.map((c) => (
            <SourceChip
              key={c.rail.id}
              label={`${c.rail.name} · ${c.rail.annualRatePct}% · ${c.rail.administrator}`}
              provenance={c.rail.provenance}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StackColumn({
  title,
  stack,
  tone,
}: {
  title: string;
  stack: CapitalStack;
  tone: "muted" | "accent";
}) {
  const { t } = useT();
  const total = stack.projectCost || 1;
  const segments = [
    ...stack.components.map((c) => ({
      label: c.rail.name,
      amount: c.amount,
      colour: tone === "accent" ? "bg-indigo-500" : "bg-slate-400",
    })),
    ...(stack.subsidy > 0
      ? [{ label: t("stack.subsidy"), amount: stack.subsidy, colour: "bg-emerald-500" }]
      : []),
    { label: t("stack.own"), amount: stack.ownContribution, colour: "bg-amber-500" },
  ].filter((s) => s.amount > 0);

  return (
    <div
      className={`rounded-xl border p-4 ${tone === "accent" ? "border-indigo-500/40 bg-indigo-500/5" : "bg-muted/20"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </p>

      {/* The bar is decoration; the list below it carries the same figures in text. */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3" aria-hidden="true">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.colour}
            style={{ width: `${(s.amount / total) * 100}%` }}
          />
        ))}
      </div>

      <dl className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground flex items-center gap-1.5 min-w-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${s.colour}`} aria-hidden="true" />
              <span className="truncate">{s.label}</span>
            </dt>
            <dd className="font-medium tabular-nums shrink-0">{money(s.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 pt-3 border-t flex justify-between text-sm">
        <span className="text-muted-foreground">{t("stack.netCost")}</span>
        <span
          className={`font-bold tabular-nums ${
            stack.netCostOfCapital < 0 ? "text-emerald-700 dark:text-emerald-400" : ""
          }`}
        >
          {signed(stack.netCostOfCapital)}
        </span>
      </div>
      {stack.netCostOfCapital < 0 && (
        <p className="text-[10px] text-emerald-800 dark:text-emerald-400 mt-1">
          {t("stack.negativeNote")}
        </p>
      )}
    </div>
  );
}
