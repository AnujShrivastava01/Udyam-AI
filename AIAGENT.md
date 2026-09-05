# AI architecture

How UdyamAI uses a language model, and — more importantly — what it refuses to let one do.

---

## The governing principle

> **The model narrates. It never computes.**

Every rupee figure, month count and ratio in this product is produced by a deterministic kernel
before any model is called. Gemini's entire job is to turn a structured verdict into two or three
warm sentences in the borrower's own language.

This is not a stylistic preference. It follows from what the product is: a system that tells a
first-time borrower with ₹10,000 whether a government loan will bankrupt them. A plausible-looking
wrong number here is not a bad user experience — it is a household pushed to a moneylender.

The test we hold ourselves to: **pull the model out and every number in the product is unchanged.**

---

## Why not an agent that reasons about the money

Two findings from the research shaped this, and both point the same way.

**1. Frontier models are unreliable at exactly this arithmetic.** Published financial-reasoning
benchmarks put frontier models well below the accuracy a loan calculation needs, and the errors
concentrate precisely where this domain lives — cap-binding cases, tier boundaries, moratorium
conventions. The published state of the art for this class of problem is *deterministic execution
with the model orchestrating*, not the model calculating.

**2. A naked LLM mentor made low-performing entrepreneurs measurably worse.** Otis et al. found the
harm came from the burden of **selecting** among AI suggestions. The design consequence is direct
and it is implemented: the recommender returns **one** recommendation with its binding constraint
named — never an undifferentiated menu — and it will return **none** rather than promote the
least-bad option.

---

## The pipeline

```
┌──────────┐   ┌──────────┐   ┌─────────────────────┐   ┌────────┐   ┌──────────┐
│  INPUT   │──▶│ RESOLVE  │──▶│ EVIDENCE            │──▶│ VERIFY │──▶│ NARRATE  │
│ voice /  │   │ village  │   │ (deterministic)     │   │ numeric│   │  (LLM)   │
│ text     │   │ → LGD →  │   │ catchment           │   │ firewall│  │ explains │
│          │   │ Census   │   │ saturation          │   │        │   │ only     │
│          │   │ key      │   │ finance kernel      │   │        │   │          │
│          │   │          │   │ solvency clock      │   │        │   │          │
└──────────┘   └──────────┘   └─────────────────────┘   └────────┘   └──────────┘
                                        │                                   │
                                   every number                      zero numbers
                                   originates here                   originate here
```

`src/lib/ai/narrate.ts` implements the last two stages.

---

## The numeric firewall

We do not ask the model nicely to avoid inventing figures. We check.

### 1. The model is handed facts, never asked to derive them

```ts
const facts = {
  activity, verdict, gestationMonths, firstInstalmentMonth,
  amountDueBeforeIncome, paymentsBeforeIncome,
  projectCost, ownContribution, loan, quarterlyInstalment,
  scheme, interestRatePct,
};
```

The prompt states: *use ONLY the numbers given above; do not calculate, round, convert, estimate or
invent any number — not even an approximation.*

### 2. The output is re-read and every number extracted

`allowedNumbers(plan)` builds the permitted set from the kernel's own output, in every form the
model might write it — bare (`46467`), Indian-grouped (`46,467`), and two-decimal (`46467.00`).

`extractNumbers(text)` pulls every numeric token out of the generated prose.

### 3. Anything unaccounted for is rejected

```ts
const rejected = verifyNumericFidelity(text, plan);
if (rejected.length > 0) return fallback(rejected);   // deterministic template instead
```

A hallucinated rupee amount **cannot reach a borrower** — by construction, not by prompt.

### What this catches, with tests

| Failure | Example | Caught |
|---|---|---|
| Invented total | "You will need about ₹52,000" | ✅ |
| Model doing its own arithmetic | "₹46,467 across 6 payments, so about ₹7,744 each" | ✅ |
| Wrong interest rate | "The scheme charges 7.5% per year" | ✅ |
| Legitimate narration | "18 months … month 6 … ₹46,467" | ✅ passes |

`src/lib/ai/ai.test.ts`. The engine's own rendered sentences are asserted to survive their own
verifier — a guarantee that must hold by definition.

---

## Degradation

The product is designed to be **fully functional with no model at all**. Failure paths:

| Condition | Behaviour |
|---|---|
| No credentials configured | Deterministic template, silently |
| Vertex unreachable / 403 / timeout | Deterministic template, error logged |
| Model returns empty | Deterministic template |
| Model invents a figure | Deterministic template + `rejected[]` returned to the caller |

The API response always carries `source: "gemini" | "template"`, so the UI can be honest about
whether a human is reading generated prose — and `rejected`, so a demo can show the firewall
catching an invented figure live.

---

## Multilingual, and the slot discipline

The same discipline governs translation. The engine returns a message key plus typed slots:

```ts
msg("solvency.gap.headline", { amount: "₹46,467" })
```

Rupee figures are formatted **once**, with `en-IN` grouping regardless of interface language — a
lakh groups the same way whether the label around it is Hindi or English, and a borrower reading a
figure aloud needs it to look like every other rupee figure they have seen. Devanagari numerals
would be a regression in legibility, not a localisation win.

Enforced by test:

- No template in any language may contain a hardcoded rupee figure.
- The placeholder set must be identical across English, Hindi and Hinglish.

The translation pipeline itself ran five domain translators plus a glossary-consistency reviewer,
which caught genuine drift — five different renderings of "margin", four of "gestation" — and
applied 67 corrections. Placeholder integrity was verified at zero mismatches across 142 keys.

---

## Model configuration

| Setting | Value | Why |
|---|---|---|
| Provider | Vertex AI (`@google-cloud/vertexai`) | Service-account auth; no key in the client |
| Model | `gemini-2.0-flash` | Narration is a short, easy task — latency matters more than depth |
| Temperature | `0.4` | Warm phrasing, low drift |
| Max tokens | `300` | Two or three sentences is the whole job |
| Runtime | `nodejs`, `maxDuration: 30` | Kernel is synchronous; only the model call is I/O |

Credentials live in `/secrets` and `.env.local`, both gitignored.

**A deployment note that cost us several hours, recorded so it costs you none.** Vertex AI
publisher models — the Gemini family — are not served to a project on a Google Cloud **free
trial** billing account. The failure is silent and misleading: the API enables normally, the
service account's `aiplatform.endpoints.predict` permission checks out, and
`projects/<p>/locations/<region>` responds — but every publisher model returns
`404 NOT_FOUND … or your project does not have access to it`, in every region, on both `v1` and
`v1beta1`.

It reads like a missing IAM role or a wrong model id. It is neither. The billing account must be
upgraded from trial to paid; the trial credit still applies. Diagnose it by checking whether the
platform endpoint responds while publisher models 404 — that asymmetry is the signature.

Until then the product falls back to the deterministic template, which is the designed behaviour
and costs a borrower nothing.

---

## What is deliberately *not* an agent

There is no tool-calling loop, no autonomous planner, no self-directed retrieval. Given a fixed
input the product produces a byte-identical answer every time, and that determinism is a feature —
an SCA officer and a borrower must never be shown contradictory figures for the same loan, and an
auditor must be able to reproduce a sanction decision months later.

The multi-agent decomposition the research proposes (Geo-Resolver, Catchment, Saturation,
Price-Risk, Solvency, Verifier as a LangGraph state machine) is the **scale-up** path, for when the
evidence layer grows past what one synchronous pass can hold. It is not needed to compute a
correct answer today, and adding it before it is needed would trade determinism for nothing.

---

## Roadmap

1. **SIDDHI-Bench** — a public 500-case loan-math benchmark with programmatically verified ground
   truth. The claim: frontier models answering end-to-end score well below a deterministic kernel
   that scores 100% by construction. This is the project's falsifiable claim and the highest-value
   item outstanding.
2. **Grounded retrieval** over scheme guideline PDFs and NABARD unit-cost tables, with citation
   enforcement — the model may only assert what a retrieved row supports.
3. **Voice** via Bhashini ASR/TTS, with the numeric firewall extended to spoken output: numbers
   read back for confirmation, never spoken by the model alone.
4. **Round-trip numeric extraction** on translated output — re-parse the rendered Indic string and
   assert every numeral matches the source JSON, turning "multilingual" from a checkbox into a
   measured 0%-corruption guarantee.
