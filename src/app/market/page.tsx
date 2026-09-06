"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NearbyBusinesses } from "@/components/nearby-businesses";
import { buildOwnProfile } from "@/lib/profile/build";
import { VILLAGES } from "@/lib/market/villages";
import { useAppStore } from "@/lib/store";
import { useMarkVisited } from "@/lib/visit";
import { useT } from "@/lib/i18n";

/**
 * Who else is trading nearby.
 *
 * The feasibility engine says outright that it cannot count competitors — its saturation index
 * falls back to total establishment density against a national rural average, which it calls "a
 * weaker claim than counting the competitors". This screen is the stronger claim, for the trades
 * and places where Google has anything mapped.
 *
 * It is a separate screen rather than a figure spliced into the report on purpose. The report's
 * numbers all come from published tables a reader can go and check; a live third-party lookup with
 * patchy rural coverage is a different KIND of evidence, and mixing the two would let the weaker
 * one inherit the credibility of the stronger.
 */
export default function MarketPage() {
  useMarkVisited("market");
  const { t } = useT();

  const onboardingInput = useAppStore((s) => s.onboardingInput);
  const visitedSteps = useAppStore((s) => s.visitedSteps);
  const profile = buildOwnProfile(onboardingInput, visitedSteps);

  // `villageInDistrict` returns ONE village — it exists for screens that need a starting row. This
  // one offers every village we hold in the district, so the filter is done here.
  const district = onboardingInput.location?.district ?? null;
  const inDistrict = district
    ? VILLAGES.filter((v) => v.district.toLowerCase() === district.toLowerCase())
    : [];
  const candidates = inDistrict.length > 0 ? inDistrict : VILLAGES;

  // Their own village if the gazetteer has it, otherwise the first in their district.
  const named = onboardingInput.location?.village?.trim().toLowerCase();
  const [village, setVillage] = useState(
    () => candidates.find((v) => v.name.toLowerCase() === named) ?? candidates[0],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 md:p-8">
      <header>
        <Badge variant="outline" className="mb-2 border-primary/30 bg-primary/5 text-primary">
          <Store className="mr-1 h-3 w-3" aria-hidden="true" /> {t("market.badge")}
        </Badge>
        <h1 className="font-heading text-3xl font-bold md:text-4xl">{t("market.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("market.subtitle")}</p>
      </header>

      {/* Which point to search from. The gazetteer's coordinates are the villages' own, so this is
          a real location even before anybody grants GPS. */}
      {candidates.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {t("market.searchAround")}
          </span>
          {candidates.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVillage(v)}
              aria-pressed={village.id === v.id}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                village.id === v.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      <NearbyBusinesses
        lat={village.lat}
        lng={village.lng}
        placeLabel={village.name}
        activityClass={profile.activity?.activityClass}
      />

      <Card className="bg-muted/20">
        <CardContent className="space-y-3 p-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">{t("market.howToRead")}</strong>{" "}
            {t("market.howBody1")}
          </p>
          <p>{t("market.howBody2")}</p>
          <Link href={profile.activity ? `/report/${profile.activity.id}` : "/discover"}>
            <Button variant="outline" size="sm" className="rounded-full">
              {t("market.published")} <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
