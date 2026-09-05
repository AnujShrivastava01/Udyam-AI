/**
 * Train the intent classifier.
 *
 *     npm run train:intent
 *
 * Writes src/lib/ml/intent/weights.json, which ships with the bundle. Training is deterministic —
 * seeded shuffling, no Math.random — so the same corpus produces the same weights and a diff of
 * that file is reviewable.
 *
 * Prints held-out accuracy, the per-class breakdown, the confusion pairs, and accuracy at a range
 * of confidence floors, because the floor is the decision that matters in production: below it the
 * turn goes to Gemini instead, so the useful question is not "how accurate is the model" but "how
 * accurate is it on the traffic it actually keeps, and how much does it hand over".
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { CORPUS, HELD_OUT } from "../src/lib/ml/intent/corpus";
import { INTENT_LABELS, predict, train, type IntentLabel } from "../src/lib/ml/intent/model";

const OUT = join(process.cwd(), "src", "lib", "ml", "intent", "weights.json");

function main() {
  console.log(`\nTraining on ${CORPUS.length} utterances, holding out ${HELD_OUT.length}.\n`);

  const trained = train(CORPUS);
  const model = { ...trained, accuracy: 0 };

  // ── held-out evaluation ───────────────────────────────────────────────────
  let correct = 0;
  const perClass = new Map<IntentLabel, { n: number; ok: number }>();
  const confusions: string[] = [];

  for (const sample of HELD_OUT) {
    const p = predict(model, sample.text);
    const hit = p.label === sample.label;
    if (hit) correct++;
    const bucket = perClass.get(sample.label) ?? { n: 0, ok: 0 };
    bucket.n++;
    if (hit) bucket.ok++;
    perClass.set(sample.label, bucket);
    if (!hit) {
      confusions.push(
        `    "${sample.text}"\n      expected ${sample.label}, got ${p.label} (${(p.confidence * 100).toFixed(0)}%)`,
      );
    }
  }

  const accuracy = correct / HELD_OUT.length;
  model.accuracy = Number(accuracy.toFixed(4));

  console.log(`Held-out accuracy: ${(accuracy * 100).toFixed(1)}%  (${correct}/${HELD_OUT.length})\n`);

  console.log("Per class:");
  for (const label of INTENT_LABELS) {
    const b = perClass.get(label);
    if (!b) continue;
    console.log(`  ${label.padEnd(14)} ${b.ok}/${b.n}`);
  }

  if (confusions.length) {
    console.log("\nMisclassified:");
    console.log(confusions.join("\n"));
  }

  // ── the decision that actually matters ────────────────────────────────────
  console.log("\nAt each confidence floor — below it, the turn goes to Gemini:");
  console.log("  floor   kept    accuracy on kept");
  for (const floor of [0.3, 0.4, 0.5, 0.6, 0.62, 0.7, 0.8]) {
    const kept = HELD_OUT.map((s) => ({ s, p: predict(model, s.text) })).filter(
      ({ p }) => p.confidence >= floor,
    );
    const keptCorrect = kept.filter(({ s, p }) => p.label === s.label).length;
    const pct = kept.length ? (100 * keptCorrect) / kept.length : 100;
    console.log(
      `  ${floor.toFixed(2)}    ${String(kept.length).padStart(2)}/${HELD_OUT.length}   ${pct.toFixed(1)}%`,
    );
  }

  // Sparsify: most of a 4096-wide row is exactly zero after training, and writing those out
  // quadruples the file for no information.
  const sparse = model.weights.map((row) => {
    const out: Record<string, number> = {};
    row.forEach((w, i) => {
      if (w !== 0) out[i] = Number(w.toFixed(5));
    });
    return out;
  });

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        labels: model.labels,
        dim: model.dim,
        bias: model.bias.map((b) => Number(b.toFixed(5))),
        sparseWeights: sparse,
        accuracy: model.accuracy,
        trainedOn: model.trainedOn,
      },
      null,
      0,
    ),
  );

  const nonZero = sparse.reduce((n, row) => n + Object.keys(row).length, 0);
  console.log(`\nWrote ${OUT}`);
  console.log(`  ${nonZero} non-zero weights across ${model.labels.length} classes\n`);
}

main();
