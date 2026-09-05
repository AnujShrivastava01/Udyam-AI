/**
 * The daily book — what came in, what went out, and whether today made money.
 *
 * A Khatabook-shaped ledger, with one difference that is the reason it belongs in THIS product
 * rather than being a separate app: the loan is right there. A shopkeeper's book tells them this
 * month's net; this one can also say whether that net covers the instalment falling due, which is
 * the single question the Solvency Clock exists to ask and the one nobody can answer from a
 * repayment schedule alone.
 *
 * Everything here is the user's own entry. Nothing is inferred, estimated or filled in — an empty
 * book shows an empty book. The arithmetic is deliberately trivial and all in one place so it can
 * be checked by hand, same rule as the finance kernel.
 */

import { toCsv } from "@/lib/export/csv";

export type EntryKind = "sale" | "expense";

export interface LedgerEntry {
  id: string;
  /** The day it happened, yyyy-mm-dd. Separate from createdAt: people write up yesterday. */
  on: string;
  kind: EntryKind;
  /** Rupees, always positive. The sign lives in `kind`, never in the number. */
  amount: number;
  note: string;
  createdAt: string;
}

export interface Totals {
  sales: number;
  expenses: number;
  /** sales − expenses. Negative is a loss, and is reported as one. */
  net: number;
  count: number;
}

export interface DayGroup {
  on: string;
  entries: LedgerEntry[];
  totals: Totals;
}

export interface BookSummary {
  today: Totals;
  month: Totals;
  allTime: Totals;
  /** Newest day first. */
  days: DayGroup[];
  /** Days with at least one entry, this calendar month. */
  daysRecordedThisMonth: number;
}

const EMPTY: Totals = { sales: 0, expenses: 0, net: 0, count: 0 };

function id(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `led-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** yyyy-mm-dd in LOCAL time. `toISOString` would roll the date back east of Greenwich. */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function newEntry(
  input: { on: string; kind: EntryKind; amount: number; note?: string },
  now: Date = new Date(),
): LedgerEntry {
  return {
    id: id(),
    on: input.on,
    kind: input.kind,
    // Rounded to the rupee. Paise in a village shop's book is noise, and a stray float makes every
    // total below look wrong by a hundredth.
    amount: Math.max(0, Math.round(input.amount)),
    note: (input.note ?? "").trim().slice(0, 120),
    createdAt: now.toISOString(),
  };
}

export function total(entries: LedgerEntry[]): Totals {
  let sales = 0;
  let expenses = 0;
  for (const e of entries) {
    if (e.kind === "sale") sales += e.amount;
    else expenses += e.amount;
  }
  return { sales, expenses, net: sales - expenses, count: entries.length };
}

export function summarise(entries: LedgerEntry[], today: Date = new Date()): BookSummary {
  const todayKey = dayKey(today);
  const monthPrefix = todayKey.slice(0, 7);

  const byDay = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.on);
    if (list) list.push(e);
    else byDay.set(e.on, [e]);
  }

  const days: DayGroup[] = [...byDay.entries()]
    // String sort is correct for yyyy-mm-dd and needs no Date parsing.
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([on, list]) => ({
      on,
      entries: [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      totals: total(list),
    }));

  const monthEntries = entries.filter((e) => e.on.startsWith(monthPrefix));

  return {
    today: byDay.has(todayKey) ? total(byDay.get(todayKey)!) : EMPTY,
    month: monthEntries.length ? total(monthEntries) : EMPTY,
    allTime: entries.length ? total(entries) : EMPTY,
    days,
    daysRecordedThisMonth: new Set(monthEntries.map((e) => e.on)).size,
  };
}

/**
 * Can this month's trading cover the instalment?
 *
 * The join between the book and the loan, and the reason both live in one product. A quarterly
 * instalment is divided by three to compare like with like — comparing a month's net against a
 * quarter's payment is the sort of unit slip that makes a comfortable business look insolvent.
 *
 * `unknown` when there is no loan or nothing recorded. A verdict computed from two days of entries
 * would be noise wearing the clothes of a finding.
 */
export type CoverVerdict = "covers" | "short" | "loss" | "unknown";

export interface CoverCheck {
  verdict: CoverVerdict;
  /** The instalment expressed per month, so both sides are monthly. */
  monthlyObligation: number;
  monthNet: number;
  /** monthNet − monthlyObligation. Negative is the shortfall. */
  headroom: number;
  /** How many days of this month have entries — the confidence in the above. */
  daysRecorded: number;
}

/** Below this many recorded days, the month's net is not yet worth drawing a conclusion from. */
export const MIN_DAYS_FOR_VERDICT = 5;

export function coverCheck(
  summary: BookSummary,
  quarterlyInstalment: number | null,
): CoverCheck {
  const monthlyObligation =
    quarterlyInstalment != null && quarterlyInstalment > 0
      ? Math.round(quarterlyInstalment / 3)
      : 0;

  const base = {
    monthlyObligation,
    monthNet: summary.month.net,
    headroom: summary.month.net - monthlyObligation,
    daysRecorded: summary.daysRecordedThisMonth,
  };

  if (monthlyObligation === 0 || summary.daysRecordedThisMonth < MIN_DAYS_FOR_VERDICT) {
    return { ...base, verdict: "unknown" };
  }
  if (summary.month.net <= 0) return { ...base, verdict: "loss" };
  return { ...base, verdict: summary.month.net >= monthlyObligation ? "covers" : "short" };
}

export const LEDGER_CSV_HEADER = ["date", "kind", "amount_inr", "note", "recorded_at"];

export function ledgerToCsv(entries: LedgerEntry[]): string {
  const ordered = [...entries].sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));
  return toCsv(
    LEDGER_CSV_HEADER,
    ordered.map((e) => [e.on, e.kind, e.amount, e.note, e.createdAt]),
  );
}
