"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Compass,
  FileText,
  HandCoins,
  IndianRupee,
  Landmark,
  MapPin,
  MessageSquare,
  ScrollText,
  Share2,
  ShoppingBag,
  Sprout,
  Store,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { buildOverview } from "@/lib/dashboard/overview";
import { useT, type MessageKey } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

/**
 * The post-onboarding home.
 *
 * Everything here is the visitor's own answer, the kernel's own arithmetic, or a count of things
 * they made — which is why the screen carries no sample-data caveat. There is nothing on it that
 * is not theirs.
 *
 * The one card that could easily have lied is the instalment projection. Nobody in this product
 * has a loan: there is no application, no disbursement and no repayment state anywhere. So it does
 * not say "your next payment"; it says what the first instalment would be if the loan were
 * disbursed today, and prints the hypothetical date so the reader cannot mistake it for a real
 * obligation.
 */

/** Month names, per locale, so the projected date is not an en-US string inside a Hindi sentence. */
const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hinglish: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: [
    "जनवरी",
    "फ़रवरी",
    "मार्च",
    "अप्रैल",
    "मई",
    "जून",
    "जुलाई",
    "अगस्त",
    "सितंबर",
    "अक्टूबर",
    "नवंबर",
    "दिसंबर",
  ],
};

export default function DashboardPage() {
  const { t, locale, money } = useT();
  const onboarding = useAppStore((s) => s.onboardingInput);
  const visitedSteps = useAppStore((s) => s.visitedSteps);
  const posts = useAppStore((s) => s.communityPosts);
  const requirements = useAppStore((s) => s.requirements);

  // Pinned at mount rather than read per render: every date on this page must agree with every
  // other, and the projection must not shift while somebody is reading it.
  const [today] = useState(() => new Date());

  const overview = useMemo(
    () => buildOverview({ onboarding, visitedSteps, posts, requirements, today }),
    [onboarding, visitedSteps, posts, requirements, today],
  );

  const {
    profile,
    plan,
    activity,
    readiness,
    readinessDone,
    readinessTotal,
    schemes,
    firstInstalment,
    nextStep,
  } = overview;

  const shortDate = (d: Date) =>
    `${d.getDate()} ${(MONTHS[locale] ?? MONTHS.en)[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-8">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <Badge variant="outline" className="mb-2 border-primary/30 bg-primary/5 text-primary">
            <Sprout className="mr-1 h-3 w-3" aria-hidden="true" /> {t("dash.badge")}
          </Badge>
          <h1 className="font-heading text-3xl font-bold md:text-4xl">{t("dash.title")}</h1>
          {overview.ready ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {[profile.village, profile.block, profile.district].filter(Boolean).join(" · ")}
              </span>
              {activity && (
                <span className="inline-flex items-center gap-1.5">
                  <Store className="h-4 w-4" aria-hidden="true" />
                  {activity.name}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("dash.introIncomplete")}</p>
          )}
        </div>
        {overview.ready && (
          <Link href="/profile/me/share" className="shrink-0">
            <Button variant="outline" className="rounded-full">
              <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> {t("dash.share")}
            </Button>
          </Link>
        )}
      </header>

      {!overview.ready ? (
        <EmptyState
          icon={Compass}
          title={t("dash.emptyTitle")}
          body={t("dash.emptyBody")}
          href="/onboarding"
          cta={t("dash.emptyCta")}
          secondary={{ href: "/discover", label: t("dash.emptySecondary") }}
        />
      ) : (
        <>
          {/* the single most useful next thing */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {t("dash.next")}
                </p>
                <p className="mt-0.5 font-heading text-lg font-bold">{t(nextStep.labelKey)}</p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t(nextStep.detailKey)}
                </p>
              </div>
              <Link href={nextStep.href} className="shrink-0">
                <Button className="rounded-full px-6">
                  {t(nextStep.ctaKey)}{" "}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* the money, if the kernel could compute it */}
          {plan ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label={t("dash.projectCost")}
                value={money(plan.structure.projectCost)}
                sub={activity ? activity.unit : t("dash.costedFrom")}
              />
              <StatTile
                label={t("dash.loan")}
                value={money(plan.structure.sanctionedLoan)}
                sub={plan.structure.scheme.name}
                tone="primary"
              />
              <StatTile
                label={t("dash.perQuarter")}
                value={money(plan.schedule.instalment)}
                sub={t("dash.rateOverYears", {
                  rate: plan.structure.scheme.annualRatePct,
                  years: plan.structure.scheme.tenureMonths / 12,
                })}
              />
              <StatTile
                label={t("dash.yourMoney")}
                value={money(profile.marginCapital ?? 0)}
                sub={t("dash.marginRequired", { amount: money(plan.structure.requiredMargin) })}
                tone={
                  (profile.marginCapital ?? 0) >= plan.structure.requiredMargin
                    ? "emerald"
                    : "rose"
                }
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                {t("dash.noPlanBody")}{" "}
                <Link href="/calculator" className="font-medium text-primary underline">
                  {t("dash.noPlanLink")}
                </Link>{" "}
                {t("dash.noPlanTail")}
              </CardContent>
            </Card>
          )}

          {/* the Solvency Clock, which is the whole point of this product */}
          {firstInstalment && (
            <Card
              className={
                firstInstalment.gapMonths && firstInstalment.gapMonths > 0
                  ? "border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent"
                  : "border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {firstInstalment.gapMonths && firstInstalment.gapMonths > 0 ? (
                    <>
                      <AlertTriangle
                        className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
                        aria-hidden="true"
                      />
                      {t("dash.gapTitle", { n: firstInstalment.gapMonths })}
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                      {t("dash.noGapTitle")}
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <p>
                  {t("dash.instalmentFalls", {
                    amount: money(firstInstalment.amount),
                    month: firstInstalment.month,
                  })}
                  {/* Zero gestation is a real and common answer — NABARD records NIL for a cow
                      already in milk — but "needs 0 months before it earns" reads like a missing
                      value. It is the good case, so it gets its own sentence. */}
                  {firstInstalment.gestationMonths === 0
                    ? t("dash.earnsFromStart")
                    : firstInstalment.gestationMonths != null
                      ? t("dash.needsMonths", { n: firstInstalment.gestationMonths })
                      : "."}
                </p>
                {/* Explicitly hypothetical. Nobody here has a loan, and a date that looks like a
                    due date will be read as one. */}
                <p className="flex items-start gap-2 text-muted-foreground">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t("dash.projection", { date: shortDate(firstInstalment.wouldFallOn) })}
                  </span>
                </p>
                <Link href="/calculator">
                  <Button variant="outline" size="sm" className="rounded-full">
                    {t("dash.seeSchedule")}{" "}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* readiness — a checklist, never a score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-baseline justify-between gap-2 text-base">
                  <span>{t("dash.readyTitle")}</span>
                  {/* "4 of 7", not "57%". A percentage invites a reader to treat it as a rating;
                      a count says exactly what it counts. */}
                  <span className="text-sm font-normal tabular-nums text-muted-foreground">
                    {t("dash.readyCount", { done: readinessDone, total: readinessTotal })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {readiness.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        item.done
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "border-muted-foreground/30"
                      }`}
                      aria-hidden="true"
                    >
                      {item.done && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-medium ${item.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : ""}`}
                      >
                        {t(item.labelKey)}
                      </span>
                      {!item.done && (
                        <span className="block text-xs leading-snug text-muted-foreground">
                          {t(item.hintKey)}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* schemes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScrollText className="h-4 w-4 shrink-0" aria-hidden="true" />{" "}
                  {t("dash.schemesTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schemes ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Count label={t("dash.youMeet")} value={schemes.meets} tone="emerald" />
                      <Count label={t("dash.needAnswers")} value={schemes.needsInfo} tone="amber" />
                      <Count label={t("dash.ruledOut")} value={schemes.doesNotMeet} tone="muted" />
                    </div>
                    {schemes.openQuestions.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("dash.openQuestions")}
                        </p>
                        <ul className="space-y-1 text-sm">
                          {schemes.openQuestions.slice(0, 3).map((q) => (
                            <li key={q} className="flex gap-2 text-muted-foreground">
                              <span aria-hidden="true">·</span>
                              <span className="leading-snug">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Link href="/schemes">
                      <Button variant="outline" size="sm" className="w-full rounded-full">
                        {t("dash.checkSchemes")}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("dash.pickTrade")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* what the user has made */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ActivityCard
              icon={MessageSquare}
              label={t("dash.yourNotes")}
              value={
                overview.posts > 0
                  ? t("dash.noteCount", { n: overview.posts })
                  : t("dash.nothingWritten")
              }
              muted={overview.posts === 0}
              href="/community"
              cta={t("dash.openCommunity")}
            />
            <ActivityCard
              icon={ShoppingBag}
              label={t("dash.yourRequirements")}
              value={
                overview.requirements > 0
                  ? t("dash.reqCount", { n: overview.requirements })
                  : t("dash.nothingComposed")
              }
              muted={overview.requirements === 0}
              href="/marketplace"
              cta={t("dash.openMarketplace")}
            />
          </div>
        </>
      )}

      {/* everywhere else — always available, so no surface is unreachable */}
      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("dash.everythingElse")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink icon={Compass} titleKey="link.discover" bodyKey="link.discover.body" href="/discover" />
          <QuickLink
            icon={BarChart2}
            titleKey="link.report"
            bodyKey="link.report.body"
            href={activity ? `/report/${activity.id}` : "/discover"}
          />
          <QuickLink
            icon={IndianRupee}
            titleKey="link.calculator"
            bodyKey="link.calculator.body"
            href="/calculator"
          />
          <QuickLink icon={FileText} titleKey="link.emi" bodyKey="link.emi.body" href="/dashboard/emi" />
          <QuickLink
            icon={Building2}
            titleKey="link.mentors"
            bodyKey="link.mentors.body"
            href="/mentors"
          />
          <QuickLink icon={Users} titleKey="link.profile" bodyKey="link.profile.body" href="/profile/me" />
          <QuickLink
            icon={Landmark}
            titleKey="link.officer"
            bodyKey="link.officer.body"
            href="/dashboard/ngo"
          />
          <QuickLink
            icon={HandCoins}
            titleKey="link.investor"
            bodyKey="link.investor.body"
            href="/dashboard/investor"
          />
          <QuickLink
            icon={ScrollText}
            titleKey="link.schemes"
            bodyKey="link.schemes.body"
            href="/schemes"
          />
        </div>
      </section>
    </div>
  );
}

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "muted";
}) {
  const colour = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    muted: "text-muted-foreground",
  }[tone];

  return (
    <div className="rounded-lg border p-2">
      <p className={`font-heading text-2xl font-bold tabular-nums ${colour}`}>{value}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function ActivityCard({
  icon: Icon,
  label,
  value,
  muted,
  href,
  cta,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
  muted: boolean;
  href: string;
  cta: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p
              className={`text-sm font-medium tabular-nums ${muted ? "text-muted-foreground" : ""}`}
            >
              {value}
            </p>
          </div>
        </div>
        <Link href={href} className="shrink-0">
          <Button variant="ghost" size="sm" className="rounded-full">
            {cta}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  icon: Icon,
  titleKey,
  bodyKey,
  href,
}: {
  icon: typeof Compass;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  href: string;
}) {
  const { t } = useT();
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-semibold">
            {t(titleKey)}
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
              aria-hidden="true"
            />
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t(bodyKey)}</p>
        </div>
      </div>
    </Link>
  );
}
