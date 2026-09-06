import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The screen a user sees before they have done anything.
 *
 * Worth a shared component because it is the single easiest place to lie. The tempting version of
 * an empty dashboard is a filled-in one — a sample borrower, a demo loan, a chart of somebody
 * else's numbers — and every screen in this product that did that had to be unpicked later.
 *
 * An empty state says what is missing and offers the one action that fixes it. Nothing else.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  href,
  cta,
  secondary,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
  cta?: string;
  secondary?: { href: string; label: string };
  /** An extra control beside the primary action — the demo loader, in practice. */
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="py-14 text-center space-y-4">
        <Icon className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-lg font-medium">{title}</p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
        {(href || secondary || children) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {href && cta && (
              <Link href={href}>
                <Button size="lg" className="rounded-full px-8">
                  {cta}
                </Button>
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href}>
                <Button size="lg" variant="ghost" className="rounded-full">
                  {secondary.label}
                </Button>
              </Link>
            )}
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
