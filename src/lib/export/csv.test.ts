import { describe, expect, it } from "vitest";

import { escapeCell, toCsv, withBom } from "./csv";

describe("CSV escaping", () => {
  it("leaves ordinary values alone", () => {
    expect(escapeCell("Gwalior")).toBe("Gwalior");
    expect(escapeCell(46467)).toBe("46467");
  });

  it("renders null and undefined as an empty field, not the word", () => {
    // `String(null)` is "null", which would land in an officer's spreadsheet as a value.
    expect(escapeCell(null)).toBe("");
    expect(escapeCell(undefined)).toBe("");
  });

  it("quotes and doubles per RFC 4180", () => {
    expect(escapeCell("Dabra, Gwalior")).toBe('"Dabra, Gwalior"');
    expect(escapeCell('He said "no"')).toBe('"He said ""no"""');
    expect(escapeCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("neutralises formula-leading cells", () => {
    // CSV injection: an applicant name beginning with = becomes code when Excel opens the export.
    for (const dangerous of ["=1+1", "+1", "-1", "@SUM(A1)"]) {
      expect(escapeCell(dangerous).startsWith("'")).toBe(true);
    }
  });

  it("neutralises a formula that ALSO needs quoting", () => {
    // Order matters: prefix first, then quote, or the apostrophe lands outside the quotes and the
    // cell is a formula again.
    expect(escapeCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
  });

  it("does not mangle a negative number written as a number", () => {
    // A genuine negative is prefixed too, which is the deliberate trade: no rupee column in this
    // app is negative, and treating -1 as text is far cheaper than executing a cell.
    expect(escapeCell(-5)).toBe("'-5");
  });

  it("joins with CRLF and puts the header first", () => {
    expect(toCsv(["a", "b"], [[1, 2], [3, 4]])).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("emits a header-only file for an empty table rather than an empty string", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });

  it("prefixes the BOM only when asked", () => {
    expect(toCsv(["a"], [])).not.toMatch(/^﻿/);
    expect(withBom("a")).toBe("﻿a");
  });
});
