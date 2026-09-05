/**
 * The same queue, ranked by opportunity instead of by risk.
 *
 * The officer console answers "what will go wrong". A financial institution or an impact investor
 * asks the opposite question — "which of these should I fund first" — and it is genuinely a
 * different sort order, not a reversal. The file with the fewest flags is not automatically the
 * one that changes a household's income the most.
 *
 * WHAT THIS IS NOT: a credit score. It does not predict default, it is not calibrated against
 * outcomes, and no model produced it. It is a transparent weighted sum of four figures the kernel
 * already computes, published alongside its own components so a reader can disagree with the
 * weights and re-rank by any single column. That is the only kind of score this project is
 * entitled to ship: one where every input is visible and the arithmetic is checkable by hand.
 *
 * ── Why fixed anchors rather than min-max over the queue ──────────────────────────────────────
 * A min-max normalisation makes a file's score depend on who else is in the queue: add one strong
 * applicant and everybody else's number drops, though nothing about them changed. An officer who
 * sanctions on a number that moves when an unrelated file arrives is being misled. The anchors
 * below are absolute and stated, so a score means the same thing in every queue and across time.
 *
 * ── Why missing data renormalises rather than scoring zero ────────────────────────────────────
 * NABARD's unit-cost tables state capital cost and gestation but not profitability, so for most
 * livestock activities DSCR and uplift are `null`. Treating null as zero would rank "we don't know"
 * below "we know it's bad", which is precisely backwards. Unknown components are dropped and the
 * remaining weights are renormalised.
 *
 * ── Why renormalising is not enough, and completeness gates the sort ──────────────────────────
 * Renormalising alone produced the opposite error, and it was only visible once the page was open:
 * a file with no surplus on record scored on speed and exposure ALONE, both of which maxed out —
 * so "we know nothing about this" rendered as a perfect 100 and outranked a file with a measured
 * 5.08× debt-service coverage. Absence of bad news had become good news.
 *
 * A score built from two components is not on the same scale as one built from four, so they are
 * not compared. Files are grouped by `assessed` first — everything measurable known, some of it
 * known, none of it — and ranked by score only WITHIN a group. A lender reads the fully-assessed
 * files first and the rest as a separate, explicitly less-informed list, which is what they would
 * do with a paper queue anyway.
 */

import type { TriagedApplication } from "./triage";

/** DSCR at or below the lending norm scores nothing; twice the norm scores full marks. */
const DSCR_FLOOR = 1.5;
const DSCR_CEILING = 3.0;

/** Surplus equal to the household's entire existing income is the top of the scale. */
const UPLIFT_CEILING = 1.0;

/** Two years to first income is the bottom of the scale; immediate income is the top. */
const GESTATION_CEILING_MONTHS = 24;

/** A quarter of the sanctioned loan falling due before any income is the bottom of the scale. */
const EXPOSURE_CEILING = 0.25;

export interface Component {
  key: "coverage" | "uplift" | "speed" | "exposure";
  label: string;
  /** The underlying figure, in its own units, for display. `null` when unknown. */
  raw: number | null;
  /** Human rendering of `raw`, units included. */
  display: string;
  /** 0..1 after anchoring, or `null` when the input is unknown. */
  normalised: number | null;
  weight: number;
  /** One line saying what the number means and where it came from. */
  note: string;
}

export interface Opportunity {
  row: TriagedApplication;
  /** 0..100. A sort order with published components, not a rating. */
  score: number;
  components: Component[];
  /** How many of the four components had data. */
  signalsUsed: number;
  /**
   * Whether the score is comparable to another file's.
   *
   * "full" — every component had a value. "partial" — some did; the score is real but built on a
   * narrower base and must not be ranked against a "full" one. "none" — nothing to go on.
   */
  assessed: "full" | "partial" | "none";
  /** True when the triage engine would not let this be sanctioned at all. */
  blocked: boolean;
  /** One sentence naming the strongest component, for the row summary. */
  rationale: string;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pct = (n: number) => `${Math.round(n * 100)}%`;
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

function components(row: TriagedApplication): Component[] {
  const { dscr, annualSurplus, gestationMonths, preIncomeObligation, sanctionedLoan } = row;
  const income = row.application.annualHouseholdIncome;

  const uplift = annualSurplus != null && income > 0 ? annualSurplus / income : null;

  const exposureRatio = sanctionedLoan > 0 ? preIncomeObligation / sanctionedLoan : null;

  return [
    {
      key: "coverage",
      label: "Repayment coverage",
      raw: dscr,
      display: dscr == null ? "not stated" : `${dscr.toFixed(2)}×`,
      normalised:
        dscr == null ? null : clamp01((dscr - DSCR_FLOOR) / (DSCR_CEILING - DSCR_FLOOR)),
      weight: 0.35,
      note: `Annual surplus ÷ peak annual debt service. Scored from ${DSCR_FLOOR}× (the lending norm) to ${DSCR_CEILING}×.`,
    },
    {
      key: "uplift",
      label: "Income uplift",
      raw: uplift,
      display: uplift == null ? "not stated" : `${pct(uplift)} of ₹${inr(income)}/yr`,
      normalised: uplift == null ? null : clamp01(uplift / UPLIFT_CEILING),
      weight: 0.3,
      note: "Activity surplus as a share of the household's declared income — what the loan changes, not what it returns.",
    },
    {
      key: "speed",
      label: "Time to first income",
      raw: gestationMonths,
      display: gestationMonths == null ? "not stated" : `${gestationMonths} months`,
      normalised:
        gestationMonths == null
          ? null
          : clamp01(1 - gestationMonths / GESTATION_CEILING_MONTHS),
      weight: 0.2,
      note: `From the activity's NABARD record. Scored from ${GESTATION_CEILING_MONTHS} months down to immediate.`,
    },
    {
      key: "exposure",
      label: "Exposure before income",
      raw: exposureRatio,
      display:
        exposureRatio == null
          ? "not stated"
          : `₹${inr(preIncomeObligation)} (${pct(exposureRatio)} of loan)`,
      normalised: exposureRatio == null ? null : clamp01(1 - exposureRatio / EXPOSURE_CEILING),
      weight: 0.15,
      note: "Instalments falling due before the unit earns, as a share of the sanctioned loan. Lower is better.",
    },
  ];
}

export function assess(row: TriagedApplication): Opportunity {
  const parts = components(row);
  const known = parts.filter((c) => c.normalised != null);
  const totalWeight = known.reduce((sum, c) => sum + c.weight, 0);

  // No usable signal at all. Zero would sort it below a file we know is weak; it is placed at the
  // bottom by `signalsUsed` in the sort instead, and the score is reported as 0 with 0 signals so
  // the UI can render "not enough data" rather than a number.
  const score =
    totalWeight === 0
      ? 0
      : Math.round(
          (100 * known.reduce((sum, c) => sum + (c.normalised as number) * c.weight, 0)) /
            totalWeight,
        );

  const strongest = [...known].sort(
    (a, b) => (b.normalised as number) - (a.normalised as number),
  )[0];

  return {
    row,
    score,
    components: parts,
    signalsUsed: known.length,
    assessed: known.length === parts.length ? "full" : known.length === 0 ? "none" : "partial",
    blocked: row.status === "BLOCK",
    rationale: rationale(row, strongest),
  };
}

function rationale(row: TriagedApplication, strongest: Component | undefined): string {
  if (row.status === "BLOCK") return "Blocked by triage — not fundable as filed.";
  if (!strongest) return "No surplus or gestation figure on record for this activity.";

  switch (strongest.key) {
    case "coverage":
      return `Covers its debt service ${strongest.display} over.`;
    case "uplift":
      return `Adds ${strongest.display} to the household.`;
    case "speed":
      return `Earns within ${strongest.display}.`;
    case "exposure":
      return "Almost nothing falls due before the unit earns.";
  }
}

const ASSESSED_RANK: Record<Opportunity["assessed"], number> = { full: 0, partial: 1, none: 2 };

/**
 * Rank a queue by opportunity.
 *
 * Three tie-breaks, in this order and for these reasons:
 *
 * 1. Blocked files sort last regardless of score. A file the rules will not sanction is not an
 *    opportunity, and burying that under a good number is the mistake this console exists to
 *    prevent.
 * 2. Then by how completely the file could be assessed. A score from two components is not on the
 *    same scale as one from four — see the note at the top of this file for the failure this
 *    prevents.
 * 3. Only then by score, and finally by loan size so the order is stable.
 */
export function rankByOpportunity(rows: TriagedApplication[]): Opportunity[] {
  return rows
    .map(assess)
    .sort(
      (a, b) =>
        Number(a.blocked) - Number(b.blocked) ||
        ASSESSED_RANK[a.assessed] - ASSESSED_RANK[b.assessed] ||
        b.score - a.score ||
        b.row.sanctionedLoan - a.row.sanctionedLoan,
    );
}

export interface PortfolioSummary {
  fundable: number;
  blocked: number;
  /** Total sanctionable across the fundable files. */
  deployable: number;
  /** Sum of annual surplus across fundable files that state one. */
  annualSurplus: number;
  /** How many fundable files carry a surplus figure at all. */
  surplusKnownFor: number;
  /**
   * Median score across fundable files assessed on ALL four components.
   *
   * Deliberately not "all scorable files": mixing partial scores into the median produced a
   * portfolio median of 100 driven entirely by files nothing was known about.
   */
  medianScore: number | null;
  /** How many files that median is computed over. */
  medianOver: number;
}

export function summarise(ranked: Opportunity[]): PortfolioSummary {
  const fundable = ranked.filter((o) => !o.blocked);
  const withSurplus = fundable.filter((o) => o.row.annualSurplus != null);
  const scored = fundable
    .filter((o) => o.assessed === "full")
    .map((o) => o.score)
    .sort((a, b) => a - b);

  return {
    fundable: fundable.length,
    blocked: ranked.length - fundable.length,
    deployable: Math.round(fundable.reduce((sum, o) => sum + o.row.sanctionedLoan, 0)),
    annualSurplus: Math.round(
      withSurplus.reduce((sum, o) => sum + (o.row.annualSurplus as number), 0),
    ),
    surplusKnownFor: withSurplus.length,
    medianOver: scored.length,
    medianScore: scored.length
      ? scored.length % 2
        ? scored[(scored.length - 1) / 2]
        : Math.round((scored[scored.length / 2 - 1] + scored[scored.length / 2]) / 2)
      : null,
  };
}
