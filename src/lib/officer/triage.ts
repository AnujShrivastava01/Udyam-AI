/**
 * SCA loan-officer triage.
 *
 * The adoption path. A consumer app needs 13 lakh beneficiaries to download something; this
 * needs 37 State Channelizing Agencies to open a CSV. It also puts an accountable human back in
 * the loop, which is the honest answer to "what if it advises someone wrongly".
 *
 * Every flag here is produced by the same deterministic kernel the beneficiary-facing pages use.
 * There is no separate officer model, so an officer and an applicant can never be shown
 * contradictory numbers.
 */

import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { plan } from "@/lib/finance";
import type { SolvencyVerdict } from "@/lib/finance/solvency";

export interface Application {
  id: string;
  applicant: string;
  village: string;
  block: string;
  district: string;
  /** Category as recorded on the paper application. */
  statedActivityId: string;
  /** Margin money the applicant says they hold, in rupees. */
  marginCapital: number;
  /** Annual household income as declared, in rupees. */
  annualHouseholdIncome: number;
  /** Scheme the SCA's existing process routed it to, if any. */
  routedTo?: "nsfdc-micro-finance" | "nsfdc-term-loan";
  submittedOn: string;
}

export type TriageStatus = "CLEAR" | "REVIEW" | "BLOCK";

export interface TriagedApplication {
  application: Application;
  status: TriageStatus;
  /** The single reason this row needs attention, in an officer's language. */
  reason: string;
  issues: string[];
  /**
   * Structure flag codes, carried alongside the human-readable issues.
   *
   * The summary counted cap-bound files with `issues.some(i => i.includes("cap"))`, which also
   * matches "Breaches the RBI repayment cap" — an affordability refusal, not a cap on the loan.
   * A count that depends on the wording of a sentence breaks the first time the sentence is
   * edited, and this one was already wrong.
   */
  flagCodes: string[];
  solvency: SolvencyVerdict;
  projectCost: number;
  sanctionedLoan: number;
  quarterlyInstalment: number;
  preIncomeObligation: number;
  /** True when the SCA's own routing disagrees with what the rules produce. */
  routingMismatch: boolean;
}

export interface TriageSummary {
  total: number;
  clear: number;
  review: number;
  block: number;
  gestationGapped: number;
  capBound: number;
  deadZone: number;
  routingMismatches: number;
  /** Total rupees of pre-income obligation across the whole queue. */
  exposedBeforeIncome: number;
}

export function triage(application: Application): TriagedApplication {
  const p = plan({
    marginCapital: application.marginCapital,
    activityId: application.statedActivityId,
    useNeedBasedCosting: true,
    annualHouseholdIncome: application.annualHouseholdIncome,
  });

  const issues: string[] = [];
  const flagCodes: string[] = [];
  for (const f of p.structure.flags) {
    issues.push(f.title);
    flagCodes.push(f.code);
  }

  const routingMismatch =
    application.routedTo != null && application.routedTo !== p.structure.scheme.id;
  if (routingMismatch) issues.push("Scheme routing disagrees with the rules");

  const activity = ACTIVITY_BY_ID.get(application.statedActivityId);
  const affordable = application.marginCapital >= p.structure.requiredMargin;
  if (!affordable) issues.push("Margin shortfall against the costed project");

  if (p.solvency.verdict === "GESTATION_GAP") issues.push("Instalments precede first income");
  if (p.solvency.verdict === "UNAFFORDABLE") issues.push("Breaches the RBI repayment cap");
  if (p.solvency.verdict === "DSCR_FAIL") issues.push("Coverage below the lending norm");

  const blocking =
    p.solvency.verdict === "UNAFFORDABLE" ||
    !affordable ||
    p.structure.flags.some((f) => f.level === "critical");

  const status: TriageStatus = blocking ? "BLOCK" : issues.length > 0 ? "REVIEW" : "CLEAR";

  return {
    application,
    status,
    reason: primaryReason(status, p.solvency.verdict, routingMismatch, affordable, activity?.gestationMonths),
    issues,
    flagCodes,
    solvency: p.solvency.verdict,
    projectCost: p.structure.projectCost,
    sanctionedLoan: p.structure.sanctionedLoan,
    quarterlyInstalment: p.schedule.instalment,
    preIncomeObligation: p.solvency.preIncomeObligation,
    routingMismatch,
  };
}

function primaryReason(
  status: TriageStatus,
  verdict: SolvencyVerdict,
  routingMismatch: boolean,
  affordable: boolean,
  gestationMonths?: number,
): string {
  if (!affordable) return "Applicant cannot fund the margin this activity actually needs.";
  if (verdict === "UNAFFORDABLE") return "Repayment would exceed half the declared household income.";
  if (routingMismatch) return "Routed to the wrong scheme tier for its project cost.";
  if (verdict === "GESTATION_GAP")
    return `Repayment begins roughly ${(gestationMonths ?? 0) - 6} months before this unit earns.`;
  if (verdict === "DSCR_FAIL") return "Earns, but without enough headroom for a bad season.";
  if (status === "CLEAR") return "Structure, cash flow and margin all check out.";
  return "Needs an officer's eye before sanction.";
}

export function triageQueue(applications: Application[]): {
  rows: TriagedApplication[];
  summary: TriageSummary;
} {
  const rows = applications.map(triage);
  const rank: Record<TriageStatus, number> = { BLOCK: 0, REVIEW: 1, CLEAR: 2 };
  rows.sort(
    (a, b) => rank[a.status] - rank[b.status] || b.preIncomeObligation - a.preIncomeObligation,
  );

  return {
    rows,
    summary: {
      total: rows.length,
      clear: rows.filter((r) => r.status === "CLEAR").length,
      review: rows.filter((r) => r.status === "REVIEW").length,
      block: rows.filter((r) => r.status === "BLOCK").length,
      gestationGapped: rows.filter((r) => r.solvency === "GESTATION_GAP").length,
      capBound: rows.filter((r) => r.flagCodes.includes("CAP_BINDING")).length,
      deadZone: rows.filter((r) => r.flagCodes.includes("DEAD_ZONE")).length,
      routingMismatches: rows.filter((r) => r.routingMismatch).length,
      exposedBeforeIncome: Math.round(
        rows.reduce((sum, r) => sum + r.preIncomeObligation, 0),
      ),
    },
  };
}

/**
 * SAMPLE QUEUE — illustrative applications, not real beneficiaries.
 *
 * Names are invented. In production this is a CSV the SCA already has, uploaded as-is.
 */
export const SAMPLE_QUEUE: Application[] = [
  {
    id: "APP-4012",
    applicant: "Rajesh Kushwaha",
    village: "Ghatigaon",
    block: "Ghatigaon",
    district: "Gwalior",
    statedActivityId: "goat-20-1",
    marginCapital: 10_000,
    annualHouseholdIncome: 86_119,
    routedTo: "nsfdc-micro-finance",
    submittedOn: "2026-08-21",
  },
  {
    id: "APP-4013",
    applicant: "Sunita Ahirwar",
    village: "Bhitarwar",
    block: "Bhitarwar",
    district: "Gwalior",
    statedActivityId: "milch-cows-2",
    marginCapital: 25_000,
    annualHouseholdIncome: 104_000,
    routedTo: "nsfdc-term-loan",
    submittedOn: "2026-08-22",
  },
  {
    id: "APP-4014",
    applicant: "Mohan Lal Jatav",
    village: "Karahiya",
    block: "Sheopur",
    district: "Sheopur",
    statedActivityId: "cb-heifer-2",
    marginCapital: 9_000,
    annualHouseholdIncome: 71_400,
    routedTo: "nsfdc-micro-finance",
    submittedOn: "2026-08-23",
  },
  {
    id: "APP-4015",
    applicant: "Phoolwati Bai",
    village: "Dabra",
    block: "Dabra",
    district: "Gwalior",
    statedActivityId: "broiler-250",
    marginCapital: 16_000,
    annualHouseholdIncome: 92_500,
    // Filed under Micro Finance although the ₹1,52,000 project cost puts it over the ₹1.40 lakh
    // boundary. A common and entirely honest clerical error — and exactly what triage should catch.
    routedTo: "nsfdc-micro-finance",
    submittedOn: "2026-08-24",
  },
  {
    id: "APP-4016",
    applicant: "Devendra Singh",
    village: "Ghatigaon",
    block: "Ghatigaon",
    district: "Gwalior",
    statedActivityId: "goat-10-1",
    marginCapital: 6_000,
    annualHouseholdIncome: 64_800,
    routedTo: "nsfdc-micro-finance",
    submittedOn: "2026-08-25",
  },
  {
    id: "APP-4017",
    applicant: "Kamla Devi",
    village: "Bhitarwar",
    block: "Bhitarwar",
    district: "Gwalior",
    statedActivityId: "milch-cows-2",
    marginCapital: 23_000,
    annualHouseholdIncome: 88_000,
    routedTo: "nsfdc-term-loan",
    submittedOn: "2026-08-26",
  },
  {
    id: "APP-4018",
    applicant: "Ramesh Prajapati",
    village: "Dabra",
    block: "Dabra",
    district: "Gwalior",
    statedActivityId: "goat-20-1",
    marginCapital: 4_000,
    annualHouseholdIncome: 58_200,
    routedTo: "nsfdc-micro-finance",
    submittedOn: "2026-08-27",
  },
];
