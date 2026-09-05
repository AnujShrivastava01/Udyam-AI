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

### 3. Claims are guarded too, not just numbers

The numeric firewall checks figures. It cannot catch a SEMANTIC invention — and we watched one
happen. `gemini-2.5-pro` wrote *"आपका लोन अभी मंज़ूर नहीं हुआ है"* — "your loan has not been
approved". Every number in that sentence was correct. The claim was fabricated.

This product performs a structuring **calculation**. It does not approve, sanction, reject or
determine eligibility — an SCA officer does. `verifyNoUnsupportedClaims` rejects any narration
that says otherwise, in English, Hinglish or Devanagari, and the deterministic template is shown
instead.

### 4. Anything unaccounted for is rejected

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
| **Fabricated approval** | "आपका लोन मंज़ूर नहीं हुआ" — numbers right, claim invented | ✅ |
| Legitimate narration | "18 months … month 6 … ₹46,467" | ✅ passes |

Two false positives were also fixed once the model started answering: rounding every allowed
value turned an interest rate of 6.5 into "7", and numbers inside strings we hand the model — the
activity is literally named "Goat rearing — **20** does + **1** buck" — were treated as
inventions. The firewall was firing on every well-behaved answer. A guard that cries wolf gets
switched off, so its false-positive rate matters as much as its recall.

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
| Provider | Vertex AI over REST + `google-auth-library` | Explicit key path; avoids ambient-credential capture |
| Location | `global` | This project does not serve these models regionally |
| Thinking budget | `0` | Dynamic thinking swings latency 70–160s; narration needs none |
| Model | `gemini-2.5-pro` | The configured default in `.env.example` and the fallback in `narrate.ts`. `gemini-2.5-flash` and `-flash-lite` are both supported through `VERTEX_MODEL` and are cheaper; pro is the default because the numeric firewall rejects more flash output than pro output, and a rejected narration costs a second call. Note pro REFUSES `thinkingBudget: 0`, which is why the budget is model-aware. |
| Temperature | `0.4` | Warm phrasing, low drift |
| Max tokens | `300` | Two or three sentences is the whole job |
| Runtime | `nodejs`, `maxDuration: 30` | Kernel is synchronous; only the model call is I/O |

Credentials live in `/secrets` and `.env.local`, both gitignored.

**Two deployment facts that cost real debugging time.**

1. **Models are served at location `global`, not at a region.** Asking
   `us-central1-aiplatform.googleapis.com/.../locations/us-central1/...` returns
   `404 NOT_FOUND … or your project does not have access to it`. That reads like missing IAM or
   a wrong model id and is neither. We chased a phantom permissions problem for hours on the
   strength of it.
2. **This project serves the `gemini-2.5-*` family**, not `gemini-2.0-*`. A model id that does
   not exist for the project produces the identical 404. Verified working here:
   `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`.

A third trap worth naming: **do not rely on `GOOGLE_APPLICATION_CREDENTIALS`.** If it is set
anywhere in the environment the SDK authenticates as whatever identity it points at, which
produces a `403` on `aiplatform.endpoints.predict` that looks exactly like a missing role. We load
the key by explicit path (`VERTEX_KEY_FILE`) so that whole class of failure cannot occur.

Diagnostic shortcut: if `projects/<p>/locations/<loc>` responds but publisher models 404, the
location or the model id is wrong — not your permissions.

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
3. **Voice IN.** Speech OUT shipped: `/api/voice/speak` runs the kernel, builds the sentence from
   its own figures via `speakAmount`, and returns the audio with the exact words spoken. The route
   takes kernel INPUTS, never a string to read out — so it cannot be used as a free text-to-speech
   proxy, and no model output or client text ever reaches the synthesiser. Speech IN still needs a
   microphone control and the `confirmationPrompt` read-back loop.
4. **Round-trip numeric extraction** on translated output — re-parse the rendered Indic string and
   assert every numeral matches the source JSON, turning "multilingual" from a checkbox into a
   measured 0%-corruption guarantee.
