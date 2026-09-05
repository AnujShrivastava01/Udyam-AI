import { describe, expect, it } from "vitest";

import { addMonths, nextDue, overdue, shouldRemind } from "./reminders";
import { amortise } from "./amortise";

/**
 * The reminder date is arithmetic, not infrastructure — so it is testable, and the awkward cases
 * are calendar ones rather than scheduling ones.
 */

const schedule = amortise({
  principal: 90_000,
  annualRatePct: 6,
  tenureMonths: 36,
  moratoriumMonths: 3,
  restMonths: 3,
  convention: "serviced",
}).schedule;

describe("addMonths", () => {
  it("keeps the day of the month", () => {
    expect(addMonths(new Date(2026, 0, 15), 3).toDateString()).toBe(
      new Date(2026, 3, 15).toDateString(),
    );
  });

  it("clamps rather than overflowing into the next month", () => {
    // 31 January + 1 month is 28 February, not 3 March. Date.setMonth alone gets this wrong,
    // which is how a reminder ends up a few days late every quarter.
    expect(addMonths(new Date(2026, 0, 31), 1).toDateString()).toBe(
      new Date(2026, 1, 28).toDateString(),
    );
  });

  it("handles a leap year", () => {
    expect(addMonths(new Date(2028, 0, 31), 1).toDateString()).toBe(
      new Date(2028, 1, 29).toDateString(),
    );
  });

  it("crosses a year boundary", () => {
    expect(addMonths(new Date(2026, 10, 10), 4).toDateString()).toBe(
      new Date(2027, 2, 10).toDateString(),
    );
  });
});

describe("nextDue", () => {
  const disbursed = new Date(2026, 0, 10);

  it("finds the first instalment before any has fallen due", () => {
    const due = nextDue(schedule, disbursed, new Date(2026, 0, 11));
    expect(due).not.toBeNull();
    expect(due!.row.month).toBe(3);
    expect(due!.dueOn.toDateString()).toBe(new Date(2026, 3, 10).toDateString());
    expect(due!.daysAway).toBeGreaterThan(0);
  });

  it("skips past the ones already paid", () => {
    const due = nextDue(schedule, disbursed, new Date(2026, 4, 1));
    expect(due!.row.month).toBe(6);
  });

  it("counts the day it falls due as due, not overdue", () => {
    const due = nextDue(schedule, disbursed, new Date(2026, 3, 10));
    expect(due!.row.month).toBe(3);
    expect(due!.daysAway).toBe(0);
  });

  it("returns null once the loan is finished", () => {
    expect(nextDue(schedule, disbursed, new Date(2030, 0, 1))).toBeNull();
  });
});

describe("overdue", () => {
  it("lists only what is genuinely past", () => {
    const disbursed = new Date(2026, 0, 10);
    const missed = overdue(schedule, disbursed, new Date(2026, 7, 1));
    // Months 3 and 6 have passed by 1 August; month 9 has not.
    expect(missed.map((m) => m.row.month)).toEqual([3, 6]);
    expect(missed.every((m) => m.daysAway < 0)).toBe(true);
  });
});

describe("shouldRemind", () => {
  const disbursed = new Date(2026, 0, 10);

  it("fires inside the lead window and not before it", () => {
    expect(shouldRemind(nextDue(schedule, disbursed, new Date(2026, 3, 5)))).toBe(true);
    expect(shouldRemind(nextDue(schedule, disbursed, new Date(2026, 2, 1)))).toBe(false);
  });

  it("never fires on a finished loan", () => {
    expect(shouldRemind(nextDue(schedule, disbursed, new Date(2030, 0, 1)))).toBe(false);
  });
});
