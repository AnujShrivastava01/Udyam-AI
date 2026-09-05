/**
 * The voice agent's decision layer.
 *
 * The model's ONLY job here is to turn a sentence into one of a fixed list of actions. It does not
 * compute, look anything up, or decide what a district is called — every slot it fills is checked
 * against a real vocabulary on the way out, and an unrecognised value becomes `unknown`, which asks
 * the user again. This is the same firewall the narration uses, applied to intent instead of to
 * numbers: the model interprets language, the deterministic code does everything else.
 *
 * An amount is the one slot that is never acted on directly. A misheard margin silently changes
 * every figure downstream and the borrower cannot proof-read speech, so a spoken amount is read
 * back and applied only after a spoken confirmation.
 */

import type { Locale } from "@/lib/i18n/keys";
import { ACTIVITIES } from "@/lib/finance/activities";
import { GAZETTEER_DISTRICTS, blocksInDistrict } from "@/lib/market/villages";

export const PAGES = [
  "onboarding",
  "discover",
  "calculator",
  "report",
  "community",
  "emi",
  "profile",
] as const;
export type Page = (typeof PAGES)[number];

export const CATEGORIES = [
  "dairy",
  "retail",
  "textiles",
  "food",
  "handicrafts",
  "services",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type AgentAction =
  | { kind: "set_district"; district: string }
  | { kind: "set_block"; block: string }
  | { kind: "set_category"; category: Category }
  | { kind: "set_margin"; amount: number; needsConfirmation: true }
  | { kind: "confirm"; yes: boolean }
  | { kind: "navigate"; page: Page }
  | { kind: "explain" }
  | { kind: "answer"; topic: "instalment" | "gap" | "scheme" | "project_cost" | "gestation" }
  | { kind: "unknown"; heard: string };

/** Everything the model is allowed to choose from, rendered into the prompt. */
export function vocabulary() {
  return {
    districts: GAZETTEER_DISTRICTS.map((d) => d.district),
    blocks: [...new Set(GAZETTEER_DISTRICTS.flatMap((d) => blocksInDistrict(d.district)))],
    categories: [...CATEGORIES],
    pages: [...PAGES],
    activities: ACTIVITIES.map((a) => a.id),
  };
}

/**
 * The schema the model must answer in.
 *
 * Deliberately flat and small. A model asked for a nested plan will invent structure; a model asked
 * to pick one label from a list mostly picks a label from the list — and when it does not, the
 * validation below catches it.
 */
export const ACTION_SCHEMA = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: [
        "set_district",
        "set_block",
        "set_category",
        "set_margin",
        "confirm",
        "navigate",
        "explain",
        "answer",
        "unknown",
      ],
    },
    district: { type: "string" },
    block: { type: "string" },
    category: { type: "string" },
    amount: { type: "number" },
    yes: { type: "boolean" },
    page: { type: "string" },
    topic: { type: "string" },
  },
  required: ["kind"],
} as const;

export function agentPrompt(transcript: string, locale: Locale, awaitingConfirmation: boolean) {
  const v = vocabulary();
  return `You route a spoken sentence to ONE action. You are not answering the user and you are not
computing anything. Reply with JSON only.

The user is a rural micro-entrepreneur in India using a loan advisory app. They speak Hindi,
Hinglish (Hindi in Latin script) or English. The transcript may be imperfect.

THE SENTENCE (transcribed, locale ${locale}):
"""
${transcript}
"""

${
  awaitingConfirmation
    ? `THE APP IS WAITING FOR A YES/NO CONFIRMATION of an amount it read back. If this sentence is
agreement (haan, ha, yes, sahi, theek hai, bilkul) reply {"kind":"confirm","yes":true}. If it is
disagreement (nahi, na, no, galat) reply {"kind":"confirm","yes":false}. If it is neither, route it
normally.`
    : ""
}

ACTIONS, and the ONLY values each may take:

set_district  district: one of ${JSON.stringify(v.districts)}
set_block     block:    one of ${JSON.stringify(v.blocks)}
set_category  category: one of ${JSON.stringify(v.categories)}
              (dairy = cows/buffalo/milk/doodh/pashupalan/bakri/goat,
               retail = shop/kirana/dukaan, textiles = tailoring/silai/kapda,
               food = papad/achaar/atta/food processing, handicrafts = handmade/craft,
               services = repairs/local services)
set_margin    amount: a rupee figure the user says they have. Convert words to a plain number:
              "ek lakh" -> 100000, "pachas hazaar" -> 50000, "das hazar rupaye" -> 10000.
              If you are not certain of the figure, reply unknown instead of guessing.
navigate      page: one of ${JSON.stringify(v.pages)}
              (calculator = EMI/kist/loan/paisa/plan, report = report/analysis/feasibility,
               discover = kya shuru karein/suggestion, emi = my loan/repayment status,
               community = community/log, profile = my profile, onboarding = start over)
explain       they want the current verdict explained ("samjhao", "yeh kya hai", "explain")
answer        topic: one of ["instalment","gap","scheme","project_cost","gestation"]
              (instalment = kitni kist/EMI, gap = kamai se pehle kitna,
               scheme = kaunsi yojana, project_cost = project ki laagat,
               gestation = kab se kamai)
unknown       anything else, or anything you are not sure about. Set "heard" to a short summary.

RULES
- Choose exactly one action.
- Never invent a district, block, category or page that is not in the lists above. If the user
  names something not on a list, reply unknown.
- Prefer unknown over a guess. Being asked again is cheap; acting on a misheard instruction is not.

OUTPUT SHAPE. The action name goes in a field called "kind". Copy this shape exactly:

  {"kind":"set_district","district":"Gwalior"}
  {"kind":"set_category","category":"dairy"}
  {"kind":"set_margin","amount":50000}
  {"kind":"navigate","page":"calculator"}
  {"kind":"answer","topic":"instalment"}
  {"kind":"explain"}
  {"kind":"confirm","yes":true}
  {"kind":"unknown","heard":"..."}

Reply with JSON only, no prose and no code fence.`;
}

/**
 * Validate whatever the model produced against the real vocabularies.
 *
 * Nothing downstream trusts the model's output: a district it invented, a page that is not a route,
 * an amount that is not a finite positive number — all become `unknown`, and the user is asked
 * again rather than sent somewhere they did not ask to go.
 */
export function validateAction(raw: unknown, transcript: string): AgentAction {
  const fallback: AgentAction = { kind: "unknown", heard: transcript.slice(0, 120) };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  // The prompt asks for "kind" and shows the shape, but a model that names the field "action" or
  // "intent" has still understood the sentence perfectly — and Gemini did exactly that, which
  // turned every correctly-classified utterance into `unknown`. Accept the obvious synonyms
  // rather than throwing away a right answer over a key name.
  const kind = r.kind ?? r.action ?? r.intent;
  const v = vocabulary();
  const pick = (value: unknown, list: string[]) => {
    const s = String(value ?? "").trim().toLowerCase();
    return list.find((item) => item.toLowerCase() === s) ?? null;
  };

  switch (kind) {
    case "set_district": {
      const district = pick(r.district, v.districts);
      return district ? { kind: "set_district", district } : fallback;
    }
    case "set_block": {
      const block = pick(r.block, v.blocks);
      return block ? { kind: "set_block", block } : fallback;
    }
    case "set_category": {
      const category = pick(r.category, v.categories) as Category | null;
      return category ? { kind: "set_category", category } : fallback;
    }
    case "set_margin": {
      const amount = Number(r.amount);
      // Bounded the same way every other money input in this product is. An unbounded spoken
      // figure reaching the kernel is how "ek lakh" becomes ten crore.
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) return fallback;
      return { kind: "set_margin", amount: Math.round(amount), needsConfirmation: true };
    }
    case "confirm":
      return { kind: "confirm", yes: r.yes === true };
    case "navigate": {
      const page = pick(r.page, [...v.pages]) as Page | null;
      return page ? { kind: "navigate", page } : fallback;
    }
    case "explain":
      return { kind: "explain" };
    case "answer": {
      const topics = ["instalment", "gap", "scheme", "project_cost", "gestation"];
      const topic = pick(r.topic, topics);
      return topic ? { kind: "answer", topic: topic as never } : fallback;
    }
    default:
      return fallback;
  }
}
