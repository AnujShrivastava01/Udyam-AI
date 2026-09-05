"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Sparkles, TriangleAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { MFS_CAP_BINDS_AT, SCHEMES, quoteAtProjectCost } from "@/lib/finance";
import { useT, money } from "@/lib/i18n";

const BOUNDARY = SCHEMES["nsfdc-micro-finance"].maxProjectCost; // ₹1,40,000
const MIN = 100_000;
const MAX = 220_000;

/**
 * The ₹1.40 lakh cliff.
 *
 * One rupee of project cost moves the borrower between schemes. The quarterly instalment halves
 * and the lifetime interest triples — in opposite directions. No beneficiary can see that
 * unaided, and the specification's Logic A / Logic B presents it as a trivial `if`.
 */
export function CliffExplorer() {
  const { t } = useT();
  const [projectCost, setProjectCost] = useState(BOUNDARY);

  const sweep = useMemo(() => {
    const points: {
      cost: number;
      instalment: number;
      totalInterest: number;
      scheme: string;
    }[] = [];
    for (let c = MIN; c <= MAX; c += 2_000) {
      // Sample either side of the boundary exactly so the discontinuity is drawn, not smoothed.
      const at = c === BOUNDARY ? [BOUNDARY, BOUNDARY + 1] : [c];
      for (const cost of at) {
        const q = quoteAtProjectCost(cost);
        points.push({
          cost,
          instalment: q.schedule.instalment,
          totalInterest: q.schedule.totalInterest,
          scheme: q.structure.scheme.shortName,
        });
      }
    }
    return points.sort((a, b) => a.cost - b.cost);
  }, []);

  const current = useMemo(() => quoteAtProjectCost(projectCost), [projectCost]);
  const scheme = current.structure.scheme;
  const isMicro = scheme.id === "nsfdc-micro-finance";
  const inDeadZone = current.structure.flags.some((f) => f.code === "DEAD_ZONE");

  const below = useMemo(() => quoteAtProjectCost(BOUNDARY), []);
  const above = useMemo(() => quoteAtProjectCost(BOUNDARY + 1), []);

  const instalmentDrop =
    ((above.schedule.instalment - below.schedule.instalment) / below.schedule.instalment) * 100;
  const interestRise =
    ((above.schedule.totalInterest - below.schedule.totalInterest) / below.schedule.totalInterest) *
    100;

  return (
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <Badge
          variant="outline"
          className="w-fit border-amber-400/40 bg-amber-400/15 text-amber-300 mb-1"
        >
          <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" /> {t("cliff.badge")}
        </Badge>
        <CardTitle className="text-2xl font-heading">{t("cliff.title")}</CardTitle>
        <CardDescription className="text-slate-200">{t("cliff.subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* live figures */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LiveStat label={t("cliff.projectCost")} value={money(projectCost)} />
          <LiveStat
            label={t("cliff.scheme")}
            value={t(
              isMicro ? "scheme.nsfdc-micro-finance.name" : "scheme.nsfdc-term-loan.name",
            )}
            accent={isMicro ? "teal" : "indigo"}
            k={scheme.id}
          />
          <LiveStat
            label={t("cliff.perQuarter")}
            value={money(current.schedule.instalment)}
            k={`q-${scheme.id}`}
            accent="emerald"
          />
          <LiveStat
            label={t("cliff.lifetimeInterest")}
            value={money(current.schedule.totalInterest)}
            k={`i-${scheme.id}`}
            accent="rose"
          />
        </div>

        {/* the slider */}
        <div>
          <Slider
            aria-label={t("cliff.slider")}
            valueText={(v) => money(v)}
            value={[projectCost]}
            min={MIN}
            max={MAX}
            step={500}
            onValueChange={(v) => setProjectCost((v as number[])[0])}
          />
          {/* The boundary caption used to sit in a justify-between row, which put it at the
              midpoint of the track. The boundary is at 33% of this range, so the label pointed at
              ₹1,60,000 while naming ₹1,40,000 — on the one control whose entire purpose is to show
              where that line falls. It is now anchored to the value it names. */}
          <div className="relative mt-1.5 h-9">
            <span className="absolute left-0 top-0 text-[11px] text-muted-foreground">
              {money(MIN)}
            </span>
            <span className="absolute right-0 top-0 text-[11px] text-muted-foreground">
              {money(MAX)}
            </span>
            <span
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${((BOUNDARY - MIN) / (MAX - MIN)) * 100}%` }}
            >
              <span className="h-2 w-px bg-amber-500" aria-hidden="true" />
              <span className="mt-0.5 whitespace-nowrap text-[11px] font-semibold text-amber-700 dark:text-amber-500">
                {t("cliff.boundary")}
              </span>
            </span>
          </div>
        </div>

        {/* dead zone warning */}
        <AnimatePresence>
          {inDeadZone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border-2 border-rose-500/40 bg-rose-500/10 p-4">
                <p className="font-bold text-sm flex items-center gap-2 text-rose-800 dark:text-rose-300">
                  <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" />{" "}
                  {t("cliff.inDeadZone")}
                </p>
                <p className="text-sm mt-1.5 leading-relaxed">
                  {t("cliff.deadZoneDetail", {
                    bindsAt: money(MFS_CAP_BINDS_AT),
                    effective: `${(current.structure.effectiveMarginPct * 100).toFixed(2)}%`,
                  })}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* the chart — this is the moment */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {t("cliff.chartTitle")}
          </p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sweep} margin={{ top: 20, right: 12, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="cliffFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="cost"
                  type="number"
                  domain={[MIN, MAX]}
                  tickFormatter={(t) => `${(t / 100000).toFixed(2)}L`}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                />
                <YAxis
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(t) => `₹${Math.round(t / 1000)}k`}
                />
                <Tooltip
                  formatter={(v) => money(Number(v ?? 0))}
                  labelFormatter={(l) => t("cliff.tooltipCost", { cost: money(Number(l)) })}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                  }}
                />
                <ReferenceArea
                  x1={MFS_CAP_BINDS_AT}
                  x2={BOUNDARY}
                  fill="#e11d48"
                  fillOpacity={0.14}
                />
                <ReferenceLine
                  x={BOUNDARY}
                  stroke="#d97706"
                  strokeDasharray="4 3"
                  label={{ value: "₹1.40L", position: "top", fill: "#d97706", fontSize: 11 }}
                />
                <Area
                  type="stepAfter"
                  dataKey="instalment"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#cliffFill)"
                  isAnimationActive={false}
                />
                <ReferenceDot
                  x={projectCost}
                  y={current.schedule.instalment}
                  r={6}
                  fill="#0f172a"
                  stroke="#fff"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("cliff.deadZoneNote")}
          </p>
        </div>

        {/* the delta */}
        <div className="grid sm:grid-cols-2 gap-3">
          <DeltaCard
            direction="down"
            pct={instalmentDrop}
            label={t("cliff.delta.instalment")}
            from={below.schedule.instalment}
            to={above.schedule.instalment}
            tone="emerald"
          />
          <DeltaCard
            direction="up"
            pct={interestRise}
            label={t("cliff.delta.interest")}
            from={below.schedule.totalInterest}
            to={above.schedule.totalInterest}
            tone="rose"
          />
        </div>

        <p className="text-sm leading-relaxed rounded-lg border bg-muted/30 p-3">
          <strong>{t("cliff.whyLabel")}</strong> {t("cliff.why")}
        </p>
      </CardContent>
    </Card>
  );
}

function LiveStat({
  label,
  value,
  accent = "slate",
  k,
}: {
  label: string;
  value: string;
  accent?: "slate" | "teal" | "indigo" | "emerald" | "rose";
  k?: string;
}) {
  const tone = {
    slate: "text-foreground",
    teal: "text-teal-600 dark:text-teal-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
  }[accent];

  return (
    <div className="rounded-xl border bg-muted/20 p-3 overflow-hidden">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={k ? `${k}-${value}` : value}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className={`font-bold text-lg leading-tight tabular-nums ${tone}`}
        >
          {value}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function DeltaCard({
  direction,
  pct,
  label,
  from,
  to,
  tone,
}: {
  direction: "up" | "down";
  pct: number;
  label: string;
  from: number;
  to: number;
  tone: "emerald" | "rose";
}) {
  const { t } = useT();
  const atBoundary = t("cliff.atBoundary", { from: money(from), to: money(to) });
  const Icon = direction === "down" ? ArrowDown : ArrowUp;
  const colour =
    tone === "emerald"
      ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10"
      : "text-rose-600 border-rose-500/40 bg-rose-500/10";
  return (
    <div className={`rounded-xl border-2 p-4 ${colour}`}>
      <p className="text-2xl font-bold font-heading flex items-center gap-1.5">
        <Icon className="w-5 h-5" aria-hidden="true" />
        {Math.abs(pct).toFixed(1)}%
      </p>
      <p className="text-sm font-medium mt-0.5 text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1 tabular-nums">{atBoundary}</p>
    </div>
  );
}
