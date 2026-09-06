/**
 * A demo session, loaded on purpose.
 *
 * ── Why this exists, and why it is a BUTTON ──────────────────────────────────────────────────
 * Several screens only say anything once there is history behind them. The khata refuses a verdict
 * under five recorded days, the dashboard checklist needs visited steps, and the marketplace has
 * nothing to find buyers for until a requirement exists. Nobody is going to type two weeks of
 * bookkeeping live in front of a panel.
 *
 * The wrong fix is to ship a populated store and let it pass as the visitor's own. Everything in
 * this product is either something the user typed or something the kernel computed from it, and a
 * pre-filled ledger masquerading as real trading would break that in the one place it matters
 * most — the screen that says whether a business is covering its loan.
 *
 * So it is loaded explicitly, with one click, and cleared with one click. `demoLoaded` goes into
 * the store alongside it so every surface can say which it is looking at.
 *
 * ── What the numbers are ────────────────────────────────────────────────────────────────────
 * Ramkali runs two crossbred cows in Ghatigaon. The ledger is built from a plausible daily rhythm
 * — milk sold most mornings, feed bought weekly, a vet visit, one bad day — NOT from a random
 * generator, so the monthly net lands near what NABARD's own surplus figure for `milch-cows-2`
 * would imply. A demo whose takings contradict the model it is demonstrating is worse than none.
 */

import { newEntry, type LedgerEntry } from "@/lib/ledger/book";
import { fromDraft, type Requirement } from "@/lib/marketplace/requirement";
import { newPost, type CommunityPost } from "@/lib/community/posts";
import type { OnboardingInput } from "@/lib/store";

export interface DemoSession {
  onboardingInput: OnboardingInput;
  visitedSteps: string[];
  disbursedOn: string;
  ledger: LedgerEntry[];
  requirements: Requirement[];
  communityPosts: CommunityPost[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysBefore = (today: Date, n: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);

/**
 * Two weeks of a two-cow dairy, in rupees.
 *
 * Roughly 24 litres a day at ₹42 wholesale on a good morning, less when a cow is off. Feed is the
 * standing cost and lands weekly; the vet visit and the one washout day are there because a ledger
 * with no bad days teaches the wrong lesson about what a margin has to absorb.
 */
const DAILY: { back: number; sales: number[]; expenses: { amount: number; note: string }[] }[] = [
  { back: 13, sales: [980], expenses: [{ amount: 2_400, note: "Pashu aahar — hafte ka" }] },
  { back: 12, sales: [1_010], expenses: [] },
  { back: 11, sales: [960], expenses: [{ amount: 180, note: "Mineral mixture" }] },
  { back: 10, sales: [1_040], expenses: [] },
  { back: 9, sales: [890], expenses: [{ amount: 600, note: "Doctor — ek gaay ne chara nahi khaya" }] },
  { back: 8, sales: [720], expenses: [] },
  { back: 7, sales: [1_000], expenses: [{ amount: 2_400, note: "Pashu aahar — hafte ka" }] },
  { back: 6, sales: [1_020], expenses: [{ amount: 150, note: "Can ki marammat" }] },
  { back: 5, sales: [990], expenses: [] },
  { back: 4, sales: [1_060], expenses: [] },
  // The washout: milk soured before the collection van came.
  { back: 3, sales: [340], expenses: [{ amount: 120, note: "Baraf — van late thi" }] },
  { back: 2, sales: [1_010], expenses: [] },
  { back: 1, sales: [1_050], expenses: [{ amount: 2_400, note: "Pashu aahar — hafte ka" }] },
  { back: 0, sales: [980], expenses: [{ amount: 200, note: "Diesel — mandi ka chakkar" }] },
];

export function buildDemoSession(today: Date = new Date()): DemoSession {
  const ledger: LedgerEntry[] = [];
  for (const day of DAILY) {
    const on = key(daysBefore(today, day.back));
    // Stamped at the day itself rather than at load time, so the entries sort the way a book
    // written up day by day would.
    const at = new Date(daysBefore(today, day.back).getTime() + 8 * 3600_000);
    for (const amount of day.sales) {
      ledger.push(newEntry({ on, kind: "sale", amount, note: "Doodh — subah ki bikri" }, at));
    }
    for (const e of day.expenses) {
      ledger.push(newEntry({ on, kind: "expense", amount: e.amount, note: e.note }, at));
    }
  }
  // Newest first, matching what `addLedgerEntry` produces.
  ledger.reverse();

  const requirements: Requirement[] = [
    fromDraft(
      {
        side: "selling",
        product: "A2 cow milk",
        quantity: 24,
        unit: "litre",
        budgetMin: 40,
        budgetMax: 46,
        needBy: null,
        district: "Gwalior",
        block: "Ghatigaon",
        notes: "Morning collection only. Cans returned the same day.",
      },
      daysBefore(today, 6),
    ),
    fromDraft(
      {
        side: "buying",
        product: "Cattle feed (pashu aahar)",
        quantity: 8,
        unit: "bags",
        budgetMin: null,
        budgetMax: 2_600,
        needBy: key(daysBefore(today, -7)),
        district: "Gwalior",
        block: "Ghatigaon",
        notes: "Monthly standing order if the price holds.",
      },
      daysBefore(today, 2),
    ),
  ];

  const communityPosts: CommunityPost[] = [
    newPost(
      "Doodh ka rate 42 mil raha hai collection centre par. Koi Gwalior side mein 45 de raha hai to bataiye.",
      "question",
      { district: "Gwalior", category: "dairy" },
      daysBefore(today, 4),
    ),
    newPost(
      "Pehli kist January mein hai. Khata dekh kar lag raha hai nikal jayegi, par pashu aahar ka rate badha to dikkat hogi.",
      "update",
      { district: "Gwalior", category: "dairy" },
      daysBefore(today, 1),
    ),
  ];

  return {
    onboardingInput: {
      location: { village: "Ghatigaon", block: "Ghatigaon", district: "Gwalior" },
      marginCapital: 25_000,
      businessCategory: "dairy",
    },
    // Enough of the journey to make the dashboard checklist meaningful without completing it —
    // a finished checklist has nothing left to demonstrate.
    visitedSteps: ["discover", "analyse", "finance", "schemes"],
    // Four months ago: past the 6-month Term Loan moratorium? No — deliberately inside it, so the
    // repayment screen demonstrates the moratorium rather than a loan already in repayment.
    disbursedOn: key(daysBefore(today, 120)),
    ledger,
    requirements,
    communityPosts,
  };
}

/**
 * The banner text lives in the message dictionary as `demo.notice`, not here.
 *
 * Entry NOTES below stay in Roman Hindi rather than being translated: they are DATA, written once
 * when the demo is loaded and stored like anything the user typed. Retranslating stored entries
 * when somebody switches language would mean rewriting their book, which is not a thing a ledger
 * may do — so they are phrased to read naturally in all three.
 */
