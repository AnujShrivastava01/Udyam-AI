/**
 * The Solvency Clock.
 *
 * Two published government tables, joined:
 *   • NABARD says a goat unit produces nothing for 18 months.
 *   • NSFDC says instalments start at month 6.
 *
 * The overlap is money the borrower must find before the enterprise has earned anything. It is
 * not a modelling opinion — it is arithmetic on two documents, and it mechanistically explains
 * a statistic the ministry has already published: that a third of credit-short beneficiaries
 * end up at a moneylender.
 */

import type { ScheduleRow } from "./amortise";
import type { Activity } from "./activities";
import { RBI_REPAYMENT_CAP_OF_INCOME } from "./schemes";
import { msg, type Message } from "@/lib/i18n/keys";
import { renderMessage } from "@/lib/i18n/render";

export type SolvencyVerdict =
  | "FEASIBLE"
  | "GESTATION_GAP"
  | "DSCR_FAIL"
  | "UNAFFORDABLE"
  | "INSUFFICIENT_DATA";

export interface SolvencyInput {
  schedule: ScheduleRow[];
  /** Months until the activity first earns. `null` when unknown — we refuse rather than guess. */
  gestationMonths: number | null;
  /** Annual net surplus once running, in rupees. Optional; DSCR is skipped without it. */
  annualSurplus?: number;
  /** Beneficiary's baseline annual household income, in rupees. Optional. */
  annualHouseholdIncome?: number;
  /** Minimum debt-service coverage ratio a lender will accept. */
  minDscr?: number;
}

export interface SolvencyResult {
  verdict: SolvencyVerdict;
  /** English rendering, for logs, tests and the WhatsApp English path. */
  headline: string;
  detail: string;
  /** The same two sentences as message keys + slots, so any locale can render them. */
  headlineMsg: Message;
  detailMsg: Message;
  /** Payments falling due at or before the activity's first income. */
  preIncomeObligation: number;
  /** How many of those payments there are. */
  preIncomePayments: number;
  /** The month the first instalment (not moratorium interest) falls due. */
  firstInstalmentMonth: number | null;
  /** gestationMonths − firstInstalmentMonth, when both are known and positive. */
  gapMonths: number | null;
  /** Total payable in the first twelve months. */
  firstYearObligation: number;
  dscr: number | null;
  /** Peak annual debt service ÷ annual household income, when income is known. */
  incomeShare: number | null;
  minDscr: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Build the English strings and the localisable messages from one source of truth. */
function say(headlineMsg: Message, detailMsg: Message) {
  return {
    headlineMsg,
    detailMsg,
    headline: renderMessage("en", headlineMsg.key, headlineMsg.params),
    detail: renderMessage("en", detailMsg.key, detailMsg.params),
  };
}
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

/** Largest total paid in any rolling 12-month window — the year that actually hurts. */
export function peakAnnualDebtService(schedule: ScheduleRow[]): number {
  if (schedule.length === 0) return 0;
  const lastMonth = schedule[schedule.length - 1].month;
  let peak = 0;
  for (let start = 0; start <= lastMonth; start += 3) {
    const window = schedule
      .filter((row) => row.month > start && row.month <= start + 12)
      .reduce((sum, row) => sum + row.payment, 0);
    if (window > peak) peak = window;
  }
  return r2(peak);
}

export function assessSolvency(input: SolvencyInput): SolvencyResult {
  const {
    schedule,
    gestationMonths,
    annualSurplus,
    annualHouseholdIncome,
    minDscr = 1.5,
  } = input;

  const firstInstalment = schedule.find((row) => !row.inMoratorium);
  const firstInstalmentMonth = firstInstalment ? firstInstalment.month : null;

  const firstYearObligation = r2(
    schedule.filter((row) => row.month <= 12).reduce((sum, row) => sum + row.payment, 0),
  );

  const peak = peakAnnualDebtService(schedule);
  const dscr = annualSurplus != null && peak > 0 ? r2(annualSurplus / peak) : null;
  const incomeShare =
    annualHouseholdIncome != null && annualHouseholdIncome > 0 ? r2(peak / annualHouseholdIncome) : null;

  const base = {
    preIncomeObligation: 0,
    preIncomePayments: 0,
    firstInstalmentMonth,
    gapMonths: null as number | null,
    firstYearObligation,
    dscr,
    incomeShare,
    minDscr,
  };

  // --- affordability is a regulatory gate, and it does not depend on gestation -------------
  // This check runs FIRST and independently: a breach of RBI's repayment cap is knowable from
  // the schedule and the household income alone. Missing gestation data must never suppress it.
  if (incomeShare != null && incomeShare > RBI_REPAYMENT_CAP_OF_INCOME) {
    return {
      ...base,
      verdict: "UNAFFORDABLE",
      ...say(
        msg("solvency.unaffordable.headline", { share: `${(incomeShare * 100).toFixed(0)}%` }),
        msg("solvency.unaffordable.detail", {
          debtService: `₹${inr(peak)}`,
          income: `₹${inr(annualHouseholdIncome!)}`,
          cap: `${RBI_REPAYMENT_CAP_OF_INCOME * 100}%`,
        }),
      ),
    };
  }

  // --- refuse rather than guess ----------------------------------------------------------
  if (gestationMonths == null) {
    return {
      ...base,
      verdict: "INSUFFICIENT_DATA",
      ...say(msg("solvency.noData.headline"), msg("solvency.noData.detail")),
    };
  }

  // --- the gestation gap ------------------------------------------------------------------
  const preIncomeRows = schedule.filter((row) => row.month <= gestationMonths && row.payment > 0);
  const preIncomeObligation = r2(preIncomeRows.reduce((sum, row) => sum + row.payment, 0));
  const gapMonths =
    firstInstalmentMonth != null && gestationMonths > firstInstalmentMonth
      ? gestationMonths - firstInstalmentMonth
      : null;

  const withGap = {
    ...base,
    preIncomeObligation,
    preIncomePayments: preIncomeRows.length,
    gapMonths,
  };

  if (preIncomeObligation > 0 && gapMonths != null) {
    return {
      ...withGap,
      verdict: "GESTATION_GAP",
      ...say(
        msg("solvency.gap.headline", { amount: `₹${inr(preIncomeObligation)}` }),
        msg("solvency.gap.detail", {
          gestation: gestationMonths,
          firstMonth: firstInstalmentMonth ?? 0,
          gapMonths,
          payments: preIncomeRows.length,
          amount: `₹${inr(preIncomeObligation)}`,
        }),
      ),
    };
  }

  // --- coverage ---------------------------------------------------------------------------
  if (dscr != null && dscr < minDscr) {
    return {
      ...withGap,
      verdict: "DSCR_FAIL",
      ...say(
        msg("solvency.dscr.headline", { dscr: `${dscr.toFixed(2)}×`, min: `${minDscr}×` }),
        msg("solvency.dscr.detail", {
          surplus: `₹${inr(annualSurplus!)}`,
          debtService: `₹${inr(peak)}`,
        }),
      ),
    };
  }

  return {
    ...withGap,
    verdict: "FEASIBLE",
    ...say(
      msg("solvency.feasible.headline"),
      gestationMonths === 0
        ? msg("solvency.feasible.immediate")
        : msg("solvency.feasible.detail", {
            gestation: gestationMonths,
            firstMonth: firstInstalmentMonth ?? 0,
          }),
    ),
  };
}

export const VERDICT_META: Record<
  SolvencyVerdict,
  { label: string; tone: "good" | "warn" | "bad" | "neutral" }
> = {
  FEASIBLE: { label: "Feasible", tone: "good" },
  GESTATION_GAP: { label: "Gestation gap", tone: "bad" },
  DSCR_FAIL: { label: "Coverage too thin", tone: "warn" },
  UNAFFORDABLE: { label: "Unaffordable", tone: "bad" },
  INSUFFICIENT_DATA: { label: "Not enough data", tone: "neutral" },
};
