/**
 * SWOT, derived rather than written.
 *
 * PS 26091 asks for a bank-ready SWOT. The tempting way to produce one is to hand the village and
 * the trade to a language model and print the four lists it returns. That produces plausible
 * paragraphs and nothing a reviewer can check — and it is exactly what this product exists to
 * argue against.
 *
 * Every entry below is a rule over figures the engine already computed. Each one carries the
 * `evidence` string that triggered it, so a bank officer reading "power supply will not run this
 * unit" can see it came from 11 hours against a requirement of 8, and disagree with the threshold
 * rather than with the vibe. Nothing here is generated text.
 *
 * A quadrant can legitimately come back empty. An empty Strengths list is information; four
 * invented bullets are not.
 */

import type { Plan } from "@/lib/finance";
import type { Activity } from "@/lib/finance/activities";
import type { Village } from "./villages";
import type { FeasibilityReport } from "./feasibility";

export type SwotQuadrant = "strength" | "weakness" | "opportunity" | "threat";

export interface SwotItem {
  quadrant: SwotQuadrant;
  /** The finding, in an officer's language. */
  claim: string;
  /** The figures that produced it. Always populated — a claim without one does not belong here. */
  evidence: string;
  /** Which subsystem produced it, so a reader knows what to re-check. */
  from: "kernel" | "market" | "census";
}

const pct = (n: number) => `${n.toFixed(1)}%`;
const inr = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

export function buildSwot(
  village: Village,
  activity: Activity | null,
  plan: Plan | null,
  report: FeasibilityReport,
): SwotItem[] {
  const items: SwotItem[] = [];
  const add = (
    quadrant: SwotQuadrant,
    from: SwotItem["from"],
    claim: string,
    evidence: string,
  ) => items.push({ quadrant, from, claim, evidence });

  const sat = report.saturation;

  // ── market room ───────────────────────────────────────────────────────────
  if (sat.label === "underserved") {
    add(
      "opportunity",
      "market",
      "This block is under-supplied for the sector",
      `Saturation index ${sat.index.toFixed(2)}× the national rural norm — ${sat.observedSector} units estimated against ${sat.expectedSector} the population would support.`,
    );
  } else if (sat.label === "crowded") {
    add(
      "threat",
      "market",
      "The sector is already above the national norm here",
      `Saturation index ${sat.index.toFixed(2)}× — ${sat.observedSector} units against ${sat.expectedSector} expected.`,
    );
  }
  if (sat.estimatesAgree === false) {
    add(
      "threat",
      "market",
      "The two independent estimates disagree, so treat the verdict as weak",
      `Supply side supports ${sat.expectedSector}; demand side supports ${sat.supportableFromDemand ?? "—"}.`,
    );
  }

  // ── who the scheme can actually reach ─────────────────────────────────────
  // The catchment is everybody. NSFDC lends only to Scheduled Caste beneficiaries, so this is the
  // number that matters for a scheme-funded enterprise and it appears nowhere else in the report.
  const scReach = Math.round(village.catchment10km * (village.scSharePct / 100));
  add(
    village.scSharePct >= 20 ? "strength" : "weakness",
    "census",
    village.scSharePct >= 20
      ? "A large scheme-eligible population within reach"
      : "The scheme-eligible population is a small share of the catchment",
    `SC share ${pct(village.scSharePct)} of ${new Intl.NumberFormat("en-IN").format(village.catchment10km)} people within 10 km — about ${new Intl.NumberFormat("en-IN").format(scReach)} people NSFDC can lend to.`,
  );

  // ── infrastructure the trade actually needs ───────────────────────────────
  if (activity?.needsPowerHours != null) {
    const enough = village.powerHoursPerDay >= activity.needsPowerHours;
    add(
      enough ? "strength" : "threat",
      "census",
      enough
        ? "Power supply covers what this unit needs to run"
        : "Power supply is below what this unit needs to run",
      `${village.powerHoursPerDay} h/day available against ${activity.needsPowerHours} h/day required.`,
    );
  }
  if (activity?.perishable) {
    if (!village.hasPuccaRoad) {
      add(
        "threat",
        "census",
        "No all-weather road, and this output spoils",
        `Nearest market ${village.distanceToMandiKm} km, nearest town ${village.distanceToTownKm} km, no pucca road.`,
      );
    } else if (village.distanceToMandiKm <= 10) {
      add(
        "strength",
        "census",
        "Perishable output can reach a market the same day",
        `Pucca road, mandi ${village.distanceToMandiKm} km away.`,
      );
    }
  }
  if (village.distanceToBankKm > 10) {
    add(
      "weakness",
      "census",
      "Banking is far enough to be a real cost of servicing the loan",
      `Nearest branch ${village.distanceToBankKm} km.`,
    );
  }
  if (village.literacyPct < 60) {
    add(
      "weakness",
      "census",
      "Low literacy — paperwork will need help, and spoken guidance matters more than written",
      `Literacy ${pct(village.literacyPct)}.`,
    );
  }

  // ── the money ─────────────────────────────────────────────────────────────
  if (plan) {
    const { solvency, structure, schedule } = plan;

    if (solvency.verdict === "GESTATION_GAP") {
      add(
        "threat",
        "kernel",
        "Repayment starts before this unit earns anything",
        `${inr(solvency.preIncomeObligation)} falls due across ${solvency.preIncomePayments} instalment(s) before month ${activity?.gestationMonths ?? "—"}.`,
      );
    } else if (solvency.verdict === "FEASIBLE") {
      add(
        "strength",
        "kernel",
        "Income begins before the first instalment falls due",
        `Gestation ${activity?.gestationMonths ?? 0} months against a first instalment at month ${solvency.firstInstalmentMonth ?? "—"}.`,
      );
    } else if (solvency.verdict === "UNAFFORDABLE") {
      add(
        "threat",
        "kernel",
        "Repayment would breach the RBI household-income cap",
        `Peak annual debt service is ${pct((solvency.incomeShare ?? 0) * 100)} of declared household income; the cap is 50%.`,
      );
    } else if (solvency.verdict === "DSCR_FAIL") {
      add(
        "weakness",
        "kernel",
        "The unit earns, but with too little headroom for a bad season",
        `Debt-service coverage ${(solvency.dscr ?? 0).toFixed(2)}× against a ${solvency.minDscr}× floor.`,
      );
    }

    for (const flag of structure.flags) {
      if (flag.code === "DEAD_ZONE") {
        add(
          "weakness",
          "kernel",
          "The 10% margin rule does not hold at this project cost",
          `Effective own contribution ${pct(structure.effectiveMarginPct * 100)}, not 10% — the loan cap binds before the tier changes.`,
        );
      }
      if (flag.code === "CAP_BINDING") {
        add(
          "weakness",
          "kernel",
          "The scheme's loan ceiling, not the percentage, is what sets the loan",
          `${inr(structure.sanctionedLoan)} sanctioned against an indicative ${inr(structure.indicativeLoan)}.`,
        );
      }
    }

    if (activity && activity.gestationMonths === 0) {
      add(
        "strength",
        "kernel",
        "Earns from the first month, so no income gap to bridge",
        `NABARD records no gestation for this unit. Quarterly instalment ${inr(schedule.instalment)}.`,
      );
    }
  }

  return items;
}

export const SWOT_METHOD =
  "Each entry is a rule over a figure the engine computed, not generated text. The evidence line " +
  "under every claim is the number that triggered it — disagree with the threshold rather than " +
  "with the wording. A quadrant may be empty; that is a finding, not a gap.";
