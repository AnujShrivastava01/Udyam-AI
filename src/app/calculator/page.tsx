"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Clock,
  IndianRupee,
  Landmark,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CapitalStackCard } from "@/components/capital-stack";
import { CliffExplorer } from "@/components/cliff-explorer";
import { SolvencyClock } from "@/components/solvency-clock";
import { SourceChip } from "@/components/source-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACTIVITIES, ACTIVITY_COVERAGE, GESTATION_RANGE_NOTE } from "@/lib/finance/activities";
import { plan, type MoratoriumConvention } from "@/lib/finance";
import { useAppStore } from "@/lib/store";
import { useT, money, type MessageKey } from "@/lib/i18n";

const FLAG_STYLE: Record<string, string> = {
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  info: "border-border bg-muted/40 text-muted-foreground",
};

export default function CalculatorPage() {
  const { onboardingInput, setOnboardingInput } = useAppStore();
  const { t } = useT();
  const [margin, setMargin] = useState(onboardingInput.marginCapital || 100_000);
  const [activityId, setActivityId] = useState<string | undefined>("goat-20-1");
  const [needBased, setNeedBased] = useState(true);
  const [convention, setConvention] = useState<MoratoriumConvention>("serviced");
  const [householdIncome, setHouseholdIncome] = useState(86_119);

  // Dragging the slider fired this on every tick, and the store drives LayoutShell — so one drag
  // re-rendered the header, the stepper and the bottom nav a few hundred times. The store only
  // needs the value the user settled on.
  useEffect(() => {
    const id = setTimeout(() => setOnboardingInput({ marginCapital: margin }), 250);
    return () => clearTimeout(id);
  }, [margin, setOnboardingInput]);

  // The kernel is guarded here as well as internally. A cleared input is an ordinary user action,
  // and it must never be able to take the page down mid-render.
  const result = useMemo(() => {
    try {
      return plan({
        marginCapital: margin,
        activityId,
        useNeedBasedCosting: needBased,
        annualHouseholdIncome: householdIncome > 0 ? householdIncome : undefined,
        convention,
      });
    } catch (e) {
      console.error("[calculator] kernel refused these inputs:", e);
      return null;
    }
  }, [margin, activityId, needBased, householdIncome, convention]);

  // Empty state first, so everything below can rely on a real plan rather than guarding each use.
  if (!result || result.structure.sanctionedLoan <= 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold font-heading flex items-center gap-3">
            <Calculator className="w-8 h-8 text-primary" /> {t("calc.title")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl">{t("calc.subtitle")}</p>
        </header>

        <Card className="border-2 border-dashed">
          <CardContent className="py-14 text-center space-y-4">
            <IndianRupee className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="text-lg font-medium">
              {result?.structure.flags[0]?.detail ?? t("calc.margin.hint")}
            </p>
            <div className="max-w-xs mx-auto text-left">
              <label
                htmlFor="margin-capital-empty"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("calc.margin.title")}
              </label>
              <Input
                id="margin-capital-empty"
                type="number"
                min={0}
                inputMode="numeric"
                autoFocus
                value={margin || ""}
                onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 h-12 text-xl font-bold"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { structure: s, schedule, solvency, activity } = result;

  const chartData = schedule.schedule.map((row) => ({
    label: `M${row.month}`,
    month: row.month,
    Principal: row.principal,
    Interest: row.interest,
  }));

  const moratoriumEndMonth = s.moratoriumMonths;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-24">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" /> {t("calc.title")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl">
          {t("calc.subtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ───────────────────────── inputs ───────────────────────── */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[calc(var(--app-header-h,9.5rem)+1.5rem)]">
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-lg">{t("calc.margin.title")}</CardTitle>
              <CardDescription>{t("calc.margin.hint")}</CardDescription>
              <div className="pt-4 relative">
                <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="margin-capital"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={t("calc.margin.title")}
                  value={margin}
                  onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))}
                  className="pl-10 text-xl font-bold h-12"
                />
              </div>
              <div className="pt-4">
                <Slider
                  aria-label={t("calc.marginSlider")}
                  value={[margin]}
                  min={5_000}
                  max={500_000}
                  step={1_000}
                  onValueChange={(v) => setMargin((v as number[])[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>₹5,000</span>
                  <span>₹5,00,000</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("activity.pickPrompt")}
                </p>
                {/* aria-pressed, not colour alone: the selected activity drives every rupee on
                    the page, and a screen-reader user had no way to know which one was active. */}
                <div className="grid gap-1.5" role="group" aria-label={t("calc.activityGroup")}>
                  {ACTIVITIES.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setActivityId(a.id)}
                      aria-pressed={activityId === a.id}
                      className={`text-left rounded-lg border px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        activityId === a.id
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="block text-sm font-medium">
                        {t(`activity.${a.id}.name` as MessageKey)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {money(a.unitCost)} ·{" "}
                        {a.gestationMonths === 0
                          ? t("activity.earnsImmediately")
                          : t("activity.earnsFrom", { month: a.gestationMonths })}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  {ACTIVITY_COVERAGE.note}
                </p>
              </div>

              <Toggle
                label={t("calc.needBased.label")}
                hint={t("calc.needBased.hint")}
                checked={needBased}
                onChange={setNeedBased}
              />
              <Toggle
                label={t("calc.serviced.label")}
                hint={t("calc.serviced.hint")}
                checked={convention === "serviced"}
                onChange={(v) => setConvention(v ? "serviced" : "capitalised")}
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("calc.income.label")}
                </p>
                <Input
                  id="household-income"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={t("calc.income.label")}
                  value={householdIncome}
                  onChange={(e) => setHouseholdIncome(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {t("calc.income.hint", { amount: money(86_119) })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ───────────────────────── results ───────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* flags first — the refusals matter more than the offer */}
          {s.flags.length > 0 && (
            <div className="space-y-2">
              {s.flags.map((f) => (
                <div
                  key={f.code}
                  className={`rounded-xl border-2 p-4 ${FLAG_STYLE[f.level]}`}
                >
                  <p className="font-bold flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {f.title}
                  </p>
                  <p className="text-sm mt-1.5 leading-relaxed opacity-90">{f.detail}</p>
                </div>
              ))}
            </div>
          )}

          <SolvencyClock
            schedule={schedule.schedule}
            solvency={solvency}
            activity={activity}
            voice={{
              marginCapital: margin,
              activityId,
              annualHouseholdIncome: householdIncome > 0 ? householdIncome : undefined,
            }}
          />

          {/* the structure */}
          <motion.div
            key={s.scheme.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 bg-card overflow-hidden"
          >
            <div
              className={`p-6 text-white ${
                s.scheme.id === "nsfdc-micro-finance"
                  ? "bg-gradient-to-r from-teal-600 to-teal-800"
                  : "bg-gradient-to-r from-blue-700 to-indigo-800"
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <Badge
                    variant="secondary"
                    className="mb-2 bg-white/20 text-white border-none hover:bg-white/30"
                  >
                    {s.basis === "need-based" ? t("calc.basis.needBased") : t("calc.basis.spec")}
                  </Badge>
                  <h2 className="text-2xl font-bold font-heading">
                    {s.scheme.corporation} {s.scheme.name}
                  </h2>
                  <p className="text-white/80 mt-1 flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />{" "}
                    {t("scheme.governmentBacked")}
                  </p>
                </div>
                <Landmark className="w-10 h-10 opacity-40 shrink-0" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <Metric label={t("calc.projectCost")} value={money(s.projectCost)} />
                <Metric label={t("calc.sanctionedLoan")} value={money(s.sanctionedLoan)} />
                {/* The "your share is above 10%" warning was carried by an amber tint alone, on
                    the one tile that tells the borrower they must find more money than the scheme
                    implies. It now says so. */}
                <Metric
                  label={t("calc.yourShare")}
                  value={`${(s.effectiveMarginPct * 100).toFixed(2)}%`}
                  accent={s.effectiveMarginPct > 0.1001}
                  note={s.effectiveMarginPct > 0.1001 ? t("calc.marginWarning") : undefined}
                />
                <Metric
                  label={t("calc.moratorium")}
                  value={`${s.moratoriumMonths} mo`}
                  icon={<Clock className="w-3 h-3" />}
                />
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Figure label={t("calc.quarterly")} value={money(schedule.instalment)} strong />
                <Figure label={t("calc.instalments")} value={String(schedule.instalmentCount)} />
                <Figure label={t("calc.totalInterest")} value={money(schedule.totalInterest)} />
                <Figure label={t("calc.totalOutflow")} value={money(schedule.totalOutflow)} />
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed">
                {t("calc.altConvention", {
                  convention:
                    convention === "serviced"
                      ? t("calc.convention.capitalised")
                      : t("calc.convention.serviced"),
                  instalment: money(result.alternateConvention.instalment),
                  interest: money(result.alternateConvention.totalInterest),
                })}
              </div>

              {s.moratoriumNote && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed">
                  {s.moratoriumNote}
                </div>
              )}

              {/* schedule chart */}
              <div>
                <h3 className="font-bold font-heading flex items-center gap-2 mb-3">
                  <TrendingDown className="w-5 h-5 text-primary" /> {t("calc.schedule")}
                </h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {/* The axis was categorical over M3, M6, M9… — every schedule month is a
                        multiple of the 3-month rest period. The "first income" line is placed at
                        the activity's gestation, and papad-pickle's is month 2, which matched no
                        category, so recharts dropped the line silently while the caption below
                        still explained a marker that was not there. A numeric axis can hold it. */}
                    <BarChart data={chartData} margin={{ top: 20, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="month"
                        type="number"
                        domain={[0, chartData[chartData.length - 1]?.month ?? 0]}
                        tickFormatter={(m) => `M${m}`}
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(t) => `₹${Math.round(t / 1000)}k`}
                      />
                      <Tooltip
                        formatter={(v) => money(Number(v ?? 0))}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)",
                        }}
                      />
                      <Legend iconType="circle" />
                      {/* A numeric axis has no band width, so bars need an explicit size. */}
                      <Bar dataKey="Principal" stackId="a" fill="var(--color-primary)" barSize={10} />
                      <Bar dataKey="Interest" stackId="a" fill="var(--color-chart-2)" barSize={10} />
                      {activity && activity.gestationMonths > 0 && (
                        <ReferenceLine
                          x={activity.gestationMonths}
                          stroke="#e11d48"
                          strokeDasharray="4 3"
                          label={{
                            value: t("calc.firstIncome"),
                            position: "top",
                            fill: "#e11d48",
                            fontSize: 11,
                          }}
                        />
                      )}
                      {moratoriumEndMonth > 0 && (
                        <ReferenceLine
                          x={moratoriumEndMonth}
                          stroke="var(--color-muted-foreground)"
                          strokeDasharray="3 3"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* amortisation table */}
              <div className="border rounded-xl overflow-hidden">
                <Table containerClassName="max-h-[28rem] overflow-y-auto">
                    <caption className="sr-only">{t("calc.tbl.caption")}</caption>
                    <TableHeader className="bg-muted sticky top-0 z-10">
                      <TableRow>
                        <TableHead scope="col" className="w-[70px]">
                          {t("calc.tbl.month")}
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          {t("calc.tbl.opening")}
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          {t("calc.tbl.interest")}
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          {t("calc.tbl.principal")}
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          {t("calc.tbl.payment")}
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          {t("calc.tbl.closing")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.schedule.map((row) => {
                        const preIncome =
                          activity != null && row.month <= activity.gestationMonths && row.payment > 0;
                        return (
                          <TableRow
                            key={row.period}
                            className={
                              preIncome ? "bg-rose-500/5" : row.inMoratorium ? "bg-amber-500/5" : ""
                            }
                          >
                            <TableCell className="font-medium">
                              {row.month}
                              {preIncome && (
                                <span className="ml-1 rounded bg-rose-500/15 px-1 py-0.5 text-[9px] font-semibold text-rose-800 dark:text-rose-300">
                                  {t("calc.tbl.preIncome")}
                                </span>
                              )}
                              {row.inMoratorium && (
                                <span className="ml-1 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-semibold text-amber-900 dark:text-amber-300">
                                  {t("calc.tbl.mor")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {money(row.openingBalance)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{money(row.interest)}</TableCell>
                            <TableCell className="text-right tabular-nums">{money(row.principal)}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">
                              {money(row.payment)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {money(row.closingBalance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                </Table>
                <div className="p-3 bg-muted/20 border-t text-xs text-muted-foreground">
                  {t("calc.tbl.legend")}
                </div>
              </div>

              {/* the trace */}
              <div>
                <h3 className="font-bold font-heading mb-3">{t("calc.howDecided")}</h3>
                <ol className="space-y-2">
                  {/* The loop variable used to be called `t`, shadowing the translator inside the
                      one block that most needs it. */}
                  {s.trace.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>
                        <span className="font-medium">{step.rule}</span>
                        <span className="text-muted-foreground"> → {step.outcome}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap gap-2">
                <SourceChip
                  label={`${s.scheme.name} — ${s.scheme.annualRatePct}% · ${s.scheme.tenureMonths / 12}y · cap ${money(s.scheme.maxLoan)}`}
                  provenance={s.scheme.provenance}
                />
                {activity && GESTATION_RANGE_NOTE[activity.id] && (
                  <span className="text-[11px] text-muted-foreground self-center">
                    {GESTATION_RANGE_NOTE[activity.id]}
                  </span>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Link href={`/report/${activityId ?? "general"}`}>
                  <Button size="lg" className="rounded-full px-8">
                    {t("calc.seeReport")} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* the cheapest structure actually available, against the one the spec routes to */}
      <CapitalStackCard
        projectCost={s.projectCost}
        marginAvailable={margin}
        convention={convention}
        activityClass={activity?.activityClass}
      />

      {/* the cliff — full width, because it is the point */}
      <CliffExplorer />
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  note,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  note?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg p-3 ${accent ? "bg-amber-400/25 ring-1 ring-amber-300/60" : "bg-black/20"}`}>
      {/* text-white/70 on this gradient measured about 2.9:1. The label is the only thing naming
          what the figure is. */}
      <p className="text-white/90 text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="font-bold text-lg leading-tight tabular-nums">{value}</p>
      {note && <p className="mt-1 text-[10px] font-medium leading-tight text-amber-50">{note}</p>}
    </div>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className={`font-bold leading-tight ${strong ? "text-xl text-primary" : "text-base"}`}>
        {value}
      </p>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  // A plain <button> announced as "button" with no state: a screen-reader user could not tell
  // whether need-based costing was on, and the two toggles change every figure on the page.
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={`${id}-hint`}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span id={`${id}-hint`} className="block text-[11px] text-muted-foreground mt-0.5">
          {hint}
        </span>
      </span>
    </button>
  );
}
