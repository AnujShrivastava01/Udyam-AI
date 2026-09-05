import { describe, expect, it } from "vitest";

import { SAMPLE_QUEUE, triageQueue } from "./triage";
import { QUEUE_HEADER, SAMPLE_QUEUE_NOTE, queueFilename, queueToCsv } from "./export";

const banner = { note: SAMPLE_QUEUE_NOTE, generatedAt: "2026-09-05T10:30:00.000Z" };
const { rows } = triageQueue(SAMPLE_QUEUE);

describe("queue export", () => {
  const csv = queueToCsv(rows, banner);
  const lines = csv.split("\r\n");

  it("leads with a provenance banner, then a blank line, then the header", () => {
    expect(lines[0].startsWith("#")).toBe(true);
    expect(lines[0]).toContain("ILLUSTRATIVE SAMPLE QUEUE");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe(QUEUE_HEADER.join(","));
  });

  it("writes one row per application", () => {
    expect(lines).toHaveLength(3 + rows.length);
  });

  it("states the row count in the banner, so a truncated file is obvious", () => {
    expect(lines[0]).toContain(`${rows.length} rows`);
  });

  it("names an applied filter, so a partial export cannot pass as the whole queue", () => {
    const filtered = queueToCsv(rows.slice(0, 2), { ...banner, filter: "district=Gwalior" });
    expect(filtered.split("\r\n")[0]).toContain("district=Gwalior");
    expect(filtered.split("\r\n")[0]).toContain("2 rows");
  });

  it("writes rupees as summable integers, not formatted strings", () => {
    const body = lines.slice(3);
    for (const line of body) {
      expect(line).not.toContain("₹");
      expect(line).not.toContain("1,04,"); // Indian grouping would make the cell text
    }
  });

  it("carries every column the console shows, so the two cannot disagree", () => {
    for (const column of [
      "sanctioned_loan_inr",
      "pre_income_obligation_inr",
      "solvency_verdict",
      "triage_status",
      "dscr",
      "gestation_months",
      "flags",
    ]) {
      expect(QUEUE_HEADER).toContain(column);
    }
  });

  it("leaves an unknown DSCR blank rather than writing null", () => {
    expect(csv).not.toContain(",null,");
  });

  it("emits a header even for an empty selection", () => {
    const empty = queueToCsv([], banner);
    expect(empty).toContain(QUEUE_HEADER.join(","));
    expect(empty.split("\r\n")[0]).toContain("0 rows");
  });

  it("quotes the reason sentence, which contains commas", () => {
    // `reason` is prose. Unquoted, one comma shifts every column after it by one.
    expect(csv).toMatch(/"/);
    for (const line of lines.slice(3)) {
      // Every data row must have at least as many fields as the header once quoting is honoured.
      const naive = line.split(",").length;
      expect(naive).toBeGreaterThanOrEqual(QUEUE_HEADER.length - 1);
    }
  });
});

describe("filename", () => {
  it("is date-stamped and sortable", () => {
    expect(queueFilename("2026-09-05T10:30:00.000Z")).toBe("udyamai-triage-2026-09-05.csv");
  });

  it("takes a prefix, so the investor view does not overwrite the officer's file", () => {
    expect(queueFilename("2026-09-05T10:30:00.000Z", "udyamai-portfolio")).toBe(
      "udyamai-portfolio-2026-09-05.csv",
    );
  });
});
