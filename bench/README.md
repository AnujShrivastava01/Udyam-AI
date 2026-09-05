# SIDDHI-Bench

A public benchmark for concessional-loan arithmetic under the NSFDC schemes that SIH26091
describes.

## Why

The closest prior work on deterministic tool-grounding for financial reasoning explicitly leaves
loan/EMI arithmetic unevaluated. This fills that hole — for a domain where a wrong answer is not a
bad user experience but a household pushed to a moneylender.

Unusually for a benchmark, **the labels are not annotator opinion.** They are arithmetic, computed
by a kernel that is itself pinned by unit tests against figures worked by hand from the published
scheme documents. Anyone can recompute them.

## Track L — loan arithmetic

500 seeded cases. A solver must produce the full five-tuple:

1. scheme tier
2. sanctioned loan **after** the ₹1.25 L / ₹45 L cap
3. quarterly instalment
4. moratorium interest
5. total interest

Scored as **exact match on all five at ₹1 tolerance**. Partial credit is reported per field so a
failure can be diagnosed, but the headline is strict — a quote that gets the scheme and the loan
right and the instalment wrong is not partially correct to a borrower.

Hard regions are deliberately over-sampled: the tier boundary, the dead zone between ₹1,38,889 and
₹1,40,000, cap-binding cases, the ₹50 lakh ceiling, the 12-month plantation exception, and
capitalised-moratorium cases.

## Run it

```bash
npm run bench          # regenerates every artifact in this directory
BENCH_COUNT=2000 npm run bench
```

`cases.json` and `labels.json` are the benchmark. `results.json` carries every solver's per-case
result. `LEADERBOARD.md` is the table.

## Results

See [LEADERBOARD.md](./LEADERBOARD.md). The finding in one line:

> **The specification implemented literally gets the scheme tier right 100% of the time, the
> sanctioned loan right only where no cap binds (71.8%), and the quarterly instalment right
> 0% of the time.**

That is not a criticism of the problem statement. It is the gap between a rule as written and a
rule as the scheme documents actually constrain it — which is exactly the gap a borrower falls
into.

## A flaw we found and fixed

The first version drew arbitrary project costs, so a case's 10% margin did not round-trip:
`margin / 0.1` did not reproduce the project cost. Any solver that inverts the margin — precisely
what the specification instructs — lost marks for **our** rounding rather than its own errors. It
understated spec-literal loan accuracy by 50 points (21.8% → 71.8%).

Project costs are now always a multiple of ten, and a test asserts the round-trip. A benchmark that
overstates its finding is worse than no benchmark.

## Adding a solver

Implement `Solver` in `src/lib/bench/solvers.ts` and add it to `SOLVERS`. An LLM solver belongs
here too — the harness does not care where an answer comes from.
