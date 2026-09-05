/**
 * CSV, written once.
 *
 * Two surfaces need it — the officer's queue and the user's requirements — and the escaping rules
 * are exactly the kind of thing that is subtly wrong in the second copy. RFC 4180: a field
 * containing a comma, a quote or a newline is wrapped in quotes, and quotes inside it are doubled.
 *
 * Two things here are deliberate and not obvious:
 *
 * A field beginning with `=`, `+`, `-` or `@` is prefixed with an apostrophe. Excel and LibreOffice
 * treat such a cell as a formula, so a value like `=cmd|...` in an uploaded applicant name becomes
 * code execution on the officer's machine when they open the export. This is CSV injection, and an
 * export that goes to a government office is exactly where it matters. The apostrophe is the
 * standard mitigation and is invisible in the rendered cell.
 *
 * The file is prefixed with a UTF-8 BOM. Excel on Windows — which is what an SCA office runs —
 * reads a BOM-less UTF-8 CSV as the system codepage, so Devanagari village names arrive as
 * mojibake. The BOM costs three bytes and fixes it.
 */

const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function escapeCell(value: unknown): string {
  if (value == null) return "";
  let s = String(value);
  if (FORMULA_LEAD.test(s)) s = `'${s}`;
  if (NEEDS_QUOTES.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(escapeCell).join(","));
  // CRLF, because RFC 4180 says so and because Excel is the reader that matters here.
  return lines.join("\r\n");
}

/** Prepend the BOM. Separate from `toCsv` so tests can assert on the content without it. */
export function withBom(csv: string): string {
  return `\uFEFF${csv}`;
}

/**
 * Hand a CSV to the browser as a download.
 *
 * Client-only: it touches `document` and `URL.createObjectURL`. The object URL is revoked on the
 * next tick — not immediately, because Safari cancels an in-flight download when the URL is
 * revoked in the same frame as the click.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([withBom(csv)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
