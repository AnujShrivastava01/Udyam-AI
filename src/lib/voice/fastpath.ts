/**
 * The local fast path: answer a turn without calling Gemini, when that can be done safely.
 *
 * A cascade, not a replacement. The classifier gives a LABEL; the slot still has to be filled, and
 * this only short-circuits when the slot can be resolved deterministically:
 *
 *   explain / confirm / unknown   no slot at all
 *   set_district / set_block      closed vocabulary from the gazetteer — matched, not guessed
 *   navigate                      closed set of routes, matched on keywords
 *   set_margin                    parseSpokenAmount, which refuses rather than guessing
 *
 * `set_category` and `answer` still go to Gemini. Both need a mapping from open-ended phrasing to
 * one label ("bakri palni hai" → dairy, "kitna dena padega" → instalment) and a keyword table that
 * covered them would be exactly the brittle thing the classifier exists to avoid. The classifier
 * knows the KIND, but the kind alone is not an action.
 *
 * Anything this returns null for goes to the model. The worst case is a wasted local computation
 * measured in microseconds; there is no path where a low-confidence guess becomes an action.
 */

import { GAZETTEER_DISTRICTS, blocksInDistrict } from "@/lib/market/villages";
import { parseSpokenAmount } from "./bhashini";
import { validateAction, type AgentAction, type Page } from "./agent";
import { CONFIDENCE_FLOOR, predict, type IntentModel } from "@/lib/ml/intent/model";
import weights from "@/lib/ml/intent/weights.json";

/** Rehydrate the sparse rows the training script writes. */
let cached: IntentModel | null = null;
function model(): IntentModel {
  if (cached) return cached;
  const raw = weights as unknown as {
    labels: string[];
    dim: number;
    bias: number[];
    sparseWeights: Record<string, number>[];
    accuracy: number;
    trainedOn: number;
  };
  cached = {
    labels: raw.labels,
    dim: raw.dim,
    bias: raw.bias,
    accuracy: raw.accuracy,
    trainedOn: raw.trainedOn,
    weights: raw.sparseWeights.map((row) => {
      const dense = new Array<number>(raw.dim).fill(0);
      for (const [k, v] of Object.entries(row)) dense[Number(k)] = v;
      return dense;
    }),
  };
  return cached;
}

/** Longest name first, so "Ghatigaon" is not shadowed by a shorter name inside it. */
function matchFromList(transcript: string, options: string[]): string | null {
  const haystack = transcript.toLowerCase();
  const sorted = [...options].sort((a, b) => b.length - a.length);
  return sorted.find((o) => haystack.includes(o.toLowerCase())) ?? null;
}

const PAGE_WORDS: { page: Page; words: string[] }[] = [
  { page: "calculator", words: ["calculator", "plan", "kist", "emi", "किस्त", "पैसे", "paise", "loan"] },
  { page: "report", words: ["report", "रिपोर्ट", "feasibility", "analysis", "vishleshan"] },
  { page: "discover", words: ["discover", "shuru kare", "शुरू कर", "khojein", "suggestion"] },
  { page: "emi", words: ["mera loan", "मेरा लोन", "repayment", "tracker", "bakaya"] },
  { page: "community", words: ["community", "समुदाय", "samuday", "log"] },
  { page: "profile", words: ["profile", "प्रोफ़ाइल", "प्रोफाइल", "mera udyam"] },
  { page: "onboarding", words: ["shuru se", "शुरू से", "start over", "onboarding"] },
];

export interface FastResult {
  action: AgentAction;
  confidence: number;
}

/**
 * Returns an action when the local model is confident AND the slot resolves; null otherwise.
 *
 * `awaitingConfirmation` matters: "haan" means nothing unless something was asked. Outside that
 * state a confirmation is not an action and the turn is handed on.
 */
export function fastPath(transcript: string, awaitingConfirmation: boolean): FastResult | null {
  const p = predict(model(), transcript);
  if (p.confidence < CONFIDENCE_FLOOR) return null;

  const done = (action: AgentAction): FastResult => ({ action, confidence: p.confidence });

  switch (p.label) {
    case "explain":
      return done({ kind: "explain" });

    case "confirm_yes":
      return awaitingConfirmation ? done({ kind: "confirm", yes: true }) : null;
    case "confirm_no":
      return awaitingConfirmation ? done({ kind: "confirm", yes: false }) : null;

    case "unknown":
      // A confident reject is worth taking locally: noise is the most common turn of all, and
      // sending it to a paid model to be told it is noise helps nobody.
      return done({ kind: "unknown", heard: transcript.slice(0, 120) });

    case "set_district": {
      const district = matchFromList(transcript, GAZETTEER_DISTRICTS.map((d) => d.district));
      return district ? done(validateAction({ kind: "set_district", district }, transcript)) : null;
    }

    case "set_block": {
      const all = [...new Set(GAZETTEER_DISTRICTS.flatMap((d) => blocksInDistrict(d.district)))];
      const block = matchFromList(transcript, all);
      return block ? done(validateAction({ kind: "set_block", block }, transcript)) : null;
    }

    case "navigate": {
      const hit = PAGE_WORDS.find((p) =>
        p.words.some((w) => transcript.toLowerCase().includes(w.toLowerCase())),
      );
      return hit ? done(validateAction({ kind: "navigate", page: hit.page }, transcript)) : null;
    }

    case "set_margin": {
      // parseSpokenAmount returns null rather than guessing — full Devanagari numerals, for one,
      // it deliberately does not read. A null here hands the turn to Gemini, which is right. It
      // reads all three scripts itself, so it needs no locale.
      const amount = parseSpokenAmount(transcript);
      return amount != null
        ? done(validateAction({ kind: "set_margin", amount }, transcript))
        : null;
    }

    // set_category and answer need an open-ended phrase mapped to one label. The classifier knows
    // the kind; the kind is not the action. Gemini fills these.
    default:
      return null;
  }
}

/** For the diagnostics panel and the docs — reported, not asserted. */
export function localModelInfo() {
  const m = model();
  return { accuracy: m.accuracy, trainedOn: m.trainedOn, floor: CONFIDENCE_FLOOR };
}
