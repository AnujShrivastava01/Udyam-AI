/**
 * The message contract.
 *
 * The engine never returns prose. It returns a key plus typed parameters, and the UI renders
 * them through a dictionary. That is what keeps the numeric-fidelity guarantee real: a rupee
 * figure is computed once, formatted once by `Intl`, and injected into a translated template as
 * a slot. It is never itself translated, and no translator can corrupt it.
 *
 * Adding a key here without adding it to every dictionary is a type error.
 */

export type Locale = "en" | "hi" | "hinglish";

export const LOCALES: { id: Locale; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "hinglish", label: "Hinglish", native: "Hinglish" },
];

/** A message the engine emits: a key, plus the values to slot into it. */
export interface Message {
  key: MessageKey;
  params?: Record<string, string | number>;
}

export const msg = (key: MessageKey, params?: Record<string, string | number>): Message => ({
  key,
  params,
});

/**
 * Every key in the system. The English dictionary is the source of truth for wording; the other
 * dictionaries must supply the same set.
 */
export const EN = {
  // ── chrome ────────────────────────────────────────────────────────────────
  "lang.label": "Language",

  // ── activities (NABARD unit names) ────────────────────────────────────────
  "activity.goat-10-1.name": "Goat rearing — 10 does + 1 buck",
  "activity.goat-10-1.unit": "10 does + 1 buck, open grazing",
  "activity.goat-20-1.name": "Goat rearing — 20 does + 1 buck",
  "activity.goat-20-1.unit": "20 does + 1 buck, open grazing",
  "activity.cb-heifer-2.name": "Crossbred heifer unit",
  "activity.cb-heifer-2.unit": "2 animals at 15 months of age, with shed",
  "activity.broiler-250.name": "Broiler poultry",
  "activity.broiler-250.unit": "250 birds",
  "activity.milch-cows-2.name": "Dairy — 2 improved cows",
  "activity.milch-cows-2.unit": "2 cows in milk, with shed",

  "activity.cost": "{cost}",
  "activity.earnsFrom": "earns from month {month}",
  "activity.earnsImmediately": "earns from the first month",
  "activity.pickPrompt": "What do you want to start?",

  // ── schemes ───────────────────────────────────────────────────────────────
  "scheme.nsfdc-micro-finance.name": "Micro Finance Scheme",
  "scheme.nsfdc-term-loan.name": "Term Loan Scheme",
  "scheme.governmentBacked": "Government backed",

  // ── solvency verdicts ─────────────────────────────────────────────────────
  "solvency.GESTATION_GAP.label": "Gestation gap",
  "solvency.FEASIBLE.label": "Feasible",
  "solvency.DSCR_FAIL.label": "Coverage too thin",
  "solvency.UNAFFORDABLE.label": "Unaffordable",
  "solvency.INSUFFICIENT_DATA.label": "Not enough data",

  "solvency.gap.headline": "{amount} falls due before the first rupee of income",
  "solvency.gap.detail":
    "NABARD prices this activity with a {gestation}-month gestation, but the first instalment is due at month {firstMonth}. That leaves {gapMonths} months — {payments} payments totalling {amount} — that must be funded from somewhere other than the enterprise. This is the gap that sends borrowers to a moneylender.",

  "solvency.feasible.headline": "Income begins before the first instalment falls due",
  "solvency.feasible.detail":
    "Gestation is {gestation} months and the first instalment falls at month {firstMonth}. The enterprise is earning before it is asked to repay.",
  "solvency.feasible.immediate":
    "NABARD records no gestation for this unit — it earns from the first month, so every instalment is met from the enterprise itself.",

  "solvency.unaffordable.headline": "Repayment would take {share} of household income",
  "solvency.unaffordable.detail":
    "Peak annual debt service is {debtService} against a household income of {income}. RBI's microfinance framework caps repayment obligations at {cap} of household income. This structure is over that line before the business has proved anything.",

  "solvency.dscr.headline": "Debt-service coverage of {dscr} is below the {min} a lender expects",
  "solvency.dscr.detail":
    "Projected annual surplus of {surplus} against peak annual debt service of {debtService}. The unit earns, but not with enough headroom to absorb a bad season.",

  "solvency.noData.headline": "No gestation figure for this activity",
  "solvency.noData.detail":
    "We hold NABARD unit-cost norms only for the activities in our seed dataset. Rather than estimate when this one starts earning, we decline to give a solvency verdict. The repayment schedule above is still exact.",

  // ── structure flags ───────────────────────────────────────────────────────
  "flag.CAP_BINDING.title": "The loan cap is binding",
  "flag.CAP_BINDING.detail":
    "{scheme} lends at most {cap}. At a project cost of {projectCost} the {share} share would be {indicative}, so the cap — not the percentage — is what sets the loan.",
  "flag.DEAD_ZONE.title": "Dead zone — the 10% rule silently breaks here",
  "flag.DEAD_ZONE.detail":
    "The {cap} cap starts binding at a project cost of {bindsAt}, not at the ₹1.40 lakh tier boundary. Between those two figures the beneficiary must contribute {effective} — not 10% — so the structure is not financeable as specified.",
  "flag.ABOVE_TIER_CEILING.title": "Above the scheme ceiling",
  "flag.ABOVE_TIER_CEILING.detail":
    "A project cost of {projectCost} exceeds the {ceiling} ceiling these schemes cover. Either the project is scoped down, or it needs a different funding rail.",
  "flag.MARGIN_SHORTFALL.title": "Margin shortfall",
  "flag.MARGIN_SHORTFALL.detail":
    "This activity needs {required} of own contribution but only {available} is available — a gap of {gap}.",

  // ── recommender binding constraints ───────────────────────────────────────
  "constraint.marginShort": "Needs {required} of your own money; you have {available}.",
  "constraint.overIncomeCap": "Repayment would exceed half your household income — over RBI's limit.",
  "constraint.gestationGap": "Instalments start {months} months before this unit earns anything.",
  "constraint.thinCoverage": "Earns, but with too little headroom to survive a bad season.",
  "constraint.noGestationData": "We do not hold a gestation figure for this activity.",
  "constraint.crowded":
    "Cash flow works, but the block is already above the national norm for this sector.",
  "constraint.clear": "Income starts before repayment does, and the margin is within reach.",

  // ── calculator page ───────────────────────────────────────────────────────
  "calc.title": "Smart Financial Planner",
  "calc.subtitle": "It doesn't tell you what you can borrow. It tells you what you can repay.",
  "calc.margin.title": "Your margin money",
  "calc.margin.hint": "The cash you actually have today.",
  "calc.needBased.label": "Cost the project from what the activity needs",
  "calc.needBased.hint": "Off = the specification's formula: project cost = margin ÷ 10%",
  "calc.serviced.label": "Interest serviced during moratorium",
  "calc.serviced.hint": "Off = interest capitalised into principal",
  "calc.income.label": "Annual household income",
  "calc.projectCost": "Project cost",
  "calc.sanctionedLoan": "Sanctioned loan",
  "calc.yourShare": "Your share",
  "calc.moratorium": "Moratorium",
  "calc.quarterly": "Quarterly instalment",
  "calc.instalments": "Instalments",
  "calc.totalInterest": "Total interest",
  "calc.totalOutflow": "Total outflow",
  "calc.schedule": "Repayment schedule",
  "calc.howDecided": "How this was decided",
  "calc.seeReport": "See the full feasibility report",

  // ── solvency clock ────────────────────────────────────────────────────────
  "clock.title": "The Solvency Clock",
  "clock.subtitle": "When the enterprise earns, against when the scheme collects.",
  "clock.income": "Income",
  "clock.repayment": "Repayment",
  "clock.months": "months",
  "clock.noIncome": "no income · gestation {months} months",
  "clock.earning": "earning",
  "clock.dueBeforeIncome": "Due before first income",
  "clock.paymentsInWindow": "Payments in that window",
  "clock.uncoveredMonths": "Uncovered months",

  // ── cliff explorer ────────────────────────────────────────────────────────
  "cliff.badge": "The ₹1.40 lakh cliff",
  "cliff.title": "One rupee changes everything about this loan",
  "cliff.subtitle":
    "Drag across ₹1,40,000 and watch the quarterly instalment halve while lifetime interest triples. The cheaper headline rate is not the lighter burden.",
  "cliff.boundary": "₹1,40,000 — the boundary",
  "cliff.chartTitle": "Quarterly instalment across the boundary",
  "cliff.deadZoneNote": "The shaded band is the dead zone — where the cap binds but the tier has not changed.",
  "cliff.inDeadZone": "You are inside the dead zone",
  "cliff.atBoundary": "{from} → {to} at the boundary",
  "cliff.why":
    "An advisor optimising on the headline interest rate routes the borrower into the 6.5% scheme — which carries roughly double the quarterly cash-flow burden and is therefore the option more likely to default. A threshold rule cannot express that trade-off. An optimiser has to.",

  // ── discover / recommender ────────────────────────────────────────────────
  "discover.title": "What should you actually start?",
  "discover.subtitle":
    "One recommendation, with the binding constraint named — not a menu of plausible options for you to guess between.",
  "discover.yourVillage": "Your village",
  "discover.marginLabel": "Margin money you have",
  "discover.ourRecommendation": "Our recommendation",
  "discover.perQuarter": "Per quarter",
  "discover.earnsFromMonth": "Earns from month",
  "discover.seeSchedule": "See the repayment schedule",
  "discover.fullReport": "Full feasibility report",
  "discover.othersTitle": "Everything else we looked at, and why it ranked where it did",
  "discover.refusalTitle": "We are not going to recommend anything here",
  "discover.dueBeforeIncome": "due before income",

  // ── report ────────────────────────────────────────────────────────────────
  "report.title": "Feasibility Report",
  "report.subtitle": "Every number below names where it came from — or it is not shown.",
  "report.village": "Village",
  "report.activity": "Activity",
  "report.standingOn": "What this report is standing on",
  "report.score": "Feasibility score",
  "report.roomToEnter": "Room to enter",
  "report.crowded": "Crowded",
  "report.thinData": "Data too thin",

  // ── officer console ───────────────────────────────────────────────────────
  "officer.title": "Sanction triage",
  "officer.subtitle":
    "Every pending file, run through the same rules engine the applicant sees. The queue is sorted by what will go wrong, not by when it arrived.",
  "officer.inQueue": "In the queue",
  "officer.gestationGapped": "Gestation-gapped",
  "officer.routingMismatches": "Routing mismatches",
  "officer.exposed": "Exposed before income",
  "officer.status.BLOCK": "Do not sanction",
  "officer.status.REVIEW": "Officer review",
  "officer.status.CLEAR": "Clear",
  "officer.beforeIncome": "before income",

  // ── confidence labels ─────────────────────────────────────────────────────
  "confidence.measured": "measured",
  "confidence.estimated": "estimated",
  "confidence.seeded": "seeded — not a survey reading",
  "confidence.unavailable": "unavailable",

  // ── source chip ───────────────────────────────────────────────────────────
  "source.title": "Where this number comes from",
  "source.source": "Source",
  "source.retrieved": "Retrieved",
  "source.document": "Document",
  "source.unverified": "Not yet re-verified first-hand",
} as const;

export type MessageKey = keyof typeof EN;
export type Dictionary = Record<MessageKey, string>;
