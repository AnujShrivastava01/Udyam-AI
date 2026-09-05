import { describe, expect, it } from "vitest";

import {
  asMessage,
  budgetLabel,
  dateLabel,
  emptyDraft,
  fromDraft,
  isValid,
  requirementsToCsv,
  validate,
  type Requirement,
} from "./requirement";

const draft = (over: Partial<ReturnType<typeof emptyDraft>> = {}) => ({
  ...emptyDraft({ district: "Gwalior", block: "Dabra" }),
  product: "A2 cow milk",
  quantity: 50,
  unit: "litre",
  ...over,
});

describe("requirement validation", () => {
  it("accepts a complete draft", () => {
    expect(validate(draft())).toEqual({});
    expect(isValid(draft())).toBe(true);
  });

  it("names the offending field rather than returning a bare false", () => {
    expect(validate(draft({ product: "" })).product).toBeTruthy();
    expect(validate(draft({ quantity: 0 })).quantity).toBeTruthy();
  });

  it("rejects a budget band that runs backwards", () => {
    expect(validate(draft({ budgetMin: 60, budgetMax: 55 })).budgetMax).toBeTruthy();
    expect(validate(draft({ budgetMin: 55, budgetMax: 60 })).budgetMax).toBeUndefined();
  });

  it("treats an open-ended band as valid — one end is a real answer", () => {
    expect(isValid(draft({ budgetMin: 55, budgetMax: null }))).toBe(true);
    expect(isValid(draft({ budgetMin: null, budgetMax: 60 }))).toBe(true);
  });

  it("treats no budget at all as valid — negotiable is a real answer", () => {
    expect(isValid(draft({ budgetMin: null, budgetMax: null }))).toBe(true);
  });

  it("rejects NaN, which is what an emptied number input produces", () => {
    expect(validate(draft({ quantity: NaN })).quantity).toBeTruthy();
    expect(validate(draft({ budgetMin: NaN })).budgetMin).toBeTruthy();
  });

  it("rejects a date that is not one", () => {
    expect(validate(draft({ needBy: "not a date" })).needBy).toBeTruthy();
    expect(validate(draft({ needBy: "2026-10-01" })).needBy).toBeUndefined();
    expect(validate(draft({ needBy: null })).needBy).toBeUndefined();
  });
});

describe("budget label", () => {
  it("says negotiable rather than showing an empty range", () => {
    expect(budgetLabel({ budgetMin: null, budgetMax: null })).toBe("Negotiable");
  });

  it("renders each open end explicitly", () => {
    expect(budgetLabel({ budgetMin: 55, budgetMax: null })).toBe("₹55 and above");
    expect(budgetLabel({ budgetMin: null, budgetMax: 60 })).toBe("Up to ₹60");
    expect(budgetLabel({ budgetMin: 55, budgetMax: 60 })).toBe("₹55 – ₹60");
  });

  it("groups in the Indian system", () => {
    expect(budgetLabel({ budgetMin: 150000, budgetMax: null })).toBe("₹1,50,000 and above");
  });
});

describe("date label", () => {
  it("is stable regardless of the machine's timezone", () => {
    // Parsed as UTC and read back in UTC. A local-time round trip renders 2026-10-01 as
    // 30 Sep west of Greenwich, and this string gets forwarded to a buyer.
    expect(dateLabel("2026-10-01")).toBe("1 Oct 2026");
  });

  it("refuses rather than printing Invalid Date", () => {
    expect(dateLabel("rubbish")).toBeNull();
    expect(dateLabel(null)).toBeNull();
  });
});

describe("shareable message", () => {
  const req = (over: Partial<Requirement> = {}): Requirement => ({
    ...fromDraft(draft()),
    id: "req-1",
    createdAt: "2026-09-05T00:00:00.000Z",
    ...over,
  });

  it("leads with the side, so a reader knows which way the trade goes", () => {
    expect(asMessage(req({ side: "selling" })).startsWith("SELLING")).toBe(true);
    expect(asMessage(req({ side: "buying" })).startsWith("WANTED")).toBe(true);
  });

  it("always states a price line, even when there is no band", () => {
    // An absent line is indistinguishable from an unanswered question to whoever reads this.
    expect(asMessage(req({ budgetMin: null, budgetMax: null }))).toContain("Price: Negotiable");
  });

  it("labels the date by which way the trade goes", () => {
    expect(asMessage(req({ side: "buying", needBy: "2026-10-01" }))).toContain(
      "Needed by: 1 Oct 2026",
    );
    expect(asMessage(req({ side: "selling", needBy: "2026-10-01" }))).toContain(
      "Available until: 1 Oct 2026",
    );
  });

  it("omits the location line entirely when nothing is known", () => {
    expect(asMessage(req({ district: null, block: null }))).not.toContain("Location:");
  });
});

describe("requirements CSV", () => {
  it("writes one row per requirement under the published header", () => {
    const csv = requirementsToCsv([
      { ...fromDraft(draft()), id: "r1", createdAt: "2026-09-05T00:00:00.000Z" },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("product");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("A2 cow milk");
  });

  it("leaves a missing budget empty rather than writing null", () => {
    const csv = requirementsToCsv([
      {
        ...fromDraft(draft({ budgetMin: null, budgetMax: null })),
        id: "r1",
        createdAt: "2026-09-05T00:00:00.000Z",
      },
    ]);
    expect(csv).not.toContain("null");
  });
});

describe("fromDraft", () => {
  it("trims and stamps, without trusting the caller's clock", () => {
    const r = fromDraft(draft({ product: "  ghee  " }), new Date("2026-09-05T10:00:00.000Z"));
    expect(r.product).toBe("ghee");
    expect(r.createdAt).toBe("2026-09-05T10:00:00.000Z");
    expect(r.id).toBeTruthy();
  });

  it("gives two requirements made in the same millisecond different ids", () => {
    const now = new Date("2026-09-05T10:00:00.000Z");
    expect(fromDraft(draft(), now).id).not.toBe(fromDraft(draft(), now).id);
  });
});
