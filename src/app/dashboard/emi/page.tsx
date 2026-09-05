"use client";

import { useMemo, useState } from "react";
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
import { useT } from "@/lib/i18n";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

/**
 * The borrower's own view of a live loan.
 *
 * Driven by the same kernel as the calculator and the officer console — a borrower and an
 * officer must never be able to see contradictory figures for the same loan.
 */
export default function LoanTrackerPage() {
  const { t } = useT();
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
          <h1 className="text-3xl md:text-4xl font-bold font-heading">My loan</h1>
          <p className="text-muted-foreground mt-1.5">
            {activity.name} · {s.scheme.corporation} {s.scheme.name}
          </p>
        </div>
        <Button variant="outline" className="rounded-full">
          <Download className="w-4 h-4 mr-2" /> Repayment certificate
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
                    ? "Moratorium active"
                    : stillPreIncome
                      ? "Repaying before income"
                      : "Repaying from earnings"}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-extrabold font-heading">
                  {stillPreIncome
                    ? `${monthsToIncome} months until this unit earns`
                    : "Your unit is earning"}
                </h2>
                <p className="text-white/85 mt-2 max-w-md leading-relaxed">
                  {stillPreIncome
                    ? `You still owe ₹${inr(remainingPreIncome)} before the first sale. This is the gap — plan for it now, not in month nine.`
                    : "Instalments from here are met by the enterprise itself."}
                </p>
              </div>

              {next && (
                <div className="bg-black/25 p-5 rounded-2xl border border-white/15 min-w-[240px]">
                  <p className="text-white/70 text-xs uppercase font-semibold tracking-wider mb-1">
                    Next payment
                  </p>
                  <p className="text-3xl font-bold tabular-nums">₹{inr(next.payment)}</p>
                  <p className="text-sm text-white/80 mt-1">
                    due in month {next.month}
                    {next.inMoratorium ? " · interest only" : ""}
                  </p>
                  <Button size="sm" className="w-full mt-4 bg-white text-slate-900 hover:bg-white/90">
                    Pay now
                  </Button>
                </div>
              )}
            </div>
          </div>

          <CardContent className="pt-6 space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">
                  {paid.length} of {rows.length} payments made
                </span>
                <span className="font-semibold tabular-nums">₹{inr(outstanding)} outstanding</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile label="Sanctioned" value={`₹${inr(s.sanctionedLoan)}`} icon={<Wallet className="w-3.5 h-3.5" />} />
              <Tile label="Repaid so far" value={`₹${inr(paidAmount)}`} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
              <Tile label="Per quarter" value={`₹${inr(schedule.instalment)}`} icon={<CalendarCheck className="w-3.5 h-3.5" />} />
              <Tile label="Moratorium" value={`${s.moratoriumMonths} months`} icon={<Clock className="w-3.5 h-3.5" />} />
            </div>

            {/* month scrubber — demo control, labelled as one */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Month {monthsElapsed} since disbursement
                </span>
                <span className="text-[10px] text-muted-foreground">
                  demo control — production reads the SCA ledger
                </span>
              </div>
              <input
                type="range"
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
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              This loan was structured to collect before it earns
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {t(solvency.detailMsg.key, solvency.detailMsg.params)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/calculator">
              <Button variant="outline" className="rounded-full">
                See the Solvency Clock <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Repayment schedule</CardTitle>
          <CardDescription>
            Rows before month {activity.gestationMonths} fall due before this unit earns anything.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <div className="max-h-[380px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[90px]">Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
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
                              <CheckCircle2 className="w-3 h-3" /> paid
                            </span>
                          ) : r.inMoratorium ? (
                            <span className="text-[11px] text-amber-700 dark:text-amber-400">
                              moratorium
                            </span>
                          ) : preIncome ? (
                            <span className="text-[11px] text-rose-700 dark:text-rose-400">
                              before income
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">upcoming</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">₹{inr(r.interest)}</TableCell>
                        <TableCell className="text-right tabular-nums">₹{inr(r.principal)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          ₹{inr(r.payment)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          ₹{inr(r.closingBalance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
