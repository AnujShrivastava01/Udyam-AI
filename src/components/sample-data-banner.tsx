"use client";

import { Info } from "lucide-react";

/**
 * Declares that everything below is illustrative, not real.
 *
 * The product's third principle is that seeded or invented data must be labelled as such
 * EVERYWHERE it appears — presenting it as a real reading is the one unrecoverable mistake this
 * project can make. Several screens still render hand-written sample content; until they are
 * driven by the kernel, they must say so above the fold rather than in a footnote.
 *
 * Deliberately not dismissible. A disclosure a user can close is a disclosure that stops working.
 */
export function SampleDataBanner({
  what,
  detail,
  className = "",
}: {
  /** What is illustrative, in the user's terms — "This loan", "These posts". */
  what: string;
  /** Optional extra sentence: what the real version would be driven by. */
  detail?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={`rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 ${className}`}
    >
      <p className="flex items-start gap-2 text-sm font-bold text-amber-900 dark:text-amber-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{what} is sample content, not real data.</span>
      </p>
      {detail && (
        <p className="mt-1.5 pl-6 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
          {detail}
        </p>
      )}
    </div>
  );
}
