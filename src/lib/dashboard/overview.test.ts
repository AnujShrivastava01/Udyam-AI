import { describe, expect, it } from "vitest";

import { buildOverview, type OverviewInput } from "./overview";
import type { OnboardingInput } from "@/lib/store";

const TODAY = new Date("2026-09-06T00:00:00.000Z");

const blank: OnboardingInput = { location: null, marginCapital: null, businessCategory: "" };

const answered: OnboardingInput = {
  location: { village: "Ghatigaon", block: "Ghatigaon", district: "Gwalior" },
  marginCapital: 25_000,
  businessCategory: "dairy",
};

function overview(over: Partial<OverviewInput> = {}) {
  return buildOverview({
    onboarding: blank,
    visitedSteps: [],
    posts: [],
    requirements: [],
    today: TODAY,
    ...over,
  });
}

describe("an unanswered session", () => {
  const o = overview();

  it("is not ready, and invents nothing to look busy", () => {
    expect(o.ready).toBe(false);
    expect(o.plan).toBeNull();
    expect(o.activity).toBeNull();
    expect(o.firstInstalment).toBeNull();
    expect(o.schemes).toBeNull();
  });

  it("points at onboarding rather than at a feature", () => {
    expect(o.nextStep.href).toBe("/onboarding");
    expect(o.nextStep.labelKey).toBe("next.onboard");
  });

  it("still lists the whole checklist, all of it undone", () => {
    expect(o.readinessTotal).toBeGreaterThan(0);
    expect(o.readinessDone).toBe(0);
    expect(o.readiness.every((r) => !r.done)).toBe(true);
  });
});

describe("an answered session", () => {
  const o = overview({ onboarding: answered });

  it("is ready and carries a plan the kernel computed", () => {
    expect(o.ready).toBe(true);
    expect(o.plan).not.toBeNull();
    expect(o.activity?.id).toBe("milch-cows-2");
  });

  it("ticks exactly the three answered items", () => {
    const done = o.readiness.filter((r) => r.done).map((r) => r.id);
    expect(done).toEqual(["location", "capital", "category"]);
  });

  it("counts scheme matches once a trade is known", () => {
    expect(o.schemes).not.toBeNull();
    const s = o.schemes!;
    expect(s.meets + s.needsInfo + s.doesNotMeet).toBeGreaterThan(0);
  });

  it("projects the first instalment from the schedule, not from an assumption", () => {
    const f = o.firstInstalment!;
    expect(f.amount).toBe(o.plan!.schedule.instalment);
    expect(f.month).toBe(o.plan!.solvency.firstInstalmentMonth);
  });

  it("dates the projection by adding whole months to today", () => {
    const f = o.firstInstalment!;
    // Whatever the moratorium is, the projected date is exactly that many months out — never a
    // 30-day approximation, which drifts across February.
    const expected = new Date(TODAY.getTime());
    expected.setMonth(expected.getMonth() + f.month);
    expect(f.wouldFallOn.getMonth()).toBe(expected.getMonth());
    expect(f.wouldFallOn.getDate()).toBe(TODAY.getDate());
  });

  it("takes the gestation gap from the kernel rather than subtracting by hand", () => {
    // Every hand-rolled version of this figure in this codebase has been wrong, because the
    // moratorium differs by scheme tier and by activity.
    expect(o.firstInstalment!.gapMonths).toBe(o.plan!.solvency.gapMonths);
  });
});

describe("readiness", () => {
  it("ticks visited screens that are outside the journey stepper", () => {
    const o = overview({ onboarding: answered, visitedSteps: ["schemes", "share"] });
    const byId = Object.fromEntries(o.readiness.map((r) => [r.id, r.done]));
    expect(byId.schemes).toBe(true);
    expect(byId.share).toBe(true);
  });

  it("advances the next step to the first undone item", () => {
    const o = overview({ onboarding: answered, visitedSteps: ["analyse", "finance"] });
    expect(o.nextStep.href).toBe("/schemes");
  });

  it("returns message keys rather than English, so the dashboard can be read in Hindi", () => {
    // This module runs on the server too, and the language lives in a client store. Returning
    // sentences here would have made the dashboard the one screen in a trilingual product that
    // only speaks English.
    const o = overview({ onboarding: answered });
    for (const item of o.readiness) {
      expect(item.labelKey.startsWith("ready.")).toBe(true);
      expect(item.hintKey.endsWith(".hint")).toBe(true);
    }
  });

  it("sends a fully ready user to the artefact rather than nowhere", () => {
    const o = overview({
      onboarding: answered,
      visitedSteps: ["analyse", "finance", "schemes", "share"],
    });
    expect(o.readinessDone).toBe(o.readinessTotal);
    expect(o.nextStep.href).toBe("/profile/me/share");
  });

  it("links the report at the user's own activity, not a hardcoded one", () => {
    const o = overview({ onboarding: answered });
    expect(o.readiness.find((r) => r.id === "report")!.href).toBe("/report/milch-cows-2");
  });

  it("falls back to discover when no activity is resolved", () => {
    const o = overview({
      onboarding: { ...answered, businessCategory: "handicrafts" },
    });
    expect(o.activity).toBeNull();
    expect(o.readiness.find((r) => r.id === "report")!.href).toBe("/discover");
  });
});

describe("counts of what the user made", () => {
  it("reports them without inventing engagement around them", () => {
    const o = overview({
      onboarding: answered,
      posts: [
        {
          id: "p1",
          body: "hi",
          kind: "update",
          createdAt: TODAY.toISOString(),
          district: null,
          category: null,
        },
      ],
      requirements: [],
    });
    expect(o.posts).toBe(1);
    expect(o.requirements).toBe(0);
  });
});

describe("a margin the kernel refuses", () => {
  it("keeps the rest of the dashboard rather than failing whole", () => {
    const o = overview({ onboarding: { ...answered, marginCapital: 1 } });
    expect(o.ready).toBe(true);
    expect(o.profile.district).toBe("Gwalior");
    // No plan means no projection — and specifically not a zero one.
    if (o.plan === null) expect(o.firstInstalment).toBeNull();
  });
});
