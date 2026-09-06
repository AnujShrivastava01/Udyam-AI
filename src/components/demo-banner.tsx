"use client";

import { FlaskConical, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

/**
 * The demo session, loaded and cleared explicitly.
 *
 * Several screens only say anything once there is history behind them — the khata refuses a
 * verdict under five recorded days, the marketplace has nothing to find buyers for until a
 * requirement exists — and nobody is going to type two weeks of bookkeeping in front of a panel.
 *
 * So the data is available in one click, and it announces itself in another. Shipping a populated
 * store that passes as the visitor's own would break the one rule the rest of this product is
 * built on: everything on screen is either something you typed or something the kernel computed
 * from it. A pre-filled ledger under the heading "this month covers your instalment" is the
 * single worst place to blur that.
 */
export function DemoBanner() {
  const { t } = useT();
  const demoLoaded = useAppStore((s) => s.demoLoaded);
  const resetSession = useAppStore((s) => s.resetSession);

  if (!demoLoaded) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-3">
      <FlaskConical
        className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        {t("demo.notice")}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 rounded-full"
        onClick={resetSession}
      >
        <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> {t("demo.clear")}
      </Button>
    </div>
  );
}

/** The load control, for empty states. Hidden once a demo is already loaded. */
export function LoadDemoButton({ className }: { className?: string }) {
  const { t } = useT();
  const demoLoaded = useAppStore((s) => s.demoLoaded);
  const loadDemo = useAppStore((s) => s.loadDemo);

  if (demoLoaded) return null;

  return (
    <Button variant="outline" size="lg" className={`rounded-full ${className ?? ""}`} onClick={loadDemo}>
      <Play className="mr-2 h-4 w-4" aria-hidden="true" /> {t("demo.load")}
    </Button>
  );
}
