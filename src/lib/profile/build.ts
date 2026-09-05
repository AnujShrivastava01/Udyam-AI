/**
 * The user's own profile, assembled from things they actually did.
 *
 * No new data source and nothing invented. Every field below is either something the user typed
 * into onboarding, something the kernel computed from it, or a record of which steps they opened.
 * That is the whole point: a profile built this way needs no "sample data" disclaimer, because
 * there is nothing on it that is not theirs.
 *
 * `complete` is what the UI branches on. A visitor who has answered nothing gets the empty state
 * and an invitation to start, not a persona with their district spliced into it.
 */

import { plan, type Plan } from "@/lib/finance";
import { ACTIVITY_BY_ID, type Activity } from "@/lib/finance/activities";
import type { OnboardingInput } from "@/lib/store";

export interface OwnProfile {
  /** True once there is enough to say anything at all. */
  complete: boolean;
  district: string | null;
  block: string | null;
  village: string | null;
  category: string | null;
  marginCapital: number | null;
  activity: Activity | null;
  /** Null when the margin is unknown or the kernel refuses the inputs. */
  plan: Plan | null;
  /** Journey steps actually opened, in the order the strip shows them. */
  visited: string[];
}

/** The activity each onboarding category maps to — the same table onboarding routes with. */
const CATEGORY_ACTIVITY: Record<string, string | null> = {
  dairy: "milch-cows-2",
  retail: "kirana-store",
  textiles: "tailoring-2",
  food: "papad-pickle",
  handicrafts: null,
  services: "atta-chakki",
};

export function buildOwnProfile(
  input: OnboardingInput,
  visitedSteps: string[],
  activityId?: string,
): OwnProfile {
  const category = input.businessCategory || null;
  const resolvedId = activityId ?? (category ? CATEGORY_ACTIVITY[category] ?? undefined : undefined);
  const activity = resolvedId ? ACTIVITY_BY_ID.get(resolvedId) ?? null : null;

  let computed: Plan | null = null;
  if (input.marginCapital != null && input.marginCapital > 0) {
    try {
      computed = plan({
        marginCapital: input.marginCapital,
        activityId: resolvedId,
        useNeedBasedCosting: true,
      });
      if (computed.structure.sanctionedLoan <= 0) computed = null;
    } catch {
      // A margin the kernel refuses is not a profile failure; the rest of the profile still holds.
      computed = null;
    }
  }

  return {
    complete: Boolean(input.location?.district && category && input.marginCapital),
    district: input.location?.district || null,
    block: input.location?.block || null,
    village: input.location?.village || null,
    category,
    marginCapital: input.marginCapital,
    activity,
    plan: computed,
    visited: visitedSteps,
  };
}
