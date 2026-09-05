"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Layers, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceChip } from "@/components/source-chip";
import { optimiseStack, type CapitalStack } from "@/lib/finance/stack";

const inr = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n)))}`;

const signed = (n: number) => (n < 0 ? `−${inr(n)}` : inr(n));

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
}: {
  projectCost: number;
  marginAvailable: number;
}) {
  const result = useMemo(
    () => optimiseStack({ projectCost, marginAvailable }),
    [projectCost, marginAvailable],
  );

  const { best, specRouted, saving } = result;
  if (!best || !specRouted) {
    return (
      <Card className="border-2 border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            No viable capital structure at this margin
          </CardTitle>
          <CardDescription>
            {result.candidates[0]?.rejectedBecause ??
              "Every rail we model needs more own contribution than is available."}
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
          className="w-fit border-indigo-400/40 bg-indigo-400/15 text-indigo-200 mb-1"
        >
          <Layers className="w-3 h-3 mr-1" /> Capital stack
        </Badge>
        <CardTitle className="text-xl font-heading">
          {better
            ? `A cheaper structure exists — ${inr(saving!)} cheaper`
            : "Single-scheme routing is already the cheapest here"}
        </CardTitle>
        <CardDescription className="text-slate-300">
          The specification routes to one scheme by project cost. We solve for the cheapest viable
          structure across every rail the applicant is eligible for.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <StackColumn
            title="As specified — one scheme"
            stack={specRouted}
            tone="muted"
          />
          <StackColumn title="Optimised" stack={best} tone="accent" />
        </div>

        {better && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4"
          >
            <p className="text-2xl font-bold font-heading text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <TrendingDown className="w-6 h-6" />
              {inr(saving!)}
            </p>
            <p className="text-sm mt-1 leading-relaxed">
              lower net cost of capital, because a margin-money subsidy is never repaid while
              interest always is. A threshold rule cannot find this — it only ever looks at one
              scheme.
            </p>
          </motion.div>
        )}

        {result.unverifiedRailsUsed.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              This structure relies on scheme terms we have not re-verified
            </p>
            <p className="text-[11px] mt-1 leading-relaxed text-muted-foreground">
              {result.unverifiedRailsUsed.join(", ")} — terms are drawn from public scheme
              summaries. Re-fetch the guidelines from the administering ministry before quoting
              this saving to a beneficiary.
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
  const total = stack.projectCost || 1;
  const segments = [
    ...stack.components.map((c) => ({
      label: c.rail.name,
      amount: c.amount,
      colour: tone === "accent" ? "bg-indigo-500" : "bg-slate-400",
    })),
    ...(stack.subsidy > 0
      ? [{ label: "Subsidy (grant)", amount: stack.subsidy, colour: "bg-emerald-500" }]
      : []),
    { label: "Your money", amount: stack.ownContribution, colour: "bg-amber-500" },
  ].filter((s) => s.amount > 0);

  return (
    <div
      className={`rounded-xl border p-4 ${tone === "accent" ? "border-indigo-500/40 bg-indigo-500/5" : "bg-muted/20"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </p>

      <div className="flex h-3 rounded-full overflow-hidden mb-3">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.colour}
            style={{ width: `${(s.amount / total) * 100}%` }}
            title={`${s.label} ${inr(s.amount)}`}
          />
        ))}
      </div>

      <dl className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground flex items-center gap-1.5 min-w-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${s.colour}`} />
              <span className="truncate">{s.label}</span>
            </dt>
            <dd className="font-medium tabular-nums shrink-0">{inr(s.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 pt-3 border-t flex justify-between text-sm">
        <span className="text-muted-foreground">Net cost of capital</span>
        <span
          className={`font-bold tabular-nums ${
            stack.netCostOfCapital < 0 ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
        >
          {signed(stack.netCostOfCapital)}
        </span>
      </div>
      {stack.netCostOfCapital < 0 && (
        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
          negative — the grant exceeds the lifetime interest
        </p>
      )}
    </div>
  );
}
