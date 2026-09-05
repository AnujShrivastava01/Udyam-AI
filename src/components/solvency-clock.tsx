"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, HelpCircle, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/finance/activities";
import type { ScheduleRow } from "@/lib/finance/amortise";
import { VERDICT_META, type SolvencyResult } from "@/lib/finance/solvency";
import { SourceChip } from "@/components/source-chip";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

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
}: SolvencyClockProps) {
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
              <Icon className={`w-5 h-5 shrink-0 ${tone.text}`} />
              The Solvency Clock
            </CardTitle>
            <CardDescription className="mt-1">
              When the enterprise earns, against when the scheme collects.
            </CardDescription>
          </div>
          <Badge variant="outline" className={`${tone.text} ${tone.ring} shrink-0 whitespace-nowrap`}>
            {VERDICT_META[solvency.verdict].label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div>
          <p className={`text-xl font-bold font-heading ${tone.text}`}>{solvency.headline}</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{solvency.detail}</p>
        </div>

        {gestation != null && (
          <div className="space-y-2">
            {/* income track */}
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Income
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
                    earning
                  </span>
                </motion.div>
                {gestationPct > 12 && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[10px] font-bold text-rose-900 dark:text-rose-200">
                    no income · gestation {gestation} months
                  </span>
                )}
              </div>
            </div>

            {/* obligations track */}
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Repayment
              </span>
              <div className="relative h-7 flex-1 rounded-md bg-muted/50 overflow-hidden border">
                {visible.map((row) => {
                  const isPreIncome = gestation != null && row.month <= gestation;
                  return (
                    <div
                      key={row.month}
                      title={`Month ${row.month} · ₹${inr(row.payment)}${
                        row.inMoratorium ? " (moratorium interest)" : ""
                      }`}
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
                <span className="absolute right-0 text-[10px] text-muted-foreground">months</span>
              </div>
            </div>
          </div>
        )}

        {solvency.preIncomeObligation > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat
              label="Due before first income"
              value={`₹${inr(solvency.preIncomeObligation)}`}
              tone="bad"
            />
            <Stat
              label="Payments in that window"
              value={String(solvency.preIncomePayments)}
              tone="bad"
            />
            <Stat
              label="Uncovered months"
              value={solvency.gapMonths != null ? `${solvency.gapMonths}` : "—"}
              tone="bad"
            />
          </div>
        )}

        {activity && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <SourceChip
              label={`Gestation ${activity.gestationMonths} mo · ${activity.name}`}
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
