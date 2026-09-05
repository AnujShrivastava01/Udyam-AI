import { describe, expect, it } from "vitest";

import type { NearbyPlace } from "./places";
import { analyseSpread, bearingDeg, crowdingFrom, sectorOf } from "./spread";

const CENTRE = { lat: 28.6092, lng: 76.9798 }; // Najafgarh

/** A place at an offset from the centre, with the distance the caller states. */
const at = (dLat: number, dLng: number, km: number, name = "shop"): NearbyPlace => ({
  id: `${dLat},${dLng}`,
  name,
  address: null,
  lat: CENTRE.lat + dLat,
  lng: CENTRE.lng + dLng,
  distanceKm: km,
  rating: null,
  ratingCount: null,
  kind: null,
});

describe("bearing", () => {
  it("reads due north as 0 and due east as 90", () => {
    expect(bearingDeg(CENTRE, { lat: CENTRE.lat + 0.1, lng: CENTRE.lng })).toBeCloseTo(0, 0);
    expect(bearingDeg(CENTRE, { lat: CENTRE.lat, lng: CENTRE.lng + 0.1 })).toBeCloseTo(90, 0);
    expect(bearingDeg(CENTRE, { lat: CENTRE.lat - 0.1, lng: CENTRE.lng })).toBeCloseTo(180, 0);
    expect(bearingDeg(CENTRE, { lat: CENTRE.lat, lng: CENTRE.lng - 0.1 })).toBeCloseTo(270, 0);
  });

  it("always returns 0..360, never a negative", () => {
    for (const d of [-0.1, 0.1]) {
      for (const e of [-0.1, 0.1]) {
        const b = bearingDeg(CENTRE, { lat: CENTRE.lat + d, lng: CENTRE.lng + e });
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(360);
      }
    }
  });
});

describe("sectors", () => {
  it("centres north on 0 and wraps past 337.5", () => {
    // The modulo case: 350 degrees is north, not off the end of the array.
    expect(sectorOf(0)).toBe("N");
    expect(sectorOf(350)).toBe("N");
    expect(sectorOf(10)).toBe("N");
  });

  it("puts each cardinal and intercardinal where it belongs", () => {
    expect(sectorOf(45)).toBe("NE");
    expect(sectorOf(90)).toBe("E");
    expect(sectorOf(135)).toBe("SE");
    expect(sectorOf(180)).toBe("S");
    expect(sectorOf(225)).toBe("SW");
    expect(sectorOf(270)).toBe("W");
    expect(sectorOf(315)).toBe("NW");
  });
});

describe("crowding thresholds", () => {
  it("reads the nearest distance the way a shopkeeper would", () => {
    expect(crowdingFrom(0.1)).toBe("on-top");
    expect(crowdingFrom(0.6)).toBe("close");
    expect(crowdingFrom(2)).toBe("spaced");
    expect(crowdingFrom(8)).toBe("clear");
  });

  it("says unknown rather than clear when nothing was mapped", () => {
    // The distinction the whole feature rests on: "nothing on the map" is not "nothing there".
    expect(crowdingFrom(null)).toBe("unknown");
  });
});

describe("spread", () => {
  it("finds the nearest competitor, which is the number that decides a site", () => {
    const s = analyseSpread(CENTRE, [at(0.05, 0, 5.5), at(0.002, 0, 0.2), at(0, 0.03, 2.9)]);
    expect(s.nearestKm).toBe(0.2);
    expect(s.crowding).toBe("on-top");
  });

  it("counts the close rings separately from the total", () => {
    const s = analyseSpread(CENTRE, [at(0.001, 0, 0.4), at(0.01, 0, 1.4), at(0.05, 0, 5.2)]);
    expect(s.total).toBe(3);
    expect(s.within1km).toBe(1);
    expect(s.within2km).toBe(2);
  });

  it("uses a median, so one far outlier does not move the typical distance", () => {
    const s = analyseSpread(CENTRE, [at(0.001, 0, 1), at(0.002, 0, 2), at(0.4, 0, 40)]);
    expect(s.medianKm).toBe(2);
  });

  it("groups a cluster on one road into one sector", () => {
    // Three shops due east: the point of the sector view is that this reads as a cluster, not as
    // "three competitors somewhere in the ring".
    const s = analyseSpread(CENTRE, [at(0, 0.01, 1), at(0, 0.02, 2), at(0, 0.03, 3)]);
    expect(s.bySector.find((x) => x.sector === "E")!.count).toBe(3);
    expect(s.mostCrowded).toBe("E");
    expect(s.fewestMapped).not.toContain("E");
  });

  it("reports the nearest place within each sector, not just the count", () => {
    const s = analyseSpread(CENTRE, [at(0, 0.02, 2), at(0, 0.05, 5)]);
    expect(s.bySector.find((x) => x.sector === "E")!.nearestKm).toBe(2);
    expect(s.bySector.find((x) => x.sector === "W")!.nearestKm).toBeNull();
  });

  it("returns every empty sector, because ties are real", () => {
    const s = analyseSpread(CENTRE, [at(0, 0.01, 1)]);
    expect(s.fewestMapped).toHaveLength(7);
    expect(s.fewestMapped).not.toContain("E");
  });

  it("names no crowded direction when the spread is level", () => {
    // With nothing mapped there is no pattern, and inventing one out of noise is exactly what a
    // site-suggestion feature must not do.
    const s = analyseSpread(CENTRE, []);
    expect(s.mostCrowded).toBeNull();
    expect(s.crowding).toBe("unknown");
    expect(s.nearestKm).toBeNull();
    expect(s.medianKm).toBeNull();
    expect(s.fewestMapped).toHaveLength(8);
  });

  it("always accounts for every place exactly once across the eight sectors", () => {
    const places = [at(0.01, 0, 1), at(0, 0.01, 1), at(-0.01, 0, 1), at(0, -0.01, 1), at(0.01, 0.01, 1.4)];
    const s = analyseSpread(CENTRE, places);
    expect(s.bySector.reduce((n, x) => n + x.count, 0)).toBe(places.length);
  });
});
