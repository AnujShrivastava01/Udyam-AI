"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Info,
  MapPin,
  ShieldAlert,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { Progress } from "@/components/ui/progress";
import { ACTIVITIES, ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { buildFeasibilityReport, type Confidence, type Figure } from "@/lib/market/feasibility";
import { GAZETTEER_COVERAGE, VILLAGES, VILLAGE_BY_ID } from "@/lib/market/villages";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

const CONFIDENCE_STYLE: Record<Confidence, { label: string; className: string }> = {
  measured: { label: "measured", className: "text-emerald-700 border-emerald-500/40 bg-emerald-500/10" },
  estimated: { label: "estimated", className: "text-blue-700 border-blue-500/40 bg-blue-500/10" },
  seeded: { label: "seeded — not a survey reading", className: "text-amber-800 border-amber-500/40 bg-amber-500/10" },
  unavailable: { label: "unavailable", className: "text-muted-foreground border-border bg-muted/40" },
};

export default function FeasibilityReportPage() {
  const [villageId, setVillageId] = useState(VILLAGES[0].id);
  const [activityId, setActivityId] = useState("goat-20-1");

  const village = VILLAGE_BY_ID.get(villageId)!;
  const activity = ACTIVITY_BY_ID.get(activityId) ?? null;

  const report = useMemo(() => buildFeasibilityReport(village, activity), [village, activity]);
  const { saturation: sat } = report;

  const satData = [
    { name: "Already there", value: sat.observedSector, fill: "#e11d48" },
    { name: "Population supports", value: sat.expectedSector, fill: "#0d9488" },
    ...(sat.supportableFromDemand != null
      ? [{ name: "Spending supports", value: sat.supportableFromDemand, fill: "#2563eb" }]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" /> Feasibility Report
        </h1>
        <p className="text-muted-foreground text-lg">
          Every number below names where it came from — or it is not shown.
        </p>
      </header>

      {/* selectors */}
      <Card>
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Village
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VILLAGES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVillageId(v.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    villageId === v.id ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50"
                  }`}
                >
                  {v.name}
                  <span className="block text-[10px] text-muted-foreground">
                    {v.block} · {v.district}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Activity
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActivityId(a.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    activityId === a.id ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="block max-w-[13rem] truncate">{a.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {a.unit} · gestation {a.gestationMonths} mo
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* data quality — stated before any finding, not after */}
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4">
        <p className="font-bold text-sm flex items-center gap-2 text-amber-900 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0" /> What this report is standing on
        </p>
        <ul className="mt-2 space-y-1.5">
          {report.dataQuality.warnings.map((w, i) => (
            <li key={i} className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90 flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-700" />
              {w}
            </li>
          ))}
        </ul>
      </div>

      {/* verdict */}
      <motion.div
        key={`${villageId}-${activityId}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-xl flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  {village.name}, {village.block} block
                </CardTitle>
                <CardDescription className="mt-1">
                  {village.district}, {village.state}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  report.verdict === "CROWDED"
                    ? "border-rose-500/40 text-rose-700 bg-rose-500/10"
                    : report.verdict === "PROMISING"
                      ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                      : "border-border text-muted-foreground"
                }
              >
                {report.verdict === "CROWDED"
                  ? "Crowded"
                  : report.verdict === "PROMISING"
                    ? "Room to enter"
                    : "Data too thin"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg leading-relaxed">{report.summary}</p>
            {report.score != null && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Feasibility score</span>
                  <span className="font-bold">{report.score} / 100</span>
                </div>
                <Progress value={report.score} />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  A composite of saturation, market access and gestation — not a probability of success.
                  It is a ranking aid, and it moves when the inputs move.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* saturation chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Two independent reads on market room
          </CardTitle>
          <CardDescription>
            Supply side against demand side. When they disagree, the report says so rather than
            averaging them into a number that looks confident.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={satData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => `${Math.round(Number(v ?? 0))} units`}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {satData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
                <ReferenceLine x={sat.observedSector} stroke="#e11d48" strokeDasharray="3 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">
              Saturation index <strong className="text-lg">{sat.index.toFixed(2)}×</strong> the national rural norm
            </span>
            {sat.estimatesAgree === false && (
              <span className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> the two methods disagree
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {report.sections.map((s) => (
          <Card key={s.key} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{s.title}</CardTitle>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  PS req. {s.requirement}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <p className="font-semibold text-primary leading-snug">{s.headline}</p>
              {s.detail && (
                <p className="text-sm text-muted-foreground leading-relaxed">{s.detail}</p>
              )}
              <div className="space-y-2 pt-1">
                {s.figures.map((f, i) => (
                  <FigureRow key={i} figure={f} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* threats callout + next step */}
      <Card className="border-2 border-rose-500/30 bg-rose-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" /> Before you borrow against this
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            A market with room is not the same as a loan you can survive.{" "}
            {activity && activity.gestationMonths > 0 ? (
              <>
                NABARD prices this activity with a{" "}
                <strong>{activity.gestationMonths}-month gestation</strong> — check what that does to
                the repayment schedule before you commit.
              </>
            ) : (
              <>Check the repayment schedule against the activity&apos;s own cash flow before you commit.</>
            )}
          </p>
          <Link href="/calculator">
            <Button className="rounded-full">
              Open the Solvency Clock <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Gazetteer coverage: {GAZETTEER_COVERAGE.villages} villages across{" "}
        {GAZETTEER_COVERAGE.districts.join(", ")} ({GAZETTEER_COVERAGE.states.join(", ")}).{" "}
        {GAZETTEER_COVERAGE.note}
      </p>
    </div>
  );
}

function FigureRow({ figure }: { figure: Figure }) {
  const style = CONFIDENCE_STYLE[figure.confidence];
  if (figure.confidence === "unavailable") {
    return (
      <div className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
        {figure.note ?? "Not available for this combination."}
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-base font-bold tabular-nums">
          {figure.unit.startsWith("₹") ? "₹" : ""}
          {inr(figure.value)}
          {figure.band ? (
            <span className="text-xs font-normal text-muted-foreground"> ± {inr(figure.band)}</span>
          ) : null}
        </span>
        <span className="text-[11px] text-muted-foreground">{figure.unit.replace(/^₹\s?/, "")}</span>
        <span
          className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.className}`}
        >
          {style.label}
        </span>
      </div>
      {figure.note && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{figure.note}</p>
      )}
      {figure.provenance && (
        <div className="mt-2">
          <SourceChip label={figure.provenance.source} provenance={figure.provenance} />
        </div>
      )}
    </div>
  );
}
