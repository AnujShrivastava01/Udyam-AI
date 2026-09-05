# References

Sources behind UdyamAI (SIH 2026, PS 26091). Every link was checked and returned HTTP 200 on
2026-09-05.

**One caveat, and it matters for a submission.** A working link is not a verified figure. The
numbers in this project were transcribed from these documents during research; most have not been
re-confirmed against the primary source by the team, which is why `DATA_PROVENANCE.md` marks them
"needs first-hand re-fetch" and why the app renders a `needsVerification` marker on the figures
concerned. Before quoting any specific number on a slide, open the document and re-read it. The
column below says which ones are load-bearing.

---

## 1. The core finding — the two tables nobody had joined

The claim: NABARD publishes how long a rural activity takes to earn; NSFDC publishes when
repayment starts; join them and ₹46,467 falls due on a ₹1,00,000 goat unit before the first rupee
of income.

| Source | What it gives | Load-bearing? |
|---|---|---|
| [NABARD — Model Bankable Projects / unit cost & gestation](https://www.nabard.org/auth/writereaddata/tender/pub_1612241135501243.pdf) | Activity unit costs **and the gestation column** | **Yes — the whole argument** |
| [NABARD](https://www.nabard.org/) | Publisher, for the general citation | Yes |
| [NSFDC — Schemes](https://nsfdc.nic.in/scheme) | Micro Finance & Term Loan: rates, caps, tenures, moratoria | **Yes — every rupee** |
| [NSFDC — Eligibility](https://nsfdc.nic.in/eligibility-requirements) | Income ceilings, beneficiary definition | Yes |

## 2. The affordability gate

| Source | What it gives |
|---|---|
| [RBI — Master Directions, Microfinance Loans, 2022](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx) | The **50%-of-household-income** repayment cap the engine enforces |

## 3. Evidence the problem is real — the Ministry's own evaluation

| Source | What it gives |
|---|---|
| [MoSJE — Evaluation of NSFDC (summary report)](https://socialjustice.gov.in/public/ckeditor/upload/Summary%20Report-Evaluation%20of%20NSFDC_1648795113.pdf) | Average **pre-loan household income ₹86,119** — the default in the calculator, from the Ministry that owns the problem statement |

This is the strongest citation in the deck: the sponsoring ministry's own evaluation of the scheme
the product structures against.

## 4. Market and feasibility data

| Source | What it gives |
|---|---|
| [MoSPI — HCES 2023-24 Fact Sheet](https://www.mospi.gov.in/sites/default/files/publication_reports/HCES%20FactSheet%202023-24.pdf) | Rural MPCE ₹4,122; MP rural ₹3,441; item-group per-capita spend |
| [Sixth Economic Census — Highlights](https://www.mospi.gov.in/sites/default/files/economic-census/sixth_economic_census/all_india/5_Highlights_6ecRep.pdf) | Establishment density per 1,000 rural persons |
| [Sixth Economic Census — Chapter II](https://www.mospi.gov.in/sites/default/files/economic-census/sixth_economic_census/all_india/7_ChapterII_6ecRep.pdf) | Distribution by activity, the basis for sector share |
| [MoSPI — Economic Census landing](https://www.mospi.gov.in/economic-census) | Series homepage |
| [MoSPI — ASUSE 2025 press note](https://www.mospi.gov.in/uploads/latestReleases/latest_release_1774347321466_c16ddf22-bfff-4097-88a7-b3134e464d51_Press_Note_ASUSE_2025_English.pdf) | Unincorporated enterprise survey — the current successor to the NSS rounds |

## 5. Geospatial — the gazetteer pipeline

Not yet ingested; the shipped gazetteer is four seeded villages. These are the sources the
pipeline is designed against.

| Source | What it gives |
|---|---|
| [SHRUG (Development Data Lab)](https://www.devdatalab.org/shrug) | Village-level Economic Census and Census keys |
| [SHRUG — download](https://www.devdatalab.org/shrug_download/data) | The datasets themselves |
| [SHRUG — ec13 table metadata](https://docs.devdatalab.org/SHRUG-Metadata/Economic%20Census/Tables/ec13-metadata/) | Field definitions for establishment counts |
| [LGD — Local Government Directory](https://lgdirectory.gov.in/) | Authoritative village/block/district codes |
| [WorldPop — India, 1 km constrained](https://hub.worldpop.org/geodata/summary?id=41746) | Catchment population |
| [data.gov.in — Village Amenities, Census 2011](https://www.data.gov.in/catalog/village-amenities-census-2011) | Village infrastructure attributes |

**Licensing note for the deck:** SHRUG is **CC BY-NC-SA 4.0 — non-commercial, share-alike**.
Derived datasets inherit it. The underlying government data is GODL-India, which does permit
commercial use, so a commercial deployment must re-derive from MoSPI primary data rather than from
SHRUG. Worth a line on the slide — it shows the licensing was actually read.

## 6. Comparable rails (the multi-scheme capital stack)

Terms for these are **indicative**, drawn from public scheme summaries and marked
`needsVerification` in the code. Re-fetch from the administering ministry before quoting a saving.

| Source | What it gives |
|---|---|
| [myScheme (National Scheme Portal)](https://www.myscheme.gov.in/) | PMEGP, MUDRA (Kishore/Tarun) terms and subsidy patterns |
| [NBCFDC — pattern of finance](https://nbcfdc.gov.in/nbcfdc/web/en/loans-pattern-of-finance) | A sibling NCFDC's published finance pattern, for comparison |

---

## Suggested slide wording

> **Built on published guidelines from NABARD, NSFDC and MoSPI.**
> Gestation periods: NABARD model project reports. Scheme terms: NSFDC.
> Repayment cap: RBI Microfinance Directions 2022. Household income baseline:
> MoSJE's own 2020 evaluation of NSFDC. Market benchmarks: HCES 2023-24 and
> the Sixth Economic Census.

Name only bodies you actually draw from. An earlier version of the landing page listed SIDBI and
NRLM, which the engine does not use — naming a body you do not read from reads as endorsement, and
it is the kind of claim a judge can falsify with one question.
