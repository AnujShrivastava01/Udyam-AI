import { describe, expect, it } from "vitest";

import {
  MIN_DAYS_FOR_VERDICT,
  coverCheck,
  dayKey,
  ledgerToCsv,
  newEntry,
  summarise,
  total,
  type LedgerEntry,
} from "./book";

const TODAY = new Date(2026, 8, 6); // 6 Sep 2026, local

const e = (on: string, kind: "sale" | "expense", amount: number, note = ""): LedgerEntry =>
  newEntry({ on, kind, amount, note }, new Date(`${on}T09:00:00.000Z`));

describe("dayKey", () => {
  it("is the LOCAL calendar day", () => {
    // toISOString().slice(0,10) is the previous day east of Greenwich after 05:30 IST, which would
    // file an evening sale under yesterday.
    expect(dayKey(new Date(2026, 8, 6, 23, 30))).toBe("2026-09-06");
    expect(dayKey(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});

describe("newEntry", () => {
  it("keeps the amount positive and puts the sign in the kind", () => {
    expect(newEntry({ on: "2026-09-06", kind: "expense", amount: -500 }).amount).toBe(0);
    expect(newEntry({ on: "2026-09-06", kind: "expense", amount: 500 }).amount).toBe(500);
  });

  it("rounds to the rupee", () => {
    expect(newEntry({ on: "2026-09-06", kind: "sale", amount: 249.6 }).amount).toBe(250);
  });

  it("trims and caps the note", () => {
    const long = newEntry({ on: "2026-09-06", kind: "sale", amount: 1, note: "  x".repeat(200) });
    expect(long.note.length).toBeLessThanOrEqual(120);
  });
});

describe("totals", () => {
  it("nets sales against expenses", () => {
    const t = total([e("2026-09-06", "sale", 900), e("2026-09-06", "expense", 350)]);
    expect(t).toEqual({ sales: 900, expenses: 350, net: 550, count: 2 });
  });

  it("reports a loss as a negative net rather than clamping it", () => {
    // A book that cannot show a bad day is not a book.
    expect(total([e("2026-09-06", "expense", 400)]).net).toBe(-400);
  });

  it("is all zeroes for an empty book", () => {
    expect(total([])).toEqual({ sales: 0, expenses: 0, net: 0, count: 0 });
  });
});

describe("summarise", () => {
  const entries = [
    e("2026-09-06", "sale", 1_200),
    e("2026-09-06", "expense", 400),
    e("2026-09-05", "sale", 800),
    e("2026-08-31", "sale", 5_000), // previous month
  ];
  const s = summarise(entries, TODAY);

  it("separates today from the month from all time", () => {
    expect(s.today.net).toBe(800);
    expect(s.month.net).toBe(1_600); // 6th and 5th only
    expect(s.allTime.net).toBe(6_600);
  });

  it("does not let last month leak into this month", () => {
    expect(s.month.sales).toBe(2_000);
    expect(s.allTime.sales).toBe(7_000);
  });

  it("groups by day, newest first", () => {
    expect(s.days.map((d) => d.on)).toEqual(["2026-09-06", "2026-09-05", "2026-08-31"]);
    expect(s.days[0].totals.net).toBe(800);
  });

  it("counts distinct recorded days this month", () => {
    expect(s.daysRecordedThisMonth).toBe(2);
  });

  it("returns zeroes for today when nothing was recorded today", () => {
    expect(summarise([e("2026-09-01", "sale", 100)], TODAY).today.count).toBe(0);
  });
});

describe("coverCheck — the join between the book and the loan", () => {
  const busyMonth = (net: number): LedgerEntry[] =>
    Array.from({ length: MIN_DAYS_FOR_VERDICT }, (_, i) =>
      e(`2026-09-0${i + 1}`, net >= 0 ? "sale" : "expense", Math.abs(net) / MIN_DAYS_FOR_VERDICT),
    );

  it("compares a MONTH against a month, not against a quarter", () => {
    // The unit slip this guards: a quarterly instalment of 10,288 is ~3,429 a month. Comparing a
    // month's net against the full quarter would call a comfortable shop insolvent.
    const c = coverCheck(summarise(busyMonth(6_000), TODAY), 10_288);
    expect(c.monthlyObligation).toBe(3_429);
    expect(c.verdict).toBe("covers");
    expect(c.headroom).toBe(6_000 - 3_429);
  });

  it("says short when the month earns but not enough", () => {
    expect(coverCheck(summarise(busyMonth(2_000), TODAY), 10_288).verdict).toBe("short");
  });

  it("says loss when the month is negative", () => {
    expect(coverCheck(summarise(busyMonth(-2_000), TODAY), 10_288).verdict).toBe("loss");
  });

  it("refuses a verdict on too few days", () => {
    // Two good days is not evidence about a month, and a green tick built on two days is worse
    // than no tick.
    const thin = [e("2026-09-06", "sale", 50_000)];
    expect(coverCheck(summarise(thin, TODAY), 10_288).verdict).toBe("unknown");
  });

  it("refuses a verdict when there is no loan", () => {
    expect(coverCheck(summarise(busyMonth(6_000), TODAY), null).verdict).toBe("unknown");
    expect(coverCheck(summarise(busyMonth(6_000), TODAY), 0).verdict).toBe("unknown");
  });

  it("still reports the figures it has, even with no verdict", () => {
    const c = coverCheck(summarise(busyMonth(6_000), TODAY), null);
    expect(c.monthNet).toBe(6_000);
    expect(c.daysRecorded).toBe(MIN_DAYS_FOR_VERDICT);
  });
});

describe("csv", () => {
  it("writes oldest first, under the published header", () => {
    const csv = ledgerToCsv([e("2026-09-06", "sale", 100), e("2026-09-01", "expense", 50)]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("date,kind,amount_inr");
    expect(lines[1]).toContain("2026-09-01");
    expect(lines[2]).toContain("2026-09-06");
  });

  it("writes rupees as summable integers", () => {
    expect(ledgerToCsv([e("2026-09-06", "sale", 1_00_000)])).toContain("100000");
  });

  it("neutralises a note that would execute in a spreadsheet", () => {
    const csv = ledgerToCsv([e("2026-09-06", "sale", 1, "=cmd|calc")]);
    expect(csv).toContain("'=cmd|calc");
  });
});
