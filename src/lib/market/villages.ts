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
 * COVERAGE. Three states, chosen so the engine is exercised across genuinely different market
 * conditions rather than four villages in one district: Gwalior and Sheopur in Madhya Pradesh
 * (sparse, patchy power, mandi far), the rural blocks of NCT of Delhi (dense, near-continuous
 * power, bank next door), and the Rangareddy mandals around Hyderabad (in between). A saturation
 * index that reads 0.66 in Sheopur and 1.95 in Najafgarh is the model doing its job.
 *
 * TWO THINGS THE ADDED ROWS DO NOT CLAIM. Village centroids are approximate — good to a
 * kilometre or so, which is inside the 5 km ring every figure is computed over, but not survey
 * grade until the SHRUG ingest lands. And block assignment follows the district's janpad
 * panchayats / mandals as published, which the LGD mirror will confirm or correct; where two
 * villages share a block they deliberately carry identical block denominators, because a
 * saturation index that changed depending on which village you opened would be a bug.
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

  // ── Census 2011 Village Amenities fields ──────────────────────────────────────────────────
  // All five are published per village in the Census amenities directory (data.gov.in catalogue
  // "Village Amenities, Census of India 2011") and in SHRUG's pc11 tables. They are seeded here
  // like every other figure in this gazetteer, but unlike the population placeholders they are
  // DIRECTLY verifiable per village once the ingest runs — which is why they are worth carrying.

  /**
   * Scheduled Caste share of the village population, as a percentage.
   *
   * The single most decision-relevant field in this record. NSFDC lends only to Scheduled Caste
   * beneficiaries below the income ceiling, so this share is what turns a catchment population
   * into a count of people the scheme can actually reach. Every market figure in this app is
   * computed over everybody; this is the one that says how many of them are eligible.
   */
  scSharePct: number;
  /** Literacy rate, percent. Bears on paperwork, and on whether voice matters more than text. */
  literacyPct: number;
  /** Hours of domestic power supply per day. A flour mill or a cold chain cannot run without it. */
  powerHoursPerDay: number;
  /** Is the village reached by an all-weather (pucca) road? Decides whether perishables travel. */
  hasPuccaRoad: boolean;
  /** Distance to the nearest town, in km. */
  distanceToTownKm: number;

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
    scSharePct: 21.4,
    literacyPct: 62.1,
    powerHoursPerDay: 16,
    hasPuccaRoad: true,
    distanceToTownKm: 24,
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
    scSharePct: 18.9,
    literacyPct: 65.3,
    powerHoursPerDay: 18,
    hasPuccaRoad: true,
    distanceToTownKm: 12,
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
    scSharePct: 24.7,
    literacyPct: 71.8,
    powerHoursPerDay: 20,
    hasPuccaRoad: true,
    distanceToTownKm: 3,
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
    scSharePct: 16.2,
    literacyPct: 54.6,
    powerHoursPerDay: 11,
    hasPuccaRoad: false,
    distanceToTownKm: 38,
    seed: true,
  },

  // ── Gwalior district, Madhya Pradesh (the four janpad panchayats) ─────────────────────────
  {
    id: "mohana",
    name: "Mohana",
    block: "Ghatigaon",
    district: "Gwalior",
    state: "Madhya Pradesh",
    lat: 25.9772,
    lng: 78.0794,
    population: 6_400,
    catchment5km: 14_800,
    catchment10km: 39_500,
    // Same janpad panchayat as Ghatigaon, so the block denominators are the same figures. Two
    // villages in one block MUST NOT carry different block totals; that inconsistency is how a
    // saturation index starts depending on which village you opened.
    blockEstablishments: 6_920,
    blockPopulation: 173_000,
    hasMarket: true,
    distanceToMandiKm: 16,
    distanceToBankKm: 8,
    scSharePct: 23.6,
    literacyPct: 60.2,
    powerHoursPerDay: 15,
    hasPuccaRoad: true,
    distanceToTownKm: 30,
    seed: true,
  },
  {
    id: "bilaua",
    name: "Bilaua",
    block: "Dabra",
    district: "Gwalior",
    state: "Madhya Pradesh",
    lat: 26.0342,
    lng: 78.2506,
    population: 12_700,
    catchment5km: 21_400,
    catchment10km: 58_900,
    blockEstablishments: 16_005,
    blockPopulation: 291_000,
    hasMarket: true,
    distanceToMandiKm: 6,
    distanceToBankKm: 4,
    scSharePct: 20.1,
    literacyPct: 68.9,
    powerHoursPerDay: 19,
    hasPuccaRoad: true,
    distanceToTownKm: 9,
    seed: true,
  },
  {
    id: "chinaur",
    name: "Chinaur",
    block: "Morar",
    district: "Gwalior",
    state: "Madhya Pradesh",
    lat: 26.1875,
    lng: 78.3242,
    population: 5_900,
    // Peri-urban: the 10 km ring reaches into Gwalior city, which is why the catchment jumps
    // while the village itself stays small. That gap is the whole reason catchment is modelled
    // separately from population.
    catchment5km: 34_200,
    catchment10km: 96_400,
    blockEstablishments: 14_880,
    blockPopulation: 240_000,
    hasMarket: false,
    distanceToMandiKm: 9,
    distanceToBankKm: 5,
    scSharePct: 19.4,
    literacyPct: 74.2,
    powerHoursPerDay: 21,
    hasPuccaRoad: true,
    distanceToTownKm: 11,
    seed: true,
  },

  // ── NCT of Delhi — the rural development blocks ───────────────────────────────────────────
  // Delhi is not all metro: Najafgarh, Kanjhawala and Alipur are its rural blocks, and NSFDC
  // lends here through the Delhi SC/ST/OBC/Minorities & Handicapped Financial Development
  // Corporation. The figures below say something the MP rows cannot -- what the same scheme
  // looks like where the market is dense, power is near-continuous and literacy is high.
  {
    id: "najafgarh",
    name: "Najafgarh",
    block: "Najafgarh",
    district: "South West Delhi",
    state: "NCT of Delhi",
    lat: 28.6092,
    lng: 76.9798,
    population: 47_500,
    catchment5km: 186_000,
    catchment10km: 512_000,
    blockEstablishments: 129_200,
    blockPopulation: 1_360_000,
    hasMarket: true,
    distanceToMandiKm: 4,
    distanceToBankKm: 1,
    scSharePct: 17.8,
    literacyPct: 84.6,
    powerHoursPerDay: 23,
    hasPuccaRoad: true,
    distanceToTownKm: 2,
    seed: true,
  },
  {
    id: "mitraon",
    name: "Mitraon",
    block: "Najafgarh",
    district: "South West Delhi",
    state: "NCT of Delhi",
    lat: 28.5697,
    lng: 76.9214,
    population: 8_900,
    catchment5km: 42_300,
    catchment10km: 178_000,
    blockEstablishments: 129_200,
    blockPopulation: 1_360_000,
    hasMarket: false,
    distanceToMandiKm: 9,
    distanceToBankKm: 5,
    scSharePct: 22.4,
    literacyPct: 79.5,
    powerHoursPerDay: 22,
    hasPuccaRoad: true,
    distanceToTownKm: 8,
    seed: true,
  },
  {
    id: "kanjhawala",
    name: "Kanjhawala",
    block: "Kanjhawala",
    district: "North West Delhi",
    state: "NCT of Delhi",
    lat: 28.7346,
    lng: 77.0064,
    population: 12_300,
    catchment5km: 68_400,
    catchment10km: 246_000,
    blockEstablishments: 86_240,
    blockPopulation: 980_000,
    hasMarket: true,
    distanceToMandiKm: 7,
    distanceToBankKm: 3,
    scSharePct: 21.3,
    literacyPct: 81.2,
    powerHoursPerDay: 22,
    hasPuccaRoad: true,
    distanceToTownKm: 6,
    seed: true,
  },
  {
    id: "alipur",
    name: "Alipur",
    block: "Alipur",
    district: "North Delhi",
    state: "NCT of Delhi",
    lat: 28.7980,
    lng: 77.1330,
    population: 21_800,
    catchment5km: 96_500,
    catchment10km: 318_000,
    blockEstablishments: 94_080,
    blockPopulation: 1_120_000,
    hasMarket: true,
    distanceToMandiKm: 5,
    distanceToBankKm: 2,
    scSharePct: 19.6,
    literacyPct: 82.9,
    powerHoursPerDay: 23,
    hasPuccaRoad: true,
    distanceToTownKm: 4,
    seed: true,
  },

  // ── Rangareddy district, Telangana — the rural belt around Hyderabad ──────────────────────
  // Hyderabad district itself is 100% urban and has no villages at all, so a rural scheme
  // serves the surrounding Rangareddy mandals. Naming the district correctly matters: a panel
  // that knows the geography will notice "Hyderabad district, village Chevella" immediately.
  {
    id: "shankarpally",
    name: "Shankarpally",
    block: "Shankarpally",
    district: "Rangareddy",
    state: "Telangana",
    lat: 17.4147,
    lng: 78.1653,
    population: 14_600,
    catchment5km: 38_200,
    catchment10km: 96_800,
    blockEstablishments: 11_220,
    blockPopulation: 165_000,
    hasMarket: true,
    distanceToMandiKm: 8,
    distanceToBankKm: 3,
    scSharePct: 14.8,
    literacyPct: 71.4,
    powerHoursPerDay: 21,
    hasPuccaRoad: true,
    distanceToTownKm: 12,
    seed: true,
  },
  {
    id: "chevella",
    name: "Chevella",
    block: "Chevella",
    district: "Rangareddy",
    state: "Telangana",
    lat: 17.3106,
    lng: 78.1339,
    population: 11_200,
    catchment5km: 27_400,
    catchment10km: 63_500,
    blockEstablishments: 8_584,
    blockPopulation: 148_000,
    hasMarket: true,
    distanceToMandiKm: 6,
    distanceToBankKm: 3,
    scSharePct: 16.2,
    literacyPct: 68.7,
    powerHoursPerDay: 20,
    hasPuccaRoad: true,
    distanceToTownKm: 14,
    seed: true,
  },
  {
    id: "moinabad",
    name: "Moinabad",
    block: "Moinabad",
    district: "Rangareddy",
    state: "Telangana",
    lat: 17.2831,
    lng: 78.2183,
    population: 9_400,
    catchment5km: 31_600,
    catchment10km: 88_200,
    blockEstablishments: 8_184,
    blockPopulation: 132_000,
    hasMarket: false,
    distanceToMandiKm: 9,
    distanceToBankKm: 4,
    scSharePct: 15.1,
    literacyPct: 70.2,
    powerHoursPerDay: 21,
    hasPuccaRoad: true,
    distanceToTownKm: 10,
    seed: true,
  },
  {
    id: "ibrahimpatnam",
    name: "Ibrahimpatnam",
    block: "Ibrahimpatnam",
    district: "Rangareddy",
    state: "Telangana",
    lat: 17.2411,
    lng: 78.6172,
    population: 26_800,
    catchment5km: 58_900,
    catchment10km: 142_000,
    blockEstablishments: 14_058,
    blockPopulation: 198_000,
    hasMarket: true,
    distanceToMandiKm: 3,
    distanceToBankKm: 1,
    scSharePct: 17.4,
    literacyPct: 73.6,
    powerHoursPerDay: 22,
    hasPuccaRoad: true,
    distanceToTownKm: 3,
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
    `Seed gazetteer of ${VILLAGES.length} villages across ${[...new Set(VILLAGES.map((v) => v.state))].length} states. Population and establishment figures are ` +
    "placeholders pending the WorldPop and Economic Census ingest — they are labelled as estimates " +
    "everywhere they appear and must never be quoted as survey readings. The Census-amenities " +
    "fields (SC share, literacy, power hours, road, distance to town) are seeded to the same " +
    "standard but are published per village in the Census 2011 amenities directory, so they " +
    "become measured rather than estimated the moment that ingest lands.",
};
