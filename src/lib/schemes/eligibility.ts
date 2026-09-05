/**
 * Match an applicant against the scheme catalogue.
 *
 * Three outcomes, not two. "Not enough information" is the common one for a visitor who has
 * answered nothing, and collapsing it into "not eligible" would tell somebody they do not qualify
 * for a scheme that has never seen their details.
 *
 * Ordering is by usefulness to the applicant: what they appear to qualify for, then what is still
 * open pending an answer, then what is ruled out — each with the reason attached, because "no" is
 * only useful when it comes with which criterion failed.
 */

import {
  SCHEMES_CATALOGUE,
  type ApplicantProfile,
  type CriterionResult,
  type SchemeEntry,
} from "./catalogue";

export type MatchVerdict = "meets" | "needs-info" | "does-not-meet";

export interface CriterionOutcome {
  label: string;
  result: CriterionResult;
}

export interface SchemeMatch {
  scheme: SchemeEntry;
  verdict: MatchVerdict;
  outcomes: CriterionOutcome[];
  /** Criteria that failed — the reason it is ruled out. */
  failed: string[];
  /** Criteria still unanswered — the questions that would settle it. */
  missing: string[];
}

export function matchSchemes(applicant: ApplicantProfile): SchemeMatch[] {
  const matches = SCHEMES_CATALOGUE.map<SchemeMatch>((scheme) => {
    const outcomes = scheme.criteria.map((c) => ({ label: c.label, result: c.test(applicant) }));
    const failed = outcomes.filter((o) => o.result === "fail").map((o) => o.label);
    const missing = outcomes.filter((o) => o.result === "unknown").map((o) => o.label);

    // A single hard failure rules the scheme out however many other criteria pass — these are
    // conjunctive requirements, not a score.
    const verdict: MatchVerdict =
      failed.length > 0 ? "does-not-meet" : missing.length > 0 ? "needs-info" : "meets";

    return { scheme, verdict, outcomes, failed, missing };
  });

  const rank: Record<MatchVerdict, number> = { meets: 0, "needs-info": 1, "does-not-meet": 2 };
  return matches.sort((a, b) => {
    if (rank[a.verdict] !== rank[b.verdict]) return rank[a.verdict] - rank[b.verdict];
    // Within a group, the ones needing fewest further answers come first.
    return a.missing.length - b.missing.length;
  });
}

export interface MatchSummary {
  meets: number;
  needsInfo: number;
  doesNotMeet: number;
  /** Distinct unanswered criteria across every scheme, most-blocking first. */
  openQuestions: string[];
}

export function summarise(matches: SchemeMatch[]): MatchSummary {
  const counts = { meets: 0, needsInfo: 0, doesNotMeet: 0 };
  const blocking = new Map<string, number>();

  for (const m of matches) {
    if (m.verdict === "meets") counts.meets++;
    else if (m.verdict === "needs-info") counts.needsInfo++;
    else counts.doesNotMeet++;

    // Only count questions that are actually blocking something — a criterion on a scheme already
    // ruled out for another reason is not worth asking about.
    if (m.verdict === "needs-info") {
      for (const q of m.missing) blocking.set(q, (blocking.get(q) ?? 0) + 1);
    }
  }

  return {
    ...counts,
    openQuestions: [...blocking.entries()].sort((a, b) => b[1] - a[1]).map(([q]) => q),
  };
}
