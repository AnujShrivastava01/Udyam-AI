# SIDDHI-Bench — Track L (loan arithmetic)

500 cases · seed `26091` · exact match on the full five-tuple at ₹1 tolerance.

Regenerate with `npm run bench`. Same seed, identical cases.

| Solver | Exact | Scheme | Loan | Instalment | Moratorium int. | Total int. |
|---|---:|---:|---:|---:|---:|---:|
| **Deterministic kernel** | **100%** | 100% | 100% | 100% | 100% | 100% |
| **Correct, but assumes interest is always serviced** | **77.4%** | 100% | 100% | 77.4% | 77.4% | 77.4% |
| **Specification, implemented literally** | **0%** | 100% | 71.8% | 0% | 47.4% | 0% |
| **Caps applied, simple interest** | **0%** | 100% | 100% | 0% | 77.4% | 0% |

## Where each solver fails

### Deterministic kernel — 100%

The engine under test is the engine that labels. Scores 100% by construction; included as the ceiling.

| Region | Cases | Exact | % |
|---|---:|---:|---:|
| ordinary-micro | 80 | 80 | 100% |
| ordinary-term | 100 | 100 | 100% |
| tier-boundary | 70 | 70 | 100% |
| dead-zone | 70 | 70 | 100% |
| above-ceiling | 60 | 60 | 100% |
| near-ceiling | 40 | 40 | 100% |
| plantation-exception | 40 | 40 | 100% |
| capitalised | 40 | 40 | 100% |

### Correct, but assumes interest is always serviced — 77.4%

Right caps, right amortisation, wrong on every case where moratorium interest is capitalised.

| Region | Cases | Exact | % |
|---|---:|---:|---:|
| ordinary-micro | 80 | 65 | 81.3% |
| ordinary-term | 100 | 90 | 90% |
| tier-boundary | 70 | 54 | 77.1% |
| dead-zone | 70 | 56 | 80% |
| above-ceiling | 60 | 51 | 85% |
| near-ceiling | 40 | 35 | 87.5% |
| plantation-exception | 40 | 36 | 90% |
| capitalised | 40 | 0 | 0% |

### Specification, implemented literally — 0%

PS formula with no caps and straight-line principal — what a faithful reading of the problem statement produces.

| Region | Cases | Exact | % |
|---|---:|---:|---:|
| ordinary-micro | 80 | 0 | 0% |
| ordinary-term | 100 | 0 | 0% |
| tier-boundary | 70 | 0 | 0% |
| dead-zone | 70 | 0 | 0% |
| above-ceiling | 60 | 0 | 0% |
| near-ceiling | 40 | 0 | 0% |
| plantation-exception | 40 | 0 | 0% |
| capitalised | 40 | 0 | 0% |

### Caps applied, simple interest — 0%

Gets the ceilings right, then prices the loan on a flat rate rather than a reducing balance.

| Region | Cases | Exact | % |
|---|---:|---:|---:|
| ordinary-micro | 80 | 0 | 0% |
| ordinary-term | 100 | 0 | 0% |
| tier-boundary | 70 | 0 | 0% |
| dead-zone | 70 | 0 | 0% |
| above-ceiling | 60 | 0 | 0% |
| near-ceiling | 40 | 0 | 0% |
| plantation-exception | 40 | 0 | 0% |
| capitalised | 40 | 0 | 0% |
