/**
 * Where the competition actually sits, and where it does not.
 *
 * A count of nearby shops answers "how many". It does not answer the question a person about to
 * sink their margin money into a kirana shop is actually asking, which is "how close is the
 * nearest one, and which way should I walk to get away from them".
 *
 * This turns a list of mapped places into three things a site decision can use:
 *
 *   - the distance to the NEAREST mapped competitor, which is the crowding number that matters
 *     locally in a way a block-level density never is;
 *   - how they are spread around the compass, so a cluster on one road is visible as a cluster;
 *   - the sector with the fewest mapped competitors.
 *
 * ── The claim this deliberately does NOT make ────────────────────────────────────────────────
 * An empty sector is not a good site. It may be a lake, a cantonment, a ravine, or simply a
 * direction nobody has bothered to add to the map. Every field below says "mapped", the emptiest
 * sector is called `fewestMapped` rather than `recommended`, and the UI that renders it must carry
 * the same caveat as the count it derives from. This is a prompt to go and look, not a site plan.
 */

import type { NearbyPlace } from "./places";

export type Sector = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export const SECTORS: Sector[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export const SECTOR_NAME: Record<Sector, string> = {
  N: "north",
  NE: "north-east",
  E: "east",
  SE: "south-east",
  S: "south",
  SW: "south-west",
  W: "west",
  NW: "north-west",
};

export interface Point {
  lat: number;
  lng: number;
}

/** Initial bearing from one point to another, in degrees clockwise from north (0–360). */
export function bearingDeg(from: Point, to: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Which 45° sector a bearing falls in.
 *
 * North is centred on 0°, so it spans 337.5°–22.5° and wraps — the modulo is what makes 350°
 * come out as N rather than falling off the end of the array.
 */
export function sectorOf(bearing: number): Sector {
  return SECTORS[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

export interface SectorSpread {
  sector: Sector;
  name: string;
  count: number;
  /** Distance to the closest mapped place in this sector, or null when there is none. */
  nearestKm: number | null;
}

export type Crowding = "on-top" | "close" | "spaced" | "clear" | "unknown";

export interface Spread {
  total: number;
  /** Distance to the nearest mapped competitor of any kind. Null when none were mapped. */
  nearestKm: number | null;
  within1km: number;
  within2km: number;
  /** Median distance, which resists one far outlier the way a mean does not. */
  medianKm: number | null;
  bySector: SectorSpread[];
  /** The sectors with the fewest mapped competitors. Plural: ties are common and real. */
  fewestMapped: Sector[];
  /** The single most crowded sector, or null when everything is level. */
  mostCrowded: Sector | null;
  crowding: Crowding;
}

/**
 * How close is too close.
 *
 * These are trade-agnostic walking distances, not a published standard, and they are stated here
 * rather than buried in a component so the thresholds can be argued with:
 *
 *   under 300 m   the same street — a customer passes both doors
 *   under 1 km    the same neighbourhood
 *   under 3 km    the same catchment, different neighbourhood
 *   beyond that   a separate local market
 */
export function crowdingFrom(nearestKm: number | null): Crowding {
  if (nearestKm == null) return "unknown";
  if (nearestKm < 0.3) return "on-top";
  if (nearestKm < 1) return "close";
  if (nearestKm < 3) return "spaced";
  return "clear";
}

export function analyseSpread(centre: Point, places: NearbyPlace[]): Spread {
  const buckets = new Map<Sector, NearbyPlace[]>(SECTORS.map((s) => [s, []]));

  for (const p of places) {
    buckets.get(sectorOf(bearingDeg(centre, p)))!.push(p);
  }

  const bySector: SectorSpread[] = SECTORS.map((sector) => {
    const list = buckets.get(sector)!;
    return {
      sector,
      name: SECTOR_NAME[sector],
      count: list.length,
      nearestKm: list.length ? Math.min(...list.map((p) => p.distanceKm)) : null,
    };
  });

  const distances = places.map((p) => p.distanceKm).sort((a, b) => a - b);
  const nearestKm = distances.length ? distances[0] : null;

  const min = Math.min(...bySector.map((s) => s.count));
  const max = Math.max(...bySector.map((s) => s.count));

  return {
    total: places.length,
    nearestKm,
    within1km: distances.filter((d) => d <= 1).length,
    within2km: distances.filter((d) => d <= 2).length,
    medianKm: distances.length
      ? distances.length % 2
        ? distances[(distances.length - 1) / 2]
        : Math.round(((distances[distances.length / 2 - 1] + distances[distances.length / 2]) / 2) * 10) / 10
      : null,
    bySector,
    fewestMapped: bySector.filter((s) => s.count === min).map((s) => s.sector),
    // With nothing mapped anywhere, or a dead-level spread, there is no crowded direction to
    // name — and naming one anyway would invent a pattern out of noise.
    mostCrowded: max > min ? (bySector.find((s) => s.count === max)!.sector ?? null) : null,
    crowding: crowdingFrom(nearestKm),
  };
}
