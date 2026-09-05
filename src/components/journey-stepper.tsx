"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, Compass, BarChart2, IndianRupee, Users, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-landing";

const STEPS = [
  { id: "discover", label: "Discover", icon: Compass, paths: ["/onboarding", "/discover", "/"] },
  { id: "analyse", label: "Analyse", icon: BarChart2, paths: ["/report"] },
  { id: "finance", label: "Finance", icon: IndianRupee, paths: ["/calculator"] },
  { id: "connect", label: "Connect", icon: Users, paths: ["/community", "/mentors", "/marketplace"] },
  { id: "manage", label: "Manage", icon: Settings, paths: ["/dashboard/emi", "/dashboard/ngo"] },
  { id: "grow", label: "Grow", icon: TrendingUp, paths: ["/profile"] },
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
    <div className="w-full bg-card border-b shadow-sm flex flex-col">
      <div className="flex items-start justify-between w-full max-w-5xl mx-auto px-2 py-3 md:px-8">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = step.icon;

          return (
            <Link href={step.paths[0]} key={step.id} className="flex flex-col items-center relative z-10 flex-1 group">
              {/* Connecting Line */}
              {index !== 0 && (
                <div
                  className={cn(
                    "absolute top-4 md:top-5 -left-1/2 w-full h-[2px] -z-10 transition-colors",
                    isCompleted || isActive ? "bg-primary" : "bg-muted group-hover:bg-primary/30"
                  )}
                />
              )}
              
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-300 relative",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-md scale-110"
                    : isCompleted
                    ? "border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105"
                    : "border-muted bg-card text-muted-foreground group-hover:border-primary/50 group-hover:text-primary/70"
                )}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                {/* Small completed badge */}
                {isCompleted && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border border-background">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-[9px] md:text-xs font-medium tracking-wide transition-colors text-center leading-tight px-0.5",
                  isActive 
                    ? "text-foreground font-bold" 
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {t(`step.${step.id}` as any)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Prev / Next Navigation Bar for high-level journey */}
      <div className="bg-muted/30 border-t px-4 py-2 flex items-center justify-between text-sm md:hidden">
        {currentStep > 0 ? (
          <Link href={STEPS[currentStep - 1].paths[0]} className="text-primary font-medium flex items-center gap-1">
            <span className="text-lg leading-none">&laquo;</span> Prev
          </Link>
        ) : (
          <div /> /* Empty placeholder to push Next to right */
        )}
        
        <span className="text-xs text-muted-foreground font-medium">
          {STEPS[currentStep].label}
        </span>

        {currentStep < STEPS.length - 1 ? (
          <Link href={STEPS[currentStep + 1].paths[0]} className="text-primary font-medium flex items-center gap-1">
            Next <span className="text-lg leading-none">&raquo;</span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
