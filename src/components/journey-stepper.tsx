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

  return (
    <nav
      aria-label="Journey"
      className="w-full bg-card border-b px-4 py-2 md:px-8 shadow-sm overflow-x-auto no-scrollbar"
    >
      <div className="flex items-center justify-between min-w-[600px] max-w-5xl mx-auto">
        {STEPS.map((step, index) => {
          const status = stateOf(index);
          const reached = status !== "pending";
          // The connecting line used to run solid to the current step, which drew a completed
          // path through five screens the user had never opened. A segment is only drawn once
          // both of the steps it joins have been reached.
          const linkedBack = index > 0 && reached && stateOf(index - 1) !== "pending";
          const Icon = step.icon;

          return (
            <Link
              href={step.href}
              key={step.id}
              aria-current={status === "current" ? "step" : undefined}
              className="flex flex-col items-center relative z-10 flex-1 group rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {index !== 0 && (
                <div
                  className={cn(
                    "absolute top-5 -left-1/2 w-full h-[2px] -z-10 transition-colors",
                    linkedBack ? "bg-primary" : "bg-muted group-hover:bg-primary/30",
                  )}
                />
              )}

              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  status === "current"
                    ? "border-primary bg-primary text-primary-foreground shadow-md scale-110"
                    : status === "done"
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105"
                      : status === "visited"
                        ? "border-primary/40 bg-card text-primary/70 hover:border-primary/60"
                        : "border-muted bg-card text-muted-foreground group-hover:border-primary/50 group-hover:text-primary/70",
                )}
              >
                {status === "done" ? (
                  <Check className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Icon className="w-5 h-5" aria-hidden="true" />
                )}
                {/* A tick and a ring carried the whole distinction. aria-current marks the step
                    the user is on; the other two states have no equivalent attribute, so they are
                    said in text — and they say different things, because they mean different
                    things. */}
                {status === "done" && <span className="sr-only">{t("step.done")}</span>}
                {status === "visited" && <span className="sr-only">{t("step.visited")}</span>}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium tracking-wide transition-colors",
                  status === "current"
                    ? "text-foreground font-semibold"
                    : status === "pending"
                      ? "text-muted-foreground group-hover:text-foreground"
                      : "text-foreground/80 group-hover:text-foreground",
                )}
              >
                {t(`step.${step.id}` as DictionaryKeys)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
