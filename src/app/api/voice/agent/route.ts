import { NextRequest, NextResponse } from "next/server";

import { plan } from "@/lib/finance";
import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { normaliseLocale } from "@/lib/i18n/render";
import { generateJson } from "@/lib/ai/vertex";
import { callerKey, throttled } from "@/lib/api/throttle";
import { activeProvider, listen, speak, verdictAsSpeech, confirmationPrompt } from "@/lib/voice";
import { agentPrompt, validateAction, type AgentAction } from "@/lib/voice/agent";
import { fastPath } from "@/lib/voice/fastpath";
import { replyFor, UNKNOWN_REPLY, NO_PLAN_REPLY } from "@/lib/voice/replies";

/**
 * The voice agent: one spoken turn in, one action and one spoken answer out.
 *
 *   audio -> Sarvam speech-to-text -> transcript
 *         -> Gemini picks ONE action from a closed list
 *         -> the action's slots are validated against real vocabularies
 *         -> the kernel computes anything numeric
 *         -> the answer is built from those figures and synthesised
 *
 * The model appears exactly once, in the middle, and its entire output is a label plus at most one
 * slot. It never computes, never navigates on its own authority, and nothing it emits reaches the
 * synthesiser — `replies.ts` builds every sentence from the kernel's values. An unrecognised slot
 * becomes `unknown`, which asks the user again; being asked twice is cheap, acting on a misheard
 * instruction is not.
 *
 * The client holds the conversation state and sends it back each turn, so this route stays
 * stateless and a serverless instance never has to remember anybody.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

interface Context {
  district?: string;
  block?: string;
  category?: string;
  marginCapital?: number | null;
  activityId?: string;
  annualHouseholdIncome?: number;
  /** Set when the previous turn read an amount back and is waiting for yes/no. */
  pendingAmount?: number | null;
}

export async function POST(req: NextRequest) {
  if (activeProvider() === "none") {
    return NextResponse.json({ error: "No voice provider configured" }, { status: 503 });
  }
  // Each turn costs a speech-to-text call, a Gemini call and a synthesis call.
  if (throttled(callerKey(req), 15)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { audio?: string; locale?: string; context?: Context };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const locale = normaliseLocale(body.locale);
  const ctx: Context = body.context ?? {};

  if (typeof body.audio !== "string" || body.audio.length < 100) {
    return NextResponse.json({ error: "no audio" }, { status: 400 });
  }
  // ~8 MB of base64 is around 45 seconds of the 16 kHz mono WAV the client sends. A turn longer
  // than that is a stuck recorder, not a sentence.
  if (body.audio.length > 8_000_000) {
    return NextResponse.json({ error: "audio too long" }, { status: 413 });
  }

  // ── 1. what was said ──────────────────────────────────────────────────────
  const heard = await listen(body.audio, locale);
  if (!heard.ok) {
    console.error("[agent] transcription failed:", heard.reason);
    return NextResponse.json({ error: "transcription failed", detail: heard.reason }, { status: 502 });
  }
  const transcript = heard.value.trim();
  if (!transcript) {
    return NextResponse.json({ error: "nothing heard" }, { status: 422 });
  }

  // ── 2. what they meant ────────────────────────────────────────────────────
  const awaitingConfirmation = ctx.pendingAmount != null;

  // A local classifier first. It answers the turns whose slot resolves deterministically —
  // confirmations, "explain", noise, a district or block from a closed list, a page, an amount
  // parseSpokenAmount is willing to read — in microseconds and without a paid call. Everything
  // else, and anything below its confidence floor, goes to Gemini exactly as before.
  const fast = fastPath(transcript, awaitingConfirmation);
  let resolvedBy: "local" | "gemini" = "local";
  let action: AgentAction;

  if (fast) {
    action = fast.action;
  } else {
    resolvedBy = "gemini";
    const raw = await generateJson(agentPrompt(transcript, locale, awaitingConfirmation), {
      temperature: 0,
      maxOutputTokens: 200,
    });
    action = validateAction(raw, transcript);
  }

  // A confirmation only means something when one was actually pending.
  if (action.kind === "confirm" && !awaitingConfirmation) {
    action = { kind: "unknown", heard: transcript.slice(0, 120) };
  }

  // ── 3. what it changes ────────────────────────────────────────────────────
  // The route never mutates anything itself: it returns the state the CLIENT should apply, so the
  // store stays the single source of truth and a failed round trip changes nothing.
  const next: Context = { ...ctx, pendingAmount: null };
  let navigateTo: string | null = null;

  switch (action.kind) {
    case "set_district":
      next.district = action.district;
      next.block = undefined;
      break;
    case "set_block":
      next.block = action.block;
      break;
    case "set_category":
      next.category = action.category;
      break;
    case "set_margin":
      // Read back, never applied on the strength of one hearing.
      next.pendingAmount = action.amount;
      break;
    case "confirm":
      if (action.yes && ctx.pendingAmount != null) {
        next.marginCapital = ctx.pendingAmount;
        navigateTo = "/calculator";
      }
      break;
    case "navigate":
      navigateTo = {
        onboarding: "/onboarding",
        discover: "/discover",
        calculator: "/calculator",
        report: `/report/${ctx.activityId ?? "goat-20-1"}`,
        community: "/community",
        emi: "/dashboard/emi",
        profile: "/profile/me",
      }[action.page];
      break;
  }

  // ── 4. the kernel, for anything numeric ───────────────────────────────────
  const margin = next.marginCapital ?? ctx.marginCapital ?? null;
  let current = null;
  if (margin != null && margin > 0) {
    try {
      current = plan({
        marginCapital: margin,
        activityId: ctx.activityId && ACTIVITY_BY_ID.has(ctx.activityId) ? ctx.activityId : undefined,
        useNeedBasedCosting: true,
        annualHouseholdIncome: ctx.annualHouseholdIncome,
      });
    } catch {
      current = null;
    }
  }

  // ── 5. what it says back ──────────────────────────────────────────────────
  let reply: string;
  if (action.kind === "set_margin") {
    // The read-back names the figure twice — as words and digit by digit — because a borrower
    // cannot proof-read speech and a misheard margin changes every figure downstream.
    reply = confirmationPrompt(action.amount, locale);
  } else if (action.kind === "explain") {
    reply =
      current && current.activity && current.solvency.verdict !== "INSUFFICIENT_DATA"
        ? verdictAsSpeech(
            {
              preIncomeObligation: current.solvency.preIncomeObligation,
              gestationMonths: current.activity.gestationMonths,
              firstInstalmentMonth: current.solvency.firstInstalmentMonth ?? 0,
              quarterlyInstalment: current.schedule.instalment,
            },
            locale,
          )
        : NO_PLAN_REPLY(locale);
  } else if (action.kind === "unknown") {
    reply = UNKNOWN_REPLY(locale);
  } else {
    reply = replyFor(action, locale, current);
  }

  const audio = await speak(reply, locale);

  return NextResponse.json({
    transcript,
    action,
    // Which half of the cascade answered. Useful in a demo, and the only way to see how much
    // traffic the local model is actually carrying.
    resolvedBy,
    reply,
    audio: audio.ok ? audio.value : null,
    mimeType: "audio/wav",
    // Everything the client should apply. It decides; this route only proposes.
    context: next,
    navigateTo,
    ...(audio.ok ? {} : { synthesisError: audio.reason }),
  });
}
