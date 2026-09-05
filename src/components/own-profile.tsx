"use client";

import Link from "next/link";
import { ArrowRight, IndianRupee, MapPin, Store, Target } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceChip } from "@/components/source-chip";
import { useT, money, type MessageKey } from "@/lib/i18n";
import type { OwnProfile } from "@/lib/profile/build";

/**
 * The signed-in-less profile.
 *
 * Everything here is the visitor's own answer or the kernel's own arithmetic, which is why it
 * carries no sample-data caveat: there is nothing on it that was invented. Where an answer is
 * missing the field is absent rather than filled with a plausible default — the previous version
 * of this page defaulted the category to "Dairy & Livestock" and the district to "Bundelkhand,
 * UP" for anyone who had not onboarded, which told first-time visitors facts about themselves.
 */
export function OwnProfileView({ profile }: { profile: OwnProfile }) {
  const { t } = useT();

  if (!profile.complete) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-14 text-center space-y-4">
          <Store className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-medium">{t("own.emptyTitle")}</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
            {t("own.emptyBody")}
          </p>
          <Link href="/onboarding" className="inline-block pt-2">
            <Button size="lg" className="rounded-full px-8">
              {t("own.start")} <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const p = profile.plan;

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-2xl font-heading">{t("own.title")}</CardTitle>
              <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  {[profile.village, profile.block, profile.district].filter(Boolean).join(" · ")}
                </span>
              </CardDescription>
            </div>
            {profile.category && (
              <Badge variant="secondary" className="bg-primary/15 text-primary border-none">
                {t(`onb.cat.${profile.category}` as MessageKey)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat
              icon={<IndianRupee className="w-3.5 h-3.5" aria-hidden="true" />}
              label={t("calc.margin.title")}
              value={profile.marginCapital != null ? money(profile.marginCapital) : "—"}
            />
            <Stat
              icon={<Target className="w-3.5 h-3.5" aria-hidden="true" />}
              label={t("report.activity")}
              value={
                profile.activity
                  ? t(`activity.${profile.activity.id}.name` as MessageKey)
                  : t("own.noActivity")
              }
            />
            <Stat
              icon={<Store className="w-3.5 h-3.5" aria-hidden="true" />}
              label={t("own.stepsOpened")}
              value={`${profile.visited.length} / 6`}
            />
          </dl>

          {p ? (
            <>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {t("own.planTitle")}
                </p>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label={t("calc.projectCost")} value={money(p.structure.projectCost)} />
                  <Stat label={t("calc.sanctionedLoan")} value={money(p.structure.sanctionedLoan)} />
                  <Stat label={t("calc.quarterly")} value={money(p.schedule.instalment)} />
                  <Stat
                    label={t("ai.facts.verdict")}
                    value={t(`solvency.${p.solvency.verdict}.label` as MessageKey)}
                  />
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <SourceChip
                    label={`${p.structure.scheme.name} · ${p.structure.scheme.annualRatePct}%`}
                    provenance={p.structure.scheme.provenance}
                  />
                  {profile.activity && (
                    <SourceChip
                      label={t("clock.gestationChip", {
                        months: profile.activity.gestationMonths,
                        activity: t(`activity.${profile.activity.id}.name` as MessageKey),
                      })}
                      provenance={profile.activity.provenance}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/calculator">
                  <Button variant="outline" className="rounded-full">
                    {t("own.openPlan")}
                  </Button>
                </Link>
                <Link href={`/profile/me/share`}>
                  <Button className="rounded-full">
                    {t("own.share")} <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              {t("own.noPlan")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
        {icon}
        {label}
      </dt>
      <dd className="font-bold leading-tight tabular-nums">{value}</dd>
    </div>
  );
}
