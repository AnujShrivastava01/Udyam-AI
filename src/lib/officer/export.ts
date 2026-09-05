/**
 * The officer's queue, as a CSV they can open.
 *
 * The adoption pitch for this console is "37 State Channelizing Agencies open a spreadsheet". Two
 * disabled CSV buttons sitting on that screen were the worst possible place for a dead affordance,
 * so the export is real.
 *
 * Three decisions worth stating:
 *
 * The first line of the file is a provenance banner, not the header row. An export that leaves this
 * app and lands in an office inbox has to carry its own caveat — that the queue is illustrative,
 * which kernel produced the figures, and when. A spreadsheet with no context is exactly how a
 * sample becomes a real sanction list two forwards later. Spreadsheet readers tolerate a leading
 * comment line, and a machine consumer skips one line; the alternative — silent, contextless
 * numbers — is worse than a small parsing inconvenience.
 *
 * Every column is a figure the kernel computed, none is derived here. The console and the export
 * cannot disagree because there is only one source.
 *
 * Rupee columns are plain integers, not formatted strings. "₹1,04,32,118" is text to a spreadsheet
 * and cannot be summed; the officer's first instinct will be to total the column.
 */

import { toCsv } from "@/lib/export/csv";
import type { TriagedApplication } from "./triage";

export const QUEUE_HEADER = [
  "application_id",
  "applicant",
  "village",
  "block",
  "district",
  "activity_id",
  "submitted_on",
  "triage_status",
  "primary_reason",
  "solvency_verdict",
  "project_cost_inr",
  "sanctioned_loan_inr",
  "quarterly_instalment_inr",
  "pre_income_obligation_inr",
  "gestation_months",
  "dscr",
  "income_share",
  "declared_annual_income_inr",
  "routed_to",
  "routing_mismatch",
  "flags",
];

export interface BannerContext {
  /** What this export is, in one sentence. */
  note: string;
  /** ISO timestamp of the export. Passed in so callers control the clock. */
  generatedAt: string;
  /** Any filter the user had applied, so the reader knows the file is not the whole queue. */
  filter?: string;
}

export function queueToCsv(rows: TriagedApplication[], banner: BannerContext): string {
  const table = toCsv(
    QUEUE_HEADER,
    rows.map((r) => [
      r.application.id,
      r.application.applicant,
      r.application.village,
      r.application.block,
      r.application.district,
      r.application.statedActivityId,
      r.application.submittedOn,
      r.status,
      r.reason,
      r.solvency,
      Math.round(r.projectCost),
      Math.round(r.sanctionedLoan),
      Math.round(r.quarterlyInstalment),
      Math.round(r.preIncomeObligation),
      r.gestationMonths ?? "",
      r.dscr ?? "",
      r.incomeShare ?? "",
      r.application.annualHouseholdIncome,
      r.application.routedTo ?? "",
      r.routingMismatch ? "yes" : "no",
      r.flagCodes.join(" "),
    ]),
  );

  const parts = [
    banner.note,
    `Generated ${banner.generatedAt}`,
    banner.filter ? `Filter applied: ${banner.filter}` : null,
    `${rows.length} row${rows.length === 1 ? "" : "s"}`,
  ].filter(Boolean);

  // One comment line, then a blank line, then the table. The blank line matters: without it some
  // importers treat the banner as the header row.
  return `# ${parts.join(" | ")}\r\n\r\n${table}`;
}

export const SAMPLE_QUEUE_NOTE =
  "UdyamAI sanction triage — ILLUSTRATIVE SAMPLE QUEUE. Applicant names are invented. Figures are computed by the UdyamAI finance kernel from NABARD unit costs and NSFDC terms and are not a sanction recommendation.";

/** `udyamai-triage-2026-09-05.csv` — sortable, and obvious in a Downloads folder. */
export function queueFilename(generatedAt: string, prefix = "udyamai-triage"): string {
  const date = generatedAt.slice(0, 10);
  return `${prefix}-${date}.csv`;
}
