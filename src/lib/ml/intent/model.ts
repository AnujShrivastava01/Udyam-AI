/**
 * Multinomial logistic regression, trained and run in plain TypeScript.
 *
 * No framework, and that is a design decision rather than a limitation. The model is ~37k floats;
 * it loads with the bundle, classifies in microseconds, needs no network, and costs nothing per
 * call. Pulling in a runtime to do a linear model would add megabytes to serve a matrix multiply.
 *
 * WHY A MODEL HERE AT ALL, when the rest of this product argues for rules: intent is exactly the
 * job rules are bad at. "Meri kist kitni hai", "kitna dena padega har teen mahine", "EMI kya
 * banegi" and "har quarter kitne paise" all mean one thing, and a keyword table that catches all
 * four also catches things that mean something else. Classification generalises where a regex list
 * has to be maintained.
 *
 * It does NOT decide anything on its own. Its output is a label, the slots are still filled and
 * validated by `agent.ts` against real vocabularies, and below a confidence floor the request goes
 * to Gemini instead. A wrong label is a wasted round trip, never a wrong action.
 */

import { FEATURE_DIM, featurise } from "./features";

export const INTENT_LABELS = [
  "set_district",
  "set_block",
  "set_category",
  "set_margin",
  "confirm_yes",
  "confirm_no",
  "navigate",
  "explain",
  "answer",
  "unknown",
] as const;

export type IntentLabel = (typeof INTENT_LABELS)[number];

export interface IntentModel {
  /** labels × FEATURE_DIM, row-major. */
  weights: number[][];
  bias: number[];
  labels: readonly string[];
  dim: number;
  /** Held-out accuracy at training time. Reported, not asserted. */
  accuracy: number;
  trainedOn: number;
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export interface Prediction {
  label: IntentLabel;
  confidence: number;
  /** Every class, for diagnostics and for the margin between first and second. */
  scores: { label: IntentLabel; p: number }[];
}

export function predict(model: IntentModel, text: string): Prediction {
  const features = featurise(text);
  const scores = model.bias.map((b, c) => {
    let sum = b;
    const row = model.weights[c];
    for (const [idx, value] of features) sum += row[idx] * value;
    return sum;
  });
  const probs = softmax(scores);
  const ranked = probs
    .map((p, i) => ({ label: model.labels[i] as IntentLabel, p }))
    .sort((a, b) => b.p - a.p);
  return { label: ranked[0].label, confidence: ranked[0].p, scores: ranked };
}

export interface TrainOptions {
  epochs?: number;
  learningRate?: number;
  /** L2 penalty. Small, but this is a wide feature space over a small corpus. */
  l2?: number;
  /** Deterministic shuffling — no Math.random anywhere in training. */
  seed?: number;
}

/** mulberry32, the same PRNG SIDDHI-Bench uses, so a training run is reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function train(
  samples: { text: string; label: IntentLabel }[],
  { epochs = 60, learningRate = 0.5, l2 = 1e-4, seed = 26091 }: TrainOptions = {},
): Omit<IntentModel, "accuracy"> {
  const labels = INTENT_LABELS;
  const weights = labels.map(() => new Array(FEATURE_DIM).fill(0));
  const bias = new Array(labels.length).fill(0);
  const random = rng(seed);

  const encoded = samples.map((s) => ({
    features: featurise(s.text),
    target: labels.indexOf(s.label),
  }));

  const order = encoded.map((_, i) => i);
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Fisher-Yates with the seeded PRNG.
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    // Decay, so late epochs settle rather than bouncing.
    const lr = learningRate / (1 + epoch * 0.05);

    for (const idx of order) {
      const { features, target } = encoded[idx];
      const scores = bias.map((b, c) => {
        let sum = b;
        const row = weights[c];
        for (const [k, v] of features) sum += row[k] * v;
        return sum;
      });
      const probs = softmax(scores);

      for (let c = 0; c < labels.length; c++) {
        const error = probs[c] - (c === target ? 1 : 0);
        if (error === 0) continue;
        const row = weights[c];
        const step = lr * error;
        for (const [k, v] of features) row[k] -= step * v + lr * l2 * row[k];
        bias[c] -= step;
      }
    }
  }

  return { weights, bias, labels, dim: FEATURE_DIM, trainedOn: samples.length };
}

/**
 * Below this, the local model is not trusted and the turn goes to Gemini.
 *
 * Chosen from the held-out sweep rather than picked. The one error the model makes on held-out
 * data ("bijli chali gayi hai" classified as set_category) arrives at 27% confidence, so every
 * floor above 0.3 catches it. The sweep printed by `npm run train:intent`:
 *
 *     floor 0.40  →  16/18 kept, 100% accurate on kept
 *     floor 0.50  →  14/18 kept, 100%
 *     floor 0.62  →  11/18 kept, 100%
 *
 * 0.45 sits in the flat region: it keeps most of the traffic locally and gives up nothing in
 * accuracy. An initial guess of 0.62 handed 39% of turns to the API for no gain at all.
 *
 * The honest caveat: 18 held-out utterances is a small sample and these percentages carry wide
 * error bars. The floor is set where the curve is flat precisely because the exact numbers should
 * not be trusted to a decimal place. Re-run the sweep whenever the corpus grows.
 */
export const CONFIDENCE_FLOOR = 0.45;
