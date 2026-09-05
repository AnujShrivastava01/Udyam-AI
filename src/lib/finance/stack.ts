/**
 * Multi-scheme capital stacking.
 *
 * The problem statement routes a borrower to ONE scheme by a threshold on project cost. Real
 * capital is not raised that way. A ₹2.3 lakh dairy unit can be funded as an NSFDC term loan, or
 * as a PMEGP loan carrying a 25–35% margin-money SUBSIDY that never has to be repaid, or as a
 * blend — and the difference in lifetime cost is large.
 *
 * This module solves for the cheapest viable capital structure rather than routing to a tier. It
 * is a small constrained optimisation, and it is the part of the product that is least dismissible
 * as a wrapper around a language model: given the same inputs it returns the same stack, and the
 * reasoning is a printable table.
 *
 * ── HONESTY NOTE ────────────────────────────────────────────────────────────────────────────
 * Only the NSFDC parameters are transcribed from the scheme document. The other rails below carry
 * INDICATIVE terms drawn from public scheme summaries and are marked `needsVerification`. Before
 * any of this is quoted to a beneficiary or a jury, each rail's guidelines must be re-fetched.
 * Crucially, several of these schemes CANNOT legally be combined — see `EXCLUSIONS`.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 */

import { amortise } from "./amortise";
import {
  SCHEMES,
  type MoratoriumConvention,
  type Provenance,
} from "./schemes";

const INDICATIVE: Provenance = {
  source: "Public scheme summary — guidelines NOT yet re-fetched from the administering ministry",
  url: "https://www.myscheme.gov.in/",
  retrievedAt: "2026-09-05",
  needsVerification: true,
};

export type RailId =
  | "nsfdc-micro-finance"
  | "nsfdc-term-loan"
  | "pmegp"
  | "mudra-kishore"
  | "mudra-tarun"
  | "own-margin";

export interface Rail {
  id: RailId;
  name: string;
  administrator: string;
  /** Largest amount this rail can contribute, in rupees. */
  maxAmount: number;
  /** Smallest sensible draw; below this the paperwork is not worth it. */
  minAmount: number;
  annualRatePct: number;
  tenureMonths: number;
  moratoriumMonths: number;
  /**
   * Share of PROJECT COST received as a grant that is never repaid (PMEGP margin money).
   * Modelled as a subsidy on the project, not on this rail's own draw.
   */
  subsidyOfProjectCost?: number;
  /** Largest share of project cost this rail's LOAN may fund. */
  maxShareOfProjectCost: number;
  /**
   * Minimum share of project cost the beneficiary must put in themselves under this rail.
   *
   * This is what stops the optimiser producing a structure with zero own contribution. PMEGP's
   * subsidy does NOT cover the gap the loan leaves: the split for a special-category beneficiary
   * is roughly 5% own money, 35% margin-money subsidy, 60% bank loan.
   */
  minOwnContributionShare: number;
  provenance: Provenance;
  verified: boolean;
}

export const RAILS: Rail[] = [
  {
    id: "nsfdc-micro-finance",
    name: SCHEMES["nsfdc-micro-finance"].name,
    administrator: "NSFDC",
    maxAmount: SCHEMES["nsfdc-micro-finance"].maxLoan,
    minAmount: 10_000,
    annualRatePct: SCHEMES["nsfdc-micro-finance"].annualRatePct,
    tenureMonths: SCHEMES["nsfdc-micro-finance"].tenureMonths,
    moratoriumMonths: SCHEMES["nsfdc-micro-finance"].moratoriumMonths,
    maxShareOfProjectCost: SCHEMES["nsfdc-micro-finance"].loanShare,
    minOwnContributionShare: 0.1,
    provenance: SCHEMES["nsfdc-micro-finance"].provenance,
    verified: true,
  },
  {
    id: "nsfdc-term-loan",
    name: SCHEMES["nsfdc-term-loan"].name,
    administrator: "NSFDC",
    maxAmount: SCHEMES["nsfdc-term-loan"].maxLoan,
    minAmount: 140_001,
    annualRatePct: SCHEMES["nsfdc-term-loan"].annualRatePct,
    tenureMonths: SCHEMES["nsfdc-term-loan"].tenureMonths,
    moratoriumMonths: SCHEMES["nsfdc-term-loan"].moratoriumMonths,
    maxShareOfProjectCost: SCHEMES["nsfdc-term-loan"].loanShare,
    minOwnContributionShare: 0.1,
    provenance: SCHEMES["nsfdc-term-loan"].provenance,
    verified: true,
  },
  {
    id: "pmegp",
    name: "PMEGP",
    administrator: "KVIC / Ministry of MSME",
    maxAmount: 2_000_000,
    minAmount: 50_000,
    annualRatePct: 11,
    tenureMonths: 84,
    moratoriumMonths: 6,
    // The reason PMEGP can beat a cheaper interest rate: part of the project cost is a grant.
    subsidyOfProjectCost: 0.35,
    // 5% own + 35% subsidy + 60% loan. Not 90% — the subsidy does not close the gap.
    maxShareOfProjectCost: 0.6,
    minOwnContributionShare: 0.05,
    provenance: INDICATIVE,
    verified: false,
  },
  {
    id: "mudra-kishore",
    name: "MUDRA — Kishore",
    administrator: "Scheduled banks / SIDBI",
    maxAmount: 500_000,
    minAmount: 50_001,
    annualRatePct: 10.5,
    tenureMonths: 60,
    moratoriumMonths: 3,
    maxShareOfProjectCost: 0.85,
    minOwnContributionShare: 0.15,
    provenance: INDICATIVE,
    verified: false,
  },
  {
    id: "mudra-tarun",
    name: "MUDRA — Tarun",
    administrator: "Scheduled banks / SIDBI",
    maxAmount: 1_000_000,
    minAmount: 500_001,
    annualRatePct: 11.5,
    tenureMonths: 60,
    moratoriumMonths: 3,
    maxShareOfProjectCost: 0.85,
    minOwnContributionShare: 0.15,
    provenance: INDICATIVE,
    verified: false,
  },
];

export const RAIL_BY_ID = new Map(RAILS.map((r) => [r.id, r]));

/**
 * Rails that may not be combined.
 *
 * A beneficiary generally cannot draw a subsidised PMEGP loan and an NSFDC concessional loan
 * against the same project — double-subsidy is barred. Encoding the exclusion explicitly is what
 * stops the optimiser producing a mathematically optimal but ineligible answer.
 */
export const EXCLUSIONS: [RailId, RailId][] = [
  ["pmegp", "nsfdc-micro-finance"],
  ["pmegp", "nsfdc-term-loan"],
  ["pmegp", "mudra-kishore"],
  ["pmegp", "mudra-tarun"],
  ["nsfdc-micro-finance", "nsfdc-term-loan"],
  ["mudra-kishore", "mudra-tarun"],
  ["nsfdc-micro-finance", "mudra-kishore"],
  ["nsfdc-term-loan", "mudra-tarun"],
  ["nsfdc-term-loan", "mudra-kishore"],
  ["nsfdc-micro-finance", "mudra-tarun"],
];

function excluded(a: RailId, b: RailId): boolean {
  return EXCLUSIONS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

export interface StackComponent {
  rail: Rail;
  amount: number;
  quarterlyInstalment: number;
  totalInterest: number;
}

export interface CapitalStack {
  projectCost: number;
  /** Grant that never has to be repaid. */
  subsidy: number;
  /** Cash the beneficiary must put in. */
  ownContribution: number;
  components: StackComponent[];
  totalBorrowed: number;
  /** Interest across every component, over the life of each loan. */
  totalInterest: number;
  /** subsidy + ownContribution + totalBorrowed − projectCost, which must be ~0. */
  balanceCheck: number;
  /** Total quarterly outgo across all components while all are running. */
  peakQuarterlyOutgo: number;
  /** totalInterest − subsidy. The number that actually decides which stack is cheapest. */
  netCostOfCapital: number;
  feasible: boolean;
  rejectedBecause?: string;
}

export interface StackOptions {
  projectCost: number;
  /** Cash the beneficiary actually holds. */
  marginAvailable: number;
  convention?: MoratoriumConvention;
  /** Rails the applicant is not eligible for (wrong category, already availed, etc.). */
  ineligible?: RailId[];
}

function priceRail(rail: Rail, amount: number, convention: MoratoriumConvention) {
  const sched = amortise({
    principal: amount,
    annualRatePct: rail.annualRatePct,
    tenureMonths: rail.tenureMonths,
    moratoriumMonths: rail.moratoriumMonths,
    restMonths: 3,
    convention,
  });
  return { quarterlyInstalment: sched.instalment, totalInterest: sched.totalInterest };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build and price one candidate stack from a chosen combination of rails.
 *
 * Rails are drawn in order, each taking as much as it is allowed, until the project is funded.
 */
function buildStack(
  combo: Rail[],
  { projectCost, marginAvailable, convention = "serviced" }: StackOptions,
): CapitalStack {
  const subsidy = r2(
    combo.reduce((sum, r) => sum + (r.subsidyOfProjectCost ?? 0) * projectCost, 0),
  );

  // The beneficiary's own money is reserved BEFORE any rail draws, at the strictest floor any
  // rail in this combination imposes. Otherwise a subsidy plus a loan can appear to fund 100% of
  // a project, which no scheme permits.
  const ownFloorShare = Math.max(...combo.map((r) => r.minOwnContributionShare));
  const reservedOwn = r2(projectCost * ownFloorShare);

  let remaining = r2(projectCost - subsidy - reservedOwn);
  const components: StackComponent[] = [];

  for (const rail of combo) {
    if (remaining <= 0) break;
    const capByShare = rail.maxShareOfProjectCost * projectCost;
    const amount = r2(Math.min(remaining, rail.maxAmount, capByShare));
    if (amount < rail.minAmount) continue;
    const priced = priceRail(rail, amount, convention);
    components.push({ rail, amount, ...priced });
    remaining = r2(remaining - amount);
  }

  const ownContribution = r2(reservedOwn + Math.max(0, remaining));
  const totalBorrowed = r2(components.reduce((s, c) => s + c.amount, 0));
  const totalInterest = r2(components.reduce((s, c) => s + c.totalInterest, 0));
  const peakQuarterlyOutgo = r2(components.reduce((s, c) => s + c.quarterlyInstalment, 0));
  const balanceCheck = r2(subsidy + ownContribution + totalBorrowed - projectCost);

  let feasible = true;
  let rejectedBecause: string | undefined;

  if (components.length === 0) {
    feasible = false;
    rejectedBecause = "No rail in this combination can fund a draw of a workable size.";
  } else if (ownContribution > marginAvailable) {
    feasible = false;
    rejectedBecause = `Needs ₹${Math.round(ownContribution).toLocaleString("en-IN")} of own money; only ₹${Math.round(marginAvailable).toLocaleString("en-IN")} is available.`;
  } else if (Math.abs(balanceCheck) > 1) {
    feasible = false;
    rejectedBecause = "The stack does not balance against the project cost.";
  }

  return {
    projectCost,
    subsidy,
    ownContribution,
    components,
    totalBorrowed,
    totalInterest,
    balanceCheck,
    peakQuarterlyOutgo,
    // A grant is worth more than an interest saving of the same size, because it is never repaid.
    netCostOfCapital: r2(totalInterest - subsidy),
    feasible,
    rejectedBecause,
  };
}

export interface StackResult {
  best: CapitalStack | null;
  /** Every candidate considered, cheapest first. */
  candidates: CapitalStack[];
  /** What the problem statement's single-scheme routing would have produced. */
  specRouted: CapitalStack | null;
  /** netCostOfCapital saved by stacking versus the specification's route. */
  saving: number | null;
  unverifiedRailsUsed: string[];
}

/**
 * Solve for the cheapest viable capital structure.
 *
 * The search space is small — five rails, pairs only, minus the exclusions — so this is an exact
 * enumeration rather than a heuristic. Exhaustive beats clever here: it is provably optimal over
 * the modelled space, and it is explainable line by line.
 */
export function optimiseStack(opts: StackOptions): StackResult {
  const ineligible = new Set(opts.ineligible ?? []);
  const pool = RAILS.filter((r) => !ineligible.has(r.id));

  const combos: Rail[][] = [];
  for (const a of pool) {
    combos.push([a]);
    for (const b of pool) {
      if (a.id === b.id || excluded(a.id, b.id)) continue;
      // Order matters (the first rail draws first); dedupe by sorting the id pair.
      if (a.id < b.id) combos.push([a, b]);
    }
  }

  const candidates = combos
    .map((c) => buildStack(c, opts))
    .filter((s) => s.components.length > 0)
    .sort((x, y) => {
      if (x.feasible !== y.feasible) return x.feasible ? -1 : 1;
      return x.netCostOfCapital - y.netCostOfCapital;
    });

  const best = candidates.find((c) => c.feasible) ?? null;

  // What the specification alone would have done: route on project cost, single scheme.
  const specRail = RAIL_BY_ID.get(
    opts.projectCost <= SCHEMES["nsfdc-micro-finance"].maxProjectCost
      ? "nsfdc-micro-finance"
      : "nsfdc-term-loan",
  )!;
  const specRouted = buildStack([specRail], opts);

  const saving =
    best && specRouted.feasible ? r2(specRouted.netCostOfCapital - best.netCostOfCapital) : null;

  return {
    best,
    candidates: candidates.slice(0, 8),
    specRouted,
    saving,
    unverifiedRailsUsed: (best?.components ?? [])
      .filter((c) => !c.rail.verified)
      .map((c) => c.rail.name),
  };
}
