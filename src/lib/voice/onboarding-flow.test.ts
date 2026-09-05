import { describe, expect, it } from "vitest";

import { firstMissing, nextQuestion, onboardingComplete } from "./replies";
import type { Locale } from "@/lib/i18n/keys";

const LOCALES: Locale[] = ["en", "hi", "hinglish"];

/**
 * The bug this file exists for.
 *
 * The agent's replies hardcoded the sequence: setting a district said "now choose your block",
 * setting a block said "now tell me how much capital you have", and confirming an amount opened
 * the plan. The business category was in no link of that chain, so the agent could SET a category
 * but never asked for one — a user could talk their way to a costed plan without ever being asked
 * what work they wanted to do, and the activity quietly fell back to a default.
 */
describe("the agent asks for what is missing", () => {
  it("asks for the category once district and block are known", () => {
    expect(firstMissing({ district: "Gwalior", block: "Ghatigaon" })).toBe("category");
  });

  it("asks in the order the plan actually needs", () => {
    expect(firstMissing({})).toBe("district");
    expect(firstMissing({ district: "Gwalior" })).toBe("block");
    expect(firstMissing({ district: "Gwalior", block: "Dabra" })).toBe("category");
    expect(
      firstMissing({ district: "Gwalior", block: "Dabra", category: "dairy" }),
    ).toBe("margin");
  });

  it("never skips the category on the way to the margin", () => {
    // The regression in one line: with a margin already set but no category, the next question is
    // still the category — not "nothing left to ask".
    const ctx = { district: "Gwalior", block: "Dabra", marginCapital: 50_000 };
    expect(firstMissing(ctx)).toBe("category");
    expect(onboardingComplete(ctx)).toBe(false);
  });

  it("treats a zero or null margin as unanswered", () => {
    const base = { district: "Gwalior", block: "Dabra", category: "dairy" };
    expect(firstMissing({ ...base, marginCapital: null })).toBe("margin");
    expect(firstMissing({ ...base, marginCapital: 0 })).toBe("margin");
    expect(firstMissing({ ...base, marginCapital: 1 })).toBeNull();
  });

  it("is complete only when all four are answered", () => {
    expect(
      onboardingComplete({
        district: "Gwalior",
        block: "Dabra",
        category: "dairy",
        marginCapital: 50_000,
      }),
    ).toBe(true);
  });
});

describe("the questions themselves", () => {
  it("has a question in every language for every field", () => {
    const states = [
      {},
      { district: "Gwalior" },
      { district: "Gwalior", block: "Dabra" },
      { district: "Gwalior", block: "Dabra", category: "dairy" },
      { district: "Gwalior", block: "Dabra", category: "dairy", marginCapital: 50_000 },
    ];
    for (const locale of LOCALES) {
      for (const ctx of states) {
        const q = nextQuestion(ctx, locale);
        expect(q.length).toBeGreaterThan(4);
      }
    }
  });

  it("reads the category options out loud", () => {
    // A closed set the user cannot see has to be spoken, or the only way to discover the options
    // is to guess — and this is a voice-first product for users who may not read the screen.
    const q = nextQuestion({ district: "Gwalior", block: "Dabra" }, "en").toLowerCase();
    for (const option of ["dairy", "kirana", "tailoring", "food", "handicrafts", "services"]) {
      expect(q).toContain(option);
    }
  });

  it("says it is finished rather than asking a fifth question", () => {
    const q = nextQuestion(
      { district: "Gwalior", block: "Dabra", category: "dairy", marginCapital: 50_000 },
      "en",
    );
    expect(q.toLowerCase()).toContain("everything");
  });

  it("keeps the acknowledgements free of a hardcoded next step", () => {
    // "Alright, Gwalior. Now choose your block." was the shape of the bug: the sentence itself
    // decided what came next, so a field outside that chain could never be reached.
    const q = nextQuestion({ district: "Gwalior" }, "en");
    expect(q).toBe("Which block?");
  });
});
