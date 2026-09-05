/**
 * A loan being repaid, tracked against the calendar.
 *
 * The repayment screen was driven by three hardcoded numbers — activity `goat-20-1`, a margin of
 * ₹10,000, and "9 months elapsed" set by a slider. Every figure on it was real arithmetic about a
 * borrower who did not exist, on the screen the journey calls "manage".
 *
 * This module replaces the slider with a date. Two modes, and the difference matters:
 *
 *   PROJECTED — no disbursement date. Rows are numbered months, nothing is "paid", and the screen
 *               says what would happen. This is everybody's state until they actually borrow.
 *   TRACKED   — a disbursement date the user entered. Months elapsed come from the calendar, rows
 *               carry real dates, and "overdue" means overdue.
 *
 * Nothing here invents a payment history. A row before today is `due`, not `paid`: this app has no
 * ledger and cannot know whether the money was actually sent. Calling an unpaid instalment "paid"
 * on a repayment tracker is the single most expensive lie this screen could tell, and it is
 * exactly what a progress bar driven by elapsed time does.
 */

import type { ScheduleRow } from "@/lib/finance/amortise";
import { addMonths, nextDue, type DueInstalment } from "@/lib/finance/reminders";

export type TrackerMode = "projected" | "tracked";

/** A schedule row placed on the calendar. */
export interface DatedRow {
  row: ScheduleRow;
  /** Null in projected mode — there is no date to place it on. */
  dueOn: Date | null;
  /**
   * `elapsed` means the date has passed. Deliberately NOT called "paid": no ledger exists, so
   * whether the money moved is something only the borrower and the lender know.
   */
  state: "elapsed" | "next" | "upcoming";
}

export interface LoanTracking {
  mode: TrackerMode;
  rows: DatedRow[];
  /** Whole months from disbursement to today. Zero in projected mode. */
  monthsElapsed: number;
  /** The next instalment falling due, or null when the schedule is finished. */
  next: DueInstalment | null;
  /** Instalments whose date has passed. Their total is what MAY still be owed, not what is. */
  elapsedCount: number;
  elapsedTotal: number;
  /** Closing balance after the last elapsed row — the scheduled outstanding, if all were paid. */
  scheduledOutstanding: number;
  /** Instalments still to fall due at or before the activity's first income. */
  remainingPreIncome: number;
  /** True while the calendar is still inside the moratorium. */
  inMoratorium: boolean;
  /** Months until the activity earns, from today. Null when gestation is unknown. */
  monthsToIncome: number | null;
}

/** Whole calendar months between two dates — 31 Jan to 1 Mar is one month, not two. */
export function monthsBetween(from: Date, to: Date): number {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

export interface TrackInput {
  schedule: ScheduleRow[];
  /** ISO date (yyyy-mm-dd), or null when the loan has not been taken. */
  disbursedOn: string | null;
  today: Date;
  moratoriumMonths: number;
  /** Months from disbursement until the activity earns. */
  gestationMonths: number | null;
}

export function track({
  schedule,
  disbursedOn,
  today,
  moratoriumMonths,
  gestationMonths,
}: TrackInput): LoanTracking {
  const disbursed = parseDate(disbursedOn);

  if (!disbursed) {
    return {
      mode: "projected",
      rows: schedule.map((row) => ({ row, dueOn: null, state: "upcoming" as const })),
      monthsElapsed: 0,
      next: null,
      elapsedCount: 0,
      elapsedTotal: 0,
      scheduledOutstanding: schedule[0]?.openingBalance ?? 0,
      remainingPreIncome: preIncomeTotal(schedule, gestationMonths, 0),
      inMoratorium: moratoriumMonths > 0,
      monthsToIncome: gestationMonths,
    };
  }

  const monthsElapsed = monthsBetween(disbursed, today);
  const next = nextDue(schedule, disbursed, today);

  const rows: DatedRow[] = schedule.map((row) => {
    const dueOn = addMonths(disbursed, row.month);
    const state: DatedRow["state"] =
      next && row.period === next.row.period
        ? "next"
        : row.month <= monthsElapsed
          ? "elapsed"
          : "upcoming";
    return { row, dueOn, state };
  });

  const elapsed = schedule.filter((r) => r.month <= monthsElapsed);

  return {
    mode: "tracked",
    rows,
    monthsElapsed,
    next,
    elapsedCount: elapsed.length,
    elapsedTotal: round(elapsed.reduce((sum, r) => sum + r.payment, 0)),
    scheduledOutstanding: round(
      elapsed.length
        ? elapsed[elapsed.length - 1].closingBalance
        : (schedule[0]?.openingBalance ?? 0),
    ),
    remainingPreIncome: preIncomeTotal(schedule, gestationMonths, monthsElapsed),
    inMoratorium: monthsElapsed < moratoriumMonths,
    monthsToIncome:
      gestationMonths == null ? null : Math.max(0, gestationMonths - monthsElapsed),
  };
}

/**
 * What is still to fall due before the enterprise earns its first rupee.
 *
 * The number the Solvency Clock exists to surface, and the one a borrower has to find from
 * somewhere other than this loan.
 */
function preIncomeTotal(
  schedule: ScheduleRow[],
  gestationMonths: number | null,
  monthsElapsed: number,
): number {
  if (gestationMonths == null) return 0;
  return round(
    schedule
      .filter((r) => r.month > monthsElapsed && r.month <= gestationMonths)
      .reduce((sum, r) => sum + r.payment, 0),
  );
}

/**
 * Parse a yyyy-mm-dd string to a LOCAL date at midnight.
 *
 * `new Date("2026-09-06")` parses as UTC midnight, which is the previous day everywhere west of
 * Greenwich — so a borrower in a negative offset would see every due date land a day early. The
 * value comes from an `<input type="date">`, which means a local calendar day, so it is
 * constructed as one.
 */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  // Rejects 2026-02-31, which the Date constructor would silently roll into March.
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null;
  return date;
}

/** Back to yyyy-mm-dd in LOCAL time, for round-tripping through an `<input type="date">`. */
export function toInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const round = (n: number) => Math.round(n * 100) / 100;
