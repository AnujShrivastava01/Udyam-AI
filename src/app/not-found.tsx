"use client";

import Link from "next/link";
import { Compass, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The 404.
 *
 * Next's default is an unstyled black-on-white page with no way back — which, on a product whose
 * bottom navigation is the only way most users move around, is a dead end. This one is inside the
 * app shell and offers the two routes that always exist.
 *
 * Deliberately not translated through the message dictionary: this page renders when a route could
 * not be resolved, and reaching into the client store for a language preference is exactly the
 * kind of extra dependency that turns a 404 into a 500. Both languages are shown instead, which is
 * shorter than either alone would be honest about.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl items-center justify-center p-4 py-20 md:p-8">
      <Card className="w-full border-2 border-dashed">
        <CardContent className="space-y-5 py-14 text-center">
          <p className="font-heading text-5xl font-bold text-muted-foreground/40">404</p>
          <div className="space-y-1">
            <p className="text-lg font-medium">This page does not exist</p>
            <p lang="hi" className="text-lg font-medium text-muted-foreground">
              यह पन्ना मौजूद नहीं है
            </p>
          </div>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            The link may be old, or the address mistyped. Everything this app can do is reachable
            from your dashboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Link href="/dashboard">
              <Button size="lg" className="rounded-full px-8">
                <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" /> Dashboard
              </Button>
            </Link>
            <Link href="/discover">
              <Button size="lg" variant="ghost" className="rounded-full">
                <Compass className="mr-2 h-4 w-4" aria-hidden="true" /> Discover a trade
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
