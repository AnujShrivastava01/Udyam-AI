/**
 * Reducing-balance amortisation with an explicit moratorium.
 *
 * This module is PURE: no DB, no network, no framework. `import` it with sockets disabled and
 * it still works. That is what makes the numbers testable — and what lets us say truthfully
 * that pulling the language model out changes nothing about them.
 */

import type { MoratoriumConvention } from "./schemes";

export interface AmortiseInput {
  /** Sanctioned loan, in rupees. */
  principal: number;
  /** Annual interest rate, as a percentage (e.g. 6.5). */
  annualRatePct: number;
  /** Total tenure in months, INCLUDING the moratorium. */
  tenureMonths: number;
  /** Principal holiday in months from disbursement. */
  moratoriumMonths: number;
  /** Rest period in months (3 = quarterly). */
  restMonths: number;
  convention: MoratoriumConvention;
}

export interface ScheduleRow {
  /** 1-based instalment index across the whole tenure, including moratorium rests. */
  period: number;
  /** Months since disbursement at which this payment falls due. */
  month: number;
  inMoratorium: boolean;
  openingBalance: number;
  interest: number;
  principal: number;
  /** What the borrower actually pays this period. */
  payment: number;
  closingBalance: number;
}

export interface AmortiseResult {
  /** The level instalment payable in each amortising period. */
  instalment: number;
  /** Number of amortising (post-moratorium) instalments. */
  instalmentCount: number;
  /** Periodic interest rate actually used, as a fraction. */
  periodicRate: number;
  /**
   * Interest paid during the moratorium. Non-zero only under the `serviced` convention —
   * under `capitalised` it is rolled into principal instead.
   */
  moratoriumInterest: number;
  /** Principal the amortisation actually runs on (differs from input under `capitalised`). */
  amortisedPrincipal: number;
  /** Interest over the amortising periods, excluding any moratorium interest. */
  amortisationInterest: number;
  /**
   * Every rupee of interest the borrower pays, derived from the payment stream:
   * `totalOutflow - principal`.
   *
   * This is NOT `moratoriumInterest + amortisationInterest`, which is what the comment used to
   * claim. Under the capitalised convention moratorium interest is folded into principal and then
   * repaid WITH interest, so it appears in neither field — summing the two columns made the
   * capitalised convention look cheaper than the serviced one, which is backwards.
   */
  totalInterest: number;
  /** Every rupee the borrower actually pays: the sum of the payment column. */
  totalOutflow: number;
  schedule: ScheduleRow[];
}

/** Round to paise so repeated arithmetic doesn't drift into fractions of a rupee. */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Level-instalment (annuity) factor on a reducing balance.
 *
 *   A = P · i / (1 − (1 + i)^−n)
 *
 * with the zero-rate case handled separately so a 0% scheme doesn't divide by zero.
 */
export function levelInstalment(principal: number, periodicRate: number, periods: number): number {
  if (periods <= 0) return 0;
  if (periodicRate === 0) return principal / periods;
  return (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -periods));
}

export function amortise(input: AmortiseInput): AmortiseResult {
  const { principal, annualRatePct, tenureMonths, moratoriumMonths, restMonths, convention } = input;

  // `NaN <= 0` is false, so every one of these guards used to pass a NaN straight through and the
  // whole schedule came back as NaN with no error anywhere — a plan that looks structured and is
  // arithmetic garbage. Finiteness is checked first, before any comparison.
  for (const [name, v] of [
    ["principal", principal],
    ["annualRatePct", annualRatePct],
    ["tenureMonths", tenureMonths],
    ["moratoriumMonths", moratoriumMonths],
    ["restMonths", restMonths],
  ] as const) {
    if (!Number.isFinite(v)) throw new Error(`amortise: ${name} must be a finite number`);
  }
  if (principal <= 0) throw new Error("amortise: principal must be positive");
  if (restMonths <= 0) throw new Error("amortise: restMonths must be positive");
  if (tenureMonths <= moratoriumMonths) {
    throw new Error("amortise: tenure must exceed the moratorium");
  }
  if (!Number.isInteger(moratoriumMonths) || moratoriumMonths < 0) {
    throw new Error("amortise: moratorium must be a non-negative whole number of months");
  }
  if (moratoriumMonths % restMonths !== 0) {
    throw new Error("amortise: moratorium must be a whole number of rest periods");
  }
  // The amortising window has to divide exactly into rest periods.
  //
  // This used to be Math.round, which failed silently in both directions. A 13-month tenure with a
  // 12-month moratorium rounded 1/3 down to ZERO instalments: levelInstalment returns 0 for
  // periods <= 0, so the function returned instalment 0, a schedule that never touched principal,
  // and a NEGATIVE total interest. Rounding up was worse in a quieter way — a 14-month tenure
  // produced one instalment falling due at month 15, past the tenure the scheme actually grants.
  // Every scheme and rail in the registry has an exact window (36-3, 84-6, 84-12, 60-3), so this
  // refuses only inputs that were already producing a wrong answer.
  if ((tenureMonths - moratoriumMonths) % restMonths !== 0) {
    throw new Error("amortise: amortising window must be a whole number of rest periods");
  }

  const periodicRate = annualRatePct / 100 / (12 / restMonths);
  const moratoriumPeriods = moratoriumMonths / restMonths;
  const instalmentCount = (tenureMonths - moratoriumMonths) / restMonths;

  const schedule: ScheduleRow[] = [];
  let balance = principal;
  let moratoriumInterest = 0;

  // --- moratorium ---------------------------------------------------------------------
  for (let p = 1; p <= moratoriumPeriods; p++) {
    const interest = r2(balance * periodicRate);
    const opening = balance;

    if (convention === "serviced") {
      // Interest is paid as it falls due; principal is untouched.
      moratoriumInterest = r2(moratoriumInterest + interest);
    } else {
      // Interest is funded into the principal and repaid later, with interest on it.
      balance = r2(balance + interest);
    }

    schedule.push({
      period: p,
      month: p * restMonths,
      inMoratorium: true,
      openingBalance: opening,
      interest,
      principal: 0,
      payment: convention === "serviced" ? interest : 0,
      closingBalance: balance,
    });
  }

  // --- amortisation -------------------------------------------------------------------
  const amortisedPrincipal = balance;
  const instalment = r2(levelInstalment(amortisedPrincipal, periodicRate, instalmentCount));

  let amortisationInterest = 0;

  for (let k = 1; k <= instalmentCount; k++) {
    const period = moratoriumPeriods + k;
    const opening = balance;
    const interest = r2(balance * periodicRate);
    // The final instalment absorbs accumulated rounding so the balance closes at exactly zero.
    const isLast = k === instalmentCount;
    const principalPart = isLast ? r2(balance) : r2(instalment - interest);
    const payment = isLast ? r2(principalPart + interest) : instalment;

    balance = r2(balance - principalPart);
    amortisationInterest = r2(amortisationInterest + interest);

    schedule.push({
      period,
      month: period * restMonths,
      inMoratorium: false,
      openingBalance: opening,
      interest,
      principal: principalPart,
      payment,
      closingBalance: Math.max(0, balance),
    });
  }

  // Total cost is what the borrower actually hands over, minus what they originally received.
  //
  // Deriving it from the payment stream — rather than summing the interest columns — is what
  // makes it correct under BOTH conventions. Under `capitalised`, moratorium interest is folded
  // into principal and then repaid *with interest on it*; summing the interest columns would
  // silently omit that, and make the capitalised option look cheaper than the serviced one.
  // It is not. It is always dearer.
  const totalOutflow = r2(schedule.reduce((sum, row) => sum + row.payment, 0));
  const totalInterest = r2(totalOutflow - principal);

  return {
    instalment,
    instalmentCount,
    periodicRate,
    moratoriumInterest,
    amortisedPrincipal,
    amortisationInterest,
    totalInterest,
    totalOutflow,
    schedule,
  };
}

/**
 * The monthly-EMI equivalent of the same loan, for comparison only.
 *
 * These schemes repay quarterly; borrowers think in months. Showing both is a comprehension
 * aid, never the sanctioned figure.
 */
export function monthlyEquivalent(input: Omit<AmortiseInput, "restMonths">): AmortiseResult {
  return amortise({ ...input, restMonths: 1 });
}
