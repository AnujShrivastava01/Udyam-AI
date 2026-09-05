import { describe, expect, it } from "vitest";

import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { CATEGORY_SPEND, RURAL_MPCE, categoryForActivityClass } from "./benchmarks";
import {
  DEFAULT_SECTOR_SHARE,
  RURAL_OAE_GVA_PER_YEAR,
  addressableDemand,
  buildFeasibilityReport,
  catchment,
  saturation,
} from "./feasibility";
import { VILLAGES, VILLAGE_BY_ID } from "./villages";

const ghatigaon = VILLAGE_BY_ID.get("ghatigaon")!;
const dabra = VILLAGE_BY_ID.get("dabra")!;
const goat = ACTIVITY_BY_ID.get("goat-20-1")!;

describe("benchmarks", () => {
  it("maps activity classes onto HCES item groups", () => {
    expect(categoryForActivityClass("dairy")?.id).toBe("milk");
    expect(categoryForActivityClass("poultry")?.id).toBe("egg-fish-meat");
    expect(categoryForActivityClass("nonsense")).toBeNull();
  });

  it("keeps every spend figure positive and attributed", () => {
    for (const c of CATEGORY_SPEND) {
      expect(c.perCapitaMonthly).toBeGreaterThan(0);
      expect(c.serves.length).toBeGreaterThan(0);
    }
    expect(RURAL_MPCE.allIndia).toBe(4_122);
    expect(RURAL_MPCE.byState["Madhya Pradesh"]).toBe(3_441);
  });
});

describe("catchment", () => {
  it("returns the ring population with an explicit uncertainty band", () => {
    const c = catchment(ghatigaon, 10);
    expect(c.value).toBe(ghatigaon.catchment10km);
    expect(c.band).toBeGreaterThan(0);
    expect(c.provenance).toBeDefined();
  });

  it("labels seeded villages as seeded, never as measured", () => {
    expect(catchment(ghatigaon, 5).confidence).toBe("seeded");
  });

  it("a 10 km ring always holds at least as many people as a 5 km ring", () => {
    for (const v of VILLAGES) {
      expect(catchment(v, 10).value).toBeGreaterThanOrEqual(catchment(v, 5).value);
    }
  });
});

describe("addressable demand", () => {
  it("is catchment × per-capita spend × 12, scaled to the state", () => {
    const { figure, perCapitaMonthly } = addressableDemand(ghatigaon, "dairy");
    // MP scaling: 348 × (3441 / 4122)
    expect(perCapitaMonthly).toBeCloseTo(348 * (3441 / 4122), 1);
    expect(figure.value).toBeCloseTo(ghatigaon.catchment10km * perCapitaMonthly! * 12, 0);
    expect(figure.confidence).toBe("seeded");
  });

  it("declines rather than guessing when no spend category maps", () => {
    const { figure } = addressableDemand(ghatigaon, "construction");
    expect(figure.confidence).toBe("unavailable");
    expect(figure.value).toBe(0);
  });
});

describe("saturation", () => {
  it("compares observed against what the population would support nationally", () => {
    const s = saturation(ghatigaon, "livestock");
    expect(s.expectedSector).toBe(Math.round((ghatigaon.blockPopulation / 1000) * 12.63));
    expect(s.observedSector).toBe(Math.round(ghatigaon.blockEstablishments * DEFAULT_SECTOR_SHARE));
    expect(s.index).toBeCloseTo(s.observedSector / s.expectedSector, 2);
  });

  it("produces an independent demand-side estimate", () => {
    const s = saturation(ghatigaon, "dairy");
    expect(s.supportableFromDemand).not.toBeNull();
    expect(s.supportableFromDemand!).toBeGreaterThan(0);
    // and it is derived from the published GVA-per-enterprise figure
    expect(RURAL_OAE_GVA_PER_YEAR).toBe(71_217);
  });

  it("surfaces the sector-share assumption rather than hiding it", () => {
    expect(saturation(ghatigaon, "retail").sectorShareAssumed).toBe(DEFAULT_SECTOR_SHARE);
  });

  it("returns unknown for a class with no density benchmark", () => {
    const s = saturation(ghatigaon, "construction");
    expect(s.label).toBe("unknown");
  });

  it("labels a denser block as more crowded than a sparser one, all else equal", () => {
    const a = saturation(ghatigaon, "retail");
    const b = saturation(dabra, "retail");
    // Dabra has proportionally more establishments per head than Ghatigaon.
    expect(b.index).toBeGreaterThan(a.index);
  });
});

describe("feasibility report", () => {
  it("discharges every Module-1 requirement it claims", () => {
    const r = buildFeasibilityReport(ghatigaon, goat);
    const covered = new Set(r.sections.map((s) => s.requirement));
    // Requirements 1 (reach), 2 (opportunity), 4 (threats), 5 (competition), 6 (pricing)
    for (const req of [1, 2, 4, 5, 6]) expect(covered.has(req)).toBe(true);
  });

  it("never emits a figure without a confidence label", () => {
    const r = buildFeasibilityReport(ghatigaon, goat);
    for (const s of r.sections) {
      for (const f of s.figures) {
        expect(["measured", "estimated", "seeded", "unavailable"]).toContain(f.confidence);
      }
    }
  });

  it("warns that seeded data is seeded", () => {
    const r = buildFeasibilityReport(ghatigaon, goat);
    expect(r.dataQuality.seeded).toBe(true);
    expect(r.dataQuality.warnings.join(" ")).toMatch(/seeded placeholders/i);
  });

  it("always discloses the sector-share modelling assumption", () => {
    const r = buildFeasibilityReport(ghatigaon, goat);
    expect(r.dataQuality.warnings.join(" ")).toMatch(/assumption/i);
  });

  it("penalises a long gestation in the score", () => {
    const cows = ACTIVITY_BY_ID.get("milch-cows-2")!;
    const withGestation = buildFeasibilityReport(ghatigaon, goat).score!;
    const withoutGestation = buildFeasibilityReport(ghatigaon, cows).score!;
    expect(withoutGestation).toBeGreaterThan(withGestation);
  });

  it("penalises distance to market", () => {
    const near = buildFeasibilityReport(dabra, goat).score!; // mandi 1 km
    const far = buildFeasibilityReport(VILLAGE_BY_ID.get("karahiya")!, goat).score!; // mandi 24 km
    expect(near).toBeGreaterThan(far);
  });

  it("keeps the score inside its stated bounds", () => {
    for (const v of VILLAGES) {
      const s = buildFeasibilityReport(v, goat).score;
      if (s != null) {
        expect(s).toBeGreaterThanOrEqual(5);
        expect(s).toBeLessThanOrEqual(95);
      }
    }
  });
});
