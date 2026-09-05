/**
 * SIDDHI-Bench — case generation.
 *
 * A public benchmark for concessional-loan arithmetic under the NSFDC schemes SIH26091 describes.
 *
 * Why this benchmark exists: the closest prior work on deterministic tool-grounding for financial
 * reasoning explicitly leaves loan/EMI arithmetic unevaluated. This fills that hole for a domain
 * where a wrong answer is not a bad user experience — it is a household pushed to a moneylender.
 *
 * Generation is SEEDED and therefore reproducible. Anyone can regenerate the identical 500 cases
 * and re-score any solver against them.
 */

import { MFS_CAP_BINDS_AT, SCHEMES, type MoratoriumConvention } from "@/lib/finance";

export interface BenchCase {
  id: string;
  /** What the beneficiary holds, in rupees. */
  marginCapital: number;
  /** The costed requirement, when the case is need-based. */
  projectCost: number;
  convention: MoratoriumConvention;
  /** Activity class, which can trigger the 12-month plantation/construction moratorium. */
  activityClass?: string;
  /** Which hard region this case was drawn from — used to report accuracy per region. */
  region: CaseRegion;
}

export type CaseRegion =
  | "ordinary-micro"
  | "ordinary-term"
  | "tier-boundary"
  | "dead-zone"
  | "cap-binding"
  | "near-ceiling"
  | "plantation-exception"
  | "capitalised";

/**
 * Deterministic PRNG (mulberry32).
 *
 * `Math.random()` would make the benchmark unreproducible, which would defeat its purpose — a
 * benchmark nobody else can regenerate is an assertion, not evidence.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round to a multiple of ten so a 10% margin is exact. */
const toTen = (n: number) => Math.round(n / 10) * 10;

const MFS = SCHEMES["nsfdc-micro-finance"];
const TERM = SCHEMES["nsfdc-term-loan"];

/** How many cases to draw from each region. Hard regions are deliberately over-sampled. */
const MIX: [CaseRegion, number][] = [
  ["ordinary-micro", 0.16],
  ["ordinary-term", 0.20],
  ["tier-boundary", 0.14],
  ["dead-zone", 0.14],
  ["cap-binding", 0.12],
  ["near-ceiling", 0.08],
  ["plantation-exception", 0.08],
  ["capitalised", 0.08],
];

/**
 * Project costs are always a multiple of ten.
 *
 * This matters for fairness, not tidiness. A case's margin is its 10% share; if the project cost
 * were arbitrary, `margin / 0.1` would not round-trip and a solver that inverts the margin — which
 * is exactly what the specification says to do — would be penalised for OUR rounding rather than
 * for its own errors. A benchmark that overstates its finding is worse than no benchmark.
 */
function drawProjectCost(region: CaseRegion, rnd: () => number): number {
  const r = rnd();
  switch (region) {
    case "ordinary-micro":
      // Comfortably below the point where the cap starts to bite.
      return toTen(20_000 + r * (MFS_CAP_BINDS_AT - 25_000));
    case "ordinary-term":
      return toTen(150_000 + r * 2_000_000);
    case "tier-boundary":
      // Straddle ₹1,40,000 by a few thousand either way.
      return toTen(MFS.maxProjectCost - 4_000 + r * 8_000);
    case "dead-zone":
      // Strictly inside ₹1,38,889 → ₹1,40,000, where the cap binds but the tier has not changed.
      return toTen(Math.ceil(MFS_CAP_BINDS_AT) + 10 + r * (MFS.maxProjectCost - Math.ceil(MFS_CAP_BINDS_AT) - 10));
    case "cap-binding":
      // Term-loan territory where 90% would exceed the ₹45 lakh cap.
      return toTen(TERM.maxLoan / TERM.loanShare + r * 200_000);
    case "near-ceiling":
      return toTen(TERM.maxProjectCost - r * 300_000);
    case "plantation-exception":
      return toTen(300_000 + r * 1_500_000);
    case "capitalised":
      return toTen(50_000 + r * 1_200_000);
  }
}

export interface GenerateOptions {
  count?: number;
  seed?: number;
}

/** Generate the benchmark. Same seed and count ⇒ byte-identical cases. */
export function generateCases({ count = 500, seed = 26091 }: GenerateOptions = {}): BenchCase[] {
  const rnd = mulberry32(seed);
  const cases: BenchCase[] = [];

  // Build the region schedule up front so the mix is exact rather than probabilistic.
  const schedule: CaseRegion[] = [];
  for (const [region, share] of MIX) {
    for (let i = 0; i < Math.round(count * share); i++) schedule.push(region);
  }
  while (schedule.length < count) schedule.push("ordinary-term");
  schedule.length = count;

  schedule.forEach((region, i) => {
    const projectCost = drawProjectCost(region, rnd);
    const convention: MoratoriumConvention =
      region === "capitalised" ? "capitalised" : rnd() < 0.2 ? "capitalised" : "serviced";
    const activityClass =
      region === "plantation-exception" ? (rnd() < 0.5 ? "plantation" : "construction") : undefined;

    cases.push({
      id: `SB-${String(i + 1).padStart(4, "0")}`,
      // The beneficiary's nominal 10% share of the costed project.
      // Exact by construction, because projectCost is a multiple of ten.
      marginCapital: projectCost / 10,
      projectCost,
      convention,
      activityClass,
      region,
    });
  });

  return cases;
}

export const REGIONS: CaseRegion[] = MIX.map(([r]) => r);
