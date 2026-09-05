/**
 * The finance kernel's contract.
 *
 * These expected values were computed by hand from the published scheme parameters before any
 * code existed. If a change to the kernel moves one of them, the kernel is wrong — not the test.
 *
 * Run: npm test
 */

import { describe, expect, it } from "vitest";

import { amortise, levelInstalment } from "./amortise";
import { MFS_CAP_BINDS_AT, SCHEMES } from "./schemes";
import { cliffAt, routeScheme, structure } from "./structure";
import { assessSolvency } from "./solvency";
import { plan, quoteAtProjectCost } from "./index";

/** Tolerance of one paisa — these are rupee figures, not floating-point approximations. */
const near = (actual: number, expected: number, tol = 0.02) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe("scheme registry", () => {
  it("holds NSFDC's published Micro Finance terms", () => {
    const s = SCHEMES["nsfdc-micro-finance"];
    expect(s.maxProjectCost).toBe(140_000);
    expect(s.maxLoan).toBe(125_000);
    expect(s.annualRatePct).toBe(6.5);
    expect(s.tenureMonths).toBe(36);
    expect(s.moratoriumMonths).toBe(3);
  });

  it("holds NSFDC's published Term Loan terms, including the 12-month exception", () => {
    const s = SCHEMES["nsfdc-term-loan"];
    expect(s.maxProjectCost).toBe(5_000_000);
    expect(s.maxLoan).toBe(4_500_000);
    expect(s.annualRatePct).toBe(8.0);
    expect(s.tenureMonths).toBe(84);
    expect(s.moratoriumMonths).toBe(6);
    expect(s.moratoriumExceptions?.[0].moratoriumMonths).toBe(12);
    expect(s.moratoriumExceptions?.[0].appliesTo).toContain("plantation");
  });

  it("puts the Micro Finance cap's binding point at ₹1,38,888.89 — not at the ₹1.40 lakh boundary", () => {
    near(MFS_CAP_BINDS_AT, 138_888.89);
  });
});

describe("amortisation", () => {
  it("Micro Finance: ₹1,25,000 at 6.5% over 3 years incl. 3-month moratorium, interest serviced", () => {
    const r = amortise({
      principal: 125_000,
      annualRatePct: 6.5,
      tenureMonths: 36,
      moratoriumMonths: 3,
      restMonths: 3,
      convention: "serviced",
    });
    expect(r.instalmentCount).toBe(11);
    near(r.instalment, 12_501.34, 0.05);
    near(r.moratoriumInterest, 2_031.25);
    near(r.totalInterest, 14_546, 1.5);
  });

  it("Micro Finance under the capitalised convention costs more per quarter", () => {
    const r = amortise({
      principal: 125_000,
      annualRatePct: 6.5,
      tenureMonths: 36,
      moratoriumMonths: 3,
      restMonths: 3,
      convention: "capitalised",
    });
    near(r.instalment, 12_704.49, 0.05);
    expect(r.moratoriumInterest).toBe(0);
    near(r.amortisedPrincipal, 127_031.25);
  });

  it("capitalising the moratorium interest is ALWAYS dearer than servicing it", () => {
    // Regression guard. Totals must be derived from the payment stream, not by summing the
    // interest columns — otherwise the interest folded into principal disappears from the
    // total and capitalising looks cheaper, which is the opposite of the truth.
    const args = {
      annualRatePct: 6.5,
      tenureMonths: 36,
      moratoriumMonths: 3,
      restMonths: 3,
    } as const;
    const serviced = amortise({ ...args, principal: 90_000, convention: "serviced" });
    const capitalised = amortise({ ...args, principal: 90_000, convention: "capitalised" });

    expect(capitalised.totalInterest).toBeGreaterThan(serviced.totalInterest);
    expect(capitalised.totalOutflow).toBeGreaterThan(serviced.totalOutflow);

    // And the totals must reconcile to the payments actually made.
    for (const r of [serviced, capitalised]) {
      const paid = r.schedule.reduce((sum, row) => sum + row.payment, 0);
      near(r.totalOutflow, paid, 0.02);
      near(r.totalInterest, paid - 90_000, 0.02);
    }
  });

  it("Term Loan: the specification's own example — ₹9,00,000 at 8% over 7 years incl. 6-month moratorium", () => {
    const r = amortise({
      principal: 900_000,
      annualRatePct: 8,
      tenureMonths: 84,
      moratoriumMonths: 6,
      restMonths: 3,
      convention: "serviced",
    });
    expect(r.instalmentCount).toBe(26);
    near(r.instalment, 44_729.31, 0.05);
  });

  it("Term Loan under the capitalised convention", () => {
    const r = amortise({
      principal: 900_000,
      annualRatePct: 8,
      tenureMonths: 84,
      moratoriumMonths: 6,
      restMonths: 3,
      convention: "capitalised",
    });
    near(r.instalment, 46_536.37, 0.05);
  });

  it("the plantation exception — a 12-month moratorium — raises the instalment to ₹51,506.44", () => {
    const r = amortise({
      principal: 900_000,
      annualRatePct: 8,
      tenureMonths: 84,
      moratoriumMonths: 12,
      restMonths: 3,
      convention: "capitalised",
    });
    expect(r.instalmentCount).toBe(24);
    near(r.instalment, 51_506.44, 0.05);
  });

  it("closes the balance at exactly zero", () => {
    const r = amortise({
      principal: 900_000,
      annualRatePct: 8,
      tenureMonths: 84,
      moratoriumMonths: 6,
      restMonths: 3,
      convention: "serviced",
    });
    expect(r.schedule[r.schedule.length - 1].closingBalance).toBe(0);
  });

  it("handles a zero rate without dividing by zero", () => {
    expect(levelInstalment(120_000, 0, 12)).toBe(10_000);
  });

  it("refuses a moratorium that is not a whole number of rests", () => {
    expect(() =>
      amortise({
        principal: 100_000,
        annualRatePct: 8,
        tenureMonths: 84,
        moratoriumMonths: 4,
        restMonths: 3,
        convention: "serviced",
      }),
    ).toThrow();
  });
});

describe("structuring and routing", () => {
  it("routes on project cost exactly as Logic A / Logic B specify", () => {
    expect(routeScheme(140_000)?.id).toBe("nsfdc-micro-finance");
    expect(routeScheme(140_001)?.id).toBe("nsfdc-term-loan");
    expect(routeScheme(5_000_001)).toBeNull();
  });

  it("reproduces the specification's headline example: ₹1L margin → ₹10L cost → ₹9L loan", () => {
    const s = structure({ marginCapital: 100_000 });
    expect(s.projectCost).toBe(1_000_000);
    expect(s.sanctionedLoan).toBe(900_000);
    expect(s.scheme.id).toBe("nsfdc-term-loan");
    expect(s.basis).toBe("margin-inversion");
  });

  it("applies the ₹1.25 lakh cap the specification's formula omits", () => {
    const s = structure({ marginCapital: 14_000 }); // → ₹1,40,000 project cost
    expect(s.indicativeLoan).toBe(126_000);
    expect(s.sanctionedLoan).toBe(125_000);
    expect(s.flags.some((f) => f.code === "CAP_BINDING")).toBe(true);
  });

  it("detects the dead zone where the beneficiary silently owes more than 10%", () => {
    const s = structure({ marginCapital: 13_950, neededProjectCost: 139_500 });
    expect(s.flags.some((f) => f.code === "DEAD_ZONE")).toBe(true);
    expect(s.effectiveMarginPct).toBeGreaterThan(0.1);
    near(s.effectiveMarginPct * 100, 10.39, 0.05);
  });

  it("does not flag a dead zone below the cap's binding point", () => {
    const s = structure({ marginCapital: 13_000, neededProjectCost: 130_000 });
    expect(s.flags.some((f) => f.code === "DEAD_ZONE")).toBe(false);
    near(s.effectiveMarginPct, 0.1);
  });

  it("flags a project cost above the ₹50 lakh scheme ceiling", () => {
    const s = structure({ marginCapital: 700_000 }); // → ₹70 lakh
    expect(s.flags.some((f) => f.code === "ABOVE_TIER_CEILING")).toBe(true);
    expect(s.projectCost).toBe(5_000_000);
  });

  it("applies the 12-month moratorium to plantation activities", () => {
    const s = structure({ marginCapital: 100_000, activityClass: "plantation" });
    expect(s.moratoriumMonths).toBe(12);
  });

  it("emits a trace explaining every routing decision", () => {
    const s = structure({ marginCapital: 14_000 });
    expect(s.trace.length).toBeGreaterThanOrEqual(3);
    expect(s.trace.some((t) => t.rule.includes("cap"))).toBe(true);
  });
});

describe("the ₹1.40 lakh cliff", () => {
  it("one rupee of project cost halves the quarterly instalment and triples lifetime interest", () => {
    const cliff = cliffAt();

    const below = amortise({
      principal: cliff.below.loan,
      annualRatePct: SCHEMES["nsfdc-micro-finance"].annualRatePct,
      tenureMonths: SCHEMES["nsfdc-micro-finance"].tenureMonths,
      moratoriumMonths: SCHEMES["nsfdc-micro-finance"].moratoriumMonths,
      restMonths: 3,
      convention: "serviced",
    });
    const above = amortise({
      principal: cliff.above.loan,
      annualRatePct: SCHEMES["nsfdc-term-loan"].annualRatePct,
      tenureMonths: SCHEMES["nsfdc-term-loan"].tenureMonths,
      moratoriumMonths: SCHEMES["nsfdc-term-loan"].moratoriumMonths,
      restMonths: 3,
      convention: "serviced",
    });

    near(below.instalment, 12_501.34, 0.05);
    near(above.instalment, 6_262.15, 0.05);
    near(below.totalInterest, 14_546, 1.5);
    near(above.totalInterest, 41_855, 1.5);

    // The direction of the finding: the cheaper headline rate is the heavier lifetime cost,
    // and the lighter quarterly burden.
    expect(above.instalment).toBeLessThan(below.instalment * 0.55);
    expect(above.totalInterest).toBeGreaterThan(below.totalInterest * 2.5);
  });
});

describe("the solvency clock", () => {
  it("goat rearing: ₹46,467 falls due before the first kid sale", () => {
    const p = plan({
      marginCapital: 10_000,
      activityId: "goat-20-1",
      useNeedBasedCosting: true,
      convention: "serviced",
    });

    expect(p.structure.projectCost).toBe(100_000);
    expect(p.structure.sanctionedLoan).toBe(90_000);
    expect(p.structure.scheme.id).toBe("nsfdc-micro-finance");

    near(p.schedule.moratoriumInterest, 1_462.5);
    near(p.schedule.instalment, 9_000.97, 0.05);

    expect(p.solvency.verdict).toBe("GESTATION_GAP");
    near(p.solvency.preIncomeObligation, 46_467, 1.5);
    expect(p.solvency.preIncomePayments).toBe(6); // moratorium interest + 5 instalments
    expect(p.solvency.gapMonths).toBe(12);
  });

  it("a unit already in milk has no gestation gap", () => {
    const p = plan({
      marginCapital: 23_000,
      activityId: "milch-cows-2",
      useNeedBasedCosting: true,
    });
    expect(p.activity?.gestationMonths).toBe(0);
    expect(p.solvency.verdict).toBe("FEASIBLE");
  });

  it("refuses a verdict when no gestation figure exists, rather than guessing", () => {
    const r = assessSolvency({ schedule: [], gestationMonths: null });
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
  });

  it("flags a structure that breaches RBI's 50%-of-household-income repayment cap", () => {
    // The specification's own example against the beneficiary population's measured income.
    const p = plan({
      marginCapital: 100_000,
      annualHouseholdIncome: 86_119,
      convention: "serviced",
    });
    expect(p.structure.sanctionedLoan).toBe(900_000);
    expect(p.solvency.incomeShare).not.toBeNull();
    expect(p.solvency.incomeShare!).toBeGreaterThan(1); // debt service exceeds annual income outright
    expect(p.solvency.verdict).toBe("UNAFFORDABLE");
  });
});

describe("kernel purity", () => {
  it("computes both moratorium conventions so neither is a silent assumption", () => {
    const p = plan({ marginCapital: 100_000, convention: "serviced" });
    expect(p.convention).toBe("serviced");
    expect(p.alternateConvention.convention).toBe("capitalised");
    expect(p.alternateConvention.instalment).toBeGreaterThan(p.schedule.instalment);
  });
});

describe("degenerate inputs (regressions)", () => {
  it("returns a zero structure instead of throwing when the margin is cleared", () => {
    // Clearing the margin field is an ordinary user action. It used to reach amortise(), throw
    // "principal must be positive" mid-render, and white-screen the calculator.
    const s = structure({ marginCapital: 0 });
    expect(s.projectCost).toBe(0);
    expect(s.sanctionedLoan).toBe(0);
    expect(s.flags.some((f) => f.code === "BELOW_MINIMUM")).toBe(true);
  });

  it("plan() survives a zero margin and returns an empty schedule", () => {
    const p = plan({ marginCapital: 0 });
    expect(p.schedule.instalment).toBe(0);
    expect(p.schedule.schedule).toEqual([]);
    expect(p.solvency).toBeDefined();
  });

  it("quoteAtProjectCost survives the floor of the cliff sweep", () => {
    expect(() => quoteAtProjectCost(0)).not.toThrow();
    expect(quoteAtProjectCost(0).schedule.instalment).toBe(0);
  });

  it("rejects NaN rather than returning a plausible wrong number", () => {
    const s = structure({ marginCapital: Number.NaN });
    expect(s.sanctionedLoan).toBe(0);
    expect(s.flags.some((f) => f.code === "BELOW_MINIMUM")).toBe(true);
  });
});
