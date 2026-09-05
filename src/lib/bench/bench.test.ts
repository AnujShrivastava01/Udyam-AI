import { describe, expect, it } from "vitest";

import { generateCases, mulberry32, REGIONS } from "./cases";
import { groundTruth, kernelSolver, specLiteralSolver, SOLVERS } from "./solvers";
import { FIELDS, runBenchmark, scoreSolver, TOLERANCE } from "./score";

describe("case generation", () => {
  it("is reproducible from a seed", () => {
    const a = generateCases({ count: 50, seed: 26091 });
    const b = generateCases({ count: 50, seed: 26091 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces different cases for a different seed", () => {
    const a = generateCases({ count: 50, seed: 1 });
    const b = generateCases({ count: 50, seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("generates exactly the requested count", () => {
    expect(generateCases({ count: 500 }).length).toBe(500);
    expect(generateCases({ count: 37 }).length).toBe(37);
  });

  it("covers every hard region", () => {
    const cases = generateCases({ count: 500 });
    const seen = new Set(cases.map((c) => c.region));
    for (const r of REGIONS) expect(seen.has(r), `region ${r} not sampled`).toBe(true);
  });

  it("puts dead-zone cases strictly inside the dead zone", () => {
    const cases = generateCases({ count: 500 }).filter((c) => c.region === "dead-zone");
    expect(cases.length).toBeGreaterThan(20);
    for (const c of cases) {
      expect(c.projectCost).toBeGreaterThan(138_888);
      expect(c.projectCost).toBeLessThanOrEqual(140_000);
    }
  });

  it("puts tier-boundary cases on both sides of ₹1.40 lakh", () => {
    const cases = generateCases({ count: 500 }).filter((c) => c.region === "tier-boundary");
    expect(cases.some((c) => c.projectCost <= 140_000)).toBe(true);
    expect(cases.some((c) => c.projectCost > 140_000)).toBe(true);
  });

  it("lets a 10% margin round-trip exactly — no rounding artifact", () => {
    // Regression guard for a real flaw this benchmark had. When project costs were arbitrary,
    // `margin / 0.1` did not reproduce the project cost, so any solver that inverts the margin —
    // which is precisely what the specification instructs — lost marks for OUR rounding rather
    // than for its own errors. That understated its loan accuracy by 50 points.
    for (const c of generateCases({ count: 500 })) {
      expect(c.projectCost % 10).toBe(0);
      expect(Math.abs(c.marginCapital / 0.1 - c.projectCost)).toBeLessThan(0.001);
    }
  });

  it("mulberry32 stays inside [0,1)", () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("ground truth", () => {
  it("never emits a loan above the scheme cap", () => {
    for (const c of generateCases({ count: 500 })) {
      const t = groundTruth(c);
      const cap = t.scheme === "nsfdc-micro-finance" ? 125_000 : 4_500_000;
      expect(t.sanctionedLoan).toBeLessThanOrEqual(cap + TOLERANCE);
    }
  });

  it("always produces a positive instalment and non-negative interest", () => {
    for (const c of generateCases({ count: 200 })) {
      const t = groundTruth(c);
      expect(t.quarterlyInstalment).toBeGreaterThan(0);
      expect(t.totalInterest).toBeGreaterThanOrEqual(0);
      expect(t.moratoriumInterest).toBeGreaterThanOrEqual(0);
    }
  });

  it("reports zero moratorium interest on every capitalised case", () => {
    const capitalised = generateCases({ count: 500 }).filter((c) => c.convention === "capitalised");
    expect(capitalised.length).toBeGreaterThan(50);
    for (const c of capitalised) expect(groundTruth(c).moratoriumInterest).toBe(0);
  });
});

describe("scoring", () => {
  it("the kernel scores 100% — it is the label source", () => {
    const report = scoreSolver(kernelSolver, generateCases({ count: 500 }));
    expect(report.exactPct).toBe(100);
    for (const f of FIELDS) expect(report.perFieldPct[f]).toBe(100);
  });

  it("the specification implemented literally scores far below the kernel", () => {
    const report = scoreSolver(specLiteralSolver, generateCases({ count: 500 }));
    // This is the finding, not a target: building exactly what the PS says produces answers that
    // disagree with the scheme's own arithmetic on most cases.
    expect(report.exactPct).toBeLessThan(20);
  });

  it("the spec-literal solver fails hardest exactly where the caps bind", () => {
    const report = scoreSolver(specLiteralSolver, generateCases({ count: 500 }));
    expect(report.perRegion["cap-binding"].pct).toBe(0);
    expect(report.perRegion["dead-zone"].pct).toBe(0);
  });

  it("scores every solver without throwing", () => {
    const run = runBenchmark({ count: 200 });
    expect(run.reports.length).toBe(SOLVERS.length);
    for (const r of run.reports) {
      expect(r.total).toBe(200);
      expect(r.exactPct).toBeGreaterThanOrEqual(0);
      expect(r.exactPct).toBeLessThanOrEqual(100);
    }
  });

  it("a solver that is right except on convention loses exactly the capitalised cases", () => {
    const run = runBenchmark({ count: 500 });
    const blind = run.reports.find((r) => r.solverId === "convention-blind")!;
    const cases = generateCases({ count: 500 });
    const capitalisedShare =
      cases.filter((c) => c.convention === "capitalised").length / cases.length;
    // It should score close to (1 − capitalised share): right everywhere else.
    expect(blind.exactPct).toBeGreaterThan((1 - capitalisedShare) * 100 - 5);
    expect(blind.exactPct).toBeLessThan(100);
  });
});
