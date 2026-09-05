"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, Compass, BarChart2, IndianRupee, Users, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useTranslation, type DictionaryKeys } from "@/lib/i18n-landing";

/**
 * `href` is where the step goes; `paths` is what counts as being on it.
 *
 * They used to be the same field, and the stepper linked to `paths[0]`. Two of those prefixes are
 * not routes: /report is only ever /report/[id], and /profile is only /profile/[id]. Analyse and
 * Grow — two of the six steps in the product's primary navigation — went to a 404 from every page.
 *
 * `isDone` is the evidence that the step is actually finished. Only Discover has one: the store
 * genuinely knows whether the user answered the three onboarding questions. For the rest the app
 * holds no record of an outcome, so the most it can honestly say is that the user has been there —
 * which is a weaker mark, and is drawn as a weaker mark.
 */
type Evidence = { onboardingInput: ReturnType<typeof useAppStore.getState>["onboardingInput"] };

const STEPS: {
  id: string;
  icon: typeof Compass;
  href: string;
  paths: string[];
  isDone?: (e: Evidence) => boolean;
}[] = [
  {
    id: "discover",
    icon: Compass,
    href: "/onboarding",
    paths: ["/onboarding", "/discover", "/"],
    isDone: (e) =>
      !!e.onboardingInput.location?.district &&
      !!e.onboardingInput.businessCategory &&
      (e.onboardingInput.marginCapital ?? 0) > 0,
  },
  { id: "analyse", icon: BarChart2, href: "/report/goat-20-1", paths: ["/report"] },
  { id: "finance", icon: IndianRupee, href: "/calculator", paths: ["/calculator"] },
  {
    id: "connect",
    icon: Users,
    href: "/community",
    paths: ["/community", "/mentors", "/marketplace"],
  },
  {
    id: "manage",
    icon: Settings,
    href: "/dashboard/emi",
    paths: ["/dashboard/emi", "/dashboard/ngo"],
  },
  { id: "grow", icon: TrendingUp, href: "/profile/me", paths: ["/profile"] },
];

export function JourneyStepper() {
  const pathname = usePathname();
  const { t } = useTranslation();
  // Narrow subscriptions: this strip sits in the header on every page, so subscribing to the whole
  // store would re-render it on every keystroke in the calculator.
  const onboardingInput = useAppStore((s) => s.onboardingInput);
  const visitedSteps = useAppStore((s) => s.visitedSteps);
  const markStepVisited = useAppStore((s) => s.markStepVisited);

  const activeIndex = STEPS.findIndex((step) =>
    step.paths.some((p) => pathname === p || pathname.startsWith(p + "/")),
  );

  // Being here is the evidence. Recorded once per step, and persisted, so the strip is a record of
  // where the user has actually been rather than a guess from where they are now.
  useEffect(() => {
    const step = STEPS[activeIndex];
    if (step) markStepVisited(step.id);
  }, [activeIndex, markStepVisited]);

  const stateOf = (index: number) => {
    const step = STEPS[index];
    if (!step) return "pending" as const;
    if (index === activeIndex) return "current" as const;
    if (step.isDone?.({ onboardingInput })) return "done" as const;
    return visitedSteps.includes(step.id) ? ("visited" as const) : ("pending" as const);
  };

  const prev = activeIndex > 0 ? STEPS[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < STEPS.length - 1 ? STEPS[activeIndex + 1] : null;

  return (
    <nav aria-label="Journey" className="w-full bg-card border-b shadow-sm flex flex-col">
      {/* Shrinks to fit rather than scrolling: the strip lives inside the FIXED header, so a
          horizontal scrollbar here added height to the bar on every page. */}
      <div className="flex items-start justify-between w-full max-w-5xl mx-auto px-2 py-3 md:px-8">
        {STEPS.map((step, index) => {
          const status = stateOf(index);
          const reached = status !== "pending";
          // The connecting line used to run solid to the current step, which drew a completed
          // path through five screens the user had never opened. A segment is only drawn once
          // both of the steps it joins have been reached.
          const linkedBack = index > 0 && reached && stateOf(index - 1) !== "pending";

          /**
           * Don't let the user skip ahead into a screen that needs earlier answers — but do let
           * them go anywhere they have already been.
           *
           * This was `index > activeIndex`, which also disabled every step BEHIND the current one
           * in the forward direction: finish Finance, walk back to Discover, and Finance was no
           * longer clickable. It disagreed with the Prev/Next bar too, whose Next links straight
           * to `activeIndex + 1` — a step the strip was refusing to open.
           *
           * Reached steps are always open, the immediate next one is open so the journey can
           * progress, and anything further that has never been visited stays shut.
           */
          const isDisabled = status === "pending" && index > activeIndex + 1;
          const Icon = step.icon;

          return (
            <Link
              href={isDisabled ? "#" : step.href}
              key={step.id}
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "flex flex-col items-center relative z-10 flex-1 group rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isDisabled && "opacity-70 cursor-not-allowed"
              )}
              onClick={(e) => {
                if (isDisabled) e.preventDefault();
              }}
            >
              {/* Connecting Line */}
              {index !== 0 && (
                <div
                  className={cn(
                    "absolute top-4 md:top-5 h-[2px] -z-10 transition-colors",
                    "left-[calc(-50%+20px)] w-[calc(100%-40px)] md:left-[calc(-50%+24px)] md:w-[calc(100%-48px)]",
                    linkedBack ? "bg-primary" : "bg-muted",
                    !isDisabled && "group-hover:bg-primary/30"
                  )}
                />
              )}

              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-300 relative",
                  status === "current"
                    ? "border-primary bg-primary text-primary-foreground shadow-md scale-110"
                    : status === "done"
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105"
                      : status === "visited"
                        ? "border-primary/40 bg-card text-primary/70 hover:border-primary/60"
                        : "border-muted bg-card text-muted-foreground",
                  !isDisabled && status === "pending" && "group-hover:border-primary/50 group-hover:text-primary/70"
                )}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />

                {/* The tick is a corner badge rather than a replacement for the icon, so the step
                    stays identifiable at a glance. It appears only for `done` — a step the user
                    has merely opened gets the lighter ring above and no tick, because those are
                    two different claims. */}
                {status === "done" && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border border-background">
                    <Check className="w-2.5 h-2.5" aria-hidden="true" />
                  </div>
                )}

                {/* aria-current marks the step the user is on; the other two states have no
                    equivalent attribute, so they are said in text — and they say different things,
                    because they mean different things. */}
                {status === "done" && <span className="sr-only">{t("step.done")}</span>}
                {status === "visited" && <span className="sr-only">{t("step.visited")}</span>}
              </div>
              <span
                className={cn(
                  "mt-2 text-[9px] md:text-xs font-medium tracking-wide transition-colors text-center leading-tight px-0.5",
                  status === "current"
                    ? "text-foreground font-bold"
                    : status === "pending"
                      ? "text-muted-foreground"
                      : "text-foreground/80",
                  !isDisabled && "group-hover:text-foreground"
                )}
              >
                {t(`step.${step.id}` as DictionaryKeys)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Prev / Next on a phone, where the six targets above are small. Rendered only when the
          current route is one of the steps — activeIndex is -1 elsewhere, and STEPS[-1] would
          have thrown. */}
      {activeIndex >= 0 && (
        <div className="bg-muted/30 border-t px-4 py-2 flex items-center justify-between text-sm md:hidden">
          {prev ? (
            <Link
              href={prev.href}
              className="text-primary font-medium flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="text-lg leading-none" aria-hidden="true">
                &laquo;
              </span>{" "}
              {t(`step.${prev.id}` as DictionaryKeys)}
            </Link>
          ) : (
            <div />
          )}

          <span className="text-xs text-muted-foreground font-medium">
            {t(`step.${STEPS[activeIndex].id}` as DictionaryKeys)}
          </span>

          {next ? (
            <Link
              href={next.href}
              className="text-primary font-medium flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t(`step.${next.id}` as DictionaryKeys)}{" "}
              <span className="text-lg leading-none" aria-hidden="true">
                &raquo;
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </nav>
  );
}
