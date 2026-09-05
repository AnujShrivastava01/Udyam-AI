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
   * From the Economic Census in production; seeded here.
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
    blockEstablishments: 1_610,
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
    blockEstablishments: 2_940,
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
    blockEstablishments: 5_120,
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
    blockEstablishments: 780,
    blockPopulation: 112_000,
    hasMarket: false,
    distanceToMandiKm: 24,
    distanceToBankKm: 18,
    seed: true,
  },
];

export const VILLAGE_BY_ID = new Map(VILLAGES.map((v) => [v.id, v]));

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
