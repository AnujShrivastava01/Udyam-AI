/**
 * Everything the post-onboarding home needs, assembled in one pure function.
 *
 * The dashboard is the screen a returning user lands on, so it is also the screen most likely to
 * drift into flattery: a progress ring that fills itself, a "next payment" for a loan nobody has
 * taken, a readiness score with no denominator. Keeping the assembly here — pure, with the clock
 * passed in — means every claim on that screen is a value some test can pin.
 *
 * Three rules this module follows:
 *
 * 1. Nothing is invented. Every field is the user's own answer, the kernel's own arithmetic, or a
 *    count of things they made. Where an answer is missing the field is `null` and the UI says the
 *    question is unanswered, rather than filling in a plausible default.
 *
 * 2. No loan exists. There is no application, disbursement or repayment state anywhere in this
 *    product, so the dashboard must never render "your next EMI". What it CAN say is conditional
 *    and labelled as such: if this were disbursed today, the first instalment would fall on X.
 *
 * 3. Readiness is a checklist, not a score. `readiness` counts completed steps out of a stated
 *    total, so it can be read as "4 of 7" rather than as an opaque 82/100 nobody can audit.
 */

import type { Plan } from "@/lib/finance";
import type { MessageKey } from "@/lib/i18n/keys";
import type { Activity } from "@/lib/finance/activities";
import { addMonths } from "@/lib/finance/reminders";
import { matchSchemes, summarise as summariseSchemes, type MatchSummary } from "@/lib/schemes/eligibility";
import type { ApplicantProfile } from "@/lib/schemes/catalogue";
import { buildOwnProfile, type OwnProfile } from "@/lib/profile/build";
import type { CommunityPost } from "@/lib/community/posts";
import type { Requirement } from "@/lib/marketplace/requirement";
import type { OnboardingInput } from "@/lib/store";

/**
 * One thing the user has or has not done. The order is the order the UI lists them in.
 *
 * Message KEYS, not sentences. This module runs on the server too, and the language lives in a
 * client store — so returning English here would have made the dashboard the one screen in a
 * trilingual product that only speaks English. Same pattern the solvency verdict already uses.
 */
export interface ReadinessItem {
  id: string;
  labelKey: MessageKey;
  /** What to do about it, when it is not done. */
  hintKey: MessageKey;
  href: string;
  done: boolean;
}

export interface FirstInstalmentProjection {
  /** The instalment amount, in rupees. */
  amount: number;
  /** Month number from disbursement — from the schedule, not assumed. */
  month: number;
  /** The date it would fall on IF the loan were disbursed on `today`. */
  wouldFallOn: Date;
  /** Months the activity needs before it earns anything. */
  gestationMonths: number | null;
  /** Positive when repayment starts before the enterprise earns. The Solvency Clock, in one number. */
  gapMonths: number | null;
}

export interface DashboardOverview {
  profile: OwnProfile;
  /** True once location, category and margin are all answered. */
  ready: boolean;
  plan: Plan | null;
  activity: Activity | null;
  readiness: ReadinessItem[];
  readinessDone: number;
  readinessTotal: number;
  schemes: MatchSummary | null;
  /** Conditional, never presented as a live obligation. Null without a workable plan. */
  firstInstalment: FirstInstalmentProjection | null;
  posts: number;
  requirements: number;
  /** The single most useful next thing, given where they are. */
  nextStep: { labelKey: MessageKey; detailKey: MessageKey; href: string; ctaKey: MessageKey };
}

export interface OverviewInput {
  onboarding: OnboardingInput;
  visitedSteps: string[];
  posts: CommunityPost[];
  requirements: Requirement[];
  /** Passed in so the projection is testable and the render is deterministic. */
  today: Date;
}

export function buildOverview({
  onboarding,
  visitedSteps,
  posts,
  requirements,
  today,
}: OverviewInput): DashboardOverview {
  const profile = buildOwnProfile(onboarding, visitedSteps);
  const computed = profile.plan;

  // Onboarding collects location, capital and category — and nothing else. Every other criterion
  // in the scheme catalogue is therefore genuinely unknown, and `matchSchemes` returns
  // "needs-info" rather than guessing. That is the correct answer, and the dashboard turns it into
  // the useful prompt: these are the questions that would settle your eligibility.
  const applicant: ApplicantProfile = {
    enterpriseStage: "new",
    activityClass: profile.activity?.activityClass,
  };
  const schemes = profile.category ? summariseSchemes(matchSchemes(applicant)) : null;

  const readiness: ReadinessItem[] = [
    {
      id: "location",
      labelKey: "ready.location",
      hintKey: "ready.location.hint",
      href: "/onboarding",
      done: Boolean(profile.district),
    },
    {
      id: "capital",
      labelKey: "ready.capital",
      hintKey: "ready.capital.hint",
      href: "/onboarding",
      done: profile.marginCapital != null && profile.marginCapital > 0,
    },
    {
      id: "category",
      labelKey: "ready.category",
      hintKey: "ready.category.hint",
      href: "/onboarding",
      done: Boolean(profile.category),
    },
    {
      id: "report",
      labelKey: "ready.report",
      hintKey: "ready.report.hint",
      // The user's own activity, never a hardcoded one — an earlier version of this journey
      // pushed everybody to the same report id whatever they had answered.
      href: profile.activity ? `/report/${profile.activity.id}` : "/discover",
      done: visitedSteps.includes("analyse"),
    },
    {
      id: "plan",
      labelKey: "ready.plan",
      hintKey: "ready.plan.hint",
      href: "/calculator",
      done: visitedSteps.includes("finance"),
    },
    {
      id: "schemes",
      labelKey: "ready.schemes",
      hintKey: "ready.schemes.hint",
      href: "/schemes",
      done: visitedSteps.includes("schemes"),
    },
    {
      id: "share",
      labelKey: "ready.share",
      hintKey: "ready.share.hint",
      href: "/profile/me/share",
      done: visitedSteps.includes("share"),
    },
  ];

  const readinessDone = readiness.filter((r) => r.done).length;

  return {
    profile,
    ready: profile.complete,
    plan: computed,
    activity: profile.activity,
    readiness,
    readinessDone,
    readinessTotal: readiness.length,
    schemes,
    firstInstalment: projectFirstInstalment(computed, profile.activity, today),
    posts: posts.length,
    requirements: requirements.length,
    nextStep: nextStep(profile, readiness),
  };
}

/**
 * What the first instalment would be, if the loan were disbursed today.
 *
 * Explicitly conditional. Nobody in this product has a loan, so the only honest form of this card
 * is a projection from a hypothetical disbursement date — and the date has to be shown, or the
 * reader will take it for a real due date.
 */
function projectFirstInstalment(
  computed: Plan | null,
  activity: Activity | null,
  today: Date,
): FirstInstalmentProjection | null {
  if (!computed) return null;

  const month = computed.solvency.firstInstalmentMonth;
  if (month == null) return null;

  return {
    amount: computed.schedule.instalment,
    month,
    wouldFallOn: addMonths(today, month),
    gestationMonths: activity?.gestationMonths ?? null,
    // The kernel's own answer, not a subtraction done here — the moratorium differs by tier and by
    // activity, and every hand-rolled version of this figure in this codebase has been wrong.
    gapMonths: computed.solvency.gapMonths,
  };
}

function nextStep(
  profile: OwnProfile,
  readiness: ReadinessItem[],
): DashboardOverview["nextStep"] {
  const firstUndone = readiness.find((r) => !r.done);

  if (!profile.complete) {
    return {
      labelKey: "next.onboard",
      detailKey: "next.onboard.detail",
      href: "/onboarding",
      ctaKey: "next.onboard.cta",
    };
  }

  if (!firstUndone) {
    return {
      labelKey: "next.done",
      detailKey: "next.done.detail",
      href: "/profile/me/share",
      ctaKey: "next.done.cta",
    };
  }

  return {
    labelKey: firstUndone.labelKey,
    detailKey: firstUndone.hintKey,
    href: firstUndone.href,
    ctaKey: "next.open",
  };
}
