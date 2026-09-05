import { describe, expect, it } from "vitest";

import { plan } from "@/lib/finance";
import { allowedNumbers, extractNumbers, verifyNumericFidelity } from "./narrate";

const goat = plan({
  marginCapital: 10_000,
  activityId: "goat-20-1",
  useNeedBasedCosting: true,
});

describe("numeric fidelity verifier", () => {
  it("extracts every number from prose, including grouped ones", () => {
    expect(extractNumbers("You owe ₹46,467 across 6 payments over 12 months")).toEqual([
      "46,467",
      "6",
      "12",
    ]);
  });

  it("allows the kernel's own figures in both bare and grouped form", () => {
    const allowed = allowedNumbers(goat);
    expect(allowed.has("46467")).toBe(true);
    expect(allowed.has("46,467")).toBe(true);
    expect(allowed.has("18")).toBe(true); // gestation
    expect(allowed.has("90000")).toBe(true); // sanctioned loan
  });

  it("accepts narration built only from kernel figures", () => {
    const good =
      "This work earns nothing for 18 months, but your first instalment is due in month 6. " +
      "That means ₹46,467 has to come from somewhere else.";
    expect(verifyNumericFidelity(good, goat)).toEqual([]);
  });

  it("REJECTS a narration that invents a figure", () => {
    // The classic failure: a plausible-looking total the engine never produced.
    const bad = "You will need about ₹52,000 before you earn anything.";
    const rejected = verifyNumericFidelity(bad, goat);
    expect(rejected).toContain("52,000");
  });

  it("REJECTS a narration that does its own arithmetic", () => {
    // 46,467 ÷ 6 = 7,744.5 — a number the model derived rather than received.
    const bad = "That is ₹46,467 across 6 payments, so about ₹7,744 each time.";
    expect(verifyNumericFidelity(bad, goat).length).toBeGreaterThan(0);
  });

  it("catches an invented interest rate", () => {
    const bad = "The scheme charges 7.5% per year.";
    expect(verifyNumericFidelity(bad, goat)).toContain("7.5");
  });

  it("passes the real kernel-rendered sentence unchanged", () => {
    // Whatever the engine itself says must, by definition, survive its own verifier.
    expect(verifyNumericFidelity(goat.solvency.headline, goat)).toEqual([]);
    expect(verifyNumericFidelity(goat.solvency.detail, goat)).toEqual([]);
  });
});
