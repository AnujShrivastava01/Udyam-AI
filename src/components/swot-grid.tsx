"use client";

import { AlertTriangle, ShieldCheck, TrendingUp, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { SWOT_METHOD, type SwotItem, type SwotQuadrant } from "@/lib/market/swot";

/**
 * The SWOT, as a four-quadrant grid.
 *
 * Every claim carries the figure that produced it directly underneath, because that is the whole
 * difference between this and four bullet lists a model wrote. An empty quadrant prints "nothing
 * found" rather than being padded — a bank officer learning that the engine found no strengths
 * here has learned something.
 */

const QUADRANTS: {
  id: SwotQuadrant;
  icon: typeof ShieldCheck;
  labelKey: "swot.strengths" | "swot.weaknesses" | "swot.opportunities" | "swot.threats";
  tone: string;
}[] = [
  {
    id: "strength",
    icon: ShieldCheck,
    labelKey: "swot.strengths",
    tone: "border-emerald-500/40 bg-emerald-500/5",
  },
  {
    id: "weakness",
    icon: TriangleAlert,
    labelKey: "swot.weaknesses",
    tone: "border-amber-500/40 bg-amber-500/5",
  },
  {
    id: "opportunity",
    icon: TrendingUp,
    labelKey: "swot.opportunities",
    tone: "border-primary/40 bg-primary/5",
  },
  {
    id: "threat",
    icon: AlertTriangle,
    labelKey: "swot.threats",
    tone: "border-rose-500/40 bg-rose-500/5",
  },
];

export function SwotGrid({ items }: { items: SwotItem[] }) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("swot.title")}</CardTitle>
        <CardDescription>{t("swot.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {QUADRANTS.map((q) => {
            const found = items.filter((i) => i.quadrant === q.id);
            const Icon = q.icon;
            return (
              <section
                key={q.id}
                aria-labelledby={`swot-${q.id}`}
                className={`rounded-xl border-2 p-4 ${q.tone}`}
              >
                <h3
                  id={`swot-${q.id}`}
                  className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t(q.labelKey)}
                  <span className="ml-auto text-xs font-normal tabular-nums opacity-70">
                    {found.length}
                  </span>
                </h3>

                {found.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("swot.none")}</p>
                ) : (
                  <ul className="space-y-3">
                    {found.map((item, i) => (
                      <li key={i}>
                        <p className="text-sm font-medium leading-snug">{item.claim}</p>
                        {/* The number that triggered the claim. This is the point of the panel. */}
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {item.evidence}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">{SWOT_METHOD}</p>
      </CardContent>
    </Card>
  );
}
