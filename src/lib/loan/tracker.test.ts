import { describe, expect, it } from "vitest";

import { plan } from "@/lib/finance";
import { monthsBetween, parseDate, toInputValue, track } from "./tracker";

const p = plan({ marginCapital: 25_000, activityId: "milch-cows-2", useNeedBasedCosting: true });
const schedule = p.schedule.schedule;

const base = {
  schedule,
  moratoriumMonths: p.structure.moratoriumMonths,
  gestationMonths: p.activity?.gestationMonths ?? null,
};

describe("monthsBetween", () => {
  it("counts whole months, not 30-day blocks", () => {
    expect(monthsBetween(new Date(2026, 0, 15), new Date(2026, 3, 15))).toBe(3);
  });

  it("does not round a partial month up", () => {
    // 31 Jan to 1 Mar is one month elapsed, not two — the February payment has not come round.
    expect(monthsBetween(new Date(2026, 0, 31), new Date(2026, 2, 1))).toBe(1);
  });

  it("is zero, never negative, for a future disbursement", () => {
    expect(monthsBetween(new Date(2027, 0, 1), new Date(2026, 0, 1))).toBe(0);
  });
});

describe("parseDate", () => {
  it("reads an input value as a LOCAL calendar day", () => {
    // `new Date("2026-09-06")` is UTC midnight, which is 5 September west of Greenwich — every
    // due date would land a day early for those users.
    const d = parseDate("2026-09-06")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(6);
  });

  it("refuses a date that does not exist rather than rolling it forward", () => {
    expect(parseDate("2026-02-31")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
  });

  it("refuses junk and empties", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate("06/09/2026")).toBeNull();
  });

  it("round-trips through the input format", () => {
    expect(toInputValue(parseDate("2026-09-06")!)).toBe("2026-09-06");
  });
});

describe("projected mode — no disbursement date", () => {
  const t = track({ ...base, disbursedOn: null, today: new Date(2026, 8, 6) });

  it("places nothing on the calendar", () => {
    expect(t.mode).toBe("projected");
    expect(t.rows.every((r) => r.dueOn === null)).toBe(true);
  });

  it("claims no progress at all", () => {
    expect(t.monthsElapsed).toBe(0);
    expect(t.elapsedCount).toBe(0);
    expect(t.elapsedTotal).toBe(0);
  });

  it("shows the full loan as outstanding", () => {
    expect(t.scheduledOutstanding).toBe(schedule[0].openingBalance);
  });
});

describe("tracked mode — a real disbursement date", () => {
  // Disbursed a year ago.
  const t = track({
    ...base,
    disbursedOn: "2025-09-06",
    today: new Date(2026, 8, 6),
  });

  it("derives months elapsed from the calendar, not from a slider", () => {
    expect(t.mode).toBe("tracked");
    expect(t.monthsElapsed).toBe(12);
  });

  it("dates every row by adding whole months to disbursement", () => {
    const first = t.rows[0];
    expect(first.dueOn).not.toBeNull();
    expect(first.dueOn!.getDate()).toBe(6);
  });

  it("marks a passed row 'elapsed' — the union has no 'paid' at all", () => {
    // There is no ledger. Whether the money moved is something only the borrower and the lender
    // know, and a tracker that assumes it did is worse than one that says nothing. The type
    // enforces it: `state` is "elapsed" | "next" | "upcoming", so "paid" cannot be assigned.
    const states = new Set(t.rows.map((r) => r.state));
    expect(states.has("elapsed")).toBe(true);
    expect([...states].sort()).toEqual(["elapsed", "next", "upcoming"]);
  });

  it("marks exactly one row as next", () => {
    expect(t.rows.filter((r) => r.state === "next")).toHaveLength(1);
  });

  it("agrees with its own next-due row", () => {
    const flagged = t.rows.find((r) => r.state === "next")!;
    expect(t.next!.row.period).toBe(flagged.row.period);
  });

  it("reports the scheduled outstanding after the last elapsed row", () => {
    const elapsed = schedule.filter((r) => r.month <= t.monthsElapsed);
    expect(t.scheduledOutstanding).toBe(
      Math.round(elapsed[elapsed.length - 1].closingBalance * 100) / 100,
    );
  });

  it("leaves the moratorium once the calendar has passed it", () => {
    expect(t.inMoratorium).toBe(false);
  });
});

describe("a loan disbursed today", () => {
  const t = track({ ...base, disbursedOn: "2026-09-06", today: new Date(2026, 8, 6) });

  it("has elapsed nothing and is inside the moratorium", () => {
    expect(t.monthsElapsed).toBe(0);
    expect(t.elapsedCount).toBe(0);
    expect(t.inMoratorium).toBe(base.moratoriumMonths > 0);
  });

  it("points at the first payable instalment", () => {
    expect(t.next).not.toBeNull();
    expect(t.next!.row.payment).toBeGreaterThan(0);
  });
});

describe("a finished loan", () => {
  it("has no next instalment rather than looping to the first", () => {
    const t = track({ ...base, disbursedOn: "2015-01-01", today: new Date(2026, 8, 6) });
    expect(t.next).toBeNull();
    expect(t.scheduledOutstanding).toBeCloseTo(0, 0);
  });
});

describe("pre-income exposure", () => {
  it("counts only instalments still to fall due before first income", () => {
    const gapped = plan({
      marginCapital: 11_000,
      activityId: "bee-keeping-20",
      useNeedBasedCosting: true,
    });
    const t = track({
      schedule: gapped.schedule.schedule,
      moratoriumMonths: gapped.structure.moratoriumMonths,
      gestationMonths: gapped.activity!.gestationMonths,
      disbursedOn: "2026-09-06",
      today: new Date(2026, 8, 6),
    });
    // Bee-keeping earns at month 9 against a 3-month moratorium, so there is real exposure.
    expect(t.remainingPreIncome).toBeGreaterThan(0);
    expect(t.monthsToIncome).toBe(9);
  });

  it("is zero for an activity that earns immediately", () => {
    const t = track({ ...base, disbursedOn: "2026-09-06", today: new Date(2026, 8, 6) });
    expect(base.gestationMonths).toBe(0);
    expect(t.remainingPreIncome).toBe(0);
  });
});
