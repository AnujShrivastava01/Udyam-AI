"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import {
  GAZETTEER_COVERAGE,
  VILLAGES,
  VILLAGE_BY_ID,
  villageInDistrict,
} from "@/lib/market/villages";
import { useT, money, num, type MessageKey } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  measured: "text-emerald-800 border-emerald-500/40 bg-emerald-500/10",
  estimated: "text-blue-800 border-blue-500/40 bg-blue-500/10",
  seeded: "text-amber-900 border-amber-500/40 bg-amber-500/10",
  unavailable: "text-muted-foreground border-border bg-muted/40",
};

/**
 * The route parameter is now read.
 *
 * It was ignored entirely: the page always opened on VILLAGES[0] and goat-20-1, so /report/kirana-store
 * and /report/rep-12345 rendered the identical page and the calculator’s "see the full report"
 * button silently discarded the activity the user had just chosen. The id is accepted as an
 * activity id, a village id, or `village__activity`; anything else falls back to the defaults,
 * which is what an id like rep-12345 was always going to do.
 */
function readRouteId(raw: string | undefined) {
  const parts = decodeURIComponent(raw ?? "").split("__").filter(Boolean);
  let village: string | undefined;
  let activity: string | undefined;
  for (const part of parts) {
    if (ACTIVITY_BY_ID.has(part)) activity = part;
    else if (VILLAGE_BY_ID.has(part)) village = part;
  }
  return { village, activity };
}

export default function FeasibilityReportPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const onboardingDistrict = useAppStore((st) => st.onboardingInput.location?.district);

  const fromRoute = readRouteId(params?.id);
  // Failing the route id, fall back to whatever district onboarding collected before dropping to
  // the first row — the user told us where they are; showing them a different district is rude.
  const defaultVillage =
    fromRoute.village ?? villageInDistrict(onboardingDistrict)?.id ?? VILLAGES[0].id;

  const [villageId, setVillageId] = useState(defaultVillage);
  const [picker, setPicker] = useState<"village" | "activity" | null>(null);
  const [activityId, setActivityId] = useState(fromRoute.activity ?? "goat-20-1");

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
          <Target className="w-8 h-8 text-primary" aria-hidden="true" /> {t("report.title")}
        </h1>
        <p className="text-muted-foreground text-lg">{t("report.subtitle")}</p>
      </header>

      {/*
        Leads with what was chosen, not with a menu.

        This was two columns of chips \u2014 four villages and eleven activities, all shown at once, the
        selected one distinguishable only by a tint. The user had just answered "where are you" and
        "what do you want to start" in onboarding, and the report opened by asking again in a wall
        of options. What they picked now reads as a sentence at the top; the full list is one click
        away for anyone who wants to compare.
      */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectionSummary
              label={t("report.village")}
              value={village.name}
              detail={
                village.block === village.district
                  ? village.district
                  : `${village.block} \u00b7 ${village.district}`
              }
              open={picker === "village"}
              onToggle={() => setPicker(picker === "village" ? null : "village")}
              changeLabel={t("report.change")}
              icon={<MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
            />
            <SelectionSummary
              label={t("report.activity")}
              value={activity ? t(`activity.${activity.id}.name` as MessageKey) : "\u2014"}
              detail={
                activity
                  ? `${t(`activity.${activity.id}.unit` as MessageKey)} \u00b7 ${t("report.gestationMo", {
                      months: activity.gestationMonths,
                    })}`
                  : ""
              }
              open={picker === "activity"}
              onToggle={() => setPicker(picker === "activity" ? null : "activity")}
              changeLabel={t("report.change")}
              icon={<Target className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
            />
          </div>

          {picker === "village" && (
            <div
              className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 border-t pt-4"
              role="group"
              aria-label={t("report.village")}
            >
              {VILLAGES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVillageId(v.id);
                    setPicker(null);
                  }}
                  aria-pressed={villageId === v.id}
                  className={`min-w-0 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    villageId === v.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="block truncate">{v.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {v.block === v.district ? v.district : `${v.block} \u00b7 ${v.district}`}
                  </span>
                </button>
              ))}
            </div>
          )}

          {picker === "activity" && (
            /* a.name / a.unit are the English fields on the record. The calculator renders the
               same activity through activity.<id>.name, so one session showed "\u092c\u0915\u0930\u0940 \u092a\u093e\u0932\u0928" on one
               page and "Goat rearing" on the next. Both pages now read the dictionary. */
            <div
              className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 border-t pt-4"
              role="group"
              aria-label={t("report.activity")}
            >
              {ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setActivityId(a.id);
                    setPicker(null);
                  }}
                  aria-pressed={activityId === a.id}
                  className={`min-w-0 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    activityId === a.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="block truncate">
                    {t(`activity.${a.id}.name` as MessageKey)}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {t(`activity.${a.id}.unit` as MessageKey)} \u00b7{" "}
                    {t("report.gestationMo", { months: a.gestationMonths })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* data quality — stated before any finding, not after */}
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4">
        <h2 className="font-bold text-sm flex items-center gap-2 text-amber-900 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" /> {t("report.standingOn")}
        </h2>
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
                  <MapPin className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  {t("report.blockSuffix", { village: village.name, block: village.block })}
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
                  ? t("report.crowded")
                  : report.verdict === "PROMISING"
                    ? t("report.roomToEnter")
                    : t("report.thinData")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* The feasibility engine still returns finished English sentences rather than message
                keys with numeric slots, the way the finance kernel does. Until it is converted,
                saying so is better than letting a Hindi reader assume the analysis was written for
                them. */}
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {t("report.analysisLanguageNote")}
            </p>
            <p className="text-lg leading-relaxed" lang="en">
              {report.summary}
            </p>
            {report.score != null && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{t("report.score")}</span>
                  <span className="font-bold">{report.score} / 100</span>
                </div>
                <Progress value={report.score} />
                <p className="text-[11px] text-muted-foreground mt-1.5">{t("report.scoreNote")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* saturation chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" aria-hidden="true" />{" "}
            {t("report.marketRoom")}
          </CardTitle>
          <CardDescription>{t("report.marketRoomNote")}</CardDescription>
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
                  formatter={(v) => t("report.units", { count: num(Math.round(Number(v ?? 0))) })}
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
              {t("report.satIndex", { index: sat.index.toFixed(2) })}
            </span>
            {sat.estimatesAgree === false && (
              <span className="text-xs text-amber-800 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                {t("report.methodsDisagree")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* sections */}
      <section aria-labelledby="findings">
        <h2 id="findings" className="text-xl font-bold font-heading mb-3">
          {t("report.sectionsHeading")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
        {report.sections.map((s) => (
          <Card key={s.key} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base" lang="en">
                  {s.title}
                </CardTitle>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {t("report.psReq", { n: s.requirement })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <p className="font-semibold text-primary leading-snug" lang="en">
                {s.headline}
              </p>
              {s.detail && (
                <p className="text-sm text-muted-foreground leading-relaxed" lang="en">
                  {s.detail}
                </p>
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
      </section>

      {/* threats callout + next step */}
      <Card className="border-2 border-rose-500/30 bg-rose-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" aria-hidden="true" />{" "}
            {t("report.beforeYouBorrow")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            {activity && activity.gestationMonths > 0
              ? t("report.beforeYouBorrowGestation", { months: activity.gestationMonths })
              : t("report.beforeYouBorrowPlain")}
          </p>
          <Link href="/calculator">
            <Button className="rounded-full">
              {t("report.openClock")} <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("report.coverage", {
          villages: GAZETTEER_COVERAGE.villages,
          districts: GAZETTEER_COVERAGE.districts.join(", "),
          states: GAZETTEER_COVERAGE.states.join(", "),
          note: GAZETTEER_COVERAGE.note,
        })}
      </p>
    </div>
  );
}

function FigureRow({ figure }: { figure: Figure }) {
  const { t } = useT();
  const className = CONFIDENCE_STYLE[figure.confidence];
  if (figure.confidence === "unavailable") {
    return (
      <div className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
        {figure.note ?? t("report.figureUnavailable")}
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-base font-bold tabular-nums">
          {figure.unit.startsWith("₹")
            ? money(figure.value)
            : num(figure.value, figure.decimals ?? 0)}
          {figure.band ? (
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              ± {num(figure.band, figure.decimals ?? 0)}
            </span>
          ) : null}
        </span>
        <span className="text-[11px] text-muted-foreground">{figure.unit.replace(/^₹\s?/, "")}</span>
        <span
          className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
        >
          {t(`confidence.${figure.confidence}` as MessageKey)}
        </span>
      </div>
      {figure.note && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground" lang="en">
          {figure.note}
        </p>
      )}
      {figure.provenance && (
        <div className="mt-2">
          <SourceChip label={figure.provenance.source} provenance={figure.provenance} />
        </div>
      )}
    </div>
  );
}

/** What is currently selected, with the list one click away rather than always on screen. */
function SelectionSummary({
  label,
  value,
  detail,
  open,
  onToggle,
  changeLabel,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  open: boolean;
  onToggle: () => void;
  changeLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 p-3">
      <div className="flex min-w-0 items-start gap-2">
        {icon}
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="truncate font-semibold leading-tight">{value}</p>
          {detail && <p className="truncate text-[11px] text-muted-foreground">{detail}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {changeLabel}
      </button>
    </div>
  );
}
