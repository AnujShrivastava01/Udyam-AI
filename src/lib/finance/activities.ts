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
  | "manufacturing";

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
  provenance: Provenance;
}

const NABARD_JH: Provenance = {
  source: "NABARD Jharkhand Regional Office — Unit Cost 2023-24",
  url: "https://www.nabard.org/",
  retrievedAt: "2026-09-04",
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
    provenance: NABARD_JH,
  },
  {
    id: "goat-20-1",
    name: "Goat rearing — 20 does + 1 buck",
    unit: "20 does + 1 buck, open grazing",
    activityClass: "livestock",
    unitCost: 100_000,
    gestationMonths: 18,
    provenance: NABARD_JH,
  },
  {
    id: "cb-heifer-2",
    name: "Crossbred heifer unit",
    unit: "2 animals at 15 months of age, with shed",
    activityClass: "dairy",
    unitCost: 97_500,
    gestationMonths: 27,
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
    provenance: NABARD_JH,
  },
  {
    id: "milch-cows-2",
    name: "Dairy — 2 improved indigenous / crossbred cows",
    unit: "2 cows in milk, with shed",
    activityClass: "dairy",
    unitCost: 230_000,
    gestationMonths: 0, // NABARD records gestation as NIL — the animal is already in milk.
    provenance: NABARD_JH,
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
  states: ["Jharkhand"],
  note:
    "Seed dataset transcribed from one NABARD regional Unit Cost table. National coverage requires " +
    "parsing every state's PDF; until then, activities outside this list have no gestation figure " +
    "and the solvency check will decline to run rather than guess.",
};
