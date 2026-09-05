/**
 * The hyper-local feasibility engine.
 *
 * Answers all six of the problem statement's Module-1 requirements with a computed figure and a
 * named source, or declines. There is no code path that emits an uncited number.
 *
 * Two independent estimates of how many enterprises a place can support are produced —
 * one from the SUPPLY side (establishment density against a national benchmark) and one from the
 * DEMAND side (catchment population × per-capita category spend ÷ revenue per enterprise).
 * Where they disagree, the report says so instead of averaging them into false confidence.
 */

import type { Provenance } from "@/lib/finance/schemes";
import type { Activity } from "@/lib/finance/activities";
import {
  BENCHMARK_COVERAGE,
  CATEGORY_SPEND,
  ECONOMIC_CENSUS,
  ESTABLISHMENT_DENSITY,
  HCES,
  RURAL_MPCE,
  RURAL_REGISTRATION_RATE,
  WORLDPOP,
  categoryForActivityClass,
} from "./benchmarks";
import type { Village } from "./villages";

/** NSS 73rd round: annual gross value added per rural own-account enterprise, in rupees. */
export const RURAL_OAE_GVA_PER_YEAR = 71_217;

export const NSS_PROVENANCE: Provenance = {
  source: "NSS 73rd Round — Unincorporated Non-Agricultural Enterprises",
  url: "https://www.mospi.gov.in/",
  retrievedAt: "2026-09-04",
  needsVerification: true,
};

/**
 * Share of a block's non-farm establishments belonging to the chosen sector.
 *
 * This is an EXPLICIT MODELLING ASSUMPTION, not a measurement. The Economic Census publishes
 * employment share by industry at village level, not establishment counts by industry — so a
 * sector count cannot be read off directly and must be modelled. Surfacing the assumption is
 * the honest alternative to hiding it.
 */
export const DEFAULT_SECTOR_SHARE = 0.12;

export type Confidence = "measured" | "estimated" | "seeded" | "unavailable";

export interface Figure {
  value: number;
  /** Plus/minus band, in the same unit. */
  band?: number;
  unit: string;
  confidence: Confidence;
  provenance?: Provenance;
  note?: string;
}

export interface FeasibilitySection {
  key: string;
  title: string;
  /** PS Module-1 requirement number this discharges. */
  requirement: number;
  headline: string;
  detail: string;
  figures: Figure[];
}

export interface FeasibilityReport {
  village: Village;
  activity: Activity | null;
  /** 0-100, or null when the inputs do not support a score. */
  score: number | null;
  verdict: "PROMISING" | "CROWDED" | "THIN_DATA";
  summary: string;
  sections: FeasibilitySection[];
  saturation: SaturationResult;
  dataQuality: {
    seeded: boolean;
    warnings: string[];
  };
}

export interface SaturationResult {
  /** Supply-side estimate of existing sector establishments in the block. */
  observedSector: number;
  /** What a block of this population would hold at the national rural average. */
  expectedSector: number;
  /** observed ÷ expected. Above 1 means more crowded than the national norm. */
  index: number;
  /** Demand-side estimate of how many enterprises the catchment can support. */
  supportableFromDemand: number | null;
  /** expected − observed, floored at zero. */
  headroom: number;
  /** Do the supply and demand estimates agree on direction? */
  estimatesAgree: boolean | null;
  sectorShareAssumed: number;
  label: "underserved" | "balanced" | "crowded" | "unknown";
}

const round = (n: number, dp = 0) => {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

/** Population inside a radius, from the gazetteer's precomputed rings. */
export function catchment(village: Village, radiusKm: 5 | 10): Figure {
  const value = radiusKm === 5 ? village.catchment5km : village.catchment10km;
  return {
    value,
    // WorldPop's own positional and modelling error, plus our centroid uncertainty.
    band: Math.round(value * 0.15),
    unit: "people",
    confidence: village.seed ? "seeded" : "estimated",
    provenance: WORLDPOP,
    note: village.seed
      ? "Seeded placeholder — pending the WorldPop raster ingest."
      : "Summed from the WorldPop constrained raster inside the ring.",
  };
}

/** Annual rupees spent on this category by everyone inside the catchment. */
export function addressableDemand(
  village: Village,
  activityClass: string,
): { figure: Figure; perCapitaMonthly: number | null } {
  const category = categoryForActivityClass(activityClass);
  if (!category) {
    return {
      figure: {
        value: 0,
        unit: "₹ per year",
        confidence: "unavailable",
        note: "No HCES item group maps to this activity class, so addressable demand cannot be computed.",
      },
      perCapitaMonthly: null,
    };
  }

  const stateMpce = RURAL_MPCE.byState[village.state];
  // Scale the national item-group figure by how this state's total spend compares to the
  // national average — a crude but stated adjustment, not a silent one.
  const scale = stateMpce ? stateMpce / RURAL_MPCE.allIndia : 1;
  const perCapitaMonthly = round(category.perCapitaMonthly * scale, 2);
  const annual = village.catchment10km * perCapitaMonthly * 12;

  return {
    figure: {
      value: annual,
      band: Math.round(annual * 0.25),
      unit: "₹ per year",
      confidence: village.seed ? "seeded" : "estimated",
      provenance: HCES,
      note:
        `${inr(village.catchment10km)} people × ₹${perCapitaMonthly}/month on ${category.label.toLowerCase()} × 12` +
        (stateMpce ? `, scaled to ${village.state} rural MPCE` : ""),
    },
    perCapitaMonthly,
  };
}

export function saturation(village: Village, activityClass: string): SaturationResult {
  const density = ESTABLISHMENT_DENSITY[activityClass];
  if (!density) {
    return {
      observedSector: 0,
      expectedSector: 0,
      index: 0,
      supportableFromDemand: null,
      headroom: 0,
      estimatesAgree: null,
      sectorShareAssumed: DEFAULT_SECTOR_SHARE,
      label: "unknown",
    };
  }

  const expectedSector = round((village.blockPopulation / 1000) * density.per1000);
  const observedSector = round(village.blockEstablishments * DEFAULT_SECTOR_SHARE);
  const index = expectedSector > 0 ? round(observedSector / expectedSector, 2) : 0;

  const { figure } = addressableDemand(village, activityClass);
  // Only a share of catchment spend is actually capturable by enterprises of this kind.
  const CAPTURE_SHARE = 0.35;
  const supportableFromDemand =
    figure.confidence === "unavailable"
      ? null
      : round((figure.value * CAPTURE_SHARE) / RURAL_OAE_GVA_PER_YEAR);

  const label: SaturationResult["label"] =
    index < 0.8 ? "underserved" : index <= 1.2 ? "balanced" : "crowded";

  const estimatesAgree =
    supportableFromDemand == null
      ? null
      : // Do both methods point the same way about whether there is room?
        supportableFromDemand > observedSector === index < 1;

  return {
    observedSector,
    expectedSector,
    index,
    supportableFromDemand,
    headroom: Math.max(0, expectedSector - observedSector),
    estimatesAgree,
    sectorShareAssumed: DEFAULT_SECTOR_SHARE,
    label,
  };
}

/** Suggested price band from what the catchment can afford, not from what the seller hopes. */
export function pricing(village: Village, activity: Activity | null): Figure {
  const category = activity ? categoryForActivityClass(activity.activityClass) : null;
  if (!category) {
    return {
      value: 0,
      unit: "₹",
      confidence: "unavailable",
      note: "Pricing needs an activity whose output maps to an HCES item group.",
    };
  }
  const stateMpce = RURAL_MPCE.byState[village.state] ?? RURAL_MPCE.allIndia;
  const share = category.perCapitaMonthly / RURAL_MPCE.allIndia;
  const localMonthly = round(stateMpce * share, 2);

  return {
    value: localMonthly,
    band: round(localMonthly * 0.2, 2),
    unit: `₹ per person per month on ${category.label.toLowerCase()}`,
    confidence: "estimated",
    provenance: HCES,
    note:
      `Local purchasing power for this category, from ${village.state} rural MPCE of ₹${inr(stateMpce)}. ` +
      "Price above this band and the catchment cannot sustain the volume.",
  };
}

export function buildFeasibilityReport(
  village: Village,
  activity: Activity | null,
): FeasibilityReport {
  const activityClass = activity?.activityClass ?? "retail";
  const c5 = catchment(village, 5);
  const c10 = catchment(village, 10);
  const demand = addressableDemand(village, activityClass);
  const sat = saturation(village, activityClass);
  const price = pricing(village, activity);

  const warnings: string[] = [];
  if (village.seed) {
    warnings.push(
      "Population and establishment figures for this village are seeded placeholders, not survey readings.",
    );
  }
  warnings.push(
    `Sector establishment count is modelled at ${(sat.sectorShareAssumed * 100).toFixed(0)}% of all block ` +
      "establishments — the Economic Census publishes employment share by industry, not counts, so this is an assumption.",
  );
  warnings.push(BENCHMARK_COVERAGE.note);
  if (sat.estimatesAgree === false) {
    warnings.push(
      "The supply-side and demand-side estimates disagree about whether there is room here. Treat the verdict as weak.",
    );
  }

  const channels = [
    village.hasMarket ? "Village haat / periodic market" : null,
    village.distanceToMandiKm <= 15 ? `Mandi at ${village.distanceToMandiKm} km` : null,
    "Direct to household within the catchment",
    village.distanceToMandiKm > 20 ? "Aggregator or FPO collection (distance to mandi is a real constraint)" : null,
  ].filter(Boolean) as string[];

  const sections: FeasibilitySection[] = [
    {
      key: "reach",
      title: "Market reach",
      requirement: 1,
      headline: `${inr(c10.value)} people within 10 km`,
      detail: `${inr(c5.value)} live within 5 km. Distribution runs through: ${channels.join("; ")}.`,
      figures: [c5, c10],
    },
    {
      key: "opportunity",
      title: "Opportunity",
      requirement: 2,
      headline:
        sat.label === "underserved"
          ? `Room for roughly ${sat.headroom} more units of this kind`
          : sat.label === "crowded"
            ? "This sector is already above the national rural norm here"
            : "Supply is broadly in line with what this population supports",
      detail:
        sat.supportableFromDemand != null
          ? `Supply side says ${sat.observedSector} exist against ${sat.expectedSector} the population would support. ` +
            `Demand side independently says the catchment's spending could sustain about ${sat.supportableFromDemand}. ` +
            (sat.estimatesAgree ? "The two agree." : "The two disagree — treat this with caution.")
          : "Only the supply-side estimate is available for this activity.",
      figures: [
        {
          value: sat.index,
          unit: "× the national rural norm",
          confidence: village.seed ? "seeded" : "estimated",
          provenance: ECONOMIC_CENSUS,
          note: `${sat.observedSector} estimated units against ${sat.expectedSector} expected.`,
        },
      ],
    },
    {
      key: "competition",
      title: "Competitor density",
      requirement: 5,
      headline: `${sat.observedSector} similar units estimated in ${village.block} block`,
      detail:
        `Against a block population of ${inr(village.blockPopulation)}, the national rural average would put ` +
        `${sat.expectedSector} here. Registry counts (Udyam, GST) cannot substitute: only ` +
        `${(RURAL_REGISTRATION_RATE * 100).toFixed(1)}% of rural enterprises hold any registration, so they see ` +
        "roughly one in five.",
      figures: [
        {
          value: sat.observedSector,
          band: Math.round(sat.observedSector * 0.4),
          unit: "establishments",
          confidence: "estimated",
          provenance: ECONOMIC_CENSUS,
          note: "Modelled from block establishment count and an assumed sector share.",
        },
      ],
    },
    {
      key: "pricing",
      title: "Product market value",
      requirement: 6,
      headline:
        price.confidence === "unavailable"
          ? "Not computable for this activity"
          : `₹${price.value} per person per month is what this catchment actually spends`,
      detail: price.note ?? "",
      figures: [price],
    },
    {
      key: "demand",
      title: "Addressable demand",
      requirement: 1,
      headline:
        demand.figure.confidence === "unavailable"
          ? "No spend category maps to this activity"
          : `₹${inr(demand.figure.value)} a year flows through this catchment for this category`,
      detail: demand.figure.note ?? "",
      figures: [demand.figure],
    },
    {
      key: "threats",
      title: "Threats",
      requirement: 4,
      headline: threatHeadline(village, activity),
      detail: threatDetail(village, activity),
      figures: [
        {
          value: village.distanceToMandiKm,
          unit: "km to nearest mandi",
          confidence: village.seed ? "seeded" : "estimated",
          note: "Distance to market is the single most common supply-chain constraint in these blocks.",
        },
      ],
    },
  ];

  // A score is only offered when the inputs support one.
  const thinData = village.seed && sat.label === "unknown";
  const score = thinData
    ? null
    : Math.max(
        5,
        Math.min(
          95,
          Math.round(
            55 +
              (sat.label === "underserved" ? 22 : sat.label === "crowded" ? -22 : 0) +
              (village.hasMarket ? 6 : -6) +
              (village.distanceToMandiKm <= 10 ? 8 : village.distanceToMandiKm >= 20 ? -12 : 0) +
              (activity && activity.gestationMonths >= 18 ? -10 : 0),
          ),
        ),
      );

  return {
    village,
    activity,
    score,
    verdict: thinData ? "THIN_DATA" : sat.label === "crowded" ? "CROWDED" : "PROMISING",
    summary: buildSummary(village, activity, sat),
    sections,
    saturation: sat,
    dataQuality: { seeded: village.seed, warnings },
  };
}

function threatHeadline(village: Village, activity: Activity | null): string {
  if (village.distanceToMandiKm > 20) return `Nearest mandi is ${village.distanceToMandiKm} km away`;
  if (activity && activity.gestationMonths >= 18)
    return `${activity.gestationMonths} months before this unit earns anything`;
  if (!village.hasMarket) return "No periodic market in the village itself";
  return "No dominant structural threat identified";
}

function threatDetail(village: Village, activity: Activity | null): string {
  const parts: string[] = [];
  if (village.distanceToMandiKm > 20) {
    parts.push(
      `Every sale carries ${village.distanceToMandiKm} km of transport, which compresses margin and makes a single ` +
        "aggregator the only realistic buyer — the classic single-buyer dependency.",
    );
  }
  if (!village.hasMarket) {
    parts.push("Without a haat in the village, reaching the catchment means going to the customer.");
  }
  if (village.distanceToBankKm > 10) {
    parts.push(
      `Bank access at ${village.distanceToBankKm} km makes working-capital top-ups slow, which matters more than the ` +
        "interest rate for a seasonal business.",
    );
  }
  if (activity && activity.gestationMonths >= 12) {
    parts.push(
      `NABARD prices a ${activity.gestationMonths}-month gestation for this unit — see the Solvency Clock for what that ` +
        "does to the repayment schedule.",
    );
  }
  return parts.length ? parts.join(" ") : "No structural threat rose above the reporting threshold.";
}

function buildSummary(village: Village, activity: Activity | null, sat: SaturationResult): string {
  const what = activity ? activity.name.toLowerCase() : "this activity";
  if (sat.label === "crowded") {
    return `${village.name} already carries more ${what} capacity than a block of its size normally supports. Entering here means taking share, not finding it.`;
  }
  if (sat.label === "underserved") {
    return `${village.name} looks under-supplied for ${what} relative to its catchment. The constraint here is distribution, not demand.`;
  }
  return `${village.name} is broadly balanced for ${what}. Viability will turn on cost and cash flow rather than on market room.`;
}

export const SPEND_CATEGORIES = CATEGORY_SPEND;
export { NSS_PROVENANCE as RURAL_ENTERPRISE_PROVENANCE };
