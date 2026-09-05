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

  "activity.tailoring-2.name": "Tailoring unit — 2 machines",
  "activity.tailoring-2.unit": "2 machines, 1 overlock, starting cloth stock",
  "activity.kirana-store.name": "Kirana / general store",
  "activity.kirana-store.unit": "Shop fit-out plus opening stock",
  "activity.papad-pickle.name": "Papad & pickle unit",
  "activity.papad-pickle.unit": "Food processing unit with drying and packing",
  "activity.mushroom.name": "Mushroom cultivation",
  "activity.mushroom.unit": "Low-cost shed, 100 bags per cycle",
  "activity.bee-keeping-20.name": "Bee-keeping — 20 boxes",
  "activity.bee-keeping-20.unit": "20 colonies with boxes and extraction kit",
  "activity.atta-chakki.name": "Flour mill (atta chakki)",
  "activity.atta-chakki.unit": "Motorised mill with installation",
  "activity.tier.verified": "NABARD unit cost",
  "activity.tier.indicative": "indicative — not yet sourced",
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
  // ── calculator page (residual strings that had no key) ────────────────
  "calc.basis.needBased": "Sized to the activity",
  "calc.basis.spec": "Specification formula",
  "calc.activityGroup": "Choose an activity",
  "calc.marginSlider": "Margin money",
  "calc.convention.serviced": "serviced",
  "calc.convention.capitalised": "capitalised",
  "calc.altConvention":
    "Under the {convention} convention the same loan would cost {instalment} per quarter and {interest} in total interest. We compute both so neither is a silent assumption.",
  "calc.income.hint":
    "Default is {amount} — the average pre-loan household income measured in MoSJE’s own 2020 evaluation of NSFDC.",
  "calc.tbl.caption": "Repayment schedule, month by month",
  "calc.tbl.month": "Month",
  "calc.tbl.opening": "Opening",
  "calc.tbl.interest": "Interest",
  "calc.tbl.principal": "Principal",
  "calc.tbl.payment": "Payment",
  "calc.tbl.closing": "Closing",
  "calc.tbl.mor": "moratorium",
  "calc.tbl.preIncome": "before income",
  "calc.tbl.legend":
    "Rows tagged “before income” fall due before the activity earns anything. Rows tagged “moratorium” are inside the moratorium. The tags are there because colour alone is not a label.",

  // ── capital stack ──────────────────────────────────────
  "stack.badge": "Capital stack",
  "stack.title.cheaper": "A cheaper structure exists — {amount} cheaper",
  "stack.title.same": "Single-scheme routing is already the cheapest here",
  "stack.description":
    "The specification routes to one scheme by project cost. We solve for the cheapest viable structure across every rail the applicant is eligible for.",
  "stack.column.spec": "As specified — one scheme",
  "stack.column.best": "Optimised",
  "stack.subsidy": "Subsidy (grant)",
  "stack.own": "Your money",
  "stack.netCost": "Net cost of capital",
  "stack.negativeNote": "negative — the grant exceeds the lifetime interest",
  "stack.savingNote":
    "lower net cost of capital, because a margin-money subsidy is never repaid while interest always is. A threshold rule cannot find this — it only ever looks at one scheme.",
  "stack.unverified.title": "This structure relies on scheme terms we have not re-verified",
  "stack.unverified.detail":
    "{rails} — terms are drawn from public scheme summaries. Re-fetch the guidelines from the administering ministry before quoting this saving to a beneficiary.",
  "stack.none.title": "No viable capital structure at this margin",
  "stack.none.detail": "Every rail we model needs more own contribution than is available.",

  // ── source chip (remaining) ──────────────────────────────
  "source.effectiveFrom": "Effective from",
  "source.unverified.detail":
    "This figure was transcribed during research but has not been re-confirmed against the primary document by the team. Government rates and ceilings change. Re-fetch and date your own copy before quoting it.",
  // ── cliff explorer (remaining) ─────────────────────────────
  "cliff.projectCost": "Project cost",
  "cliff.scheme": "Scheme",
  "cliff.perQuarter": "Per quarter",
  "cliff.lifetimeInterest": "Lifetime interest",
  "cliff.slider": "Project cost",
  "cliff.deadZoneDetail":
    "The ₹1.25 lakh cap starts binding at {bindsAt}, not at the ₹1.40 lakh boundary. Here the beneficiary must find {effective} — not 10% — so the structure is not financeable as specified.",
  "cliff.whyLabel": "Why this matters:",
  "cliff.tooltipCost": "Project cost {cost}",
  "cliff.delta.instalment": "Quarterly instalment",
  "cliff.delta.interest": "Lifetime interest",
  // ── solvency clock (remaining) ────────────────────────────
  "clock.payment": "Month {month} · {amount}",
  "clock.paymentMoratorium": "Month {month} · {amount} (moratorium interest)",
  "clock.gestationChip": "Gestation {months} months · {activity}",
  // ── report page (remaining chrome) ──────────────────────────
  "report.blockSuffix": "{village}, {block} block",
  "report.scoreNote":
    "A composite of saturation, market access and gestation — not a probability of success. It is a ranking aid, and it moves when the inputs move.",
  "report.marketRoom": "Two independent reads on market room",
  "report.marketRoomNote":
    "Supply side against demand side. When they disagree, the report says so rather than averaging them into a number that looks confident.",
  "report.satIndex": "Saturation index {index}× the national rural norm",
  "report.methodsDisagree": "the two methods disagree",
  "report.units": "{count} units",
  "report.psReq": "PS req. {n}",
  "report.beforeYouBorrow": "Before you borrow against this",
  "report.beforeYouBorrowGestation":
    "A market with room is not the same as a loan you can survive. NABARD prices this activity with a {months}-month gestation — check what that does to the repayment schedule before you commit.",
  "report.beforeYouBorrowPlain":
    "A market with room is not the same as a loan you can survive. Check the repayment schedule against the activity’s own cash flow before you commit.",
  "report.openClock": "Open the Solvency Clock",
  "report.coverage": "Gazetteer coverage: {villages} villages across {districts} ({states}). {note}",
  "report.figureUnavailable": "Not available for this combination.",
  "report.analysisLanguageNote":
    "The analysis text below is generated in English. Every rupee figure, label and heading on this page follows your chosen language; the narrative sentences do not yet.",
  "report.sectionsHeading": "Findings, requirement by requirement",
  "report.gestationMo": "gestation {months} mo",
  // ── onboarding ────────────────────────────────────────
  "onb.step": "Step {n} of 3",
  "onb.q1.title": "Where are you located?",
  "onb.q1.desc": "Select your district and block.",
  "onb.q2.title": "What is your initial capital?",
  "onb.q2.desc": "Enter the amount you can invest from your own pocket (margin money).",
  "onb.q3.title": "What kind of business?",
  "onb.q3.desc": "Choose a category that best describes your idea.",
  "onb.district": "District",
  "onb.districtPlaceholder": "Select district",
  "onb.block": "Block / Tehsil",
  "onb.blockPlaceholder": "Select block",
  "onb.village": "Village (optional)",
  "onb.villagePlaceholder": "Type a village name",
  "onb.capital": "Available margin capital",
  "onb.category": "Business category",
  "onb.cat.dairy": "Dairy & livestock",
  "onb.cat.retail": "Retail & kirana",
  "onb.cat.textiles": "Textiles & tailoring",
  "onb.cat.food": "Food processing",
  "onb.cat.handicrafts": "Handicrafts",
  "onb.cat.services": "Local services",
  "onb.back": "Back",
  "onb.continue": "Continue",
  "onb.analyse": "Analyse feasibility",
  "onb.working": "Structuring your plan…",
  "onb.previewTitle": "What {margin} routes to today",
  "onb.previewBody":
    "{scheme} would carry a project cost of {projectCost} and a loan of {loan}, at a quarterly instalment of {instalment}. This is the scheme’s arithmetic, not a sanction — no application has been made and nothing has been approved.",
  "onb.previewNone":
    "{margin} is below the minimum any of the schemes we model will structure against. Enter a larger amount to see what it routes to.",

  "clock.beforeIncomeNeutral":
    "{amount} across {payments} payment(s) falls due at or before the month income starts. That is moratorium interest inside a window the enterprise is already earning through — not an uncovered gap.",
  // ── borrower loan tracker ─────────────────────────────────
  "emi.title": "Sample loan",
  "emi.sampleWhat": "This loan",
  "emi.sampleDetail":
    "A worked example on a ₹1,00,000 goat unit, computed live by the finance kernel. It is not an account: no loan has been applied for, disbursed or tracked.",
  "emi.downloadSchedule": "Download schedule (CSV)",
  "emi.status.moratorium": "Moratorium active",
  "emi.status.preIncome": "Repaying before income",
  "emi.status.earning": "Repaying from earnings",
  "emi.headline.preIncome": "{months} months until this unit earns",
  "emi.headline.earning": "Your unit is earning",
  "emi.body.preIncome":
    "You still owe {amount} before the first sale. This is the gap — plan for it now, not in month nine.",
  "emi.body.earning": "Instalments from here are met by the enterprise itself.",
  "emi.nextPayment": "Next payment",
  "emi.dueInMonth": "due in month {month}",
  "emi.interestOnly": "interest only",
  "emi.paymentsMade": "{done} of {total} payments made",
  "emi.outstanding": "{amount} outstanding",
  "emi.tile.sanctioned": "Sanctioned",
  "emi.tile.repaid": "Repaid so far",
  "emi.tile.perQuarter": "Per quarter",
  "emi.scrubber": "Months since disbursement",
  "emi.scrubberValue": "Month {n} since disbursement",
  "emi.scrubberNote": "demo control — production reads the SCA ledger",
  "emi.gapTitle": "This loan was structured to collect before it earns",
  "emi.seeClock": "See the Solvency Clock",
  "emi.scheduleTitle": "Repayment schedule",
  "emi.scheduleNote": "Rows before month {months} fall due before this unit earns anything.",
  "emi.col.status": "Status",
  "emi.col.balance": "Balance",
  "emi.row.paid": "paid",
  "emi.row.upcoming": "upcoming",
  "calc.firstIncome": "first income",
  "discover.rankingNote":
    "Ranking combines market saturation, distance to market, and the activity’s own cash flow against the scheme’s repayment terms. Rows marked “advised against” are ones where the borrower would be asked to pay before the unit earns, or to find more margin than they have. We show them so the reasoning is visible — not as alternatives to pick from.",
  "discover.marginSlider": "Margin money",
  "calc.marginWarning": "Above 10% — the cap is binding here",
  // ── voice ──────────────────────────────────────────────
  "voice.listen": "Listen",
  "voice.stop": "Stop",
  "voice.caption": "Spoken:",
  "voice.unavailable": "Voice is unavailable right now — the figures above are unchanged.",
  "onb.blockNeedsDistrict": "Choose a district first",
  "report.change": "Change",
  // ── AI explanation panel ───────────────────────────────────
  "ai.title": "Explain this in plain words",
  "ai.subtitle":
    "The kernel above computed every figure. The model only puts them into a sentence — and is checked before you see it.",
  "ai.explain": "Explain",
  "ai.again": "Explain again",
  "ai.idle":
    "Nothing has been sent to a model yet. Press Explain and the figures above — and only those figures — are handed over to be worded.",
  "ai.failed": "The explanation could not be generated. The figures above are unchanged.",
  "ai.by.gemini": "Written by Gemini",
  "ai.by.template": "Written by the deterministic template",
  "ai.checked": "Every number checked against the kernel",
  "ai.latency": "{ms} ms",
  "ai.rejected.title": "The model invented a number, so its answer was thrown away",
  "ai.rejected.detail":
    "The sentence above is the deterministic fallback. These figures appeared in the model’s reply and the kernel never produced them, so the reply was rejected rather than shown to you:",
  "ai.facts.title": "What the model was allowed to see",
  "ai.facts.detail":
    "This is the whole of it. The model receives these values already computed and already formatted; it is never asked to add, divide or round anything, and any figure in its reply that is not on this list is treated as an invention.",
  "ai.facts.gestation": "Gestation",
  "ai.facts.verdict": "Verdict",
  "onb.districtHint": "We hold village data for {states} only.",
  // ── voice agent ──────────────────────────────────────────
  "agent.open": "Talk to Saathi",
  "agent.title": "Saathi",
  "agent.hint": "Your voice assistant \u2014 just talk, in Hindi, Hinglish or English.",
  "agent.examples":
    "Try: “my district is Gwalior”, “I want to keep goats”, “I have fifty thousand rupees”, “open the money plan”, “how much is my instalment”, or “explain this”.",
  "agent.speak": "Hold and speak",
  "agent.stop": "Done — send",
  "agent.thinking": "Listening…",
  "agent.speaking": "Answering…",
  "agent.youSaid": "You said:",
  "agent.micDenied": "The microphone is not available. Allow access and try again.",
  "agent.awaitingConfirm": "Say yes to confirm the amount, or no to say it again.",
  "agent.connecting": "Connecting…",
  "agent.listening": "Listening — just speak",
  "agent.hearing": "I can hear you…",
  "agent.close": "Close voice mode",
  "agent.end": "End conversation",
  // ── catchment map ─────────────────────────────────────────────────────────
  "map.title": "The catchment this report is computed over",
  "map.subtitle":
    "The rings are the 5 km and 10 km radii the demand estimate integrates over — not decoration.",
  "map.alt": "Map of {village} in {district} district, with the 5 km and 10 km catchment rings drawn around it.",
  "map.within5": "People within 5 km",
  "map.within10": "People within 10 km",
  "map.toMandi": "To the nearest mandi",
  "map.toBank": "To the nearest bank branch",
  "map.note":
    "The 10 km ring is the population that addressable demand is multiplied against. Population figures in this gazetteer are seeded placeholders pending the WorldPop ingest; the coordinates are the villages’ own. Map data © OpenStreetMap contributors.",
  // ── institutions / mentors ────────────────────────────────────────────────
  "mentors.title": "Who to actually go to",
  "mentors.subtitle":
    "Real bodies that do this work, most of them free. No invented advisors, no ratings, no fees we cannot verify.",
  "mentors.free": "Free",
  "mentors.districtNote": "Shown for {district}. All of these operate nationally, one office per district.",
  // ── the user's own profile ─────────────────────────────────
  "own.title": "Your enterprise",
  "own.emptyTitle": "Nothing here yet — and nothing invented to fill it",
  "own.emptyBody":
    "This page shows what you have told us and what the engine computed from it. Answer the three questions and it fills itself.",
  "own.start": "Start",
  "own.noActivity": "Not chosen yet",
  "own.stepsOpened": "Steps opened",
  "own.planTitle": "The plan the engine computed for you",
  "own.noPlan":
    "Enter the capital you have and the engine will structure a plan here.",
  "own.openPlan": "Open the full plan",
  "own.share": "Summary for a bank or NGO",
  "own.sampleNotice":
    "This is an example profile, not yours. Your own is at /profile/me.",
  // ── shareable summary ─────────────────────────────────────────────────────
  "share.title": "Loan structuring summary",
  "share.subtitle":
    "Every figure below is computed from published scheme terms. This is not an application and not a sanction.",
  "share.applicant": "Applicant",
  "share.structure": "Structure",
  "share.verdict": "Solvency",
  "share.basis": "How this was decided",
  "share.footer":
    "Structured against {scheme}. Source: {source}. Scheme terms change; confirm against the administering agency before acting on this. No application has been filed and no lender has seen this document.",
  "share.print": "Print or save as PDF",
  "share.back": "Back to profile",
  // ── SWOT ──────────────────────────────────────────────────────────────────
  "swot.title": "Strengths, weaknesses, opportunities, threats",
  "swot.subtitle":
    "Derived from the figures above, not written by a model. Each claim shows the number that triggered it.",
  "swot.strengths": "Strengths",
  "swot.weaknesses": "Weaknesses",
  "swot.opportunities": "Opportunities",
  "swot.threats": "Threats",
  "swot.none": "Nothing found here — which is itself a finding, not a gap.",
} as const;

export type MessageKey = keyof typeof EN;
export type Dictionary = Record<MessageKey, string>;
