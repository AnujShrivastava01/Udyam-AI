"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Compass,
  IndianRupee,
  MapPin,
  TrendingDown,
} from "lucide-react";

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
import { VERDICT_META } from "@/lib/finance/solvency";
import { recommendActivities, type Recommendation } from "@/lib/market/recommend";
import { VILLAGES, VILLAGE_BY_ID } from "@/lib/market/villages";
import { useT, type MessageKey } from "@/lib/i18n";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

export default function DiscoverPage() {
  const { t } = useT();
  const [villageId, setVillageId] = useState(VILLAGES[0].id);
  const [margin, setMargin] = useState(100_000);
  const [income, setIncome] = useState(86_119);

  const village = VILLAGE_BY_ID.get(villageId)!;
  const result = useMemo(
    () => recommendActivities(village, margin, income > 0 ? income : undefined),
    [village, margin, income],
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading flex items-center gap-3">
          <Compass className="w-8 h-8 text-primary" /> {t("discover.title")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl">
          {t("discover.subtitle")}
        </p>
      </header>

      {/* inputs */}
      <Card>
        <CardContent className="pt-6 grid gap-5 md:grid-cols-3">
          <div className="md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("discover.yourVillage")}
            </p>
            <div className="grid gap-1.5">
              {VILLAGES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVillageId(v.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    villageId === v.id ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {v.name}
                  </span>
                  <span className="block text-[10px] text-muted-foreground pl-5">
                    {v.block} block · mandi {v.distanceToMandiKm} km
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("discover.marginLabel")}
              </p>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={margin}
                  onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))}
                  className="pl-9 h-11 text-lg font-bold"
                />
              </div>
              <Slider
                className="mt-3"
                value={[margin]}
                min={5_000}
                max={300_000}
                step={1_000}
                onValueChange={(v) => setMargin((v as number[])[0])}
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("calc.income.label")}
              </p>
              <Input
                type="number"
                value={income}
                onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
                className="h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* refusal, when nothing clears */}
      {result.refusal && (
        <Card className="border-2 border-amber-500/40 bg-amber-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-300">
<Ban className="w-5 h-5" /> {t("discover.refusalTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{result.refusal}</p>
          </CardContent>
        </Card>
      )}

      {/* the one recommendation */}
      {result.top && (
        <motion.div
          key={`${villageId}-${result.top.activity.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-emerald-500/40 overflow-hidden">
            <CardHeader className="bg-emerald-500/10">
              <Badge
                variant="outline"
                className="w-fit border-emerald-500/40 text-emerald-800 dark:text-emerald-300 mb-1"
              >
                {t("discover.ourRecommendation")}
              </Badge>
              <CardTitle className="text-2xl font-heading">
                {t(`activity.${result.top.activity.id}.name` as MessageKey)}
              </CardTitle>
              <CardDescription className="text-base">
                {t(result.top.bindingConstraint.key, result.top.bindingConstraint.params)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label={t("calc.projectCost")} value={`₹${inr(result.top.projectCost)}`} />
                <Stat label={t("calc.yourShare")} value={`₹${inr(result.top.requiredMargin)}`} />
                <Stat label={t("discover.perQuarter")} value={`₹${inr(result.top.quarterlyInstalment)}`} />
                <Stat
                  label={t("discover.earnsFromMonth")}
                  value={
                    result.top.activity.gestationMonths === 0
                      ? "1"
                      : String(result.top.activity.gestationMonths)
                  }
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/calculator">
                  <Button className="rounded-full">
                    {t("discover.seeSchedule")} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href={`/report/${villageId}`}>
                  <Button variant="outline" className="rounded-full">
                    {t("discover.fullReport")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* the rest, including what we advise against */}
      <div>
        <h2 className="text-lg font-bold font-heading mb-3">
          {t("discover.othersTitle")}
        </h2>
        <div className="space-y-2">
          {result.ranked
            .filter((r) => r.activity.id !== result.top?.activity.id)
            .map((r) => (
              <RankedRow key={r.activity.id} rec={r} />
            ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Ranking combines market saturation, distance to market, and the activity&apos;s own cash
        flow against the scheme&apos;s repayment terms. Rows marked &ldquo;advised against&rdquo;
        are ones where the borrower would be asked to pay before the unit earns, or to find more
        margin than they have. We show them so the reasoning is visible — not as alternatives to
        pick from.
      </p>
    </div>
  );
}

function RankedRow({ rec }: { rec: Recommendation }) {
  const { t } = useT();
  const meta = VERDICT_META[rec.solvency];
  return (
    <div
      className={`rounded-xl border p-4 flex flex-wrap items-center gap-4 ${
        rec.advisedAgainst ? "border-rose-500/30 bg-rose-500/5" : "bg-card"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold flex items-center gap-2">
          {rec.advisedAgainst ? (
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          {t(`activity.${rec.activity.id}.name` as MessageKey)}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t(rec.bindingConstraint.key, rec.bindingConstraint.params)}
        </p>
      </div>

      {rec.preIncomeObligation > 0 && (
        <div className="text-right">
          <p className="text-sm font-bold text-rose-600 flex items-center gap-1 justify-end">
            <TrendingDown className="w-3.5 h-3.5" />₹{inr(rec.preIncomeObligation)}
          </p>
<p className="text-[10px] text-muted-foreground">{t("discover.dueBeforeIncome")}</p>
        </div>
      )}

      <Badge
        variant="outline"
        className={
          meta.tone === "good"
            ? "border-emerald-500/40 text-emerald-700"
            : meta.tone === "bad"
              ? "border-rose-500/40 text-rose-700"
              : "border-border text-muted-foreground"
        }
      >
        {t(`solvency.${rec.solvency}.label` as MessageKey)}
      </Badge>

      <span className="text-sm font-bold tabular-nums w-10 text-right">{rec.score}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="font-bold text-lg leading-tight">{value}</p>
    </div>
  );
}
