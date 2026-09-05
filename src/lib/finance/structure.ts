/**
 * Project-cost structuring and scheme routing, with an explainable trace.
 *
 * The problem statement specifies `Project Cost = Available Margin ÷ 10%` and a threshold rule
 * at ₹1.40 lakh. We implement that exactly — and then apply the two constraints the scheme
 * documents themselves impose but the formula omits: the loan caps, and the tier ceiling.
 *
 * Nothing here contradicts the specification. It completes it.
 */

import {
  MFS_CAP_BINDS_AT,
  SCHEMES,
  SCHEME_LIST,
  type Scheme,
  type SchemeId,
} from "./schemes";

export type FlagLevel = "info" | "warning" | "critical";

export interface StructureFlag {
  code:
    | "CAP_BINDING"
    | "DEAD_ZONE"
    | "ABOVE_TIER_CEILING"
    | "BELOW_MINIMUM"
    | "MARGIN_SHORTFALL";
  level: FlagLevel;
  title: string;
  detail: string;
}

/** One step of the routing decision, so the user can see *why*, not just *what*. */
export interface TraceStep {
  rule: string;
  outcome: string;
}

export interface StructureInput {
  /** Cash the beneficiary actually has, in rupees. */
  marginCapital: number;
  /**
   * What the activity actually costs, when known (e.g. from a NABARD unit-cost norm).
   * When supplied, this drives the structuring instead of the margin-inversion formula.
   */
  neededProjectCost?: number;
  /** Activity class, used to pick up moratorium exceptions. */
  activityClass?: string;
}

export interface Structure {
  /** How the project cost was arrived at. */
  basis: "margin-inversion" | "need-based";
  projectCost: number;
  /** Loan before the cap is applied — i.e. `loanShare × projectCost`. */
  indicativeLoan: number;
  /** Loan after the cap is applied. This is the sanctionable figure. */
  sanctionedLoan: number;
  /** What the beneficiary must actually put in: projectCost − sanctionedLoan. */
  requiredMargin: number;
  /** requiredMargin ÷ projectCost. Equals the scheme's nominal 10% only when no cap binds. */
  effectiveMarginPct: number;
  scheme: Scheme;
  /** Moratorium after any activity-class exception is applied. */
  moratoriumMonths: number;
  moratoriumNote?: string;
  flags: StructureFlag[];
  trace: TraceStep[];
}

/** Route a project cost to its scheme tier, exactly as the problem statement's Logic A / B. */
/**
 * Route a project cost to its scheme.
 *
 * Partitions on the UPPER bound only. The declared bands are ₹0–₹1,40,000 and
 * ₹1,40,001–₹50,00,000, which leaves a one-rupee hole: a project cost of ₹1,40,000.50 matched
 * neither band and structure() threw "no scheme covers a project cost of 140000.5". Nothing in the
 * UI reaches it — the slider steps ₹1,000 and every unit cost is an integer — but /api/narrate
 * accepts an arbitrary margin, and a kernel that throws on a value inside its own documented range
 * is a kernel with a hole in it.
 *
 * Matching on the upper bound alone keeps both tiers' boundary wording exactly as declared while
 * making the function total over [0, ceiling]. Above the ceiling it still returns null, because
 * that is a refusal the caller must handle, not a rounding question.
 */
export function routeScheme(projectCost: number): Scheme | null {
  if (!Number.isFinite(projectCost) || projectCost < 0) return null;
  return SCHEME_LIST.find((s) => projectCost <= s.maxProjectCost) ?? null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

export function structure(input: StructureInput): Structure {
  const { marginCapital, neededProjectCost, activityClass } = input;

  const basis: Structure["basis"] = neededProjectCost != null ? "need-based" : "margin-inversion";
  const flags: StructureFlag[] = [];
  const trace: TraceStep[] = [];

  // --- 1. project cost ------------------------------------------------------------------
  let projectCost: number;
  if (neededProjectCost != null) {
    projectCost = r2(neededProjectCost);
    trace.push({
      rule: "Project cost from activity unit cost",
      outcome: `₹${inr(projectCost)} — the activity's own costed requirement, not a figure derived from the wallet`,
    });
  } else {
    projectCost = r2(marginCapital / 0.1);
    trace.push({
      rule: "Project Cost = Available Margin ÷ 10%  (as specified)",
      outcome: `₹${inr(marginCapital)} ÷ 0.10 = ₹${inr(projectCost)}`,
    });
  }

  // --- 1a. nothing to structure ----------------------------------------------------------
  // A cleared margin field is an ordinary thing for a user to do, not an exceptional one. Return a
  // well-formed zero structure with the BELOW_MINIMUM flag the type has always declared, so the UI
  // can say "enter an amount" instead of the kernel throwing mid-render.
  // marginCapital arrives from a text field, so a NaN is an ordinary user state (a cleared input)
  // and gets the soft refusal below, not an exception. neededProjectCost comes from the activity
  // registry — a non-finite value there is a programming error and should be loud.
  if (neededProjectCost != null && !Number.isFinite(neededProjectCost)) {
    throw new Error("structure: neededProjectCost must be a finite number");
  }
  if (!Number.isFinite(projectCost) || projectCost <= 0) {
    const scheme = SCHEMES["nsfdc-micro-finance"];
    return {
      basis,
      projectCost: 0,
      indicativeLoan: 0,
      sanctionedLoan: 0,
      requiredMargin: 0,
      effectiveMarginPct: 0,
      scheme,
      moratoriumMonths: scheme.moratoriumMonths,
      flags: [
        {
          code: "BELOW_MINIMUM",
          level: "info",
          title: "Nothing to structure yet",
          detail:
            basis === "margin-inversion"
              ? "Enter the amount of your own money to see what it can fund."
              : "This activity has no costed requirement, so there is nothing to structure.",
        },
      ],
      trace,
    };
  }

  // --- 2. tier ceiling ------------------------------------------------------------------
  const ceiling = SCHEMES["nsfdc-term-loan"].maxProjectCost;
  if (projectCost > ceiling) {
    flags.push({
      code: "ABOVE_TIER_CEILING",
      level: "critical",
      title: "Above the scheme ceiling",
      detail:
        `A project cost of ₹${inr(projectCost)} exceeds the ₹${inr(ceiling)} ceiling these schemes cover. ` +
        `Either the project is scoped down, or it needs a different funding rail.`,
    });
    projectCost = ceiling;
    trace.push({
      rule: "Cap project cost at the scheme ceiling",
      outcome: `Structured at ₹${inr(ceiling)}`,
    });
  }

  // --- 3. route -------------------------------------------------------------------------
  const scheme = routeScheme(projectCost);
  if (!scheme) {
    throw new Error(`structure: no scheme covers a project cost of ${projectCost}`);
  }
  trace.push({
    rule:
      scheme.id === "nsfdc-micro-finance"
        ? "Logic A — project cost ≤ ₹1.40 lakh"
        : "Logic B — project cost > ₹1.40 lakh and ≤ ₹50 lakh",
    outcome: `${scheme.name} · ${scheme.annualRatePct}% p.a. · ${scheme.tenureMonths / 12} years`,
  });

  // --- 4. loan, then the cap ------------------------------------------------------------
  const indicativeLoan = r2(projectCost * scheme.loanShare);
  const sanctionedLoan = r2(Math.min(indicativeLoan, scheme.maxLoan));

  trace.push({
    rule: `Loan = ${scheme.loanShare * 100}% of project cost`,
    outcome: `₹${inr(indicativeLoan)}`,
  });

  if (sanctionedLoan < indicativeLoan) {
    trace.push({
      rule: `Apply the ₹${inr(scheme.maxLoan)} cap`,
      outcome: `Sanctionable loan held down to ₹${inr(sanctionedLoan)}`,
    });
    flags.push({
      code: "CAP_BINDING",
      level: "warning",
      title: "The loan cap is binding",
      detail:
        `${scheme.name} lends at most ₹${inr(scheme.maxLoan)}. At a project cost of ₹${inr(projectCost)} ` +
        `the ${scheme.loanShare * 100}% share would be ₹${inr(indicativeLoan)}, so the cap — not the percentage — ` +
        `is what sets the loan.`,
    });
  }

  const requiredMargin = r2(projectCost - sanctionedLoan);
  const effectiveMarginPct = projectCost > 0 ? requiredMargin / projectCost : 0;

  // --- 5. the dead zone -----------------------------------------------------------------
  // Between the point where the MFS cap starts to bind and the tier boundary, the beneficiary
  // is silently required to find more than 10%. The specification's formula cannot express this.
  if (
    scheme.id === "nsfdc-micro-finance" &&
    projectCost > MFS_CAP_BINDS_AT &&
    projectCost <= scheme.maxProjectCost
  ) {
    flags.push({
      code: "DEAD_ZONE",
      level: "critical",
      title: "Dead zone — the 10% rule silently breaks here",
      detail:
        `The ₹${inr(scheme.maxLoan)} cap starts binding at a project cost of ₹${inr(MFS_CAP_BINDS_AT)}, not at the ` +
        `₹1.40 lakh tier boundary. Between those two figures the beneficiary must contribute ` +
        `${(effectiveMarginPct * 100).toFixed(2)}% — not 10% — so the structure is not financeable as specified. ` +
        `Either scope the project below ₹${inr(MFS_CAP_BINDS_AT)}, or cross into the Term Loan tier.`,
    });
  }

  // --- 6. can the beneficiary actually fund the margin? ---------------------------------
  if (basis === "need-based" && marginCapital < requiredMargin) {
    flags.push({
      code: "MARGIN_SHORTFALL",
      level: "critical",
      title: "Margin shortfall",
      detail:
        `This activity needs ₹${inr(requiredMargin)} of own contribution but only ₹${inr(marginCapital)} is available — ` +
        `a gap of ₹${inr(requiredMargin - marginCapital)}.`,
    });
  }

  // --- 7. moratorium exceptions ---------------------------------------------------------
  let moratoriumMonths = scheme.moratoriumMonths;
  let moratoriumNote: string | undefined;
  const exception = scheme.moratoriumExceptions?.find((e) =>
    activityClass ? e.appliesTo.includes(activityClass) : false,
  );
  if (exception) {
    moratoriumMonths = exception.moratoriumMonths;
    moratoriumNote = exception.note;
    trace.push({
      rule: `Moratorium exception for ${activityClass}`,
      outcome: `${exception.moratoriumMonths} months instead of ${scheme.moratoriumMonths}`,
    });
  }

  return {
    basis,
    projectCost,
    indicativeLoan,
    sanctionedLoan,
    requiredMargin,
    effectiveMarginPct,
    scheme,
    moratoriumMonths,
    moratoriumNote,
    flags,
    trace,
  };
}

/**
 * The tier boundary rendered as a comparison.
 *
 * One rupee of project cost moves the borrower between schemes. The cheaper headline rate is
 * not the lighter cash-flow burden — and no beneficiary can see that unaided.
 */
export interface CliffComparison {
  below: { projectCost: number; scheme: SchemeId; loan: number };
  above: { projectCost: number; scheme: SchemeId; loan: number };
}

export function cliffAt(boundary = SCHEMES["nsfdc-micro-finance"].maxProjectCost): CliffComparison {
  const below = structure({ marginCapital: boundary * 0.1, neededProjectCost: boundary });
  const above = structure({ marginCapital: boundary * 0.1, neededProjectCost: boundary + 1 });
  return {
    below: { projectCost: below.projectCost, scheme: below.scheme.id, loan: below.sanctionedLoan },
    above: { projectCost: above.projectCost, scheme: above.scheme.id, loan: above.sanctionedLoan },
  };
}
