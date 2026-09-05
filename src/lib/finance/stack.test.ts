import { describe, expect, it } from "vitest";

import { EXCLUSIONS, RAILS, optimiseStack } from "./stack";

describe("rail catalogue", () => {
  it("marks which rails are verified and which are not", () => {
    const verified = RAILS.filter((r) => r.verified).map((r) => r.id);
    expect(verified).toContain("nsfdc-micro-finance");
    expect(verified).toContain("nsfdc-term-loan");
    // Everything else is indicative and must say so.
    for (const r of RAILS.filter((x) => !x.verified)) {
      expect(r.provenance.needsVerification).toBe(true);
    }
  });

  it("bars double-subsidy combinations", () => {
    const pairs = EXCLUSIONS.map(([a, b]) => `${a}+${b}`);
    expect(pairs.some((p) => p.includes("pmegp") && p.includes("nsfdc-term-loan"))).toBe(true);
    expect(pairs.some((p) => p.includes("nsfdc-micro-finance") && p.includes("nsfdc-term-loan"))).toBe(
      true,
    );
  });
});

describe("stack balancing", () => {
  it("every candidate balances against the project cost", () => {
    const r = optimiseStack({ projectCost: 230_000, marginAvailable: 25_000 });
    for (const c of r.candidates) {
      expect(Math.abs(c.balanceCheck)).toBeLessThanOrEqual(1);
      expect(c.subsidy + c.ownContribution + c.totalBorrowed).toBeCloseTo(c.projectCost, 0);
    }
  });

  it("never proposes a stack the borrower cannot fund", () => {
    const r = optimiseStack({ projectCost: 500_000, marginAvailable: 20_000 });
    if (r.best) expect(r.best.ownContribution).toBeLessThanOrEqual(20_000);
  });

  it("never draws more from a rail than its ceiling", () => {
    const r = optimiseStack({ projectCost: 4_000_000, marginAvailable: 1_000_000 });
    for (const c of r.candidates) {
      for (const comp of c.components) {
        expect(comp.amount).toBeLessThanOrEqual(comp.rail.maxAmount + 1);
      }
    }
  });

  it("never combines two excluded rails", () => {
    const r = optimiseStack({ projectCost: 800_000, marginAvailable: 300_000 });
    for (const c of r.candidates) {
      const ids = c.components.map((x) => x.rail.id);
      for (const [a, b] of EXCLUSIONS) {
        expect(ids.includes(a) && ids.includes(b), `${a}+${b} must not co-occur`).toBe(false);
      }
    }
  });
});

describe("optimisation", () => {
  it("ranks candidates by net cost of capital, cheapest first", () => {
    const r = optimiseStack({ projectCost: 600_000, marginAvailable: 200_000 });
    const feasible = r.candidates.filter((c) => c.feasible);
    for (let i = 1; i < feasible.length; i++) {
      expect(feasible[i].netCostOfCapital).toBeGreaterThanOrEqual(
        feasible[i - 1].netCostOfCapital,
      );
    }
  });

  it("treats a grant as worth more than an interest saving of the same size", () => {
    // PMEGP carries a higher rate than NSFDC but a 35% grant. Over a large project the grant
    // should win on net cost, which is the whole reason single-scheme routing is leaving money
    // on the table.
    const r = optimiseStack({ projectCost: 1_000_000, marginAvailable: 400_000 });
    expect(r.best).not.toBeNull();
    expect(r.best!.subsidy).toBeGreaterThan(0);
    expect(r.best!.netCostOfCapital).toBeLessThan(r.specRouted!.netCostOfCapital);
  });

  it("reports a saving against the specification's single-scheme route", () => {
    const r = optimiseStack({ projectCost: 1_000_000, marginAvailable: 400_000 });
    expect(r.saving).not.toBeNull();
    expect(r.saving!).toBeGreaterThan(0);
  });

  it("surfaces every unverified rail it relied on", () => {
    const r = optimiseStack({ projectCost: 1_000_000, marginAvailable: 400_000 });
    if (r.best?.components.some((c) => !c.rail.verified)) {
      expect(r.unverifiedRailsUsed.length).toBeGreaterThan(0);
    }
  });

  it("respects an ineligibility list", () => {
    const r = optimiseStack({
      projectCost: 1_000_000,
      marginAvailable: 400_000,
      ineligible: ["pmegp"],
    });
    for (const c of r.candidates) {
      expect(c.components.every((x) => x.rail.id !== "pmegp")).toBe(true);
    }
  });

  it("returns no best stack when nothing is affordable, rather than a cheapest impossible one", () => {
    const r = optimiseStack({ projectCost: 3_000_000, marginAvailable: 1_000 });
    expect(r.best).toBeNull();
    expect(r.candidates.every((c) => !c.feasible)).toBe(true);
    expect(r.candidates[0]?.rejectedBecause).toBeTruthy();
  });

  it("prices a small project through the micro-finance rail", () => {
    const r = optimiseStack({ projectCost: 100_000, marginAvailable: 10_000 });
    expect(r.specRouted!.components[0].rail.id).toBe("nsfdc-micro-finance");
    expect(r.specRouted!.feasible).toBe(true);
  });
});

describe("rail project-cost bands (regression)", () => {
  it("always produces a spec route with at least one component", () => {
    // The term-loan rail's minAmount was set to 140_001 — the tier's PROJECT-COST boundary rather
    // than a draw minimum — so buildStack skipped it whenever 90% of project cost fell below that.
    // A ₹1.5 lakh project produced a zero-component stack, and the UI rendered "your money
    // ₹1,50,000 / net cost ₹0" while claiming single-scheme routing was cheapest.
    for (let pc = 20_000; pc <= 3_000_000; pc += 10_000) {
      const r = optimiseStack({ projectCost: pc, marginAvailable: pc });
      expect(r.specRouted, `no spec route at ₹${pc}`).not.toBeNull();
      expect(r.specRouted!.components.length, `zero-component spec route at ₹${pc}`).toBeGreaterThan(0);
    }
  });

  it("covers the exact band that used to fail", () => {
    for (const pc of [140_010, 145_000, 150_000, 152_000, 155_550]) {
      const r = optimiseStack({ projectCost: pc, marginAvailable: pc });
      expect(r.specRouted!.components[0].rail.id).toBe("nsfdc-term-loan");
      expect(r.specRouted!.ownContribution).toBeLessThan(pc);
    }
  });

  it("never lets a rail fund a project outside its own tier band", () => {
    const micro = optimiseStack({ projectCost: 2_000_000, marginAvailable: 2_000_000 });
    for (const c of micro.candidates) {
      expect(c.components.every((x) => x.rail.id !== "nsfdc-micro-finance")).toBe(true);
    }
  });
});
