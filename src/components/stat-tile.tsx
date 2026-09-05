import { Card, CardContent } from "@/components/ui/card";

/**
 * One number with its label and its caveat.
 *
 * Written three times across the officer console, the funding view and the dashboard before it was
 * extracted, and the copies had already drifted — one clipped ₹1,04,32,118 on a phone because it
 * used `text-3xl` unconditionally, the others did not. A figure this product shows is supposed to
 * be checkable, so the component that shows figures should exist once.
 *
 * `sub` is not decoration. Every tile here carries a denominator, a scope or a source in it — "of
 * 7 fundable files", "across Gwalior" — because a headline number without one is the shape every
 * overstated claim takes.
 */
export type TileTone = "neutral" | "rose" | "amber" | "emerald" | "primary";

const TONE: Record<TileTone, string> = {
  neutral: "text-foreground",
  rose: "text-rose-600 dark:text-rose-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  primary: "text-primary",
};

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: TileTone;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {/* Scaled down until there is room, and allowed to break: a two-column phone grid clips a
            crore figure at text-3xl. */}
        <p
          className={`mt-1 text-2xl sm:text-3xl font-bold font-heading tabular-nums break-words ${TONE[tone]}`}
        >
          {value}
        </p>
        {sub && <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
