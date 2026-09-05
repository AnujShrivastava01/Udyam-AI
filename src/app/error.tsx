"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * Without this, any throw during render drops the user onto Next's unbranded exception screen —
 * which, for someone deciding whether to borrow against their only savings, reads as the product
 * having lost their information. A named, calm recovery is the minimum.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[udyam] render error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-600" aria-hidden="true" />
      <h1 className="font-heading text-2xl font-bold">Something went wrong on this screen</h1>
      <p className="text-muted-foreground">
        Nothing you entered has been sent anywhere, and no application has been made. Try again — if
        it keeps happening, the figures on the other screens are unaffected.
      </p>
      <Button onClick={reset} className="rounded-full">
        <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" /> Try again
      </Button>
    </div>
  );
}
