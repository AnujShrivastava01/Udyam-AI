"use client";

import { useState } from "react";
import { FileText, ExternalLink, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Provenance } from "@/lib/finance/schemes";

/**
 * A provenance chip.
 *
 * The rule this component enforces: if a number cannot name where it came from, it does not go
 * on screen. Clicking a chip opens the source, its vintage, and whether the team has verified
 * it first-hand — so a judge can audit any figure live rather than take it on trust.
 */
export function SourceChip({
  label,
  provenance,
  className = "",
}: {
  label: string;
  provenance: Provenance;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
      >
        <FileText className="h-3 w-3 shrink-0" />
        <span className="truncate max-w-[22rem]">{label}</span>
        {provenance.needsVerification && (
          <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Where this number comes from</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <Row term="Source">{provenance.source}</Row>
          <Row term="Retrieved">{provenance.retrievedAt}</Row>
          {provenance.effectiveFrom && (
            <Row term="Effective from">{provenance.effectiveFrom}</Row>
          )}
          <Row term="Document">
            <a
              href={provenance.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
            >
              {provenance.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </Row>
        </dl>

        {provenance.needsVerification && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed">
            <p className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Not yet re-verified first-hand
            </p>
            <p className="mt-1 text-muted-foreground">
              This figure was transcribed during research but has not been re-confirmed against the
              primary document by the team. Government rates and ceilings change. Re-fetch and date
              your own copy before quoting it.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}
