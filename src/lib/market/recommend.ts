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
import { msg, type Message } from "@/lib/i18n/keys";

import { buildFeasibilityReport } from "./feasibility";
import type { Village } from "./villages";

export interface Recommendation {
  activity: Activity;
  /** 0-100 composite. Higher is better. */
  score: number;
  feasibilityScore: number | null;
  solvency: SolvencyVerdict;
  /** The one thing that decides this row. A message key + params, never prose — so it can be
   *  rendered in Hindi or Hinglish without the engine knowing any language. */
  bindingConstraint: Message;
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
): Message {
  // Numbers are formatted here, once, and passed as slots. The template that receives them may be
  // in any language; it can never alter the figure.
  const inr = (n: number) =>
    `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

  if (!affordable) {
    return msg("constraint.marginShort", {
      required: inr(requiredMargin),
      available: inr(marginCapital),
    });
  }
  if (verdict === "UNAFFORDABLE") return msg("constraint.overIncomeCap");
  if (verdict === "GESTATION_GAP") {
    return msg("constraint.gestationGap", { months: activity.gestationMonths - 6 });
  }
  if (verdict === "DSCR_FAIL") return msg("constraint.thinCoverage");
  if (verdict === "INSUFFICIENT_DATA") return msg("constraint.noGestationData");
  if (saturationLabel === "crowded") return msg("constraint.crowded");
  return msg("constraint.clear");
}
