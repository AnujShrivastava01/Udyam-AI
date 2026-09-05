/**
 * When the next instalment falls due.
 *
 * "EMI reminders" sounds like infrastructure — a scheduler, a job queue, a notifications table.
 * It is none of those. The schedule is deterministic and already computed, so the next due date is
 * a pure function of the disbursement date and the row's month offset. Nothing is stored, nothing
 * runs in the background, and the answer is the same every time it is asked.
 *
 * The month offset is added in CALENDAR months, not 30-day blocks: a quarterly instalment due at
 * month 3 falls on the same day of the month, which is how a borrower thinks about it and how the
 * lender books it. Day-of-month is clamped so a disbursement on the 31st does not skip February.
 */

import type { ScheduleRow } from "./amortise";

export interface DueInstalment {
  row: ScheduleRow;
  dueOn: Date;
  /** Negative when it is already past. */
  daysAway: number;
}

/** Add whole calendar months, clamping the day to the target month's length. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
}

const DAY_MS = 86_400_000;

/** Midnight-to-midnight, so "due today" is not off by the time of day the page was opened. */
function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / DAY_MS);
}

/**
 * The next instalment due on or after `today`, or null when the loan is finished.
 *
 * Rows with a zero payment are skipped — under the capitalised convention the moratorium rows
 * carry no payment at all, and reminding somebody about ₹0 is noise.
 */
export function nextDue(
  schedule: ScheduleRow[],
  disbursedOn: Date,
  today: Date,
): DueInstalment | null {
  for (const row of schedule) {
    if (row.payment <= 0) continue;
    const dueOn = addMonths(disbursedOn, row.month);
    const daysAway = daysBetween(today, dueOn);
    if (daysAway >= 0) return { row, dueOn, daysAway };
  }
  return null;
}

/** Every instalment already past its date and therefore owed. */
export function overdue(
  schedule: ScheduleRow[],
  disbursedOn: Date,
  today: Date,
): DueInstalment[] {
  const out: DueInstalment[] = [];
  for (const row of schedule) {
    if (row.payment <= 0) continue;
    const dueOn = addMonths(disbursedOn, row.month);
    const daysAway = daysBetween(today, dueOn);
    if (daysAway < 0) out.push({ row, dueOn, daysAway });
  }
  return out;
}

/**
 * How far ahead a reminder should go out.
 *
 * A week is long enough to arrange money in a village economy and short enough to still be the
 * current concern. This is a stated assumption, not a measured one.
 */
export const REMINDER_LEAD_DAYS = 7;

export function shouldRemind(due: DueInstalment | null, leadDays = REMINDER_LEAD_DAYS): boolean {
  return due != null && due.daysAway <= leadDays;
}
