import { NextRequest, NextResponse } from "next/server";

import { plan } from "@/lib/finance";
import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { normaliseLocale } from "@/lib/i18n/render";
import { isAiConfigured, narratePlan } from "@/lib/ai/narrate";
import { callerKey, throttled } from "@/lib/api/throttle";

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
 * This route bills a Gemini call per request, and the browser calls it — so it cannot carry the
 * webhook's shared secret, and something else has to stand in its place.
 *
 * Two things do. First, it takes kernel INPUTS and never a prompt: the caller supplies a margin
 * and an activity id, the route runs plan() itself and builds the model's context from the figures
 * it computed. There is no string on the request that reaches Gemini, so this cannot be used as a
 * free model proxy no matter what is posted to it. Second, the throttle below caps how fast one
 * caller can spend the budget.
 *
 * It used to be gated by the webhook secret and called by nothing at all — which meant the
 * product's central AI claim was invisible in the product.
 */
export async function POST(req: NextRequest) {
  if (throttled(callerKey(req), 12)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
    activityId: body.activityId ?? null,
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
