import { describe, expect, it } from "vitest";

import { SAMPLE_QUEUE, triage, triageQueue, type TriagedApplication } from "./triage";
import { assess, rankByOpportunity, summarise } from "./opportunity";

/** A row shaped by hand, so a single component can be varied in isolation. */
function row(over: Partial<TriagedApplication> = {}): TriagedApplication {
  const base = triage(SAMPLE_QUEUE[0]);
  return { ...base, ...over };
}

describe("opportunity components", () => {
  it("anchors coverage at the lending norm, not at the best file in the queue", () => {
    // The whole point of fixed anchors: a file's score must not move when an unrelated file is
    // added to the queue.
    const atFloor = assess(row({ dscr: 1.5 }));
    const atCeiling = assess(row({ dscr: 3.0 }));
    const above = assess(row({ dscr: 9.9 }));

    const c = (o: typeof atFloor) => o.components.find((x) => x.key === "coverage")!;
    expect(c(atFloor).normalised).toBe(0);
    expect(c(atCeiling).normalised).toBe(1);
    expect(c(above).normalised).toBe(1); // clamped, not extrapolated
  });

  it("scores an unknown component as null, never as zero", () => {
    const o = assess(row({ dscr: null, annualSurplus: null }));
    expect(o.components.find((c) => c.key === "coverage")!.normalised).toBeNull();
    expect(o.components.find((c) => c.key === "uplift")!.normalised).toBeNull();
  });

  it("renormalises the surviving weights so missing data does not depress the score", () => {
    // Same file twice: once with every signal, once with coverage stripped. If the missing
    // component were treated as zero, the second score would collapse. It must not: "we don't
    // know" has to rank above "we know it is bad".
    const complete = assess(row({ dscr: 3.0, annualSurplus: 90_000, gestationMonths: 0 }));
    const partial = assess(row({ dscr: null, annualSurplus: 90_000, gestationMonths: 0 }));

    expect(complete.signalsUsed).toBe(4);
    expect(partial.signalsUsed).toBe(3);
    expect(partial.score).toBeGreaterThan(50);
  });

  it("scores a file with no usable signal as zero but reports zero signals", () => {
    const o = assess(
      row({ dscr: null, annualSurplus: null, gestationMonths: null, sanctionedLoan: 0 }),
    );
    expect(o.signalsUsed).toBe(0);
    expect(o.score).toBe(0);
    expect(o.rationale).toContain("No surplus");
  });

  it("rewards a shorter gestation", () => {
    const fast = assess(row({ gestationMonths: 0 }));
    const slow = assess(row({ gestationMonths: 24 }));
    const s = (o: typeof fast) => o.components.find((x) => x.key === "speed")!.normalised;
    expect(s(fast)).toBe(1);
    expect(s(slow)).toBe(0);
  });

  it("rewards LOWER exposure before income", () => {
    const clean = assess(row({ preIncomeObligation: 0, sanctionedLoan: 100_000 }));
    const exposed = assess(row({ preIncomeObligation: 25_000, sanctionedLoan: 100_000 }));
    const e = (o: typeof clean) => o.components.find((x) => x.key === "exposure")!.normalised;
    expect(e(clean)).toBe(1);
    expect(e(exposed)).toBe(0);
  });

  it("measures uplift against the household's own income, not an absolute rupee bar", () => {
    // ₹50,000 of surplus means something different to a ₹60,000 household than to a ₹2,00,000 one,
    // and a public lender's mandate is the ratio.
    const poor = assess(
      row({
        annualSurplus: 50_000,
        application: { ...SAMPLE_QUEUE[0], annualHouseholdIncome: 50_000 },
      }),
    );
    const rich = assess(
      row({
        annualSurplus: 50_000,
        application: { ...SAMPLE_QUEUE[0], annualHouseholdIncome: 200_000 },
      }),
    );
    const u = (o: typeof poor) => o.components.find((x) => x.key === "uplift")!.normalised!;
    expect(u(poor)).toBeGreaterThan(u(rich));
  });

  it("keeps every score inside 0..100", () => {
    for (const r of triageQueue(SAMPLE_QUEUE).rows) {
      const o = assess(r);
      expect(o.score).toBeGreaterThanOrEqual(0);
      expect(o.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("ranking", () => {
  it("sorts blocked files last however well they score", () => {
    const ranked = rankByOpportunity(triageQueue(SAMPLE_QUEUE).rows);
    const firstBlocked = ranked.findIndex((o) => o.blocked);
    if (firstBlocked !== -1) {
      expect(ranked.slice(firstBlocked).every((o) => o.blocked)).toBe(true);
    }
  });

  it("ranks a fully assessed file above a partly assessed one that scores higher", () => {
    // The bug this pins, found by opening the page: a file with no surplus on record is scored on
    // speed and exposure alone, both of which routinely max out — so it rendered a perfect 100 and
    // outranked a file with a measured 5.08x debt-service coverage. Absence of bad news had become
    // good news. A two-component score is not on the same scale as a four-component one.
    const partialPerfect = row({
      status: "CLEAR",
      dscr: null,
      annualSurplus: null,
      gestationMonths: 0,
      preIncomeObligation: 0,
      sanctionedLoan: 100_000,
    });
    const fullyAssessedMiddling = row({
      status: "CLEAR",
      dscr: 2.0,
      annualSurplus: 60_000,
      gestationMonths: 6,
      preIncomeObligation: 8_000,
      sanctionedLoan: 100_000,
    });

    expect(assess(partialPerfect).score).toBe(100);
    expect(assess(partialPerfect).assessed).toBe("partial");
    expect(assess(fullyAssessedMiddling).assessed).toBe("full");
    expect(assess(fullyAssessedMiddling).score).toBeLessThan(100);

    const ranked = rankByOpportunity([partialPerfect, fullyAssessedMiddling]);
    expect(ranked[0].assessed).toBe("full");
  });

  it("still ranks by score WITHIN a completeness group", () => {
    const better = row({ status: "CLEAR", dscr: 3.0, annualSurplus: 120_000, gestationMonths: 0 });
    const worse = row({ status: "CLEAR", dscr: 1.6, annualSurplus: 10_000, gestationMonths: 18 });
    const ranked = rankByOpportunity([worse, better]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("sorts a signal-less file below a scored one", () => {
    const scored = row({ status: "CLEAR", dscr: 2.0 });
    const blind = row({
      status: "CLEAR",
      dscr: null,
      annualSurplus: null,
      gestationMonths: null,
      sanctionedLoan: 0,
    });
    const ranked = rankByOpportunity([blind, scored]);
    expect(ranked[0].signalsUsed).toBeGreaterThan(0);
  });

  it("returns every input row exactly once", () => {
    const rows = triageQueue(SAMPLE_QUEUE).rows;
    const ranked = rankByOpportunity(rows);
    expect(ranked).toHaveLength(rows.length);
    expect(new Set(ranked.map((o) => o.row.application.id)).size).toBe(rows.length);
  });
});

describe("portfolio summary", () => {
  const ranked = rankByOpportunity(triageQueue(SAMPLE_QUEUE).rows);
  const s = summarise(ranked);

  it("counts fundable and blocked to the whole queue", () => {
    expect(s.fundable + s.blocked).toBe(ranked.length);
  });

  it("counts deployable capital across fundable files only", () => {
    const byHand = ranked
      .filter((o) => !o.blocked)
      .reduce((sum, o) => sum + o.row.sanctionedLoan, 0);
    expect(s.deployable).toBe(Math.round(byHand));
  });

  it("reports how many files the surplus total actually covers", () => {
    // A headline surplus computed over an unknown denominator is the exact shape of an
    // overstated impact number. The count travels with the figure.
    expect(s.surplusKnownFor).toBeLessThanOrEqual(s.fundable);
  });

  it("returns a null median rather than 0 when nothing is scorable", () => {
    expect(summarise([]).medianScore).toBeNull();
    expect(summarise([]).medianOver).toBe(0);
  });

  it("computes the median over fully assessed files only", () => {
    // Including partial scores put the portfolio median at 100, driven entirely by files nothing
    // was known about.
    const full = summarise(ranked).medianOver;
    expect(full).toBe(ranked.filter((o) => !o.blocked && o.assessed === "full").length);
  });
});
