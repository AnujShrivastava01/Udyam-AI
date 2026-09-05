import { NextRequest, NextResponse } from "next/server";

import { plan } from "@/lib/finance";
import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { normaliseLocale } from "@/lib/i18n/render";
import { isAiConfigured, narratePlan } from "@/lib/ai/narrate";

/**
 * Narration endpoint.
 *
 * The kernel runs here, server-side, and its output is what the model is handed. The response
 * always carries `source` so the UI can be honest about whether a human is reading generated
 * prose or the deterministic template — and `rejected` so a demo can show the verifier catching
 * an invented figure in real time.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * This route bills a Gemini call per request, so it is NOT public.
 *
 * Nothing in the app calls it — /calculator imports the kernel and computes client-side — so it
 * exists purely as a demo and diagnostic surface. Left open it would be an unauthenticated,
 * unmetered way for anyone who guessed the path to spend the project's model budget.
 *
 * It shares the webhook's secret. Send it as `x-webhook-secret`.
 */
function authorised(req: NextRequest): boolean {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected) return false;
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (provided.length !== expected.length) return false;
  // Constant-time-ish compare: never let response latency reveal how much of the secret matched.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  let body: {
    marginCapital?: number;
    activityId?: string;
    locale?: string;
    annualHouseholdIncome?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const marginCapital = Number(body.marginCapital);
  if (!Number.isFinite(marginCapital) || marginCapital <= 0 || marginCapital > 100_000_000) {
    return NextResponse.json(
      { error: "marginCapital must be a positive number below ₹10 crore" },
      { status: 400 },
    );
  }
  // activityId reaches the model inside the prompt, so it must be an id we recognise rather than
  // arbitrary user text — otherwise it is a prompt-injection channel.
  if (body.activityId != null && !ACTIVITY_BY_ID.has(String(body.activityId))) {
    return NextResponse.json({ error: "unknown activityId" }, { status: 400 });
  }
  const income = Number(body.annualHouseholdIncome);
  if (body.annualHouseholdIncome != null && (!Number.isFinite(income) || income < 0)) {
    return NextResponse.json({ error: "annualHouseholdIncome must be a non-negative number" }, { status: 400 });
  }

  // The kernel refuses some inputs that pass the checks above — a margin small enough to round to
  // a zero project cost, or one landing in the one-rupee hole between the two scheme tiers. Those
  // are 422s, not 500s: the request was well-formed and the answer is "not structurable".
  let p;
  try {
    p = plan({
      marginCapital,
      activityId: body.activityId,
      useNeedBasedCosting: true,
      annualHouseholdIncome: body.annualHouseholdIncome,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "cannot structure this input" },
      { status: 422 },
    );
  }

  const narration = await narratePlan(p, normaliseLocale(body.locale));

  return NextResponse.json({
    aiConfigured: isAiConfigured(),
    narration,
    // The figures the narration was allowed to use — so the client can render them as source
    // chips, and so a judge can check the model added nothing.
    facts: {
      verdict: p.solvency.verdict,
      projectCost: p.structure.projectCost,
      sanctionedLoan: p.structure.sanctionedLoan,
      quarterlyInstalment: p.schedule.instalment,
      preIncomeObligation: p.solvency.preIncomeObligation,
      gestationMonths: p.activity?.gestationMonths ?? null,
      scheme: p.structure.scheme.name,
    },
  });
}
