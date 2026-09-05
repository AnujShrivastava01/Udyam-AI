/**
 * NABARD unit-cost norms, carrying the column the whole thesis rests on: GESTATION PERIOD.
 *
 * NABARD's state Unit Cost tables state, for each activity, both what it costs to set up and
 * how long it takes before it earns anything. NSFDC's scheme terms state when repayment
 * begins. Joining those two published tables is the finding: for most livestock activities,
 * instalments fall due long before the enterprise produces a rupee.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * SEED DATASET — NOT THE FULL TABLE.
 *
 * These rows were transcribed from NABARD Jharkhand RO Unit Cost 2023-24 during research and
 * are enough to demonstrate the mechanism. They are NOT a national dataset. The production
 * path is `etl/nabard_unitcost_parse.py`: parse every state's Unit Cost PDF, keep the
 * gestation column, and load it here. Until that runs, the UI must show the coverage honestly
 * and must not imply national coverage.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

import type { Provenance } from "./schemes";

export type ActivityClass =
  | "livestock"
  | "dairy"
  | "poultry"
  | "plantation"
  | "construction"
  | "retail"
  | "services"
  | "manufacturing"
  | "agri";

/**
 * How much we actually know about a row's cost and gestation.
 *
 *  - `nabard-unit-cost` transcribed from a NABARD regional Unit Cost table, gestation column included.
 *  - `indicative`       a planning figure for activities whose NABARD row we have not parsed yet.
 *                       Structurally right, not yet sourced. The UI must say so.
 */
export type SourceTier = "nabard-unit-cost" | "indicative";

export interface Activity {
  id: string;
  name: string;
  /** The costed unit — NABARD prices a specific configuration, not an abstraction. */
  unit: string;
  activityClass: ActivityClass;
  /** Capital cost of one unit, in rupees. */
  unitCost: number;
  /**
   * Months from disbursement until the activity generates its first income.
   * `0` means income begins effectively immediately (NABARD records this as "NIL").
   */
  gestationMonths: number;
  /** Where NABARD states a repayment period for the activity, in years. */
  repaymentYears?: number;
  /** Indicative annual net surplus once the unit is running, in rupees. Used for DSCR only. */
  annualSurplus?: number;
  tier: SourceTier;
  provenance: Provenance;
}

const NABARD_JH: Provenance = {
  source: "NABARD Jharkhand Regional Office — Unit Cost 2023-24",
  url: "https://www.nabard.org/",
  retrievedAt: "2026-09-04",
  needsVerification: true,
};

const INDICATIVE: Provenance = {
  source:
    "Indicative planning figure — NABARD/KVIC model project profiles for this activity have NOT yet been parsed",
  url: "https://www.nabard.org/",
  retrievedAt: "2026-09-05",
  needsVerification: true,
};

export const ACTIVITIES: Activity[] = [
  {
    id: "goat-10-1",
    name: "Goat rearing — 10 does + 1 buck",
    unit: "10 does + 1 buck, open grazing",
    activityClass: "livestock",
    unitCost: 57_000,
    gestationMonths: 18,
    tier: "nabard-unit-cost",
    provenance: NABARD_JH,
  },
  {
    id: "goat-20-1",
    name: "Goat rearing — 20 does + 1 buck",
    unit: "20 does + 1 buck, open grazing",
    activityClass: "livestock",
    unitCost: 100_000,
    gestationMonths: 18,
    tier: "nabard-unit-cost",
    provenance: NABARD_JH,
  },
  {
    id: "cb-heifer-2",
    name: "Crossbred heifer unit",
    unit: "2 animals at 15 months of age, with shed",
    activityClass: "dairy",
    unitCost: 97_500,
    gestationMonths: 27,
    tier: "nabard-unit-cost",
    provenance: NABARD_JH,
  },
  {
    id: "broiler-250",
    name: "Broiler poultry",
    unit: "250 birds",
    activityClass: "poultry",
    unitCost: 152_000,
    // NABARD records a 6–12 month band; we hold the conservative end and say so in the UI.
    gestationMonths: 12,
    tier: "nabard-unit-cost",
    provenance: NABARD_JH,
  },
  {
    id: "milch-cows-2",
    name: "Dairy — 2 improved indigenous / crossbred cows",
    unit: "2 cows in milk, with shed",
    activityClass: "dairy",
    unitCost: 230_000,
    gestationMonths: 0, // NABARD records gestation as NIL — the animal is already in milk.
    tier: "nabard-unit-cost",
    provenance: NABARD_JH,
  },

  // ── Non-farm trades ───────────────────────────────────────────────────────────────────────
  // These matter because the problem statement names "Dairy, Retail, Textiles" and because they
  // are where the gestation argument cuts the other way: a shop earns in week one. Costs below
  // are INDICATIVE and labelled as such until the unit-cost parse lands.
  {
    id: "tailoring-2",
    name: "Tailoring unit — 2 machines",
    unit: "2 machines, 1 overlock, starting cloth stock",
    activityClass: "manufacturing",
    unitCost: 75_000,
    gestationMonths: 0,
    annualSurplus: 96_000,
    tier: "indicative",
    provenance: INDICATIVE,
  },
  {
    id: "kirana-store",
    name: "Kirana / general store",
    unit: "Shop fit-out plus opening stock",
    activityClass: "retail",
    unitCost: 120_000,
    gestationMonths: 0,
    annualSurplus: 132_000,
    tier: "indicative",
    provenance: INDICATIVE,
  },
  {
    id: "papad-pickle",
    name: "Papad & pickle unit",
    unit: "Food processing unit with drying and packing",
    activityClass: "manufacturing",
    // Deliberately at the tier boundary: this is the activity that lands a borrower in the
    // ₹1.40 lakh cliff, and it makes the cliff explorer concrete rather than abstract.
    unitCost: 140_000,
    gestationMonths: 2,
    annualSurplus: 150_000,
    tier: "indicative",
    provenance: INDICATIVE,
  },
  {
    id: "mushroom",
    name: "Mushroom cultivation",
    unit: "Low-cost shed, 100 bags per cycle",
    activityClass: "agri",
    unitCost: 95_000,
    gestationMonths: 3,
    annualSurplus: 108_000,
    tier: "indicative",
    provenance: INDICATIVE,
  },
  {
    id: "bee-keeping-20",
    name: "Bee-keeping — 20 boxes",
    unit: "20 colonies with boxes and extraction kit",
    activityClass: "livestock",
    unitCost: 110_000,
    gestationMonths: 9,
    annualSurplus: 90_000,
    tier: "indicative",
    provenance: INDICATIVE,
  },
  {
    id: "atta-chakki",
    name: "Flour mill (atta chakki)",
    unit: "Motorised mill with installation",
    activityClass: "manufacturing",
    unitCost: 185_000,
    gestationMonths: 0,
    annualSurplus: 168_000,
    tier: "indicative",
    provenance: INDICATIVE,
  },
];

export const ACTIVITY_BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

/** Gestation bands NABARD publishes as a range rather than a point. */
export const GESTATION_RANGE_NOTE: Record<string, string> = {
  "broiler-250":
    "NABARD states 6–12 months for this unit. We hold the conservative end (12 months); the optimistic end still leaves instalments falling before income.",
};

/**
 * Activities that reach income soonest, for suggesting an alternative when the chosen one is
 * gestation-gapped. Sorted by gestation, then by cost.
 */
export function fastestToIncome(within?: { maxUnitCost?: number }): Activity[] {
  return ACTIVITIES.filter((a) =>
    within?.maxUnitCost != null ? a.unitCost <= within.maxUnitCost : true,
  ).sort((a, b) => a.gestationMonths - b.gestationMonths || a.unitCost - b.unitCost);
}

/** Honest coverage reporting — the UI shows this rather than implying national coverage. */
export const ACTIVITY_COVERAGE = {
  rows: ACTIVITIES.length,
  verified: ACTIVITIES.filter((a) => a.tier === "nabard-unit-cost").length,
  indicative: ACTIVITIES.filter((a) => a.tier === "indicative").length,
  states: ["Jharkhand"],
  note:
    "5 rows are transcribed from a NABARD regional Unit Cost table, gestation column included. " +
    "The rest are indicative planning figures whose NABARD/KVIC profiles we have not parsed yet — " +
    "they are badged as such wherever they appear. Activities outside this list get no gestation " +
    "figure at all, and the solvency check declines to run rather than guess.",
};
