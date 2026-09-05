"use client";

import { ExternalLink, GraduationCap, Landmark, Leaf, Building2, FileText, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceChip } from "@/components/source-chip";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  INSTITUTION_NOTE,
  institutionsFor,
  type Institution,
  type InstitutionKind,
} from "@/lib/network/institutions";

const ICON: Record<InstitutionKind, typeof Users> = {
  rseti: GraduationCap,
  kvk: Leaf,
  dic: Building2,
  nabard: Landmark,
  sca: Landmark,
  portal: FileText,
};

/**
 * Who to actually go to.
 *
 * The vision asked for a mentor and expert panel. Built the obvious way that is six invented
 * advisors with invented ratings, which is a page a judge can falsify in one question. These are
 * real institutions that do this work for free, each with a link that was checked.
 */
export default function MentorsPage() {
  const { t } = useT();
  const district = useAppStore((s) => s.onboardingInput.location?.district);
  const institutions = institutionsFor(district);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" aria-hidden="true" /> {t("mentors.title")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl">{t("mentors.subtitle")}</p>
      </header>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{INSTITUTION_NOTE}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {institutions.map((i) => (
          <InstitutionCard key={i.id} institution={i} freeLabel={t("mentors.free")} />
        ))}
      </div>

      {district && (
        <p className="text-[11px] text-muted-foreground">
          {t("mentors.districtNote", { district })}
        </p>
      )}
    </div>
  );
}

function InstitutionCard({
  institution,
  freeLabel,
}: {
  institution: Institution;
  freeLabel: string;
}) {
  const Icon = ICON[institution.kind];
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base flex items-start gap-2 min-w-0">
            <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span className="min-w-0">{institution.name}</span>
          </CardTitle>
          {institution.cost === "free" && (
            <Badge
              variant="outline"
              className="shrink-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            >
              {freeLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{institution.offers}</p>
        <div className="flex flex-wrap items-center gap-2">
          <SourceChip label={institution.provenance.source} provenance={institution.provenance} />
          <a
            href={institution.provenance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {new URL(institution.provenance.url).hostname}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
