import { describe, expect, it } from "vitest";

import { amortise } from "./amortise";
import { plan } from "./index";
import { structure } from "./structure";
import { EXCLUSIONS, RAILS, optimiseStack } from "./stack";

/**
 * Regressions for defects found in the September 2026 audit. Each test names the wrong behaviour
 * it locks out, because a test whose failure message does not explain the bug costs more than it
 * saves.
 */

describe("amortise: the amortising window must divide exactly (audit M5)", () => {
  const base = {
    principal: 100_000,
    annualRatePct: 8,
    restMonths: 3,
    convention: "serviced" as const,
  };

  it("refuses a window that rounds DOWN to zero instalments", () => {
    // Used to return instalmentCount 0, instalment 0, totalInterest \u2212\u20b992,000 and a schedule that
    // never touched principal \u2014 a loan the borrower apparently never has to repay.
    expect(() => amortise({ ...base, tenureMonths: 13, moratoriumMonths: 12 })).toThrow(
      /whole number of rest periods/,
    );
  });

  it("refuses a window that rounds UP past the stated tenure", () => {
    // Used to return one instalment falling due at month 15 on a 14-month loan.
    expect(() => amortise({ ...base, tenureMonths: 14, moratoriumMonths: 12 })).toThrow(
      /whole number of rest periods/,
    );
  });

  it("still accepts every window the scheme registry actually uses", () => {
    for (const [tenure, moratorium] of [
      [36, 3],
      [84, 6],
      [84, 12],
      [60, 3],
    ] as const) {
      const r = amortise({ ...base, tenureMonths: tenure, moratoriumMonths: moratorium });
      expect(r.instalmentCount).toBe((tenure - moratorium) / 3);
      expect(r.totalInterest).toBeGreaterThan(0);
    }
  });
});

describe("structure: a zero project cost is refused, not thrown on (audit H2)", () => {
  it("emits BELOW_MINIMUM rather than reaching amortise", () => {
    const s = structure({ marginCapital: 0 });
    expect(s.sanctionedLoan).toBe(0);
    expect(s.flags.map((f) => f.code)).toContain("BELOW_MINIMUM");
  });

  it("plan() returns an empty schedule instead of throwing", () => {
    const p = plan({ marginCapital: 0 });
    expect(p.schedule.schedule).toHaveLength(0);
    expect(p.schedule.instalment).toBe(0);
  });
});

describe("capital stack (audit M2, M3, M54)", () => {
  it("no two LENDING rails are combinable under the exclusions as encoded", () => {
    // This is the substance behind the `never combines two excluded rails` test, which passes
    // vacuously: every pair is barred, so the pair branch of the enumeration is currently dead.
    // That is the correct conservative behaviour \u2014 PMEGP bars every other subsidised rail, the
    // two NSFDC tiers are alternatives, and Kishore/Tarun are tiers of one scheme \u2014 but it must
    // be asserted rather than assumed. If a combinable rail is ever added this test tells you the
    // blend path has gone live, which is a change worth noticing.
    const lending = RAILS.filter((r) => r.id !== "own-margin");
    const pairs = lending.flatMap((a, i) => lending.slice(i + 1).map((b) => [a.id, b.id] as const));
    const barred = pairs.filter(([a, b]) =>
      EXCLUSIONS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
    );
    expect(barred.length).toBe(pairs.length);

    const r = optimiseStack({ projectCost: 800_000, marginAvailable: 400_000 });
    for (const c of r.candidates) {
      expect(c.components.filter((x) => x.rail.id !== "own-margin").length).toBeLessThanOrEqual(1);
    }
  });

  it("prices a moratorium exception the same way structure() does", () => {
    // optimiseStack ignored activityClass, so a plantation term loan was priced on the standard
    // 6-month moratorium here and the 12-month exception in structure() — two different quarterly
    // instalments for one loan, rendered side by side on the calculator page.
    const projectCost = 500_000;
    const s = structure({
      marginCapital: 50_000,
      neededProjectCost: projectCost,
      activityClass: "plantation",
    });
    expect(s.moratoriumMonths).toBe(12);
    const viaStructure = amortise({
      principal: s.sanctionedLoan,
      annualRatePct: s.scheme.annualRatePct,
      tenureMonths: s.scheme.tenureMonths,
      moratoriumMonths: s.moratoriumMonths,
      restMonths: 3,
      convention: "serviced",
    });

    const viaStack = optimiseStack({
      projectCost,
      marginAvailable: 50_000,
      activityClass: "plantation",
    });
    const termLeg = viaStack.specRouted?.components.find((c) => c.rail.id === "nsfdc-term-loan");
    expect(termLeg).toBeDefined();
    expect(termLeg!.amount).toBeCloseTo(s.sanctionedLoan, 0);
    expect(termLeg!.quarterlyInstalment).toBeCloseTo(viaStructure.instalment, 0);
  });

  it("prefers the structure that asks less of the borrower when cost is tied", () => {
    const r = optimiseStack({ projectCost: 600_000, marginAvailable: 300_000 });
    const feasible = r.candidates.filter((c) => c.feasible);
    for (let i = 1; i < feasible.length; i++) {
      const a = feasible[i - 1];
      const b = feasible[i];
      if (a.netCostOfCapital === b.netCostOfCapital) {
        expect(a.ownContribution).toBeLessThanOrEqual(b.ownContribution);
      }
    }
  });
});

describe("solvency: a feasible verdict can still carry moratorium interest (audit M4)", () => {
  it("mushroom is FEASIBLE with a non-zero pre-income figure and no gap", () => {
    // The UI used to gate a red three-figure exposure panel on preIncomeObligation alone, so this
    // case rendered "Due before income" in rose under a green tick. The kernel is right; the
    // display was not. Locking the kernel shape in means the display fix stays meaningful.
    const p = plan({
      marginCapital: 20_000,
      activityId: "mushroom",
      useNeedBasedCosting: true,
      annualHouseholdIncome: 200_000,
    });
    expect(p.solvency.verdict).toBe("FEASIBLE");
    expect(p.solvency.preIncomeObligation).toBeGreaterThan(0);
    expect(p.solvency.gapMonths).toBeNull();
  });
});
