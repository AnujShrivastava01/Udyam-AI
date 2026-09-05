# Design

The product decisions behind UdyamAI, and the reasoning that produced them.

---

## Who this is for

A first-time borrower in a Madhya Pradesh village. Middle-school education is common. The phone is
often shared. They are about to take a government loan against ₹10,000 of their own money — very
possibly the only ₹10,000 they have.

And a second user who matters as much: the **State Channelizing Agency loan officer** with 400
pending files and no tool that tells them which ones will fail.

Designing for the first without the second produces an app nobody adopts. Designing for the second
without the first produces a system that processes people rather than serving them.

---

## Three principles

### 1. Refusal is a feature

The product's most valuable output is often *"we are not going to recommend anything here."*

The evidence is direct: an LLM mentor that hands a low-baseline entrepreneur a menu of plausible
options makes their outcomes **worse**, because the burden of choosing badly lands on them. So:

- The recommender returns **one** recommendation with its binding constraint named.
- When nothing clears the bar it says so, and explains what would have to change.
- Below a data-density floor it declines to rank and names the missing data.

At a ₹4,000 margin the product offers nothing at all. That is correct. Dangling something
unaffordable is the specific harm this exists to prevent.

### 2. Every number names its source, or it is not shown

There is no code path that renders an uncited figure. Each carries a confidence label —
`measured`, `estimated`, `seeded`, `unavailable` — and a chip that opens the source, its vintage,
and whether the team has verified it first-hand.

`seeded` is the important one. It means *placeholder, not a survey reading*. Showing seeded data
without saying so would be the single unrecoverable mistake this project could make, so the report
page states what it is standing on **before** it shows any finding, not in a footnote after.

### 3. Say the uncomfortable thing plainly

The saturation index cannot count competitors — the Economic Census publishes employment share by
industry, not establishment counts. So the UI says the index reduces to this block's *total*
establishment density against the national average. That is a weaker claim than "we counted the
dairies", and it is the one the data supports.

The same instinct governs the demo controls: the loan tracker's month scrubber is labelled
*"demo control — production reads the SCA ledger"* rather than passed off as live state.

---

## Information design

This is a dashboard, not a document. It is scanned and operated, so the craft is information
design before typography.

**Summary before detail.** The officer console leads with four tiles — queue size, gestation-gapped
count, routing mismatches, total exposed before income — then the queue itself, sorted by *what
will go wrong* rather than by arrival date. An officer sees the shape of their day before any
individual file.

**State encoded in form, not only colour.** A blocked application carries a dot, a chip, a tinted
row and an icon. Colour alone fails for colour-blind users and in a printed sanction note.

**Semantic colour is separate from brand.** Rose = blocked or pre-income. Amber = needs review or
seeded data. Emerald = clear. Teal is the product accent and is never used to mean "good", so the
two vocabularies cannot collide.

**Numbers align.** `tabular-nums` everywhere figures sit in a column, so an amortisation schedule
can be read down rather than across.

---

## The two moments

A demo is remembered for one or two images. These are deliberate.

### The Solvency Clock

Two tracks on one timeline. The top says when the enterprise earns, per NABARD. The bottom says
when the scheme collects, per NSFDC. The overlap is shaded red and totalled in rupees.

It works because it is not an opinion. It is two published government tables placed on the same
axis, and the gap is simply visible. A jury does not need the argument explained.

### The ₹1.40 lakh cliff

A slider sweeping project cost across the tier boundary, with the quarterly instalment plotted
underneath. At ₹1,40,001 the line drops off a cliff: instalment **−49.9%**, lifetime interest
**+187.7%**.

Four seconds of dragging proves something no paragraph would: the cheaper headline rate carries
roughly double the quarterly cash-flow burden, so an advisor optimising on interest rate routes
borrowers into the option *more* likely to default. A threshold rule cannot express that
trade-off — which is the argument for an optimiser, made physically.

The shaded band inside it is the dead zone (₹1,38,889 → ₹1,40,000) where the cap binds but the tier
has not changed, and the beneficiary silently owes more than 10%.

---

## Language

Three languages: **English, हिन्दी, Hinglish**. Hinglish is the default — rural users read
Roman-script Hinglish faster than either pure language.

**All three are shown at once.** A cycling toggle hides the options from exactly the user who most
needs to find their own language.

**Register was chosen, not defaulted.** Hindi is spoken rural Hindi, not textbook Sanskritised
Hindi: किस्त not अधिस्थगन, लोन not ऋण, साहूकार for moneylender. Hinglish keeps English financial
nouns inside Hindi sentence structure, the way a borrower and a bank mitra actually speak:
*"Aapke paas {available} hai, lekin is kaam ke liye {required} chahiye."*

**Numbers are not translated.** They are computed once, formatted once with `en-IN` grouping, and
injected as slots. A lakh groups identically whether the label around it is Hindi or English —
Devanagari numerals would be a regression in legibility, not a localisation win.

---

## Visual system

Inherited from the existing shadcn/Tailwind foundation rather than replaced — a redesign would have
cost the team velocity for no user benefit.

| Element | Choice |
|---|---|
| Type | `font-heading` for headings; system sans for body; `tabular-nums` for all figures |
| Accent | Teal (product) · indigo (Term Loan) · amber (warnings and seeded data) · rose (blocked, pre-income) |
| Cards | Border weight carries meaning — `border-2` marks a card that renders a verdict |
| Motion | Framer Motion on verdict changes and expanding rows only; enough to show causation, not decoration |
| Charts | Recharts, with reference lines for gestation and moratorium so the schedule chart carries the argument |

---

## Channels

The same kernel serves every surface, so a borrower and an officer can never be shown contradictory
figures for the same loan.

| Channel | Why |
|---|---|
| Web | The full report; what an officer and a mentor use |
| **WhatsApp** | The people this is for do not install apps. They already have WhatsApp, often on a shared handset. |
| Officer console | The adoption path — 37 SCAs opening a CSV, not 13 lakh beneficiaries downloading something |
| **Voice out** | For users who cannot read either script. Live on the Solvency Clock — the verdict, spoken, in the selected language, captioned. Voice IN is not wired: a spoken amount that cannot be read confidently returns null and asks again. |

WhatsApp carries its own copy because chat register is shorter and warmer than UI register — but
every figure still comes from the kernel, and a test asserts no chat template in any language
contains a hardcoded rupee amount.

---

## What is deliberately absent

- **No chatbot on the landing page.** The product's value is a computation, not a conversation.
- **No gamification.** Someone deciding whether to borrow against their only savings is not
  collecting badges.
- **No confidence theatre.** No score is shown without its inputs and its caveats; the feasibility
  score is explicitly labelled a ranking aid, not a probability of success.
- **No dark patterns toward borrowing.** There is no "you qualify for more!" surface anywhere. The
  headline is the opposite: *it tells you what you can repay.*

---

## Accessibility and open work

Done: keyboard-focusable controls with visible focus, semantic colour never carried by hue alone,
`aria-pressed` on the language switcher, tabular figures, a low-bandwidth-friendly page weight.

Not done, and worth being explicit about:

- **Voice IN.** Speech out is live on the Solvency Clock. Speech in needs a microphone control
  and a confirmation loop — `confirmationPrompt` exists for exactly this and must never be
  skipped, because a borrower cannot proof-read speech and a misheard margin silently changes
  every figure downstream.
- **Icon-based navigation** for non-literate users — currently text-led throughout.
- **Screen-reader pass.** The charts have no textual equivalent yet; the Solvency Clock in
  particular carries the core argument visually and needs a described alternative.
- **Contrast audit** against WCAG AA on the gradient hero cards, which have not been measured.
- **GIGW 3.0** compliance, required for a government-facing product, has not been assessed.
