"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, Compass, BarChart2, IndianRupee, Users, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation, type DictionaryKeys } from "@/lib/i18n-landing";

/**
 * `href` is where the step goes; `paths` is what counts as being on it.
 *
 * They used to be the same field, and the stepper linked to `paths[0]`. Two of those prefixes are
 * not routes: /report is only ever /report/[id], and /profile is only /profile/[id]. Analyse and
 * Grow — two of the six steps in the product's primary navigation — went to a 404 from every page.
 */
const STEPS = [
  {
    id: "discover",
    icon: Compass,
    href: "/onboarding",
    paths: ["/onboarding", "/discover", "/"],
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

  // Find the active step index based on the current pathname
  const activeIndex = STEPS.findIndex((step) =>
    step.paths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );

  const currentStep = activeIndex === -1 ? 0 : activeIndex;

  return (
    <nav
      aria-label="Journey"
      className="w-full bg-card border-b px-4 py-2 md:px-8 shadow-sm overflow-x-auto no-scrollbar"
    >
      <div className="flex items-center justify-between min-w-[600px] max-w-5xl mx-auto">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = step.icon;

          return (
            <Link
              href={step.href}
              key={step.id}
              aria-current={isActive ? "step" : undefined}
              className="flex flex-col items-center relative z-10 flex-1 group rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {/* Connecting Line (except for the first item) */}
              {index !== 0 && (
                <div
                  className={cn(
                    "absolute top-5 -left-1/2 w-full h-[2px] -z-10 transition-colors",
                    isCompleted || isActive ? "bg-primary" : "bg-muted group-hover:bg-primary/30"
                  )}
                />
              )}
              
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-md scale-110"
                    : isCompleted
                    ? "border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105"
                    : "border-muted bg-card text-muted-foreground group-hover:border-primary/50 group-hover:text-primary/70"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Icon className="w-5 h-5" aria-hidden="true" />
                )}
                {/* The tick and the ring carried the whole state. aria-current marks the active
                    step; "completed" has no equivalent attribute, so it is said in text. */}
                {isCompleted && <span className="sr-only">{t("step.completed")}</span>}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium tracking-wide transition-colors",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
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
