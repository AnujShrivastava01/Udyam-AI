/**
 * Village gazetteer — SEED DATASET.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * These rows are ILLUSTRATIVE, not ingested. Village names, blocks and districts are real
 * administrative entities; the population, catchment and establishment figures attached to
 * them are seeded placeholders so the engine can be exercised end to end.
 *
 * They are marked `seed: true` and EVERY surface that renders them must say so. Presenting a
 * seeded figure as a WorldPop or Census reading would be the one unrecoverable mistake this
 * project can make.
 *
 * The production path, in order:
 *   1. LGD daily mirror  → village codes, block/district hierarchy   (github.com/ramSeraph/opendata)
 *   2. gp_mapping.csv    → LGD ↔ Census 2011 crosswalk               (94.67% coverage, measured)
 *   3. SHRUG pc11 polys  → village centroids                          (649,618 polygons)
 *   4. WorldPop raster   → catchment population by H3 k-ring
 *   5. SHRUG ec13        → establishment counts per village
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

export interface Village {
  id: string;
  name: string;
  block: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  /** Population of the village itself. */
  population: number;
  /** Population within a 5 km radius. */
  catchment5km: number;
  /** Population within a 10 km radius. */
  catchment10km: number;
  /**
   * Total non-farm establishments recorded in the block, all sectors.
   * From the Economic Census in production; seeded here at a density that reconciles with
   * TOTAL_ESTABLISHMENT_DENSITY (~48.75 per 1,000) so the saturation model does not contradict
   * its own benchmarks. Ghatigaon 40/1k, Bhitarwar 45/1k, Dabra 55/1k, Karahiya 32/1k.
   */
  blockEstablishments: number;
  /** Population of the whole block, the denominator for density. */
  blockPopulation: number;
  /** Does the village have a periodic market / haat? */
  hasMarket: boolean;
  /** Distance to the nearest mandi, in km. */
  distanceToMandiKm: number;
  /** Distance to the nearest bank branch, in km. */
  distanceToBankKm: number;
  seed: boolean;
}

export const VILLAGES: Village[] = [
  {
    id: "ghatigaon",
    name: "Ghatigaon",
    block: "Ghatigaon",
    district: "Gwalior",
    state: "Madhya Pradesh",
    lat: 26.0966,
    lng: 78.0913,
    population: 4_180,
    catchment5km: 12_400,
    catchment10km: 38_600,
    blockEstablishments: 6_920,
    blockPopulation: 173_000,
    hasMarket: true,
    distanceToMandiKm: 11,
    distanceToBankKm: 6,
    seed: true,
  },
  {
    id: "bhitarwar",
    name: "Bhitarwar",
    block: "Bhitarwar",
    district: "Gwalior",
    state: "Madhya Pradesh",
    lat: 25.7906,
    lng: 78.1136,
    population: 16_900,
    catchment5km: 29_800,
    catchment10km: 71_200,
    blockEstablishments: 10_170,
    blockPopulation: 226_000,
    hasMarket: true,
    distanceToMandiKm: 3,
    distanceToBankKm: 2,
    seed: true,
  },
  {
    id: "dabra",
    name: "Dabra",
    block: "Dabra",
    district: "Gwalior",
    state: "Madhya Pradesh",
    lat: 25.8894,
    lng: 78.3319,
    population: 58_300,
    catchment5km: 74_500,
    catchment10km: 118_000,
    blockEstablishments: 16_005,
    blockPopulation: 291_000,
    hasMarket: true,
    distanceToMandiKm: 1,
    distanceToBankKm: 1,
    seed: true,
  },
  {
    id: "karahiya",
    name: "Karahiya",
    block: "Sheopur",
    district: "Sheopur",
    state: "Madhya Pradesh",
    lat: 25.6672,
    lng: 76.6963,
    population: 2_240,
    catchment5km: 6_100,
    catchment10km: 17_900,
    blockEstablishments: 3_584,
    blockPopulation: 112_000,
    hasMarket: false,
    distanceToMandiKm: 24,
    distanceToBankKm: 18,
    seed: true,
  },
];

export const VILLAGE_BY_ID = new Map(VILLAGES.map((v) => [v.id, v]));

/**
 * The places this product can actually report on.
 *
 * Onboarding used to offer a hardcoded list of THREE UP DISTRICTS — Jhansi, Lalitpur, Jalaun —
 * and three Bundelkhand blocks, while every village in this gazetteer is in Madhya Pradesh
 * (Gwalior and Sheopur). The two lists did not share a single row. So the app asked the user where
 * they were, could not match the answer against anything, and silently showed them Ghatigaon
 * regardless — and the "start from the district the user gave" logic in /discover and /report
 * could never once have fired.
 *
 * The picker is derived from the gazetteer now. Offering a district we hold no data for is a
 * promise the engine cannot keep; when the WorldPop / SHRUG ingest lands, these lists grow with it
 * and nothing has to be edited by hand.
 */
export const GAZETTEER_DISTRICTS: { district: string; state: string }[] = [
  ...new Map(VILLAGES.map((v) => [v.district, { district: v.district, state: v.state }])).values(),
];

/** Blocks we hold villages for, within one district. */
export function blocksInDistrict(district: string): string[] {
  return [
    ...new Set(
      VILLAGES.filter((v) => v.district.toLowerCase() === district.toLowerCase()).map((v) => v.block),
    ),
  ];
}

/** First village we hold for a district, for screens that need a sensible starting row. */
export function villageInDistrict(district: string | null | undefined) {
  if (!district) return null;
  return VILLAGES.find((v) => v.district.toLowerCase() === district.toLowerCase()) ?? null;
}

export const GAZETTEER_COVERAGE = {
  villages: VILLAGES.length,
  districts: [...new Set(VILLAGES.map((v) => v.district))],
  states: [...new Set(VILLAGES.map((v) => v.state))],
  allSeeded: VILLAGES.every((v) => v.seed),
  note:
    "Seed gazetteer of 4 Madhya Pradesh villages. Population and establishment figures are " +
    "placeholders pending the WorldPop and Economic Census ingest — they are labelled as estimates " +
    "everywhere they appear and must never be quoted as survey readings.",
};
