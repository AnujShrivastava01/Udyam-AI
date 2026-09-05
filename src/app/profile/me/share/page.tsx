"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useT, money, num, type MessageKey } from "@/lib/i18n";
import { buildOwnProfile } from "@/lib/profile/build";
import { useMarkVisited } from "@/lib/visit";

/**
 * The one page an SCA officer, a bank or an NGO would actually be handed.
 *
 * This is the officer console's input, written from the borrower's side: the same figures, the
 * same provenance, arranged so it survives being printed and put in a file. Every number is the
 * kernel's; the only free text is the applicant's own answers.
 *
 * Deliberately plain. No gradients, no cards, no chart — it has to be legible after a photocopier
 * and a fax machine have had a turn, which is the actual distribution channel for a document like
 * this in a district office.
 */
export default function SharePage() {
  // Records the visit so the dashboard checklist can tick it.
  useMarkVisited("share");

  const { t } = useT();
  const onboardingInput = useAppStore((s) => s.onboardingInput);
  const visitedSteps = useAppStore((s) => s.visitedSteps);
  const profile = buildOwnProfile(onboardingInput, visitedSteps);
  const p = profile.plan;

  if (!profile.complete || !p) {
    return (
      <div className="mx-auto max-w-2xl p-6 md:p-10">
        <p className="text-muted-foreground">{t("own.noPlan")}</p>
        <Link href="/onboarding" className="mt-4 inline-block">
          <Button className="rounded-full">{t("own.start")}</Button>
        </Link>
      </div>
    );
  }

  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-b border-dashed py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-right">{value}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      {/* Both controls are hidden when this is printed. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/profile/me">
          <Button variant="ghost" size="sm" className="rounded-full">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" /> {t("share.back")}
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="rounded-full">
          <Printer className="mr-2 h-4 w-4" aria-hidden="true" /> {t("share.print")}
        </Button>
      </div>

      <article className="rounded-xl border bg-card p-6 md:p-8 print:border-0 print:p-0">
        <header className="border-b pb-4">
          <h1 className="font-heading text-2xl font-bold">{t("share.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("share.subtitle")}</p>
        </header>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("share.applicant")}
          </h2>
          <div className="text-sm">
            {row(
              t("report.village"),
              [profile.village, profile.block, profile.district].filter(Boolean).join(", "),
            )}
            {profile.category &&
              row(t("onb.category"), t(`onb.cat.${profile.category}` as MessageKey))}
            {profile.activity &&
              row(t("report.activity"), t(`activity.${profile.activity.id}.name` as MessageKey))}
            {profile.marginCapital != null &&
              row(t("calc.margin.title"), money(profile.marginCapital))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("share.structure")}
          </h2>
          <div className="text-sm">
            {row(t("cliff.scheme"), p.structure.scheme.name)}
            {row(t("calc.projectCost"), money(p.structure.projectCost))}
            {row(t("calc.sanctionedLoan"), money(p.structure.sanctionedLoan))}
            {row(t("calc.yourShare"), `${(p.structure.effectiveMarginPct * 100).toFixed(2)}%`)}
            {row(t("calc.moratorium"), `${p.structure.moratoriumMonths} ${t("clock.months")}`)}
            {row(t("calc.quarterly"), money(p.schedule.instalment))}
            {row(t("calc.instalments"), num(p.schedule.instalmentCount))}
            {row(t("calc.totalInterest"), money(p.schedule.totalInterest))}
            {row(t("calc.totalOutflow"), money(p.schedule.totalOutflow))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("share.verdict")}
          </h2>
          <p className="text-sm font-semibold">
            {t(`solvency.${p.solvency.verdict}.label` as MessageKey)}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            {t(p.solvency.headlineMsg.key, p.solvency.headlineMsg.params)}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t(p.solvency.detailMsg.key, p.solvency.detailMsg.params)}
          </p>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("share.basis")}
          </h2>
          <ol className="space-y-1 text-xs text-muted-foreground">
            {p.structure.trace.map((step, i) => (
              <li key={i}>
                {i + 1}. {step.rule} → {step.outcome}
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-6 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("share.footer", {
            scheme: p.structure.scheme.name,
            source: p.structure.scheme.provenance.source,
          })}
        </footer>
      </article>
    </div>
  );
}
