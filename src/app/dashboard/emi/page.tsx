"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACTIVITIES, ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { plan } from "@/lib/finance";
import { useT, money, type MessageKey } from "@/lib/i18n";

/**
 * The borrower's own view of a live loan.
 *
 * Driven by the same kernel as the calculator and the officer console — a borrower and an
 * officer must never be able to see contradictory figures for the same loan.
 */
/** The schedule as a CSV the borrower can keep. Every column is already on screen. */
function scheduleCsv(rows: { month: number; openingBalance: number; interest: number; principal: number; payment: number; closingBalance: number }[]) {
  const head = "month,opening_balance,interest,principal,payment,closing_balance";
  const body = rows.map(
    (r) =>
      `${r.month},${r.openingBalance.toFixed(2)},${r.interest.toFixed(2)},${r.principal.toFixed(2)},${r.payment.toFixed(2)},${r.closingBalance.toFixed(2)}`,
  );
  return [head, ...body].join("\n");
}

export default function LoanTrackerPage() {
  const { t } = useT();
  const scrubberId = useId();
  const [activityId] = useState("goat-20-1");
  // Months elapsed since disbursement. In production this comes from the SCA's ledger.
  const [monthsElapsed, setMonthsElapsed] = useState(9);

  const activity = ACTIVITY_BY_ID.get(activityId) ?? ACTIVITIES[0];
  const result = useMemo(
    () => plan({ marginCapital: 10_000, activityId, useNeedBasedCosting: true }),
    [activityId],
  );

  const { schedule, structure: s, solvency } = result;
  const rows = schedule.schedule;

  const paid = rows.filter((r) => r.month <= monthsElapsed);
  const upcoming = rows.filter((r) => r.month > monthsElapsed);
  const next = upcoming[0] ?? null;

  const paidAmount = paid.reduce((sum, r) => sum + r.payment, 0);
  const outstanding = paid.length ? paid[paid.length - 1].closingBalance : s.sanctionedLoan;
  const progress = (paid.length / rows.length) * 100;

  const inMoratorium = monthsElapsed < s.moratoriumMonths;
  const monthsToIncome = Math.max(0, activity.gestationMonths - monthsElapsed);
  const stillPreIncome = monthsElapsed < activity.gestationMonths;

  // What is still owed before the enterprise earns its first rupee.
  const remainingPreIncome = rows
    .filter((r) => r.month > monthsElapsed && r.month <= activity.gestationMonths)
    .reduce((sum, r) => sum + r.payment, 0);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24">

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">{t("emi.title")}</h1>
          <p className="text-muted-foreground mt-1.5">
            {t(`activity.${activity.id}.name` as MessageKey)} · {s.scheme.corporation}{" "}
            {t(`scheme.${s.scheme.id}.name` as MessageKey)}
          </p>
        </div>
        {/* Was a "Repayment certificate" button that did nothing. A certificate is a document a
            lender issues; this app cannot issue one. The schedule, on the other hand, is entirely
            ours to give — so the button now downloads it. */}
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            const blob = new Blob([scheduleCsv(rows)], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `repayment-schedule-${activity.id}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-4 h-4 mr-2" aria-hidden="true" /> {t("emi.downloadSchedule")}
        </Button>
      </header>

      {/* hero */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className={`overflow-hidden border-2 ${
            stillPreIncome ? "border-rose-500/40" : "border-emerald-500/40"
          }`}
        >
          <div
            className={`p-6 md:p-8 text-white ${
              stillPreIncome
                ? "bg-gradient-to-br from-rose-800 via-rose-700 to-rose-900"
                : "bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-800"
            }`}
          >
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div>
                <Badge className="bg-white/20 text-white border-none hover:bg-white/30 mb-3">
                  {inMoratorium
                    ? t("emi.status.moratorium")
                    : stillPreIncome
                      ? t("emi.status.preIncome")
                      : t("emi.status.earning")}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-extrabold font-heading">
                  {stillPreIncome
                    ? t("emi.headline.preIncome", { months: monthsToIncome })
                    : t("emi.headline.earning")}
                </h2>
                <p className="text-white/85 mt-2 max-w-md leading-relaxed">
                  {stillPreIncome
                    ? t("emi.body.preIncome", { amount: money(remainingPreIncome) })
                    : t("emi.body.earning")}
                </p>
              </div>

              {next && (
                <div className="bg-black/25 p-5 rounded-2xl border border-white/15 min-w-[240px]">
                  <p className="text-white/70 text-xs uppercase font-semibold tracking-wider mb-1">
                    {t("emi.nextPayment")}
                  </p>
                  <p className="text-3xl font-bold tabular-nums">{money(next.payment)}</p>
                  <p className="text-sm text-white/80 mt-1">
                    {t("emi.dueInMonth", { month: next.month })}
                    {next.inMoratorium ? ` · ${t("emi.interestOnly")}` : ""}
                  </p>
                  {/* A "Pay now" button stood here and did nothing. On a screen that already says
                      the loan is a sample, an inert payment button is the one control a user might
                      believe moved money. */}
                </div>
              )}
            </div>
          </div>

          <CardContent className="pt-6 space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">
                  {t("emi.paymentsMade", { done: paid.length, total: rows.length })}
                </span>
                <span className="font-semibold tabular-nums">
                  {t("emi.outstanding", { amount: money(outstanding) })}
                </span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile
                label={t("emi.tile.sanctioned")}
                value={money(s.sanctionedLoan)}
                icon={<Wallet className="w-3.5 h-3.5" aria-hidden="true" />}
              />
              <Tile
                label={t("emi.tile.repaid")}
                value={money(paidAmount)}
                icon={<CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
              />
              <Tile
                label={t("emi.tile.perQuarter")}
                value={money(schedule.instalment)}
                icon={<CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" />}
              />
              <Tile
                label={t("calc.moratorium")}
                value={`${s.moratoriumMonths} ${t("clock.months")}`}
                icon={<Clock className="w-3.5 h-3.5" aria-hidden="true" />}
              />
            </div>

            {/* month scrubber — demo control, labelled as one */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor={scrubberId}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t("emi.scrubberValue", { n: monthsElapsed })}
                </label>
                <span className="text-[10px] text-muted-foreground">{t("emi.scrubberNote")}</span>
              </div>
              {/* The range input had no label at all — it announced as an unnamed slider on the
                  one control that changes every figure on this screen. */}
              <input
                id={scrubberId}
                type="range"
                aria-label={t("emi.scrubber")}
                aria-valuetext={t("emi.scrubberValue", { n: monthsElapsed })}
                min={0}
                max={rows[rows.length - 1].month}
                step={3}
                value={monthsElapsed}
                onChange={(e) => setMonthsElapsed(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* the warning that matters */}
      {solvency.verdict === "GESTATION_GAP" && (
        <Card className="border-2 border-rose-500/30 bg-rose-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
              {t("emi.gapTitle")}
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {t(solvency.detailMsg.key, solvency.detailMsg.params)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/calculator">
              <Button variant="outline" className="rounded-full">
                {t("emi.seeClock")} <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("emi.scheduleTitle")}</CardTitle>
          <CardDescription>
            {t("emi.scheduleNote", { months: activity.gestationMonths })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
              <Table containerClassName="max-h-[28rem] overflow-y-auto">
                <caption className="sr-only">{t("emi.scheduleTitle")}</caption>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead scope="col" className="w-[90px]">
                      {t("calc.tbl.month")}
                    </TableHead>
                    <TableHead scope="col">{t("emi.col.status")}</TableHead>
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
                      {t("emi.col.balance")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const done = r.month <= monthsElapsed;
                    const preIncome = r.month <= activity.gestationMonths;
                    return (
                      <TableRow key={r.period} className={preIncome && !done ? "bg-rose-500/5" : ""}>
                        <TableCell className="font-medium">{r.month}</TableCell>
                        <TableCell>
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />{" "}
                              {t("emi.row.paid")}
                            </span>
                          ) : r.inMoratorium ? (
                            <span className="text-[11px] text-amber-800 dark:text-amber-400">
                              {t("calc.tbl.mor")}
                            </span>
                          ) : preIncome ? (
                            <span className="text-[11px] text-rose-800 dark:text-rose-400">
                              {t("calc.tbl.preIncome")}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {t("emi.row.upcoming")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.interest)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.principal)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {money(r.payment)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {money(r.closingBalance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="font-bold text-lg leading-tight tabular-nums">{value}</p>
    </div>
  );
}
