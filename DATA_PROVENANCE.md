# Data provenance

The rule this project holds itself to: **if a number cannot name where it came from, it does not
go on screen.** Every figure the UI renders carries a confidence label, and anything we have not
re-verified against a primary document is marked as such rather than presented as settled.

## Confidence labels

| Label | Meaning |
|---|---|
| `measured` | Read directly from the cited dataset. |
| `estimated` | Computed from cited inputs by a stated method, with a band. |
| `seeded` | **Placeholder.** Structurally correct, not a real reading. Never quote it. |
| `unavailable` | We hold no basis for this. The engine declines rather than guessing. |

## Sources in use

| Source | What it gives | Vintage | Verified? |
|---|---|---|---|
| NSFDC scheme terms | Micro Finance & Term Loan rates, caps, tenures, moratoria | current | ⚠️ needs first-hand re-fetch |
| NABARD Jharkhand RO Unit Cost 2023-24 | Activity unit costs **and the gestation column** | 2023-24 | ⚠️ needs first-hand re-fetch |
| HCES 2023-24 (MoSPI) | Rural MPCE ₹4,122; MP rural ₹3,441; item-group per-capita spend | 2023-24 | ⚠️ needs first-hand re-fetch |
| Sixth Economic Census 2013 | Establishment density benchmarks per 1,000 rural persons | 2013 | ⚠️ needs first-hand re-fetch |
| NSS 73rd Round | Rural own-account enterprise GVA ₹71,217/yr | 2015-16 | ⚠️ needs first-hand re-fetch |
| RBI Microfinance Directions 2022 | The 50%-of-household-income repayment cap | 2022 | ⚠️ needs first-hand re-fetch |
| WorldPop India (1 km constrained) | Catchment population | 2020 | pipeline not yet run |

**Everything marked ⚠️ was transcribed during research and must be re-fetched with your own
retrieval date before it appears on a slide or in front of a jury.** Government rates and
ceilings change.

## What is seeded, and therefore fake

- **`src/lib/market/villages.ts`** — 4 Madhya Pradesh villages. The administrative entities are
  real; the population, catchment and establishment counts are placeholders. Every one is
  `seed: true` and the UI says so on the report page before showing any finding.
- **`src/lib/finance/activities.ts`** — 5 NABARD rows from one regional table. Real, but not
  national coverage. Activities outside this list get no gestation figure, and the solvency
  check declines rather than estimating one.

## Stated modelling assumptions

These are assumptions, not measurements, and the UI surfaces each one:

1. **Sector establishment share (12%).** The Economic Census publishes employment share by
   industry at village level, not establishment counts by industry — so "how many dairies in this
   block" cannot be read off and must be modelled.
2. **Capture share (35%)** of catchment category spend reachable by enterprises of one kind.
3. **State scaling of national item-group spend** by the ratio of state to national rural MPCE.

## Licensing note

SHRUG (the intended source for village-level Economic Census and Mission Antyodaya data) is
**CC BY-NC-SA 4.0 — non-commercial and share-alike**. Derived datasets inherit that. The
underlying government data is GODL-India, which does permit commercial use, so a commercial
deployment must re-derive from MoSPI primary data rather than from SHRUG.

## Ingest path, in order

```
1. LGD daily mirror      → village codes + hierarchy   github.com/ramSeraph/opendata
2. gp_mapping.csv        → LGD ↔ Census 2011 crosswalk (94.67% coverage, measured)
3. SHRUG pc11 polygons   → village centroids           (649,618 polygons)
4. WorldPop raster       → catchment population via H3 k-ring
5. SHRUG ec13            → establishment counts
6. NABARD state PDFs     → unit cost + gestation, all states   ← the critical parse
```

Step 6 is the only item on the critical path that cannot be parallelised away: the gestation
column is the entire differentiating claim.
