"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, HelpCircle, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/finance/activities";
import type { ScheduleRow } from "@/lib/finance/amortise";
import { VERDICT_META, type SolvencyResult } from "@/lib/finance/solvency";
import { SourceChip } from "@/components/source-chip";
import { SpeakVerdict } from "@/components/speak-verdict";
import { useT, money, type MessageKey } from "@/lib/i18n";

const TONE: Record<
  "good" | "warn" | "bad" | "neutral",
  { ring: string; text: string; bg: string; Icon: typeof AlertTriangle }
> = {
  good: {
    ring: "border-emerald-500/40",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    Icon: CheckCircle2,
  },
  bad: {
    ring: "border-rose-500/40",
    text: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-500/10",
    Icon: AlertTriangle,
  },
  warn: {
    ring: "border-amber-500/40",
    text: "text-amber-700 dark:text-amber-500",
    bg: "bg-amber-500/10",
    Icon: TrendingDown,
  },
  neutral: {
    ring: "border-border",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    Icon: HelpCircle,
  },
};

export interface SolvencyClockProps {
  schedule: ScheduleRow[];
  solvency: SolvencyResult;
  activity: Activity | null;
  /** How many months of the timeline to draw. */
  horizonMonths?: number;
  /**
   * Kernel inputs, so the verdict can be spoken. Omitted, the Listen button is not rendered —
   * the card still works, it just cannot offer audio.
   */
  voice?: { marginCapital: number; activityId?: string; annualHouseholdIncome?: number };
}

/**
 * The Solvency Clock.
 *
 * Top track: when the enterprise actually earns, per NABARD's gestation column.
 * Bottom track: when the scheme wants its money, per NSFDC's repayment terms.
 * The shaded overlap is the money that has to come from somewhere else.
 */
export function SolvencyClock({
  schedule,
  solvency,
  activity,
  horizonMonths,
  voice,
}: SolvencyClockProps) {
  const { t, locale } = useT();
  const gestation = activity?.gestationMonths ?? null;
  const lastMonth = schedule.length ? schedule[schedule.length - 1].month : 36;
  const horizon = horizonMonths ?? Math.min(lastMonth, Math.max(24, (gestation ?? 0) + 9));

  const pct = (m: number) => Math.min(100, Math.max(0, (m / horizon) * 100));
  const visible = schedule.filter((row) => row.month <= horizon && row.payment > 0);

  const tone = TONE[VERDICT_META[solvency.verdict].tone];
  const { Icon } = tone;

  const gestationPct = gestation != null ? pct(gestation) : 0;
  const ticks = Array.from({ length: Math.floor(horizon / 6) + 1 }, (_, i) => i * 6);

  return (
    <Card className={`border-2 ${tone.ring} overflow-hidden`}>
      <CardHeader className={tone.bg}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className={`w-5 h-5 shrink-0 ${tone.text}`} aria-hidden="true" />
              {t("clock.title")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("clock.subtitle")}
            </CardDescription>
          </div>
          <Badge variant="outline" className={`${tone.text} ${tone.ring} shrink-0 whitespace-nowrap`}>
            {t(`solvency.${solvency.verdict}.label` as MessageKey)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div>
          <p className={`text-xl font-bold font-heading ${tone.text}`}>
            {t(solvency.headlineMsg.key, solvency.headlineMsg.params)}
          </p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t(solvency.detailMsg.key, solvency.detailMsg.params)}
          </p>
          {/* This card carries the product's whole argument in a picture and two paragraphs. For
              a user who reads neither script, that is nothing at all. */}
          {voice && (
            <SpeakVerdict
              key={`${locale}-${voice.marginCapital}-${voice.activityId ?? ""}`}
              className="mt-3"
              marginCapital={voice.marginCapital}
              activityId={voice.activityId}
              annualHouseholdIncome={voice.annualHouseholdIncome}
            />
          )}
        </div>

        {/* The timeline is a picture of what the headline, the detail paragraph and the three
            figures below already state in words. Screen readers get the words; exposing a row of
            unlabelled coloured divs on top of that is noise, not access. The per-payment tooltips
            are a mouse convenience — the full schedule lives in the amortisation table. */}
        {gestation != null && (
          <div className="space-y-2" aria-hidden="true">
            {/* income track */}
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                {t("clock.income")}
              </span>
              <div className="relative h-7 flex-1 rounded-md bg-muted/50 overflow-hidden border">
                <div
                  className="absolute inset-y-0 left-0 bg-rose-500/15"
                  style={{ width: `${gestationPct}%` }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - gestationPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-y-0 bg-emerald-500/70 flex items-center justify-center"
                  style={{ left: `${gestationPct}%` }}
                >
                  <span className="text-[10px] font-bold text-emerald-950 px-2 truncate">
                    {t("clock.earning")}
                  </span>
                </motion.div>
                {/* Was `inset-y-0 left-0` with no right bound: the label spanned the whole track
                    and printed straight through the green "earning" block. It is now clipped to
                    the gestation span it describes. */}
                {gestationPct > 12 && (
                  <span
                    className="absolute inset-y-0 left-0 flex items-center overflow-hidden pl-2 pr-1 text-[10px] font-bold whitespace-nowrap text-rose-900 dark:text-rose-200"
                    style={{ width: `${gestationPct}%` }}
                  >
                    {t("clock.noIncome", { months: gestation })}
                  </span>
                )}
              </div>
            </div>

            {/* obligations track */}
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                {t("clock.repayment")}
              </span>
              <div className="relative h-7 flex-1 rounded-md bg-muted/50 overflow-hidden border">
                {visible.map((row) => {
                  const isPreIncome = gestation != null && row.month <= gestation;
                  return (
                    <div
                      key={row.month}
                      title={t(row.inMoratorium ? "clock.paymentMoratorium" : "clock.payment", {
                        month: row.month,
                        amount: money(row.payment),
                      })}
                      className={`absolute top-1 bottom-1 w-1.5 rounded-sm ${
                        isPreIncome ? "bg-rose-600" : "bg-primary/70"
                      }`}
                      style={{ left: `calc(${pct(row.month)}% - 3px)` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* axis */}
            {/* The unit caption was pinned to right-0, on top of the final tick, which at a
                24-month horizon is the "24". It sits on its own line now. */}
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0" />
              <div className="relative h-4 flex-1">
                {ticks.map((m) => (
                  <span
                    key={m}
                    className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                    style={{ left: `${pct(m)}%` }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <p className="pl-[5.75rem] text-[10px] text-muted-foreground">{t("clock.months")}</p>
          </div>
        )}

        {/* Gated on the VERDICT, not on the rupee figure.
            preIncomeObligation counts every payment falling due at or before first income, which
            includes moratorium interest on an activity that earns before the moratorium ends. The
            grid was gated on that figure alone with tone="bad" hardcoded, so mushroom — gestation
            3 months, verdict FEASIBLE — printed a red "Due before income ₹1,389" panel directly
            under a green tick. The exposure is real, but it is not a gap, and colouring it like
            one teaches the user to distrust the verdict. */}
        {solvency.preIncomeObligation > 0 &&
          (solvency.verdict === "GESTATION_GAP" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat
                label={t("clock.dueBeforeIncome")}
                value={money(solvency.preIncomeObligation)}
                tone="bad"
              />
              <Stat
                label={t("clock.paymentsInWindow")}
                value={String(solvency.preIncomePayments)}
                tone="bad"
              />
              <Stat
                label={t("clock.uncoveredMonths")}
                value={solvency.gapMonths != null ? `${solvency.gapMonths}` : "—"}
                tone="bad"
              />
            </div>
          ) : (
            <p className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
              {t("clock.beforeIncomeNeutral", {
                amount: money(solvency.preIncomeObligation),
                payments: solvency.preIncomePayments,
              })}
            </p>
          ))}

        {activity && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <SourceChip
              label={t("clock.gestationChip", {
                months: activity.gestationMonths,
                activity: t(`activity.${activity.id}.name` as MessageKey),
              })}
              provenance={activity.provenance}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "bad" | "good" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p
        className={`text-lg font-bold font-heading ${
          tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  );
}
