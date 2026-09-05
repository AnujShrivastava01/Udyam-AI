# PPT review — SIH26091 / UdyamAI / Team ABSOLUTE

Every item below was checked against the code in this repo, not against memory. Slide numbers follow
the submitted PDF.

Severity:
- **A** — a judge can falsify it in one question. Fix before submitting.
- **B** — wrong or unsourced; costs credibility.
- **C** — typo or inconsistency.
- **D** — missing; the deck undersells work that is actually built.

---

## A1. The technology strip on Slide 3 shows things that are not in this project

The icon row along the bottom of TECHNICAL APPROACH shows: CSS3, Flask, Python, PostgreSQL,
Firebase, React, GitHub, HTML5, JavaScript, AWS, Node.js, Vercel, Tailwind, Gemini, **ESP32**,
**Raspberry Pi**, Three.js, React (twice).

`package.json` in full:

```
@base-ui/react, @google-cloud/vertexai, @react-google-maps/api, @types/leaflet,
class-variance-authority, clsx, cn, framer-motion, google-auth-library, leaflet, lenis,
lucide-react, next 16.3.4, next-intl, react 19.2.8, react-dom, recharts, shadcn,
tailwind-merge, tw-animate-css, zustand
dev: tailwindcss 4, typescript 5, eslint, vitest, tsx
```

There is **no Python, no Flask, no PostgreSQL, no Firebase, no AWS, no Node backend, no Three.js**.

**ESP32 and Raspberry Pi are hardware.** The PS Category on Slide 1 is **Software**. Showing two
microcontrollers on a software submission invites the question "what runs on the ESP32?", and the
answer is nothing.

**Fix:** delete the strip, or replace it with only: Next.js, React, TypeScript, Tailwind, Vercel,
GitHub, Google Cloud/Vertex, Sarvam AI, Leaflet/OpenStreetMap.

## A2. Slide 6 cites three technologies the project does not use

"Technical references" lists **Google Places API**, **Hugging Face Transformers**, and
**Scikit-learn**.

- Google Places is not used — mapping is **Leaflet + OpenStreetMap** (`src/components/village-map.tsx`).
  `@react-google-maps/api` is still an unused dependency; that is worth removing.
- There is no Hugging Face anything in the repo.
- There is no scikit-learn. The intent classifier is **hand-written TypeScript**
  (`src/lib/ml/intent/`) — which is a *better* story, not a worse one.

This is the most dangerous error in the deck, because Slide 3's own stack list does not mention any
of the three. A judge who reads both slides finds the contradiction without leaving the deck.

**Fix:** replace with the sources actually used — NABARD unit costs, NSFDC scheme terms, RBI
microfinance direction, Sarvam AI docs, Vertex AI docs, Leaflet/OSM.

## A3. Slide 3 shows a "BUSINESS DB" that does not exist

The centre flow has `UDYAM AI SERVICES → BUSINESS DB (database icon) → MONTHLY AI ENGINE`.

There is no database. State lives in a **persisted zustand store in the browser** (`src/lib/store.ts`,
localStorage, `skipHydration`, versioned migrations). Every figure comes from the deterministic
kernel at request time.

**Fix:** either label it honestly — "Local session store (browser) · DB in deployment" — or say in
the speaker notes that persistence is client-side today and Postgres is Phase 3. Do not draw a
database cylinder you cannot open.

## A4. The comparison table on Slide 6 misdescribes GeM and Samadhaan

| Claim in deck | Reality |
|---|---|
| GeM ✓ "Hyper-local market & SWOT analysis" | GeM is a **public procurement portal**. It does not do SWOT or local market analysis. |
| GeM ✓ "Scheme-aware EMI" | GeM does not compute EMI. |
| GeM ✓ "Multilingual, voice-first" | GeM has language options; it is not voice-first. |
| SAMADHAN ✓ "Margin → Project Cost → Loan auto-routing" | **MSME Samadhaan** is a *delayed-payment* grievance portal. It does no loan routing. |
| SAMADHAN ✓ "Post Loan Support" | It has no lending function at all. |

A MoSJE/MSME panel will know these portals. Being wrong about the incumbents undermines every other
claim on the slide.

**Fix:** compare against things that actually overlap — **Udyam Registration portal**, **JanSamarth**
(the government's own multi-scheme loan portal), **PSB Loans in 59 Minutes**, **DeHaat**. And mark
the ✓/✗ honestly; JanSamarth *does* do scheme-aware routing, and saying so and then showing what
UdyamAI adds on top (gestation-aware solvency, voice, hyper-local feasibility) is a stronger slide
than a table where you win every row.

## A5. The `$95B` credit-gap figure is not traceable

Slide 5: *"14-20% of India's MSMEs access formal credit — a NITI Ayog report puts the unmet demand at
roughly $95B."*

The commonly citable figures are:
- **IFC / Intellecap (2018)**: MSME finance gap ≈ **$397 billion**.
- **RBI Expert Committee (U.K. Sinha, 2019)**: credit gap **₹20–25 lakh crore**.

I could not tie **$95B** to a NITI Aayog publication. Either cite the exact report, page and year, or
replace it with one of the two above.

*(Also: "NITI Ayog" → **NITI Aayog**.)*

## A6. Two statistics have no usable source

- **"32.49M Rural MSMEs (= 50% of India's 63.39M MSMEs)"** — the arithmetic is right and the 63.39M
  comes from the **NSS 73rd Round / MSME Annual Report**. The deck credits *"Fintech Industry Data"*,
  which is not a source. **Fix the attribution.**
- **"6% of MSMEs sell via e-commerce / B2B channel survey data"** — no named survey. Cite it or cut it.

---

## B1. Two impact numbers are estimates presented as measurements

- *"90% reduction in manual calculation effort. 20 min manual → ~2 min on platform."*
- *"< 5 min to generate feasibility + financial roadmap."*

Nobody was timed. The arithmetic is internally consistent, but these read as measured results.

**Fix:** one word each — "**Estimated** 90% reduction", "**Target:** under 5 minutes". A judge
respects a labelled estimate and punishes an unlabelled one.

The third tile — **"100% of financing recommendations with full repayment / affordability
breakdown"** — is genuinely true and provable from the code. Lead with that one.

## B2. "CLOUD SAAS: Scalable & secure backend" (Slide 4)

There is no backend beyond Next.js API routes on Vercel. Say "serverless API routes on Vercel"
— which is true, and is still a scalable architecture.

## B3. "Multilingual AI advisory bridges the 73% financial literacy gap" (Slide 5)

Nothing bridges a literacy gap. **"addresses"** or **"works around"**. As written it is the exact
class of unsupported claim that `verifyNoUnsupportedClaims` strips out of AI-generated text inside
the app — the deck should hold itself to the standard the product enforces.

## B4. Slide 2's scheme logic is right but incomplete

Checked against `src/lib/finance/schemes.ts` — **all correct**:

| Deck | Code |
|---|---|
| ≤ ₹1.40 lakh → Micro Finance, 6.5%, 3-yr | `maxProjectCost: 140_000`, `annualRatePct: 6.5`, `tenureMonths: 36` ✓ |
| > ₹1.40 lakh to ₹50 lakh → Term Loan, 8%, 7-yr | `140_001 … 5_000_000`, `8.0`, `84` ✓ |
| Margin 10% / Loan 90% | `loanShare: 0.9` ✓ |

What is missing is the part that makes this project original: the **₹1.25 lakh cap on the Micro
Finance loan**. Above a project cost of **₹1,38,889** the cap binds, the loan stops rising, and the
borrower's real contribution silently exceeds 10% — the "dead zone" the code detects
(`MFS_CAP_BINDS_AT`). The problem statement's own `Project Cost = Margin ÷ 10%` formula cannot see it.

**Add one line to Slide 2.** It is the strongest technical point in the whole submission.

---

## C. Typos and inconsistencies

| Slide | Wrong | Right |
|---|---|---|
| 2 | AI BUSS**I**NESS ASSISTANT | AI BUSINESS ASSISTANT |
| 3 | Bha**s**ini | Bha**sh**ini |
| 4 | COMPETE**TO**R | COMPETITOR |
| 4 | Das**j**board | Dashboard |
| 4 | Str**t**egies | Strategies |
| 4 | Ana**i**ytics | Analytics |
| 5 | in**fo**mal research | informal |
| 5 | Empower**n**ment | Empowerment |
| 5 | NITI A**y**og | NITI Aayog |
| 6 | **Udhyam**AI (comparison table header) | **Udyam**AI |

**Slide 4 layout bug:** in OPERATIONAL FEASIBILITY the line *"AI Analysis → Recommendation →
Business Plan"* is rendered **twice** — a stray text box sits behind the real one and shows through
as grey ghost text. Delete the duplicate.

**Slide 6 imagery:** the cartoon cat in sunglasses is not appropriate for a Ministry of Social
Justice & Empowerment submission. Replace with the NABARD / NSFDC / MoSPI source logos.

---

## D. What is built and missing from the deck

These are all real, tested, and in the repo — and none of them appears on any slide.

1. **The Solvency Clock / gestation gap.** The kernel joins NABARD's gestation period to NSFDC's
   moratorium and finds that repayment routinely begins **before the enterprise earns anything**.
   That is a structural defect in the scheme design, not a bug in an application — and it is the one
   finding in this project nobody else will have. `src/lib/finance/solvency.ts`.

2. **SIDDHI-Bench** — 500 seeded cases with ground truth *computed*, not annotated; deterministic
   PRNG so any run is reproducible. `src/lib/bench/`. An evaluation harness is rare in a hackathon
   deck.

3. **The numeric firewall.** Every figure the AI narrator speaks is checked against the kernel's own
   values before it reaches the user (`verifyNumericFidelity`), and unsupported claims are stripped
   (`verifyNoUnsupportedClaims`). No model is allowed to compute money.

4. **Our own ML model.** Multinomial logistic regression over hashed character n-grams, trained
   in-repo in pure TypeScript, **94.4% held-out accuracy**, 10 intent classes, 0.45 confidence floor
   chosen from a sweep. It answers the cheap voice turns locally and escalates only the ambiguous
   ones to Gemini. Slide 3 lists external APIs only and never mentions that we trained anything.

5. **The officer console** (`/dashboard/ngo`) — the same kernel, turned around for the 37 State
   Channelizing Agencies. The adoption argument: 37 offices opening a CSV beats 13 lakh
   beneficiaries downloading an app.

6. **Scheme eligibility engine** — 14 schemes with three-outcome matching (pass / fail / **unknown**,
   never a guess), each with its official link. `src/lib/schemes/`.

7. **158 passing tests**, and every scheme parameter carries machine-readable provenance
   (source, URL, retrieval date, and a `needsVerification` flag the UI surfaces).

**The two sources the entire finance kernel is built on — NABARD unit costs and NSFDC scheme terms —
are not cited anywhere in the deck.** Slide 6 cites React's documentation but not the two documents
every rupee comes from. That is the single biggest omission.

---

## Suggested priority

1. Delete the hardware/false-tech icon strip (A1) and fix Slide 6's technical references (A2).
2. Add NABARD + NSFDC to the references (D, last paragraph).
3. Fix or replace the GeM/Samadhaan comparison table (A4).
4. Source or replace the $95B and the two unsourced statistics (A5, A6).
5. Label the two estimates as estimates (B1).
6. Fix the ten typos and the ghost text (C).
7. Add the ₹1.25 lakh cap / dead zone line to Slide 2 (B4) and the Solvency Clock to Slide 2 or 4 (D1).
