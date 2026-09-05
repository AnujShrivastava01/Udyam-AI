"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, HelpCircle, Landmark, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SourceChip } from "@/components/source-chip";
import { useAppStore } from "@/lib/store";
import { useT, type MessageKey } from "@/lib/i18n";
import { CATALOGUE_NOTE, type ApplicantProfile, type SocialCategory } from "@/lib/schemes/catalogue";
import { matchSchemes, summarise, type MatchVerdict, type SchemeMatch } from "@/lib/schemes/eligibility";
import { cn } from "@/lib/utils";
import { useMarkVisited } from "@/lib/visit";

const CATEGORIES: { id: SocialCategory; key: MessageKey }[] = [
  { id: "sc", key: "elig.cat.sc" },
  { id: "st", key: "elig.cat.st" },
  { id: "obc", key: "elig.cat.obc" },
  { id: "minority", key: "elig.cat.minority" },
  { id: "pwd", key: "elig.cat.pwd" },
  { id: "safai-karamchari", key: "elig.cat.safai" },
  { id: "general", key: "elig.cat.general" },
];

const VERDICT_STYLE: Record<MatchVerdict, { tone: string; icon: typeof CheckCircle2 }> = {
  meets: { tone: "border-emerald-500/40 bg-emerald-500/5", icon: CheckCircle2 },
  "needs-info": { tone: "border-border", icon: HelpCircle },
  "does-not-meet": { tone: "border-border opacity-70", icon: XCircle },
};

/**
 * Which schemes this applicant matches, and why.
 *
 * A rules table over a catalogue, not a model. The wording is deliberate throughout: the page
 * never says "you are eligible", because a table is not entitled to that claim — the administering
 * agency decides on a filed application. It says the applicant meets the published criteria we
 * hold, and shows which criterion produced every answer.
 *
 * The three questions asked here are the ones that unlock the most schemes. Everything else is
 * read from what the user already told onboarding.
 */
export default function SchemesPage() {
  // Records the visit so the dashboard checklist can tick it.
  useMarkVisited("schemes");

  const { t } = useT();
  const onboardingInput = useAppStore((s) => s.onboardingInput);

  const [categories, setCategories] = useState<SocialCategory[]>([]);
  const [gender, setGender] = useState<ApplicantProfile["gender"]>();
  const [income, setIncome] = useState<number | null>(null);
  const [streetVendor, setStreetVendor] = useState<boolean | null>(null);
  const [shgMember, setShgMember] = useState<boolean | null>(null);

  const activityClass = useMemo(() => {
    const map: Record<string, string> = {
      dairy: "dairy",
      retail: "retail",
      textiles: "manufacturing",
      food: "manufacturing",
      services: "manufacturing",
    };
    const fromCategory = onboardingInput.businessCategory
      ? map[onboardingInput.businessCategory]
      : undefined;
    return fromCategory;
  }, [onboardingInput.businessCategory]);

  // Memoised together: the profile object is rebuilt every render, so listing its FIELDS as the
  // dependencies (rather than the object) is what stops matchSchemes running on every keystroke
  // elsewhere on the page. Building it inside the memo keeps the dependency list honest.
  const matches = useMemo(() => {
    const applicant: ApplicantProfile = {
      socialCategory: categories.length ? categories : undefined,
      gender,
      annualFamilyIncome: income ?? undefined,
      isStreetVendor: streetVendor ?? undefined,
      isSHGMember: shgMember ?? undefined,
      activityClass,
      enterpriseStage: "new",
    };
    return matchSchemes(applicant);
  }, [categories, gender, income, streetVendor, shgMember, activityClass]);
  const summary = summarise(matches);

  const toggle = (c: SocialCategory) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading flex items-center gap-3">
          <Landmark className="w-8 h-8 text-primary" aria-hidden="true" /> {t("elig.title")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl">{t("elig.subtitle")}</p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("elig.aboutYou")}</CardTitle>
          <CardDescription>{t("elig.aboutYouHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label id="cat-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("elig.category")}
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-labelledby="cat-label">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={categories.includes(c.id)}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    categories.includes(c.id)
                      ? "border-primary bg-primary/10 font-medium"
                      : "hover:bg-muted/50",
                  )}
                >
                  {t(c.key)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="income" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("elig.income")}
              </Label>
              <Input
                id="income"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="120000"
                value={income ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setIncome(raw === "" ? null : Math.max(0, Number(raw) || 0));
                }}
                className="mt-1.5 h-10"
              />
            </div>

            <div>
              <Label id="gender-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("elig.gender")}
              </Label>
              <div className="mt-1.5 flex gap-1.5" role="group" aria-labelledby="gender-label">
                {(["female", "male", "other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={gender === g}
                    onClick={() => setGender(gender === g ? undefined : g)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      gender === g ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50",
                    )}
                  >
                    {t(`elig.gender.${g}` as MessageKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <YesNo
              label={t("elig.streetVendor")}
              value={streetVendor}
              onChange={setStreetVendor}
              yes={t("elig.yes")}
              no={t("elig.no")}
            />
            <YesNo
              label={t("elig.shg")}
              value={shgMember}
              onChange={setShgMember}
              yes={t("elig.yes")}
              no={t("elig.no")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          {t("elig.countMeets", { n: summary.meets })}
        </Badge>
        <Badge variant="outline">{t("elig.countNeedsInfo", { n: summary.needsInfo })}</Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {t("elig.countRuledOut", { n: summary.doesNotMeet })}
        </Badge>
      </div>

      <div className="space-y-3">
        {matches.map((m) => (
          <SchemeCard key={m.scheme.id} match={m} />
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{CATALOGUE_NOTE}</p>
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
  yes,
  no,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  yes: string;
  no: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex gap-1.5" role="group" aria-label={label}>
        {[
          { v: true, l: yes },
          { v: false, l: no },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(value === o.v ? null : o.v)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              value === o.v ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function SchemeCard({ match }: { match: SchemeMatch }) {
  const { t } = useT();
  const { scheme, verdict, failed, missing } = match;
  const style = VERDICT_STYLE[verdict];
  const Icon = style.icon;

  return (
    <Card className={cn("border-2", style.tone)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-start gap-2">
              <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="min-w-0">{scheme.name}</span>
            </CardTitle>
            <CardDescription className="mt-1">{scheme.administrator}</CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {t(`elig.verdict.${verdict}` as MessageKey)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{scheme.funds}</p>
        {scheme.amountNote && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("elig.amount")}</span> {scheme.amountNote}
          </p>
        )}
        {scheme.benefitNote && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("elig.benefit")}</span>{" "}
            {scheme.benefitNote}
          </p>
        )}

        {failed.length > 0 && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="text-xs font-semibold text-muted-foreground">{t("elig.ruledOutBy")}</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {failed.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        )}
        {failed.length === 0 && missing.length > 0 && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="text-xs font-semibold text-muted-foreground">{t("elig.stillNeeded")}</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {missing.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <SourceChip label={scheme.provenance.source} provenance={scheme.provenance} />
          <a
            href={scheme.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("elig.openScheme")}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
