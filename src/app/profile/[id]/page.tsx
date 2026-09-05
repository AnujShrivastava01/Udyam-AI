"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  MessageSquare,
  RotateCcw,
  Share2,
  ShoppingBag,
  UserSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { OwnProfileView } from "@/components/own-profile";
import { buildOwnProfile } from "@/lib/profile/build";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

/**
 * `/profile/me` is the visitor's own, built entirely from their answers and the kernel.
 *
 * ── What used to be here, and why it is gone ──────────────────────────────────────────────────
 * Any other id rendered a persona called "Rajesh's Enterprise" carrying: an "AI Feasibility Score
 * 82/100" that no model produced, a "KYC Done" verification badge, an EMI status of "Up to date",
 * a scheme line reading "Term Loan (SBI)", two products at invented prices, a founding story dated
 * 2023, and a milestone stating "Received ₹4.5 Lakhs from SBI under Govt Scheme".
 *
 * The SBI lines are the serious ones. Naming a real bank as the lender on a disbursement that
 * never happened is a false statement about that bank, and it sat in static JSX where the numeric
 * firewall and the claim guard — which strip exactly this class of assertion out of generated text
 * — never saw it. A "Sample profile" chip does not fix that; proximity beats disclosure, and the
 * page was reachable from the journey stepper's final step.
 *
 * There are no other users, so there are no other profiles. The page says so and offers the two
 * real destinations instead: the visitor's own record, and the directory of institutions that
 * actually exist.
 */
export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const { t } = useT();
  const onboardingInput = useAppStore((s) => s.onboardingInput);
  const visitedSteps = useAppStore((s) => s.visitedSteps);

  if (params?.id !== "me") {
    return (
      <div className="mx-auto max-w-3xl p-4 pb-24 md:p-8">
        <EmptyState
          icon={UserSearch}
          title={t("prof.noProfileTitle")}
          body={t("prof.noProfileBody")}
          href="/profile/me"
          cta={t("prof.ownProfile")}
          secondary={{ href: "/mentors", label: t("prof.directory") }}
        />
      </div>
    );
  }

  return <OwnProfilePage onboardingInput={onboardingInput} visitedSteps={visitedSteps} />;
}

function OwnProfilePage({
  onboardingInput,
  visitedSteps,
}: {
  onboardingInput: ReturnType<typeof useAppStore.getState>["onboardingInput"];
  visitedSteps: string[];
}) {
  const { t } = useT();
  const posts = useAppStore((s) => s.communityPosts);
  const requirements = useAppStore((s) => s.requirements);
  const profile = buildOwnProfile(onboardingInput, visitedSteps);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-8">
      <OwnProfileView profile={profile} />

      {profile.complete && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/profile/me/share">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <Share2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">{t("prof.shareCard")}</p>
                    <p className="text-xs text-muted-foreground">{t("prof.shareCardBody")}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/community">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <MessageSquare className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold tabular-nums">
                      {t("prof.notes", { n: posts.length })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/marketplace">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <ShoppingBag className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold tabular-nums">
                      {t("prof.reqs", { n: requirements.length })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />{" "}
                {t("prof.whereTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>{t("prof.whereBody1")}</p>
              <p>{t("prof.whereBody2")}</p>
            </CardContent>
          </Card>
        </>
      )}

      <SessionControls />
    </div>
  );
}

/**
 * Clearing the session.
 *
 * A real control, because the alternative is telling somebody to find their browser's site-data
 * settings. It is two-step rather than instant: this wipes answers, notes and requirements, and a
 * single mis-tap on a phone should not.
 *
 * BOTH halves are cleared, and the order matters. Wiping localStorage alone leaves the in-memory
 * zustand store holding every answer, so a client-side navigation lands on a dashboard still full
 * of the data the user just asked to delete — and the next write persists it all straight back.
 */
function SessionControls() {
  const { t } = useT();
  const router = useRouter();
  const [armed, setArmed] = useState(false);

  function reset() {
    // Persisted copy first: if this throws (private mode, site data blocked) the in-memory reset
    // below still happens, which is the half the user can see.
    try {
      void useAppStore.persist.clearStorage();
    } catch {
      // Nothing to do about it, and nothing worth interrupting the user for.
    }

    useAppStore.setState({
      onboardingInput: { location: null, marginCapital: null, businessCategory: "" },
      visitedSteps: [],
      communityPosts: [],
      requirements: [],
    });

    router.push("/onboarding");
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium">{t("prof.resetTitle")}</p>
          <p className="text-xs leading-snug text-muted-foreground">{t("prof.resetBody")}</p>
        </div>
        {armed ? (
          <div className="flex shrink-0 gap-2">
            <Button variant="destructive" size="sm" className="rounded-full" onClick={reset}>
              {t("prof.resetConfirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setArmed(false)}
            >
              {t("prof.cancel")}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => setArmed(true)}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" /> {t("prof.resetTitle")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
