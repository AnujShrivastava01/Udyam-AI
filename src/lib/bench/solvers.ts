/**
 * SIDDHI-Bench — the answer shape, the ground truth, and the solvers under test.
 *
 * Ground truth is not hand-labelled. It is computed by the deterministic kernel, which is itself
 * pinned by 26 unit tests against figures worked by hand from the published scheme documents. So
 * the benchmark has a property most do not: its labels are auditable arithmetic rather than
 * annotator opinion.
 */

import {
  SCHEMES,
  amortise,
  levelInstalment,
  structure,
  type MoratoriumConvention,
  type SchemeId,
} from "@/lib/finance";

import type { BenchCase } from "./cases";

/** The five-tuple every solver must produce. */
export interface Answer {
  scheme: SchemeId | "none";
  /** Loan actually sanctionable, after the scheme cap. */
  sanctionedLoan: number;
  /** Level instalment payable each quarter. */
  quarterlyInstalment: number;
  /** Interest paid during the moratorium (zero under the capitalised convention). */
  moratoriumInterest: number;
  /** Total interest over the life of the loan. */
  totalInterest: number;
}

export interface Solver {
  id: string;
  label: string;
  note: string;
  solve: (c: BenchCase) => Answer;
}

// ── ground truth ────────────────────────────────────────────────────────────

export function groundTruth(c: BenchCase): Answer {
  const s = structure({
    marginCapital: c.marginCapital,
    neededProjectCost: c.projectCost,
    activityClass: c.activityClass,
  });

  const sched = amortise({
    principal: s.sanctionedLoan,
    annualRatePct: s.scheme.annualRatePct,
    tenureMonths: s.scheme.tenureMonths,
    moratoriumMonths: s.moratoriumMonths,
    restMonths: s.scheme.restMonths,
    convention: c.convention,
  });

  return {
    scheme: s.scheme.id,
    sanctionedLoan: s.sanctionedLoan,
    quarterlyInstalment: sched.instalment,
    moratoriumInterest: sched.moratoriumInterest,
    totalInterest: sched.totalInterest,
  };
}

// ── solvers ─────────────────────────────────────────────────────────────────

/** The kernel itself. Correct by construction — it is what produces the labels. */
export const kernelSolver: Solver = {
  id: "kernel",
  label: "Deterministic kernel",
  note: "The engine under test is the engine that labels. Scores 100% by construction; included as the ceiling.",
  solve: groundTruth,
};

/**
 * The specification, implemented literally.
 *
 * This is the honest baseline: what you get building exactly what SIH26091 says, with none of the
 * constraints the scheme documents themselves impose. It is also, almost exactly, the calculator
 * this repository shipped before the kernel replaced it.
 *
 *   - Project Cost = Margin ÷ 10%
 *   - Loan = 90% of project cost, with NO cap applied
 *   - Tier by the ₹1.40 lakh threshold
 *   - Principal repaid on a straight line rather than a reducing balance
 */
export const specLiteralSolver: Solver = {
  id: "spec-literal",
  label: "Specification, implemented literally",
  note: "PS formula with no caps and straight-line principal — what a faithful reading of the problem statement produces.",
  solve: (c) => {
    const projectCost = c.marginCapital / 0.1;
    const micro = projectCost <= SCHEMES["nsfdc-micro-finance"].maxProjectCost;
    const scheme = micro ? SCHEMES["nsfdc-micro-finance"] : SCHEMES["nsfdc-term-loan"];

    const loan = projectCost * 0.9; // no cap
    const periodic = scheme.annualRatePct / 100 / 4;
    const moratoriumQuarters = scheme.moratoriumMonths / 3;
    const quarters = scheme.tenureMonths / 3;
    const amortisingQuarters = quarters - moratoriumQuarters;

    // Straight-line principal, interest on the running balance.
    const principalPerQuarter = loan / amortisingQuarters;
    let balance = loan;
    let interestTotal = 0;
    let moratoriumInterest = 0;
    for (let q = 1; q <= quarters; q++) {
      const interest = balance * periodic;
      if (q <= moratoriumQuarters) {
        moratoriumInterest += interest;
        interestTotal += interest;
      } else {
        interestTotal += interest;
        balance -= principalPerQuarter;
      }
    }

    return {
      scheme: scheme.id,
      sanctionedLoan: round2(loan),
      // Reported as first-instalment total, which is what such an implementation shows the user.
      quarterlyInstalment: round2(principalPerQuarter + loan * periodic),
      moratoriumInterest: round2(moratoriumInterest),
      totalInterest: round2(interestTotal),
    };
  },
};

/**
 * A careful implementation that applies the caps but uses simple interest.
 *
 * Included because it is the most common *near-miss*: someone who read the scheme document,
 * correctly applied the ₹1.25 L / ₹45 L ceilings, and then computed interest the way a flat-rate
 * quote does. It isolates how much of the error is caps versus amortisation convention.
 */
export const cappedSimpleInterestSolver: Solver = {
  id: "capped-simple",
  label: "Caps applied, simple interest",
  note: "Gets the ceilings right, then prices the loan on a flat rate rather than a reducing balance.",
  solve: (c) => {
    const s = structure({
      marginCapital: c.marginCapital,
      neededProjectCost: c.projectCost,
      activityClass: c.activityClass,
    });
    const years = s.scheme.tenureMonths / 12;
    const simpleInterest = s.sanctionedLoan * (s.scheme.annualRatePct / 100) * years;
    const quarters = (s.scheme.tenureMonths - s.moratoriumMonths) / 3;

    return {
      scheme: s.scheme.id,
      sanctionedLoan: s.sanctionedLoan,
      quarterlyInstalment: round2((s.sanctionedLoan + simpleInterest) / quarters),
      moratoriumInterest: round2(
        s.sanctionedLoan * (s.scheme.annualRatePct / 100 / 4) * (s.moratoriumMonths / 3),
      ),
      totalInterest: round2(simpleInterest),
    };
  },
};

/**
 * Correct in every respect except the moratorium convention, which it always treats as serviced.
 *
 * The subtlest failure in the set, and the one most likely to survive review: the arithmetic is
 * right, the caps are right, and the answer is still wrong on every capitalised case.
 */
export const conventionBlindSolver: Solver = {
  id: "convention-blind",
  label: "Correct, but assumes interest is always serviced",
  note: "Right caps, right amortisation, wrong on every case where moratorium interest is capitalised.",
  solve: (c) => groundTruth({ ...c, convention: "serviced" as MoratoriumConvention }),
};

export const SOLVERS: Solver[] = [
  kernelSolver,
  specLiteralSolver,
  cappedSimpleInterestSolver,
  conventionBlindSolver,
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export { levelInstalment };
