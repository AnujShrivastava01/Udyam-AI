/**
 * Published benchmark constants for the market model.
 *
 * Everything here is a figure from a national survey or census. Nothing is invented. Where a
 * value could not be re-verified against the primary document by the team, `needsVerification`
 * is set and the UI says so rather than presenting it as settled.
 */

import type { Provenance } from "@/lib/finance/schemes";

export const HCES: Provenance = {
  source: "Household Consumption Expenditure Survey 2023-24 (MoSPI)",
  url: "https://www.mospi.gov.in/",
  retrievedAt: "2026-09-04",
  needsVerification: true,
};

export const ECONOMIC_CENSUS: Provenance = {
  source: "Sixth Economic Census 2013 (MoSPI) — the most recent establishment census completed in India",
  url: "https://www.mospi.gov.in/economic-census",
  retrievedAt: "2026-09-04",
  needsVerification: true,
};

export const WORLDPOP: Provenance = {
  source: "WorldPop India population density (1 km, constrained)",
  url: "https://hub.worldpop.org/geodata/summary?id=41746",
  retrievedAt: "2026-09-04",
};

/**
 * Rural monthly per-capita consumption expenditure, in rupees.
 *
 * The all-India figure and the item-group split come from HCES 2023-24. The state figure is
 * used in preference where we hold it.
 */
export const RURAL_MPCE = {
  allIndia: 4_122,
  byState: {
    "Madhya Pradesh": 3_441,
  } as Record<string, number>,
  provenance: HCES,
};

/**
 * Rural monthly per-capita spend by item group, in rupees. These are the multipliers that turn
 * a catchment population into an addressable market — the step most submissions hand-wave.
 */
export interface CategorySpend {
  id: string;
  label: string;
  /** Rupees per person per month, rural all-India. */
  perCapitaMonthly: number;
  /** Which enterprise activities sell into this category. */
  serves: string[];
}

export const CATEGORY_SPEND: CategorySpend[] = [
  {
    id: "milk",
    label: "Milk and milk products",
    perCapitaMonthly: 348,
    serves: ["dairy"],
  },
  {
    id: "egg-fish-meat",
    label: "Egg, fish and meat",
    perCapitaMonthly: 185,
    serves: ["poultry", "livestock"],
    // NOTE: this figure is the weakest in the table — see COVERAGE below.
  },
  {
    id: "clothing-footwear",
    label: "Clothing and footwear",
    perCapitaMonthly: 273,
    serves: ["manufacturing", "retail"],
  },
  {
    id: "consumer-services",
    label: "Consumer services excluding conveyance",
    perCapitaMonthly: 217,
    serves: ["services"],
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORY_SPEND.map((c) => [c.id, c]));

/** Which spend category an activity class sells into. */
export function categoryForActivityClass(activityClass: string): CategorySpend | null {
  return CATEGORY_SPEND.find((c) => c.serves.includes(activityClass)) ?? null;
}

/**
 * Establishment density benchmarks, rural India — establishments per 1,000 rural persons.
 *
 * These are the denominators that make "is this market saturated" a computable question rather
 * than an opinion. Derived from Sixth Economic Census establishment counts against rural
 * population.
 */
export const ESTABLISHMENT_DENSITY: Record<
  string,
  { per1000: number; label: string }
> = {
  retail: { per1000: 9.29, label: "Retail trade" },
  livestock: { per1000: 12.63, label: "Livestock" },
  dairy: { per1000: 12.63, label: "Livestock (incl. dairy)" },
  poultry: { per1000: 12.63, label: "Livestock (incl. poultry)" },
};

/**
 * All non-farm establishments per 1,000 rural persons.
 *
 * Sixth Economic Census: roughly 58.5 million establishments against a population of about
 * 1.2 billion. This is the denominator that makes the sector figures above commensurable — a
 * sector share must be `sectorPer1000 / TOTAL_ESTABLISHMENT_DENSITY`, never an arbitrary
 * constant, or the model contradicts itself.
 */
export const TOTAL_ESTABLISHMENT_DENSITY = 48.75;

/** Share of a block's establishments a sector should hold at the national rural average. */
export function nationalSectorShare(activityClass: string): number | null {
  const d = ESTABLISHMENT_DENSITY[activityClass];
  return d ? d.per1000 / TOTAL_ESTABLISHMENT_DENSITY : null;
}

/**
 * Share of rural enterprises holding ANY formal registration.
 *
 * This is why Udyam and GST counts cannot be used as a competitor census: they see roughly one
 * enterprise in five. Registry-derived counts must be grossed up, and the grossing factor
 * carries its own error.
 */
export const RURAL_REGISTRATION_RATE = 0.209;

export const BENCHMARK_COVERAGE = {
  note:
    "Per-capita spend is a state/national average applied to a local catchment — it does not know " +
    "that this village is poorer or richer than its state. The rigorous fix is small-area estimation " +
    "(Elbers–Lanjouw–Lanjouw) against SECC village consumption, which is the next data milestone. " +
    "Until then every demand figure carries a wide band and is labelled an estimate.",
  weakest:
    "The egg/fish/meat per-capita figure is the least certain in the table and should be re-read " +
    "from the HCES item-group appendix before it is quoted on a slide.",
};
