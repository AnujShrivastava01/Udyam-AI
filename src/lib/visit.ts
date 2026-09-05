"use client";

import { useEffect } from "react";

import { useAppStore } from "@/lib/store";

/**
 * Record that the user opened this screen.
 *
 * The journey stepper already does this for the six steps it draws, keyed off the route. Screens
 * outside that strip — scheme eligibility, the shareable summary — have no way to say they were
 * visited, so the dashboard's readiness checklist could never tick them however many times they
 * were opened.
 *
 * Calling a store action from an effect is not the `set-state-in-effect` anti-pattern: this is a
 * write to an external store, which is exactly what effects are for, and it is idempotent —
 * `markStepVisited` returns the same state object when the id is already present, so it cannot
 * loop.
 */
export function useMarkVisited(id: string): void {
  const markStepVisited = useAppStore((s) => s.markStepVisited);
  useEffect(() => {
    markStepVisited(id);
  }, [id, markStepVisited]);
}
