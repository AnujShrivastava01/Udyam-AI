"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  Minus,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatTile } from "@/components/stat-tile";
import { downloadCsv } from "@/lib/export/csv";
import {
  MIN_DAYS_FOR_VERDICT,
  coverCheck,
  dayKey,
  ledgerToCsv,
  newEntry,
  summarise,
  type EntryKind,
} from "@/lib/ledger/book";
import { buildOwnProfile } from "@/lib/profile/build";
import { useAppStore } from "@/lib/store";
import { useMarkVisited } from "@/lib/visit";
import { MONTHS_SHORT, useT, type MessageKey } from "@/lib/i18n";
import { DemoBanner } from "@/components/demo-banner";

/**
 * The daily book.
 *
 * A shopkeeper's ledger — what came in, what went out, did today make money — with one thing a
 * standalone bookkeeping app cannot do: it knows the loan. The card that matters is not the day's
 * net, it is whether the month's trading actually covers the instalment falling due, which is the
 * Solvency Clock asked backwards, against real takings instead of a projection.
 *
 * Everything on this screen is typed by the user. Nothing is estimated or pre-filled, and the
 * verdict refuses to appear until there are enough recorded days to mean anything — a green tick
 * computed from two entries is worse than no tick.
 */

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

/** yyyy-mm-dd, rendered in the reader's own script. */
const dayLabel = (iso: string, months: string[]) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};

export default function KhataPage() {
  useMarkVisited("khata");
  const { t, money, locale } = useT();

  const amountId = useId();
  const dateId = useId();
  const noteId = useId();

  const ledger = useAppStore((s) => s.ledger);
  const addLedgerEntry = useAppStore((s) => s.addLedgerEntry);
  const deleteLedgerEntry = useAppStore((s) => s.deleteLedgerEntry);
  const onboardingInput = useAppStore((s) => s.onboardingInput);
  const visitedSteps = useAppStore((s) => s.visitedSteps);

  const [today] = useState(() => new Date());
  const [kind, setKind] = useState<EntryKind>("sale");
  const [amount, setAmount] = useState("");
  const [on, setOn] = useState(() => dayKey(new Date()));
  const [note, setNote] = useState("");

  const profile = buildOwnProfile(onboardingInput, visitedSteps);
  const instalment = profile.plan?.schedule.instalment ?? null;

  const summary = useMemo(() => summarise(ledger, today), [ledger, today]);
  const cover = useMemo(() => coverCheck(summary, instalment), [summary, instalment]);

  const parsed = Number(amount);
  const canSave = amount !== "" && Number.isFinite(parsed) && parsed > 0 && Boolean(on);

  function save() {
    if (!canSave) return;
    addLedgerEntry(newEntry({ on, kind, amount: parsed, note }));
    setAmount("");
    setNote("");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 md:p-8">
      <DemoBanner />
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/30 bg-primary/5 text-primary">
            <BookOpen className="mr-1 h-3 w-3" aria-hidden="true" /> {t("khata.badge")}
          </Badge>
          <h1 className="font-heading text-3xl font-bold md:text-4xl">{t("khata.title")}</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">{t("khata.subtitle")}</p>
        </div>
        {ledger.length > 0 && (
          <Button
            variant="outline"
            className="shrink-0 rounded-full"
            onClick={() =>
              downloadCsv(`udyamai-khata-${dayKey(today)}.csv`, ledgerToCsv(ledger))
            }
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" /> {t("khata.export")}
          </Button>
        )}
      </header>

      {/* today, the month, and the loan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t("khata.today")}
          value={money(summary.today.net)}
          sub={t("khata.inOut", {
            inAmt: money(summary.today.sales),
            outAmt: money(summary.today.expenses),
          })}
          tone={summary.today.net > 0 ? "emerald" : summary.today.net < 0 ? "rose" : "neutral"}
        />
        <StatTile
          label={t("khata.month")}
          value={money(summary.month.net)}
          sub={t("khata.overDays", { n: summary.daysRecordedThisMonth })}
          tone={summary.month.net > 0 ? "emerald" : summary.month.net < 0 ? "rose" : "neutral"}
        />
        <StatTile
          label={t("khata.moneyIn")}
          value={money(summary.month.sales)}
          sub={t("khata.entries", { n: summary.month.count })}
        />
        <StatTile
          label={t("khata.moneyOut")}
          value={money(summary.month.expenses)}
          sub={t("khata.costOfTrade")}
        />
      </div>

      {/* the join with the loan — the reason this book lives inside this product */}
      {instalment != null && (
        <Card
          className={
            cover.verdict === "covers"
              ? "border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"
              : cover.verdict === "unknown"
                ? ""
                : "border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {cover.verdict === "covers" ? (
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : cover.verdict === "unknown" ? (
                <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <AlertTriangle
                  className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
                  aria-hidden="true"
                />
              )}
              {t(`book.${cover.verdict}` as MessageKey)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            {/* The instalment is quarterly; the book is monthly. Both sides are put on a monthly
                footing before they are compared, or a comfortable shop looks insolvent. */}
            <p>
              {t("khata.instalmentPerMonth", {
                quarter: money(instalment),
                month: money(cover.monthlyObligation),
              })}{" "}
              {t(cover.monthNet >= 0 ? "khata.monthUp" : "khata.monthDown", {
                amount: money(Math.abs(cover.monthNet)),
              })}
            </p>
            {cover.verdict === "unknown" ? (
              <p className="text-muted-foreground">
                {t("khata.tooFewDays", { n: cover.daysRecorded, min: MIN_DAYS_FOR_VERDICT })}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {cover.headroom >= 0
                  ? t("khata.headroom", { amount: money(cover.headroom) })
                  : t("khata.shortfall", { amount: money(Math.abs(cover.headroom)) })}{" "}
                {t("khata.basedOn", { n: cover.daysRecorded })}
              </p>
            )}
            <Link href="/dashboard/emi">
              <Button variant="outline" size="sm" className="rounded-full">
                {t("khata.schedule")}{" "}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* the entry form */}
      <Card className="border-2 border-primary/25">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("khata.addEntry")}</CardTitle>
          <CardDescription>{t("khata.addHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2" role="group" aria-label={t("khata.inOutGroup")}>
            {(
              [
                { id: "sale", label: t("khata.in"), Icon: Plus },
                { id: "expense", label: t("khata.out"), Icon: Minus },
              ] as { id: EntryKind; label: string; Icon: typeof Plus }[]
            ).map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={kind === k.id}
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  kind === k.id
                    ? k.id === "sale"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <k.Icon className="h-4 w-4" aria-hidden="true" /> {k.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor={amountId}>{t("khata.amount")}</Label>
              <Input
                id={amountId}
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && canSave) save();
                }}
                placeholder="900"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={dateId}>{t("khata.day")}</Label>
              {/* Defaults to today but is editable: people write up yesterday evening. */}
              <Input
                id={dateId}
                type="date"
                max={dayKey(today)}
                value={on}
                onChange={(ev) => setOn(ev.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={noteId}>{t("khata.note")}</Label>
              <Input
                id={noteId}
                value={note}
                maxLength={120}
                onChange={(ev) => setNote(ev.target.value)}
                placeholder={t("khata.notePlaceholder")}
              />
            </div>
          </div>

          <Button className="rounded-full px-8" disabled={!canSave} onClick={save}>
            {t("khata.save")}
          </Button>
        </CardContent>
      </Card>

      {/* the book itself */}
      {summary.days.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">{t("khata.emptyTitle")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {t("dash.bookEmpty")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {summary.days.map((day) => (
            <Card key={day.on}>
              <CardHeader className="flex flex-row items-baseline justify-between gap-3 space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">
                  {dayLabel(day.on, MONTHS_SHORT[locale])}
                </CardTitle>
                <span
                  className={`flex items-center gap-1 text-sm font-bold tabular-nums ${
                    day.totals.net > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : day.totals.net < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {day.totals.net > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : day.totals.net < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : null}
                  ₹{inr(day.totals.net)}
                </span>
              </CardHeader>
              <CardContent className="pb-3">
                <ul className="divide-y">
                  {day.entries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            entry.kind === "sale"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}
                          aria-hidden="true"
                        >
                          {entry.kind === "sale" ? (
                            <Plus className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                        </span>
                        <span className="truncate text-sm">
                          {entry.note ||
                            (entry.kind === "sale" ? t("khata.sale") : t("khata.expense"))}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">
                          {entry.kind === "sale" ? "+" : "−"}₹{inr(entry.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteLedgerEntry(entry.id)}
                          aria-label={t("khata.deleteEntry")}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("khata.footer")}</p>
    </div>
  );
}
