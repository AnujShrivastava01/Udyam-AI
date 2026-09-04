"use client";

import { usePathname } from "next/navigation";
import { Check, Compass, BarChart2, IndianRupee, Users, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Find the active step index based on the current pathname
  const activeIndex = STEPS.findIndex((step) =>
    step.paths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );

  const currentStep = activeIndex === -1 ? 0 : activeIndex;

  return (
    <div className="w-full bg-card border-b px-4 py-3 md:px-8 shadow-sm overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-between min-w-[600px] max-w-5xl mx-auto">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
              {/* Connecting Line (except for the first item) */}
              {index !== 0 && (
                <div
                  className={cn(
                    "absolute top-5 -left-1/2 w-full h-[2px] -z-10",
                    isCompleted || isActive ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-md scale-110"
                    : isCompleted
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted bg-card text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium tracking-wide",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
