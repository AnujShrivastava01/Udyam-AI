/**
 * The deterministic finance kernel — public API.
 *
 * Pure by construction: no database, no network, no framework. `import` it with sockets
 * monkeypatched to throw and every number here is unchanged. That property is the difference
 * between a system and a prompt, and it is the one we hold ourselves to.
 *
 * The language model never computes any of these values. It narrates them.
 */

export * from "./schemes";
export * from "./amortise";
export * from "./structure";
export * from "./activities";
export * from "./solvency";

import { amortise, type AmortiseResult } from "./amortise";
import { ACTIVITY_BY_ID, type Activity } from "./activities";
import type { MoratoriumConvention } from "./schemes";
import { structure, type Structure } from "./structure";
import { assessSolvency, type SolvencyResult } from "./solvency";

export interface PlanInput {
  /** Cash the beneficiary actually has, in rupees. */
  marginCapital: number;
  /** Activity id from the NABARD seed dataset. Optional — without it we cannot judge solvency. */
  activityId?: string;
  /**
   * Size the project from the activity's own unit cost rather than by inverting the margin.
   * Both are computed; this decides which one leads.
   */
  useNeedBasedCosting?: boolean;
  /** Beneficiary's baseline annual household income, for the affordability guardrail. */
  annualHouseholdIncome?: number;
  convention?: MoratoriumConvention;
}

export interface Plan {
  input: PlanInput;
  activity: Activity | null;
  structure: Structure;
  schedule: AmortiseResult;
  solvency: SolvencyResult;
  /**
   * The same loan under the other moratorium convention, so the difference is visible rather
   * than buried in an assumption.
   */
  alternateConvention: { convention: MoratoriumConvention; instalment: number; totalInterest: number };
  convention: MoratoriumConvention;
}

/**
 * Structure, schedule and judge a loan in one call.
 *
 * Every figure this returns is reproducible from the inputs by hand.
 */
export function plan(input: PlanInput): Plan {
  const {
    marginCapital,
    activityId,
    useNeedBasedCosting = false,
    annualHouseholdIncome,
    convention = "serviced",
  } = input;

  const activity = activityId ? (ACTIVITY_BY_ID.get(activityId) ?? null) : null;

  const s = structure({
    marginCapital,
    neededProjectCost: useNeedBasedCosting && activity ? activity.unitCost : undefined,
    activityClass: activity?.activityClass,
  });

  const amortiseArgs = {
    principal: s.sanctionedLoan,
    annualRatePct: s.scheme.annualRatePct,
    tenureMonths: s.scheme.tenureMonths,
    moratoriumMonths: s.moratoriumMonths,
    restMonths: s.scheme.restMonths,
  };

  const schedule = amortise({ ...amortiseArgs, convention });
  const other: MoratoriumConvention = convention === "serviced" ? "capitalised" : "serviced";
  const alt = amortise({ ...amortiseArgs, convention: other });

  const solvency = assessSolvency({
    schedule: schedule.schedule,
    gestationMonths: activity ? activity.gestationMonths : null,
    annualSurplus: activity?.annualSurplus,
    annualHouseholdIncome,
  });

  return {
    input,
    activity,
    structure: s,
    schedule,
    solvency,
    convention,
    alternateConvention: {
      convention: other,
      instalment: alt.instalment,
      totalInterest: alt.totalInterest,
    },
  };
}

/**
 * Structure and schedule a loan directly from a project cost.
 *
 * Used by the cliff explorer, where the point is to sweep project cost across the tier boundary
 * and watch the scheme — and therefore the instalment — change underneath it.
 */
export function quoteAtProjectCost(
  projectCost: number,
  convention: MoratoriumConvention = "serviced",
) {
  const s = structure({ marginCapital: projectCost * 0.1, neededProjectCost: projectCost });
  const schedule = amortise({
    principal: s.sanctionedLoan,
    annualRatePct: s.scheme.annualRatePct,
    tenureMonths: s.scheme.tenureMonths,
    moratoriumMonths: s.moratoriumMonths,
    restMonths: s.scheme.restMonths,
    convention,
  });
  return { structure: s, schedule };
}

/**
 * The demonstration the problem statement's own example produces.
 *
 * ₹1 lakh of margin, inverted by the specified formula, routes to a ₹9 lakh Term Loan. We
 * compute it exactly as specified so the figure can be shown, and then shown against what the
 * beneficiary population actually earns.
 */
export function specificationExample() {
  return plan({ marginCapital: 100_000, convention: "serviced" });
}
