/**
 * The recommender.
 *
 * This is the module that turns a report into advice. Its job is not to find the most exciting
 * activity — it is to refuse the ones that will fail, and to say why in one sentence.
 *
 * Design constraint, taken from the evidence: an LLM mentor that hands a low-baseline
 * entrepreneur a menu of plausible options makes their outcomes WORSE, because the burden of
 * choosing badly falls on them. So this returns a ranked list with ONE recommendation at the
 * top and the binding constraint named on every row — never an undifferentiated menu.
 */

import { ACTIVITIES, type Activity } from "@/lib/finance/activities";
import { plan } from "@/lib/finance";
import type { SolvencyVerdict } from "@/lib/finance/solvency";

import { buildFeasibilityReport } from "./feasibility";
import type { Village } from "./villages";

export interface Recommendation {
  activity: Activity;
  /** 0-100 composite. Higher is better. */
  score: number;
  feasibilityScore: number | null;
  solvency: SolvencyVerdict;
  /** The one thing that decides this row, in plain words. */
  bindingConstraint: string;
  /** Money the borrower must find before the unit earns, in rupees. */
  preIncomeObligation: number;
  quarterlyInstalment: number;
  projectCost: number;
  requiredMargin: number;
  affordable: boolean;
  /** True when we are recommending against this. */
  advisedAgainst: boolean;
}

export interface RecommendationSet {
  village: Village;
  marginCapital: number;
  ranked: Recommendation[];
  top: Recommendation | null;
  /** Set when nothing clears the bar — we say so rather than promoting the least-bad option. */
  refusal: string | null;
}

const SOLVENCY_PENALTY: Record<SolvencyVerdict, number> = {
  FEASIBLE: 0,
  DSCR_FAIL: 25,
  GESTATION_GAP: 35,
  UNAFFORDABLE: 60,
  INSUFFICIENT_DATA: 15,
};

export function recommendActivities(
  village: Village,
  marginCapital: number,
  annualHouseholdIncome?: number,
): RecommendationSet {
  const ranked: Recommendation[] = ACTIVITIES.map((activity) => {
    const feasibility = buildFeasibilityReport(village, activity);
    const p = plan({
      marginCapital,
      activityId: activity.id,
      useNeedBasedCosting: true,
      annualHouseholdIncome,
    });

    const affordable = marginCapital >= p.structure.requiredMargin;
    const base = feasibility.score ?? 50;
    const score = Math.max(
      0,
      Math.min(100, Math.round(base - SOLVENCY_PENALTY[p.solvency.verdict] - (affordable ? 0 : 20))),
    );

    return {
      activity,
      score,
      feasibilityScore: feasibility.score,
      solvency: p.solvency.verdict,
      bindingConstraint: bindingConstraintFor(
        p.solvency.verdict,
        affordable,
        p.structure.requiredMargin,
        marginCapital,
        activity,
        feasibility.saturation.label,
      ),
      preIncomeObligation: p.solvency.preIncomeObligation,
      quarterlyInstalment: p.schedule.instalment,
      projectCost: p.structure.projectCost,
      requiredMargin: p.structure.requiredMargin,
      affordable,
      advisedAgainst:
        !affordable ||
        p.solvency.verdict === "UNAFFORDABLE" ||
        (p.solvency.verdict === "GESTATION_GAP" && p.solvency.preIncomeObligation > marginCapital),
    };
  }).sort((a, b) => b.score - a.score);

  const viable = ranked.filter((r) => !r.advisedAgainst);
  const top = viable[0] ?? null;

  return {
    village,
    marginCapital,
    ranked,
    top,
    refusal: top
      ? null
      : "None of the activities we hold data for clear the bar at this margin in this village. " +
        "That is a finding, not a failure — the honest options are to raise the margin, pick a " +
        "village with better market access, or wait. We will not promote the least-bad option.",
  };
}

function bindingConstraintFor(
  verdict: SolvencyVerdict,
  affordable: boolean,
  requiredMargin: number,
  marginCapital: number,
  activity: Activity,
  saturationLabel: string,
): string {
  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

  if (!affordable) {
    return `Needs ₹${inr(requiredMargin)} of your own money; you have ₹${inr(marginCapital)}.`;
  }
  if (verdict === "UNAFFORDABLE") {
    return "Repayment would exceed half your household income — over RBI's limit.";
  }
  if (verdict === "GESTATION_GAP") {
    return `Instalments start ${activity.gestationMonths - 6} months before this unit earns anything.`;
  }
  if (verdict === "DSCR_FAIL") {
    return "Earns, but with too little headroom to survive a bad season.";
  }
  if (verdict === "INSUFFICIENT_DATA") {
    return "We do not hold a gestation figure for this activity.";
  }
  if (saturationLabel === "crowded") {
    return "Cash flow works, but the block is already above the national norm for this sector.";
  }
  return "Income starts before repayment does, and the margin is within reach.";
}
