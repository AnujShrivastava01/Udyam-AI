import { describe, expect, it } from "vitest";

import { RURAL_MPCE, TOTAL_ESTABLISHMENT_DENSITY } from "./benchmarks";
import { GAZETTEER_COVERAGE, GAZETTEER_DISTRICTS, VILLAGES, blocksInDistrict } from "./villages";

/**
 * Invariants for the gazetteer itself.
 *
 * Distinct from market.test.ts, which tests the MODEL. These test the DATA — the class of mistake
 * that arrives when somebody adds a village by hand and gets one field subtly wrong. Every one of
 * these fired at least once while the Delhi and Telangana rows were being written.
 */

describe("identity", () => {
  it("gives every village a unique id", () => {
    const ids = VILLAGES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places every village inside India's bounding box", () => {
    // A transposed lat/lng lands in the Indian Ocean and would send the Places search there too,
    // silently returning somebody else's shops.
    for (const v of VILLAGES) {
      expect(v.lat, v.id).toBeGreaterThan(6);
      expect(v.lat, v.id).toBeLessThan(37);
      expect(v.lng, v.id).toBeGreaterThan(68);
      expect(v.lng, v.id).toBeLessThan(98);
    }
  });

  it("marks every row as seeded, because every row is", () => {
    expect(VILLAGES.every((v) => v.seed)).toBe(true);
    expect(GAZETTEER_COVERAGE.allSeeded).toBe(true);
  });
});

describe("block denominators", () => {
  it("are identical for every village sharing a block", () => {
    // The bug this exists for: two villages in one janpad panchayat carrying different block
    // totals makes the saturation index depend on WHICH village you opened, which is not a
    // property any market model may have.
    const byBlock = new Map<string, { est: number; pop: number; id: string }[]>();
    for (const v of VILLAGES) {
      const key = `${v.state}/${v.district}/${v.block}`;
      const list = byBlock.get(key) ?? [];
      list.push({ est: v.blockEstablishments, pop: v.blockPopulation, id: v.id });
      byBlock.set(key, list);
    }

    for (const [key, rows] of byBlock) {
      const first = rows[0];
      for (const r of rows) {
        expect(r.est, `${key} via ${r.id}`).toBe(first.est);
        expect(r.pop, `${key} via ${r.id}`).toBe(first.pop);
      }
    }
  });

  it("keeps every block's establishment density inside the range the model can score", () => {
    // saturation() divides by TOTAL_ESTABLISHMENT_DENSITY, and market.test.ts asserts every
    // village scores between 0.3 and 2.5. Checking the density directly says WHICH row is wrong
    // when that assertion fails.
    for (const v of VILLAGES) {
      const per1k = (v.blockEstablishments / v.blockPopulation) * 1000;
      expect(per1k / TOTAL_ESTABLISHMENT_DENSITY, v.id).toBeGreaterThan(0.3);
      expect(per1k / TOTAL_ESTABLISHMENT_DENSITY, v.id).toBeLessThan(2.5);
    }
  });
});

describe("population and catchment", () => {
  it("never puts more people in the village than in its own 5 km ring", () => {
    for (const v of VILLAGES) {
      expect(v.catchment5km, v.id).toBeGreaterThanOrEqual(v.population);
    }
  });

  it("never shrinks going from 5 km to 10 km", () => {
    for (const v of VILLAGES) {
      expect(v.catchment10km, v.id).toBeGreaterThanOrEqual(v.catchment5km);
    }
  });

  it("keeps a village smaller than the block that contains it", () => {
    for (const v of VILLAGES) {
      expect(v.population, v.id).toBeLessThan(v.blockPopulation);
    }
  });
});

describe("census amenity fields", () => {
  it("keeps every percentage a percentage", () => {
    for (const v of VILLAGES) {
      expect(v.scSharePct, v.id).toBeGreaterThan(0);
      expect(v.scSharePct, v.id).toBeLessThan(100);
      expect(v.literacyPct, v.id).toBeGreaterThan(0);
      expect(v.literacyPct, v.id).toBeLessThanOrEqual(100);
    }
  });

  it("keeps power supply inside a day", () => {
    for (const v of VILLAGES) {
      expect(v.powerHoursPerDay, v.id).toBeGreaterThan(0);
      expect(v.powerHoursPerDay, v.id).toBeLessThanOrEqual(24);
    }
  });

  it("never places the mandi or the bank at a negative distance", () => {
    for (const v of VILLAGES) {
      expect(v.distanceToMandiKm, v.id).toBeGreaterThanOrEqual(0);
      expect(v.distanceToBankKm, v.id).toBeGreaterThanOrEqual(0);
      expect(v.distanceToTownKm, v.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("state coverage", () => {
  it("has a rural MPCE figure for every state it holds a village in", () => {
    // The silent failure this pins: `addressableDemand` scales by state MPCE and falls back to
    // 1.0 for an unknown state — so a missing row does not throw, it just prices that state's
    // market at the national average. For Delhi that understates it by roughly a third.
    for (const state of new Set(VILLAGES.map((v) => v.state))) {
      expect(RURAL_MPCE.byState[state], `no rural MPCE for ${state}`).toBeGreaterThan(0);
    }
  });

  it("derives the district picker from the villages it actually holds", () => {
    // Offering a district with no data behind it is a promise the engine cannot keep.
    for (const { district } of GAZETTEER_DISTRICTS) {
      expect(blocksInDistrict(district).length, district).toBeGreaterThan(0);
    }
    expect(GAZETTEER_DISTRICTS.length).toBe(new Set(VILLAGES.map((v) => v.district)).size);
  });

  it("covers more than one state, so the model is exercised across real variation", () => {
    expect(GAZETTEER_COVERAGE.states.length).toBeGreaterThan(1);
  });
});

describe("the point of adding metro-periphery rows", () => {
  it("scores a dense Delhi block as more crowded than a sparse Sheopur one", () => {
    const density = (id: string) => {
      const v = VILLAGES.find((x) => x.id === id)!;
      return (v.blockEstablishments / v.blockPopulation) * 1000;
    };
    // If these ever converge, the gazetteer has stopped representing different market conditions
    // and the saturation index has stopped meaning anything.
    expect(density("najafgarh")).toBeGreaterThan(density("karahiya") * 2);
  });
});
