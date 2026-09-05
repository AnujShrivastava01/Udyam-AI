/**
 * Versioned scheme registry.
 *
 * Every parameter here is DATA, not code — a ministry officer can change a rate or a cap
 * without a developer and without a release. Every row carries its own provenance so that
 * any number rendered in the UI can be traced back to the document it came from.
 *
 * Source of truth: NSFDC (National Scheduled Castes Finance & Development Corporation),
 * the corporation whose scheme parameters SIH26091 reproduces verbatim.
 */

export type SchemeId = "nsfdc-micro-finance" | "nsfdc-term-loan";

/**
 * How interest accruing during the moratorium is treated. Indian concessional lenders use
 * both, and the choice changes the instalment materially — so we compute both and never
 * silently pick one.
 *
 *  - `serviced`    principal holiday only; interest is paid each quarter as it accrues.
 *  - `capitalised` interest accrues and is added to principal (a funded interest term loan).
 */
export type MoratoriumConvention = "serviced" | "capitalised";

export interface Provenance {
  /** Human-readable name of the document or dataset. */
  source: string;
  /** Where it can be checked. */
  url: string;
  /** When the value was last confirmed against that source (ISO date). */
  retrievedAt: string;
  /** The scheme's own effective date, where the document states one. */
  effectiveFrom?: string;
  /**
   * Set when the team has NOT yet re-verified this against a primary source with their own
   * eyes. The UI must surface this rather than present the figure as confirmed.
   */
  needsVerification?: boolean;
}

export interface Scheme {
  id: SchemeId;
  name: string;
  shortName: string;
  corporation: string;
  /** Inclusive lower bound of project cost this scheme covers, in rupees. */
  minProjectCost: number;
  /** Inclusive upper bound of project cost this scheme covers, in rupees. */
  maxProjectCost: number;
  /** Share of project cost the corporation will lend, as a fraction. */
  loanShare: number;
  /** Hard ceiling on the sanctioned loan regardless of project cost, in rupees. */
  maxLoan: number;
  /** Annual interest rate charged to the beneficiary, as a percentage. */
  annualRatePct: number;
  /** Total repayment tenure in months, INCLUDING the moratorium. */
  tenureMonths: number;
  /** Principal holiday in months, measured from disbursement. */
  moratoriumMonths: number;
  /** Repayment frequency in months (3 = quarterly, per the problem statement). */
  restMonths: number;
  provenance: Provenance;
  /**
   * Activity classes that attract a longer moratorium under the same scheme. This exception
   * appears in the NSFDC scheme document but nowhere in the problem statement text.
   */
  moratoriumExceptions?: { appliesTo: string[]; moratoriumMonths: number; note: string }[];
}

const NSFDC_PROVENANCE: Provenance = {
  source: "NSFDC scheme terms (Micro Credit Finance & Term Loan)",
  url: "https://nsfdc.nic.in/scheme",
  retrievedAt: "2026-09-04",
  needsVerification: true,
};

export const SCHEMES: Record<SchemeId, Scheme> = {
  "nsfdc-micro-finance": {
    id: "nsfdc-micro-finance",
    name: "Micro Finance Scheme",
    shortName: "MFS",
    corporation: "NSFDC",
    minProjectCost: 0,
    maxProjectCost: 140_000,
    loanShare: 0.9,
    maxLoan: 125_000,
    annualRatePct: 6.5,
    tenureMonths: 36,
    moratoriumMonths: 3,
    restMonths: 3,
    provenance: NSFDC_PROVENANCE,
  },
  "nsfdc-term-loan": {
    id: "nsfdc-term-loan",
    name: "Term Loan Scheme",
    shortName: "TL",
    corporation: "NSFDC",
    minProjectCost: 140_001,
    maxProjectCost: 5_000_000,
    loanShare: 0.9,
    maxLoan: 4_500_000,
    annualRatePct: 8.0,
    tenureMonths: 84,
    moratoriumMonths: 6,
    restMonths: 3,
    provenance: NSFDC_PROVENANCE,
    moratoriumExceptions: [
      {
        appliesTo: ["plantation", "construction"],
        moratoriumMonths: 12,
        note:
          "NSFDC allows a 12-month moratorium for plantation and construction activities. " +
          "This exception is absent from the problem statement text and changes the instalment materially.",
      },
    ],
  },
};

export const SCHEME_LIST: Scheme[] = [
  SCHEMES["nsfdc-micro-finance"],
  SCHEMES["nsfdc-term-loan"],
];

/**
 * The project cost at which the Micro Finance Scheme's loan cap starts to bind.
 *
 * Below this, 90% of project cost is under the ₹1.25 lakh cap and the beneficiary contributes
 * exactly 10%. Above it — but still inside the Micro Finance tier — the cap holds the loan
 * down while project cost keeps rising, so the beneficiary's real contribution silently
 * exceeds 10%. The problem statement's `Project Cost = Margin ÷ 10%` formula cannot see this.
 */
export const MFS_CAP_BINDS_AT =
  SCHEMES["nsfdc-micro-finance"].maxLoan / SCHEMES["nsfdc-micro-finance"].loanShare; // ₹1,38,888.89

/**
 * RBI's microfinance direction caps the share of monthly household income that may go to
 * repayment obligations. We use it as an affordability guardrail, not as a scheme rule.
 */
export const RBI_REPAYMENT_CAP_OF_INCOME = 0.5;

export const RBI_GUARDRAIL_PROVENANCE: Provenance = {
  source: "RBI Master Direction — Regulatory Framework for Microfinance Loans, 2022",
  url: "https://www.rbi.org.in/",
  retrievedAt: "2026-09-04",
  needsVerification: true,
};
