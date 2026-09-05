/**
 * SIDDHI-Bench runner.
 *
 *   npm run bench
 *
 * Writes the public artifacts to bench/:
 *   cases.json       the 500 generated cases
 *   labels.json      ground truth, computed by the kernel
 *   results.json     every solver's full per-case result
 *   LEADERBOARD.md   the human-readable table
 *
 * The cases and labels are the benchmark. Publishing them is the point: a claim a judge can
 * re-run is worth more than a claim they have to believe.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateCases } from "./cases";
import { groundTruth } from "./solvers";
import { renderLeaderboard, runBenchmark } from "./score";

const COUNT = Number(process.env.BENCH_COUNT ?? 500);
const SEED = Number(process.env.BENCH_SEED ?? 26091);
const OUT = join(process.cwd(), "bench");

function main() {
  mkdirSync(OUT, { recursive: true });

  const cases = generateCases({ count: COUNT, seed: SEED });
  const labels = cases.map((c) => ({ id: c.id, ...groundTruth(c) }));
  const run = runBenchmark({ count: COUNT, seed: SEED });

  writeFileSync(join(OUT, "cases.json"), JSON.stringify(cases, null, 1));
  writeFileSync(join(OUT, "labels.json"), JSON.stringify(labels, null, 1));
  writeFileSync(join(OUT, "results.json"), JSON.stringify(run, null, 1));
  writeFileSync(join(OUT, "LEADERBOARD.md"), renderLeaderboard(run));

  // Console summary
  console.log(`\nSIDDHI-Bench · Track L · ${COUNT} cases · seed ${SEED}\n`);
  const width = Math.max(...run.reports.map((r) => r.label.length));
  for (const r of [...run.reports].sort((a, b) => b.exactPct - a.exactPct)) {
    console.log(`  ${r.label.padEnd(width)}  ${String(r.exactPct).padStart(5)}%  (${r.exact}/${r.total})`);
  }

  const spec = run.reports.find((r) => r.solverId === "spec-literal");
  if (spec) {
    console.log(
      `\n  The specification implemented literally is wrong on ${spec.total - spec.exact} of ${spec.total} cases.`,
    );
    console.log(
      `  It gets the scheme tier right ${spec.perFieldPct.scheme}% of the time and the instalment right ${spec.perFieldPct.quarterlyInstalment}%.`,
    );
  }
  console.log(`\n  Artifacts written to ./bench\n`);
}

main();
