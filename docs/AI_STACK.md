# AI / ML stack

What is actually running, verified against the code and against the live APIs. Written for a
"Technologies Used" slide, so it also says what is **not** here — a stack slide claiming a
capability nobody built is the easiest thing in a submission to get caught on.

## The one-line architecture

**No model is trained, fine-tuned or self-hosted. Every number is computed by a deterministic
kernel; hosted models are used only for language, and their output is verified before it reaches
the user.** That is a design decision, not a shortfall — it is what makes each figure traceable to
a government table.

---

## 1. Language models — inference only

| | |
|---|---|
| **Model** | Google **Gemini 2.5 Pro** |
| **Platform** | Vertex AI, REST (`aiplatform.googleapis.com`), location `global` |
| **Auth** | Service account via `google-auth-library` |
| **Client** | `src/lib/ai/vertex.ts` |
| **Jobs** | (a) narration — turn a computed verdict into two or three sentences; (b) intent classification — map a spoken sentence to one action from a closed list |
| **Config** | `temperature` 0 for intent, 0.4 for narration; `thinkingBudget: 128` (Pro rejects a budget of 0 with a hard 400); `responseMimeType: application/json` for intent |

Configurable to `gemini-2.5-flash` / `-flash-lite` via `VERTEX_MODEL`.

## 2. Speech — Sarvam AI (Indic-first, Indian model stack)

| Task | Model | Detail |
|---|---|---|
| Text → speech | **bulbul:v3** | speaker `rupali`, 22.05 kHz WAV, `pace 0.95` |
| Speech → text | **saarika:v2.5** | multipart upload, Hindi / English |
| Chat (fallback narrator) | `sarvam-m` | implemented, not wired |

`src/lib/voice/sarvam.ts`. **Bhashini** (Government of India, ULCA) is implemented behind the same
interface in `src/lib/voice/bhashini.ts` as the long-term government-deployment path; it needs ULCA
onboarding rather than a signup form, so Sarvam is the configured provider.

Voice-activity detection for hands-free turn-taking is **signal processing, not ML** — short-window
RMS energy with hysteresis, `src/lib/voice/vad.ts`. Worth saying so rather than calling it a model.

## 3. The deterministic kernel — where every number comes from

Not machine learning. This is the part that computes, and it is deliberately separate from the part
that talks.

| Component | Method | File |
|---|---|---|
| Repayment schedule | Reducing-balance amortisation, quarterly rests, two moratorium conventions | `finance/amortise.ts` |
| Scheme routing | Rule-based tier selection, cap-binding and dead-zone detection | `finance/structure.ts` |
| Capital stack | Exhaustive constrained enumeration over eligible rails, ranked by net cost of capital | `finance/stack.ts` |
| Solvency | Joins NABARD gestation to NSFDC repayment terms; RBI 50%-of-income gate; DSCR floor | `finance/solvency.ts` |
| Market saturation | Two independent estimators — supply-side density and demand-side spend — compared rather than averaged | `market/feasibility.ts` |
| Recommendation | Ranking with the binding constraint named, refusal when nothing is affordable | `market/recommend.ts` |

## 4. Guardrails — the distinctive engineering

This is the part worth a slide of its own.

**Numeric firewall** (`ai/narrate.ts`). Every number the model emits is extracted and checked
against the set the kernel produced. One invented figure and the whole reply is discarded and
replaced with the deterministic template. The UI shows what was rejected.

**Claim guard.** A regex set over claims the model may never make — approval, eligibility,
sanction. Added after Gemini wrote *"आपका लोन अभी मंज़ूर नहीं हुआ है"* with every number correct:
the numeric firewall cannot catch a semantic invention.

**Closed-set intent validation** (`voice/agent.ts`). The voice agent's model output is a label plus
at most one slot. Every slot is validated against a real vocabulary — districts from the gazetteer,
pages from the route table. Anything unrecognised becomes `unknown` and the user is asked again.
The model never navigates or computes on its own authority.

**Deterministic fallback.** Model unavailable, slow, or rejected → the template answers. The
product never fails to answer, and never answers with an unverified number.

## 5. Evaluation — SIDDHI-Bench

A 500-case public benchmark, `src/lib/bench/`, regenerated with `npm run bench`.

- Cases generated from a seeded `mulberry32` PRNG — same seed, byte-identical cases.
- Ground truth **computed by the kernel, not annotated by hand**.
- Eight regions oversampling the hard boundaries: dead zone, tier boundary, above ceiling,
  plantation exception, capitalised convention.
- Four solvers scored per-field and per-region.

| Solver | Exact match | Instalment |
|---|---|---|
| Deterministic kernel | 100% | 100% |
| Correct, assumes interest always serviced | 77.4% | 77.4% |
| **The specification implemented literally** | **0%** | **0%** |
| Caps applied, simple interest | 0% | 0% |

The headline result: the problem statement's own logic, implemented exactly as written, gets the
scheme tier right every time and the quarterly instalment right **none** of the time.

## 6. Supporting stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 4 · shadcn/ui + Base UI ·
zustand (persisted) · Recharts · Framer Motion · Vitest (137 tests) · Whapi (WhatsApp gateway).

## 7. What is NOT in this project

State it before a judge asks.

- **No training and no fine-tuning.** No dataset was trained on.
- **No embeddings, no vector store, no RAG.** Grounded retrieval over scheme PDFs is on the
  roadmap; it is not built.
- **No self-hosted or local model.** All inference is hosted API.
- **No computer vision, no OCR.** The NABARD PDF figures were transcribed by hand, which is why
  they carry a `needsVerification` marker.
- **No recommender trained on user behaviour.** The ranking is an explicit scoring function whose
  terms are printed on screen.
