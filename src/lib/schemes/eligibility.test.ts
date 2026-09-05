import { describe, expect, it } from "vitest";

import { SCHEMES_CATALOGUE } from "./catalogue";
import { matchSchemes, summarise } from "./eligibility";

/**
 * The behaviour worth pinning is the refusal to guess. An applicant who has told us nothing must
 * come back as "we cannot say", never as "not eligible" — the second is a statement about them
 * that nothing in the input supports.
 */

describe("an applicant who has answered nothing", () => {
  const matches = matchSchemes({});

  it("is never ruled out of a scheme with unanswered criteria", () => {
    for (const m of matches) {
      if (m.verdict === "does-not-meet") {
        // Only a genuine `fail` may rule a scheme out, never an `unknown`.
        expect(m.failed.length).toBeGreaterThan(0);
      }
    }
  });

  it("still surfaces the schemes that ask nothing of anybody", () => {
    const open = matches.filter((m) => m.verdict === "meets").map((m) => m.scheme.id);
    expect(open).toContain("udyam");
    expect(open).toContain("cgtmse");
  });

  it("reports the questions that would settle the most schemes", () => {
    const summary = summarise(matches);
    expect(summary.openQuestions.length).toBeGreaterThan(0);
    expect(summary.doesNotMeet).toBe(0);
  });
});

describe("a Scheduled Caste applicant within the income ceiling", () => {
  const matches = matchSchemes({ socialCategory: ["sc"], annualFamilyIncome: 120_000 });

  it("meets NSFDC's published criteria", () => {
    const nsfdc = matches.find((m) => m.scheme.id === "nsfdc")!;
    expect(nsfdc.verdict).toBe("meets");
  });

  it("is ruled out of the OBC corporation, with the reason attached", () => {
    const nbcfdc = matches.find((m) => m.scheme.id === "nbcfdc")!;
    expect(nbcfdc.verdict).toBe("does-not-meet");
    expect(nbcfdc.failed.join(" ")).toMatch(/Other Backward Class/);
  });

  it("qualifies for Stand-Up India on category alone, before gender is known", () => {
    const standup = matches.find((m) => m.scheme.id === "standup")!;
    expect(standup.failed).toHaveLength(0);
  });
});

describe("income ceilings are applied, not ignored", () => {
  it("rules out NSFDC above the ceiling", () => {
    const m = matchSchemes({ socialCategory: ["sc"], annualFamilyIncome: 900_000 });
    const nsfdc = m.find((x) => x.scheme.id === "nsfdc")!;
    expect(nsfdc.verdict).toBe("does-not-meet");
  });
});

describe("a woman entrepreneur", () => {
  it("qualifies for Stand-Up India regardless of category", () => {
    const m = matchSchemes({
      gender: "female",
      socialCategory: ["general"],
      age: 30,
      enterpriseStage: "new",
    });
    expect(m.find((x) => x.scheme.id === "standup")!.verdict).toBe("meets");
  });
});

describe("catalogue integrity", () => {
  it("every scheme has a link and a provenance marked for re-verification", () => {
    for (const s of SCHEMES_CATALOGUE) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.provenance.needsVerification).toBe(true);
      expect(s.criteria.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate ids", () => {
    const ids = SCHEMES_CATALOGUE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
