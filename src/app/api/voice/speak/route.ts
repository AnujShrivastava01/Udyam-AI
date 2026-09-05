import { NextRequest, NextResponse } from "next/server";

import { plan } from "@/lib/finance";
import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { normaliseLocale } from "@/lib/i18n/render";
import { activeProvider, speak, verdictAsSpeech } from "@/lib/voice";
import { callerKey, throttled } from "@/lib/api/throttle";

/**
 * Speak a solvency verdict.
 *
 * DELIBERATELY NOT A TEXT-TO-SPEECH PROXY. The body carries kernel INPUTS, never a string to
 * read out. The route runs the kernel itself, builds the sentence from the figures it computed,
 * and returns both the audio and the exact text that was spoken.
 *
 * Two reasons, and the second is the important one:
 *
 *   1. Metering. A route that speaks arbitrary text is an unauthenticated way for anyone who
 *      guesses the path to spend the project's Sarvam credit on whatever they like. This one can
 *      only ever say a verdict about a project cost between ₹1 and ₹10 crore.
 *   2. The numeric firewall, extended to speech. Every rupee figure in the spoken sentence comes
 *      from `plan()` and is expanded into words by `speakAmount` from the kernel's own value. No
 *      client string and no model output reaches the synthesiser. `spokenText` is returned so the
 *      UI can show the caption alongside the audio and a listener can check them against each
 *      other.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (activeProvider() === "none") {
    return NextResponse.json(
      { error: "No voice provider configured", configured: false },
      { status: 503 },
    );
  }

  if (throttled(callerKey(req), 20)) {
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
  if (body.activityId != null && !ACTIVITY_BY_ID.has(String(body.activityId))) {
    return NextResponse.json({ error: "unknown activityId" }, { status: 400 });
  }
  const income = Number(body.annualHouseholdIncome);
  if (body.annualHouseholdIncome != null && (!Number.isFinite(income) || income < 0)) {
    return NextResponse.json(
      { error: "annualHouseholdIncome must be a non-negative number" },
      { status: 400 },
    );
  }

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

  if (p.structure.sanctionedLoan <= 0) {
    return NextResponse.json({ error: "nothing to say about a zero loan" }, { status: 422 });
  }

  // Without an activity there is no gestation figure, and verdictAsSpeech would read out "this
  // work earns nothing for 0 months" — a confident sentence about something we do not know. The
  // kernel returns INSUFFICIENT_DATA here and declines to give a verdict; speech declines with it.
  if (p.activity == null || p.solvency.verdict === "INSUFFICIENT_DATA") {
    return NextResponse.json(
      { error: "no gestation figure for this activity — there is no verdict to speak" },
      { status: 422 },
    );
  }

  const locale = normaliseLocale(body.locale);
  const spokenText = verdictAsSpeech(
    {
      preIncomeObligation: p.solvency.preIncomeObligation,
      gestationMonths: p.activity?.gestationMonths ?? 0,
      firstInstalmentMonth: p.solvency.firstInstalmentMonth ?? 0,
      quarterlyInstalment: p.schedule.instalment,
    },
    locale,
  );

  const audio = await speak(spokenText, locale);
  if (!audio.ok) {
    // The reason is Sarvam's own message — it names deprecated models and valid speakers, which is
    // exactly what you need in the log when this contract drifts again. It never contains the key.
    console.error("[voice] synthesis failed:", audio.reason);
    return NextResponse.json(
      { error: "synthesis failed", detail: audio.reason, spokenText },
      { status: 502 },
    );
  }

  return NextResponse.json({
    provider: activeProvider(),
    locale,
    spokenText,
    audio: audio.value,
    mimeType: "audio/wav",
    // The figures the sentence was built from, so the caption and the audio can be checked
    // against the same source a judge sees on screen.
    facts: {
      verdict: p.solvency.verdict,
      preIncomeObligation: p.solvency.preIncomeObligation,
      quarterlyInstalment: p.schedule.instalment,
      gestationMonths: p.activity?.gestationMonths ?? null,
      firstInstalmentMonth: p.solvency.firstInstalmentMonth,
    },
  });
}
