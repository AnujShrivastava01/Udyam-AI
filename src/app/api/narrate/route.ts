import { NextRequest, NextResponse } from "next/server";

import { plan } from "@/lib/finance";
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

export async function POST(req: NextRequest) {
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
  if (!Number.isFinite(marginCapital) || marginCapital <= 0) {
    return NextResponse.json({ error: "marginCapital must be a positive number" }, { status: 400 });
  }

  const p = plan({
    marginCapital,
    activityId: body.activityId,
    useNeedBasedCosting: true,
    annualHouseholdIncome: body.annualHouseholdIncome,
  });

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
