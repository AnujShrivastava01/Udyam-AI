# UdyamAI

**It doesn't tell you what you can borrow. It tells you what you can repay.**

An AI business-advisory and financial-structuring assistant for rural micro-entrepreneurs, built
for **Smart India Hackathon 2026, problem statement SIH26091** (Ministry of Social Justice and
Empowerment).

---

## The finding this is built around

Two government tables have never been joined.

- **NABARD** publishes, for each rural activity, a **gestation period** — how long before it earns
  anything. Goat rearing: 18 months. Crossbred heifer: 27 months.
- **NSFDC** publishes its repayment terms. The moratorium is **3 months** (Micro Finance) or
  **6 months** (Term Loan).

Join them and the arithmetic is unavoidable. On a ₹1,00,000 goat unit — the exact configuration
NABARD prices — **₹46,467 falls due before the first kid is sold**, against a beneficiary
contribution of ₹10,000.

Nothing about that loan is irregular. It satisfies every scheme rule exactly. The gap is
structural, and it mechanistically explains a statistic the ministry itself published: that
**34% of credit-short beneficiaries end up at a moneylender**.

UdyamAI computes that gap before the loan is sanctioned, and refuses to recommend a business the
borrower cannot survive.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in what you have; everything degrades gracefully without it
npm run dev
```

Open <http://localhost:3000>. No API keys are required to see the core product — the finance and
feasibility engines are pure and run locally.

```bash
npm test          # 95 tests
npm run bench     # regenerate SIDDHI-Bench
npx tsc --noEmit  # typecheck
npm run build     # production build
```

---

## What to look at

| Route | What it shows |
|---|---|
| `/calculator` | The **Solvency Clock**, the full amortisation schedule, and the **₹1.40 lakh cliff** slider |
| `/discover` | The recommender: one recommendation with its binding constraint named — never a menu |
| `/report/[id]` | Feasibility report; every figure carries a clickable source and a confidence label |
| `/dashboard/ngo` | The **SCA officer console** — batch triage of a pending-application queue |
| `/dashboard/emi` | The borrower's live loan, with every row marked paid / moratorium / before-income |

Two moments worth trying:

1. On `/calculator`, drag the cliff slider across ₹1,40,000. The quarterly instalment **falls
   49.9%** while lifetime interest **rises 187.7%** — the cheaper headline rate is the heavier
   cash-flow burden, and a threshold rule cannot express that.
2. On `/calculator`, look at the **capital stack** — the specification's single-scheme route costs
   ₹10,473 in net capital; the optimiser finds PMEGP at **−₹6,928**, negative because the grant
   exceeds the lifetime interest.
3. On `/discover`, set the margin to ₹10,000 and pick goat rearing. It warns you, then steers you
   to a tailoring unit that earns from month one. Drop the margin to ₹4,000 and it offers nothing
   at all, because nothing is affordable — silence beats a suggestion the borrower cannot take.

And the claim, reproducible in one command — `npm run bench`:

> The specification implemented literally gets the scheme tier right 100% of the time, the
> sanctioned loan right only where no cap binds (71.8%), and the quarterly instalment right
> **0%** of the time. The deterministic kernel scores 100% by construction.

---

## Architecture in one line

**A deterministic kernel computes every number. The language model only ever explains it.**

```
input ──▶ resolve ──▶ EVIDENCE (deterministic) ──▶ VERIFY ──▶ NARRATE (LLM) ──▶ output
                      catchment · saturation       numeric      explains, never
                      finance kernel · solvency    firewall     computes
```

Pull the model out and every figure in the product is unchanged. That is the test we hold
ourselves to, and it is enforced by `verifyNumericFidelity` — see [AIAGENT.md](./AIAGENT.md).

| Module | Lines | Responsibility |
|---|---:|---|
| `src/lib/finance` | 1,482 | Scheme registry, amortisation, structuring, the Solvency Clock. Pure — no DB, no network. |
| `src/lib/market` | 1,077 | Catchment, addressable demand, saturation, the recommender |
| `src/lib/i18n` | 606 | 142 keys × English / Hindi / Hinglish, with slot-based number injection |
| `src/lib/whatsapp` | 552 | Advisory flow over WhatsApp |
| `src/lib/officer` | 245 | SCA sanction triage |
| `src/lib/ai` | 252 | Gemini narration + the numeric-fidelity verifier |
| `src/lib/bench` | ~700 | SIDDHI-Bench: case generation, ground truth, solvers, scoring |

Design rationale: [DESIGN.md](./DESIGN.md) · AI architecture: [AIAGENT.md](./AIAGENT.md) ·
Data honesty: [DATA_PROVENANCE.md](./DATA_PROVENANCE.md)

---

## Three languages, and why numbers are not one of them

The interface runs in **English, हिन्दी and Hinglish**. Hinglish is the default, because rural
users read Roman-script Hinglish faster than either pure language.

The engine never returns prose. It returns a message key plus typed slots:

```ts
msg("solvency.gap.headline", { amount: "₹46,467" })
```

Rupee figures are computed **once** by the kernel, formatted **once** with the Indian locale, and
injected into a translated template as slots. Templates get translated; numbers never do. A test
asserts that no template in any language contains a hardcoded rupee figure, and that the
placeholder set is identical across all three.

---

## The honesty layer

Every figure the product renders carries a confidence label:

| Label | Meaning |
|---|---|
| `measured` | Read directly from the cited dataset |
| `estimated` | Computed from cited inputs by a stated method, with an error band |
| `seeded` | **Placeholder.** Structurally correct, not a real reading. Never quote it. |
| `unavailable` | No basis held — the engine declines rather than guessing |

There is no code path that renders an uncited number. Where data is too thin the system says so
and refuses to rank, which is a designed behaviour rather than an unhandled case.

---

## Status, honestly

**Built and tested**

- Deterministic finance kernel — caps, both moratorium conventions, the dead zone at ₹1,38,889,
  quarterly amortisation closing to exactly zero
- The Solvency Clock, the ₹1.40 lakh cliff, need-based costing, the RBI affordability guardrail
- Feasibility engine with saturation computed two independent ways
- Recommender with a refusal path; SCA officer console; loan tracker
- Three languages end to end; WhatsApp channel; AI narration with a numeric firewall
- **SIDDHI-Bench** — 500-case public benchmark; see [bench/](./bench/README.md)
- **Multi-scheme capital stacking** across NSFDC, PMEGP and MUDRA, with the exclusions that
  bar double-subsidy encoded explicitly

**Not built yet**

- Voice in and out (Bhashini ASR/TTS)
- Real WorldPop / SHRUG / LGD ingest — the gazetteer is 4 seeded villages
- Grounded retrieval over scheme PDFs with citation enforcement

**Known limitations**

- The village gazetteer is **seeded placeholder data**, labelled as such everywhere it appears.
- The activity catalog holds 11 rows: 5 carry NABARD unit costs with the gestation column,
  6 are indicative planning figures badged as not-yet-sourced.
- Sector establishment counts are **modelled, not counted** — the Economic Census publishes
  employment share by industry, not establishment counts, so the saturation index reduces to this
  block's total establishment density against the national average. The UI says so.
- WhatsApp runs through Whapi, which drives a real WhatsApp session. Fast to demo, carries a ban
  risk on the number, and is **not** a government deployment path — that is Meta's Cloud API.
- Vertex AI narration is live on `gemini-2.5-flash` at location `global`. If it is ever
  unreachable the product falls back to the deterministic template — the designed behaviour, and
  it changes no figure a borrower sees. See AIAGENT.md for the two 404 traps (wrong location,
  wrong model family) that make this look like a permissions problem when it is not.

---

## Licence note

SHRUG — the intended source for village-level Economic Census and Mission Antyodaya data — is
**CC BY-NC-SA 4.0**, non-commercial *and* share-alike. The underlying government data is
GODL-India, which does permit commercial use, so any commercial deployment must re-derive from
MoSPI primary data rather than from SHRUG.
