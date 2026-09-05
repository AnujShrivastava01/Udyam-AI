# Integration plan — the local business ecosystem

Pushpendra's scope, mapped onto what is already built. **Additive only: nothing existing is
refactored, renamed or deleted.** Every item below is a new file, a new route, or a new field on an
existing type.

---

## 1. What already exists

More of the vision is built than the note assumes. Naming it precisely matters, because the risk
here is rebuilding working things instead of finishing unfinished ones.

| Vision item | Status today | Where |
|---|---|---|
| 3 inputs: location, investment, business type | **Built** | `/onboarding` — the exact three |
| Analyse location, competition, market | **Built and real** | `/report/[id]`, `src/lib/market/feasibility.ts` — saturation, addressable demand, competitor density, each with source and confidence |
| Best business idea + investment + risks | **Built and real** | `/discover`, `src/lib/market/recommend.ts` — one recommendation with the binding constraint named |
| Government schemes → financial options | **Built and real** | `src/lib/finance/` — NSFDC tier routing, capital stack across PMEGP/MUDRA, exact schedules |
| Smart loan & EMI calculator | **Built and real** | `/calculator` |
| EMI/payment tracking after the loan | **Built, sample data** | `/dashboard/emi` — real kernel, invented borrower |
| Multilingual | **Built** | Hindi / Hinglish / English, engine + chrome, 300+ keys |
| AI assistant | **Built** | `/api/narrate` + `AiExplanation`, numeric firewall |
| Voice assistant | **Built** | Saathi — continuous voice, drives the app |
| Hyper-local business discovery | **Partial** | Gazetteer is 4 seeded villages; no business directory |
| Community | **Shell only** | `/community` — hand-written posts, no membership state |
| B2B marketplace + bidding | **Shell only** | `/marketplace` — three invented listings, buttons disabled |
| Entrepreneur profile | **Shell only** | `/profile/[id]` — a sample persona |
| NGO / FI panel | **Partial** | `/dashboard/ngo` — real triage engine over a sample queue |
| Google Maps | **Not built** | — |
| Reminders | **Not built** | — |
| Mentors / expert panel | **Not built** | — |
| Premium / loyalty | **Not built** | — |
| Investor discovery of profiles | **Not built** | — |

**The honest summary:** the *analysis and money* half is real and defensible. The *network* half —
community, marketplace, profiles, mentors — is scaffolding. `userRole` already carries
`entrepreneur | ngo | financial-institution | mentor`, so the role model the vision needs is
already in the store and unused.

---

## 2. The strategic call, stated plainly

This product's advantage in a judged competition is that **its numbers are checkable**. A judge can
open `/calculator`, see ₹46,467, and trace it to a NABARD table and an NSFDC rule. Nothing else in
the field will have that.

Six new social surfaces, each half-built and populated with invented data, dilutes that. Two
entrepreneurs "in your community" that nobody wrote, a bid from a buyer who does not exist, a
mentor with an invented rating — every one is a thing a judge can falsify, and each one costs more
credibility than the feature earns.

So the plan below splits into three tiers, and the recommendation is to **build tier 1 for real,
build tier 2 as clearly-scoped local-first features, and put tier 3 on the roadmap slide rather
than in the demo.**

---

## 3. Tier 1 — build for real (highest value, no fabrication needed)

### 1.1 Entrepreneur profile driven by the user's own data
The profile already exists; it renders a persona. Make it render **the user's own session** —
their district, category, margin, the plan they generated, the activities they looked at.

- New: `src/lib/profile/build.ts` — assembles a profile from `onboardingInput` + `plan()` +
  `visitedSteps`. No new data source.
- Change: `/profile/[id]` reads it when the id is `me`; keeps the sample persona for any other id,
  labelled as an example.
- Why real: every field is either something the user typed or something the kernel computed.

### 1.2 The business card an NGO or bank would actually receive
The vision's "investors discover profiles and connect" needs one artefact: a shareable summary.

- New: `src/app/profile/[id]/share/page.tsx` — a print-ready one-page summary (project cost,
  scheme, schedule, solvency verdict, provenance chips).
- New: `src/lib/profile/export.ts` — the same data as CSV/JSON.
- Why real: this is the officer console's input in reverse, and the triage engine already exists.

### 1.3 Reminders, computed not stored
"EMI reminders" sounds like infrastructure. It is not — the schedule is deterministic, so the next
due date is a pure function of disbursement date + schedule.

- New: `src/lib/finance/reminders.ts` — `nextDue(schedule, disbursedOn, today)`.
- New: WhatsApp reminder template in `src/lib/whatsapp/conversation.ts` (additive case).
- UI: a "remind me on WhatsApp" control on `/dashboard/emi`.
- Why real: no scheduler needed for the demo — the WhatsApp channel already works, and the message
  is generated from the kernel.

### 1.4 Mentor/expert directory as a real, small, sourced list
Not invented profiles. Real institutions that actually provide this service.

- New: `src/lib/network/mentors.ts` — RSETIs, KVKs, DICs, NABARD DDMs, SCA offices, each with a
  real public URL, marked `verified: false` until re-fetched, same `Provenance` shape as schemes.
- New: `/mentors` route listing them, filtered by the user's district.
- Why real: these bodies exist, are publicly listed, and are the actual answer to "who helps me".
  A directory of real institutions beats invented mentor cards.

## 4. Tier 2 — build local-first, clearly scoped

These need multi-user infrastructure the project does not have and cannot honestly fake. Build them
so they work for **one user, locally**, and say so.

### 2.1 Community, as saved threads
- Store: add `communityPosts: Post[]` to the persisted store (additive field).
- `/community` renders the user's own posts alongside the existing examples, which get an
  "Example" chip.
- What it demonstrates: the interaction, honestly. What it does not claim: other people.

### 2.2 B2B marketplace, as a requirement builder
- The user can compose a requirement (product, quantity, budget band, deadline) and export/share it.
- Existing listings stay, marked as examples; the "Submit Offer" button stays disabled.
- What it demonstrates: the bidding data model, without inventing counterparties.

### 2.3 NGO / FI panel
- Already the strongest non-borrower surface. Add: filter by district, and CSV export of the
  triage queue (the button exists and is disabled — make it real, exporting the sample queue with
  a header row saying so).
- Add: `/dashboard/investor` — the same triage engine, ranked by opportunity rather than risk.

### 2.4 Google Maps
- Only where it adds information: plot the four gazetteer villages and the catchment radius on
  `/report`. `@react-google-maps/api` is already a dependency.
- Needs a key; without one the component renders the existing text figures and says the map is
  unavailable. **Never a decorative map with invented pins.**

## 5. Tier 3 — roadmap slide, not demo

Premium/loyalty tiers, investor matching, engagement metrics, paid mentor bookings, payments.
Each needs accounts, identity and money movement — none of which exist. Putting them on the
roadmap is credible; showing a fake version is not.

---

## 6. What this needs that does not exist yet

| Need | Smallest honest version |
|---|---|
| Multi-user identity | None. Everything is single-session and persisted locally. Say so once on the community screen. |
| A business directory | The gazetteer plus the mentor/institution list. No invented businesses. |
| Real other users | Not solvable before the deadline. Tier 2 exists precisely to avoid pretending otherwise. |

---

## 7. Sequence

1. **1.1 + 1.2** — profile from real session data, and the shareable summary. Highest value: it
   completes the journey's last step, which is currently the weakest screen.
2. **1.3** — reminders through the WhatsApp channel that already works.
3. **1.4** — mentor/institution directory.
4. **2.3** — investor view, reusing the triage engine.
5. **2.1 + 2.2** — community and marketplace, local-first.
6. **2.4** — map, only if a key is available.

Each step is a separate commit, verified the same way as everything else: typecheck, lint, tests,
build, and a live check in the browser.

## 8. Two constraints to carry through

**No fabricated counterparties.** Institution names must be real ones we can cite, or obviously
fictional. The "State Bank of India" post removed earlier is the failure mode.

**Sample content is unlabelled right now** — the banners were removed on request. Adding six social
surfaces multiplies what is on screen without provenance. The mitigation used above is to make
things real rather than to re-add banners: a profile built from the user's own answers needs no
disclaimer, and a directory of real institutions needs none either.
