/**
 * AI narration — Vertex AI (Gemini).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * THE MODEL NEVER COMPUTES A NUMBER.
 *
 * Every rupee figure, month count and ratio is produced by the deterministic kernel before the
 * model is called. Gemini's only job is to turn that structured verdict into two or three warm
 * sentences in the borrower's own language.
 *
 * And we do not take that on trust. `verifyNumericFidelity` re-reads the generated text, extracts
 * every number in it, and rejects the output if any figure is not one the kernel supplied. On
 * rejection we fall back to the deterministic template — so a hallucinated figure can never reach
 * a borrower, by construction rather than by prompt.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

import type { Plan } from "@/lib/finance";
import type { Locale } from "@/lib/i18n/keys";
import { renderMessage } from "@/lib/i18n/render";

export interface NarrationResult {
  text: string;
  /** `template` means the model was unavailable or its output was rejected. */
  source: "gemini" | "template";
  /** Numbers the model emitted that the kernel never produced. Empty on an accepted answer. */
  rejected: string[];
  latencyMs: number;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.VERTEX_PROJECT_ID && process.env.VERTEX_KEY_FILE);
}

/**
 * Every number the model is permitted to use, as strings, in the forms it might write them.
 * Built from the kernel's output — nothing else is allowed through.
 */
export function allowedNumbers(plan: Plan): Set<string> {
  const raw: number[] = [
    plan.structure.projectCost,
    plan.structure.sanctionedLoan,
    plan.structure.requiredMargin,
    plan.structure.indicativeLoan,
    plan.schedule.instalment,
    plan.schedule.totalInterest,
    plan.schedule.totalOutflow,
    plan.schedule.instalmentCount,
    plan.schedule.moratoriumInterest,
    plan.structure.scheme.annualRatePct,
    plan.structure.scheme.tenureMonths,
    plan.structure.scheme.tenureMonths / 12,
    plan.structure.moratoriumMonths,
    plan.solvency.preIncomeObligation,
    plan.solvency.preIncomePayments,
    plan.solvency.firstInstalmentMonth ?? 0,
    plan.solvency.gapMonths ?? 0,
    plan.activity?.gestationMonths ?? 0,
    plan.activity?.unitCost ?? 0,
    10, // the scheme's headline 10% margin
  ];

  const set = new Set<string>();
  for (const n of raw) {
    if (n == null || Number.isNaN(n)) continue;
    // The UNROUNDED value first. Rounding-only was a bug: an interest rate of 6.5 became "7",
    // so the model quoting the rate we gave it was rejected as an invention.
    set.add(String(n));
    set.add(n.toFixed(2));
    const r = Math.round(n);
    set.add(String(r));
    set.add(new Intl.NumberFormat("en-IN").format(r)); // 46,467
    set.add(new Intl.NumberFormat("en-US").format(r)); // grouping differs above 5 digits
  }

  // Numbers embedded in the STRINGS we handed the model are equally legitimate — the activity is
  // literally named "Goat rearing — 20 does + 1 buck". Rejecting the model for repeating a proper
  // noun we supplied is a false positive, and it made the firewall fire on every well-behaved
  // answer.
  for (const label of [plan.activity?.name, plan.activity?.unit, plan.structure.scheme.name]) {
    if (!label) continue;
    for (const m of label.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
      set.add(m);
      set.add(m.replace(/,/g, ""));
    }
  }

  return set;
}

/** Pull every number out of generated prose, normalised for comparison. */
export function extractNumbers(text: string): string[] {
  // Strip the ordinal/inflection suffixes Hindi and Hinglish attach to month numbers.
  const matches = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return matches.map((m) => m.trim());
}

/**
 * The guarantee, enforced.
 *
 * Returns the numbers the model used that the kernel never produced. Empty means the narration is
 * safe to show.
 */
export function verifyNumericFidelity(text: string, plan: Plan): string[] {
  const allowed = allowedNumbers(plan);
  const rejected: string[] = [];

  for (const found of extractNumbers(text)) {
    const bare = found.replace(/,/g, "");
    if (allowed.has(found) || allowed.has(bare)) continue;
    // A model may legitimately write a small ordinal that is already in the allowed set in
    // another form (e.g. "6th"). The bare-number check above covers that. Anything left is a
    // figure the kernel never produced.
    rejected.push(found);
  }
  return rejected;
}

function deterministicFallback(plan: Plan, locale: Locale): string {
  const h = renderMessage(locale, plan.solvency.headlineMsg.key, plan.solvency.headlineMsg.params);
  const d = renderMessage(locale, plan.solvency.detailMsg.key, plan.solvency.detailMsg.params);
  return `${h}\n\n${d}`;
}

const LANGUAGE_INSTRUCTION: Record<Locale, string> = {
  en: "Write in simple English, the kind a bank mitra would use out loud.",
  hi: "Write in spoken rural Hindi (Devanagari). Not textbook Hindi. Address the reader as आप. Use किस्त, ब्याज, लोन, कमाई.",
  hinglish:
    "Write in Hinglish — Roman script, Hindi sentence structure, English financial nouns (loan, instalment, income, scheme). Not pure English, and never Devanagari.",
};

/**
 * Narrate a plan.
 *
 * Falls back to the deterministic template silently whenever the model is unavailable, slow, or
 * produces a figure the kernel did not.
 */
export async function narratePlan(plan: Plan, locale: Locale): Promise<NarrationResult> {
  const started = Date.now();
  const fallback = (rejected: string[] = []): NarrationResult => ({
    text: deterministicFallback(plan, locale),
    source: "template",
    rejected,
    latencyMs: Date.now() - started,
  });

  if (!isAiConfigured()) return fallback();

  // The model is given the numbers, PRE-FORMATTED, and is never asked to derive one.
  //
  // Handing over raw floats made it write "Rs 46467.35" — technically faithful and unreadable to
  // the person it is for. Formatting here means the only string the model can copy is already the
  // one we want on screen, and it keeps formatting decisions out of the model entirely.
  const money = (n: number) =>
    `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

  const facts = {
    activity: plan.activity?.name ?? "this activity",
    verdict: plan.solvency.verdict,
    gestationMonths: plan.activity?.gestationMonths ?? null,
    firstInstalmentMonth: plan.solvency.firstInstalmentMonth,
    amountDueBeforeIncome: money(plan.solvency.preIncomeObligation),
    paymentsBeforeIncome: plan.solvency.preIncomePayments,
    projectCost: money(plan.structure.projectCost),
    ownContribution: money(plan.structure.requiredMargin),
    loan: money(plan.structure.sanctionedLoan),
    quarterlyInstalment: money(plan.schedule.instalment),
    scheme: plan.structure.scheme.name,
    interestRatePct: plan.structure.scheme.annualRatePct,
  };

  const prompt = `You are explaining a government loan decision to a first-time rural entrepreneur in India.

${LANGUAGE_INSTRUCTION[locale]}

Here are the FACTS. They were computed by a verified financial engine:
${JSON.stringify(facts, null, 2)}

Write 2–3 short sentences that explain what this means for them, warmly and without jargon.

HARD RULES:
- Use ONLY the numbers given above. Do NOT calculate, round, convert, estimate or invent any number.
- Do not add a number that is not in the facts — not even an approximation or a "roughly".
- Copy rupee amounts EXACTLY as written above, including the ₹ symbol and the commas.
- Do not give financial advice beyond explaining the verdict.
- No preamble, no sign-off, no markdown. Just the sentences.`;

  try {
    // Called over REST with an explicitly-loaded key rather than through the SDK's ambient
    // credential lookup. Two reasons, both learned the hard way:
    //
    //   1. GOOGLE_APPLICATION_CREDENTIALS, if set anywhere in the environment, silently
    //      authenticates as a DIFFERENT identity and produces a 403 that looks like a missing
    //      role. Loading the key by explicit path removes that whole class of failure.
    //   2. This project serves models at location `global`, not at a region. Asking a regional
    //      endpoint for them returns 404 "model not found", which reads like a wrong model id.
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      keyFile: process.env.VERTEX_KEY_FILE!,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const authed = await auth.getClient();

    const project = process.env.VERTEX_PROJECT_ID!;
    const location = process.env.VERTEX_LOCATION ?? "global";
    const modelId = process.env.VERTEX_MODEL ?? "gemini-2.5-flash";
    const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;

    const res = await authed.request<{
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }>({
      url: `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${modelId}:generateContent`,
      method: "POST",
      data: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800,
          // Dynamic thinking makes latency swing wildly; a fixed budget keeps narration snappy.
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
    });

    const text =
      res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

    if (!text) return fallback();

    const rejected = verifyNumericFidelity(text, plan);
    if (rejected.length > 0) {
      // The model invented a figure. Refuse it — the borrower gets the exact template instead.
      console.warn("[ai] narration rejected, invented numbers:", rejected);
      return fallback(rejected);
    }

    return { text, source: "gemini", rejected: [], latencyMs: Date.now() - started };
  } catch (e) {
    console.error("[ai] narration failed:", e instanceof Error ? e.message : String(e));
    return fallback();
  }
}
