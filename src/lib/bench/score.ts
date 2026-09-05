/**
 * SIDDHI-Bench — scoring.
 *
 * Exact-match on the full five-tuple at ₹1 tolerance. Partial credit is reported per field so a
 * failure can be diagnosed, but the headline number is the strict one: a loan quote that gets the
 * scheme and the loan right and the instalment wrong is not a partially correct answer to a
 * borrower.
 */

import { generateCases, REGIONS, type BenchCase, type CaseRegion } from "./cases";
import { groundTruth, SOLVERS, type Answer, type Solver } from "./solvers";

/** Rupee tolerance. One rupee — tight enough to catch a convention error, loose enough for float. */
export const TOLERANCE = 1;

export type Field = keyof Answer;
export const FIELDS: Field[] = [
  "scheme",
  "sanctionedLoan",
  "quarterlyInstalment",
  "moratoriumInterest",
  "totalInterest",
];

export function fieldMatches(field: Field, expected: Answer, actual: Answer): boolean {
  if (field === "scheme") return expected.scheme === actual.scheme;
  const e = expected[field] as number;
  const a = actual[field] as number;
  if (!Number.isFinite(a)) return false;
  return Math.abs(e - a) <= TOLERANCE;
}

export interface CaseResult {
  case: BenchCase;
  expected: Answer;
  actual: Answer;
  perField: Record<Field, boolean>;
  exact: boolean;
}

export interface SolverReport {
  solverId: string;
  label: string;
  note: string;
  total: number;
  exact: number;
  exactPct: number;
  perField: Record<Field, number>;
  perFieldPct: Record<Field, number>;
  perRegion: Record<CaseRegion, { total: number; exact: number; pct: number }>;
  /** A few concrete misses, for the writeup. */
  sampleFailures: CaseResult[];
}

export function scoreSolver(solver: Solver, cases: BenchCase[]): SolverReport {
  const results: CaseResult[] = cases.map((c) => {
    const expected = groundTruth(c);
    let actual: Answer;
    try {
      actual = solver.solve(c);
    } catch {
      actual = {
        scheme: "none",
        sanctionedLoan: NaN,
        quarterlyInstalment: NaN,
        moratoriumInterest: NaN,
        totalInterest: NaN,
      };
    }
    const perField = Object.fromEntries(
      FIELDS.map((f) => [f, fieldMatches(f, expected, actual)]),
    ) as Record<Field, boolean>;
    return { case: c, expected, actual, perField, exact: FIELDS.every((f) => perField[f]) };
  });

  const perField = Object.fromEntries(
    FIELDS.map((f) => [f, results.filter((r) => r.perField[f]).length]),
  ) as Record<Field, number>;

  const perRegion = Object.fromEntries(
    REGIONS.map((region) => {
      const inRegion = results.filter((r) => r.case.region === region);
      const exact = inRegion.filter((r) => r.exact).length;
      return [
        region,
        {
          total: inRegion.length,
          exact,
          pct: inRegion.length ? round1((exact / inRegion.length) * 100) : 0,
        },
      ];
    }),
  ) as Record<CaseRegion, { total: number; exact: number; pct: number }>;

  const exact = results.filter((r) => r.exact).length;

  return {
    solverId: solver.id,
    label: solver.label,
    note: solver.note,
    total: results.length,
    exact,
    exactPct: round1((exact / results.length) * 100),
    perField,
    perFieldPct: Object.fromEntries(
      FIELDS.map((f) => [f, round1((perField[f] / results.length) * 100)]),
    ) as Record<Field, number>,
    perRegion,
    sampleFailures: results.filter((r) => !r.exact).slice(0, 5),
  };
}

export interface BenchRun {
  seed: number;
  count: number;
  tolerance: number;
  reports: SolverReport[];
}

export function runBenchmark(opts: { count?: number; seed?: number; solvers?: Solver[] } = {}): BenchRun {
  const { count = 500, seed = 26091, solvers = SOLVERS } = opts;
  const cases = generateCases({ count, seed });
  return {
    seed,
    count,
    tolerance: TOLERANCE,
    reports: solvers.map((s) => scoreSolver(s, cases)),
  };
}

/** A leaderboard, rendered as Markdown for LEADERBOARD.md. */
export function renderLeaderboard(run: BenchRun): string {
  const rows = [...run.reports].sort((a, b) => b.exactPct - a.exactPct);

  const lines: string[] = [
    `# SIDDHI-Bench — Track L (loan arithmetic)`,
    ``,
    `${run.count} cases · seed \`${run.seed}\` · exact match on the full five-tuple at ₹${run.tolerance} tolerance.`,
    ``,
    `Regenerate with \`npm run bench\`. Same seed, identical cases.`,
    ``,
    `| Solver | Exact | Scheme | Loan | Instalment | Moratorium int. | Total int. |`,
    `|---|---:|---:|---:|---:|---:|---:|`,
  ];

  for (const r of rows) {
    lines.push(
      `| **${r.label}** | **${r.exactPct}%** | ${r.perFieldPct.scheme}% | ${r.perFieldPct.sanctionedLoan}% | ` +
        `${r.perFieldPct.quarterlyInstalment}% | ${r.perFieldPct.moratoriumInterest}% | ${r.perFieldPct.totalInterest}% |`,
    );
  }

  lines.push(``, `## Where each solver fails`, ``);
  for (const r of rows) {
    lines.push(`### ${r.label} — ${r.exactPct}%`, ``, `${r.note}`, ``);
    lines.push(`| Region | Cases | Exact | % |`, `|---|---:|---:|---:|`);
    for (const region of REGIONS) {
      const s = r.perRegion[region];
      if (!s || s.total === 0) continue;
      lines.push(`| ${region} | ${s.total} | ${s.exact} | ${s.pct}% |`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
