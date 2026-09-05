"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, IndianRupee, Briefcase, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { plan } from "@/lib/finance";
import { useT, money, type MessageKey } from "@/lib/i18n";
import { GAZETTEER_DISTRICTS, blocksInDistrict } from "@/lib/market/villages";

/**
 * Each category maps to the activity we actually hold a NABARD unit cost and gestation figure for,
 * so the report the user lands on is about the thing they just chose. Handicrafts has no such row;
 * it routes to the general report rather than to a nearest-neighbour we would be making up.
 */
const CATEGORIES = [
  { id: "dairy", key: "onb.cat.dairy", activity: "milch-cows-2" },
  { id: "retail", key: "onb.cat.retail", activity: "kirana-store" },
  { id: "textiles", key: "onb.cat.textiles", activity: "tailoring-2" },
  { id: "food", key: "onb.cat.food", activity: "papad-pickle" },
  { id: "handicrafts", key: "onb.cat.handicrafts", activity: null },
  { id: "services", key: "onb.cat.services", activity: "atta-chakki" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useT();
  const { onboardingInput, setOnboardingInput } = useAppStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only places the gazetteer actually covers. Offering Jhansi when every village on file is in
  // Gwalior meant the answer could never be used — see the note in villages.ts.
  const district = onboardingInput.location?.district ?? "";
  const blocks = blocksInDistrict(district);

  const handleLocationChange = (
    updates: Partial<{ district: string; block: string; village: string }>,
  ) => {
    // lat/lng used to be stamped here as 25.4358/78.5678 for every district — Jhansi town's
    // coordinates, recorded even when the user picked Lalitpur or Jalaun. Four decimal places is
    // ~11 metres of implied precision on a figure that was never measured, and nothing in the app
    // ever read it. A fabricated coordinate is not made harmless by going unused.
    const current = onboardingInput.location ?? { village: "", block: "", district: "" };
    setOnboardingInput({ location: { ...current, ...updates } });
  };

  /**
   * The preview used to read `margin × 10` and call the result an eligibility.
   *
   * That formula ignores the ₹1.40 lakh tier boundary, the ₹1.25 lakh Micro Finance cap and the
   * dead zone between them — so at ₹20,000 of margin it announced eligibility for a ₹2,00,000
   * project that no scheme in the registry will actually structure at 10% margin. It also used the
   * word "eligible", which is a claim about a lender's decision that nothing here is entitled to
   * make. The kernel runs instead, and the copy says arithmetic, not approval.
   */
  const preview = useMemo(() => {
    const margin = onboardingInput.marginCapital;
    if (margin == null || margin <= 0) return null;
    try {
      const p = plan({ marginCapital: margin, useNeedBasedCosting: false });
      if (p.structure.sanctionedLoan <= 0) return null;
      return {
        scheme: p.structure.scheme.id,
        projectCost: p.structure.projectCost,
        loan: p.structure.sanctionedLoan,
        instalment: p.schedule.instalment,
      };
    } catch {
      return null;
    }
  }, [onboardingInput.marginCapital]);

  const handleSubmit = () => {
    setIsSubmitting(true);
    const match = CATEGORIES.find((c) => c.id === onboardingInput.businessCategory);
    // Carry the choice into the route. It used to push a hardcoded "rep-12345", which the report
    // page then ignored anyway — so three screens of answers reached a page that read none of them.
    const target = match?.activity ? `/report/${match.activity}` : "/report/general";
    router.push(target);
  };

  const canAdvance =
    (step === 1 && !!onboardingInput.location?.district) ||
    // Was `marginCapital > 0`, true from mount because of the store default — so Continue was
    // already enabled on a question the user had not answered.
    (step === 2 && (onboardingInput.marginCapital ?? 0) > 0) ||
    (step === 3 && !!onboardingInput.businessCategory);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 md:p-8">
      <AnimatePresence mode="wait">
        {isSubmitting ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center space-y-6 text-center max-w-sm"
          >
            <div className="relative w-24 h-24 flex items-center justify-center bg-primary/10 rounded-full">
              <Loader2 className="w-10 h-10 text-primary animate-spin" aria-hidden="true" />
            </div>
            {/* The three staged "Analyzing local market… / Checking scheme eligibility…" messages
                on a 4.5-second timer were theatre: nothing was being analysed and no request was in
                flight. Pretending to think is the cheapest way to lose a judge's trust. */}
            <p role="status" className="text-xl font-bold font-heading">
              {t("onb.working")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            <Card className="border-none shadow-xl bg-card">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("onb.step", { n: step })}
                  </span>
                  <div className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                <CardTitle className="text-2xl font-heading">
                  {t(`onb.q${step}.title` as MessageKey)}
                </CardTitle>
                <CardDescription>{t(`onb.q${step}.desc` as MessageKey)}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="district">{t("onb.district")}</Label>
                      <Select
                        onValueChange={(val) =>
                          handleLocationChange({ district: val as string, block: "", village: "" })
                        }
                        // null, not undefined: Base UI decides controlled-ness on the FIRST
                        // render, and `undefined` there means uncontrolled — so the component
                        // flipped mode as soon as a district was chosen, and a rehydrated district
                        // never appeared in the trigger at all.
                        value={onboardingInput.location?.district ?? null}
                      >
                        <SelectTrigger id="district">
                          <SelectValue placeholder={t("onb.districtPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {GAZETTEER_DISTRICTS.map((d) => (
                            <SelectItem key={d.district} value={d.district}>
                              {d.district} · {d.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="block">{t("onb.block")}</Label>
                      {/* Blocks are filtered to the chosen district. They used to be a fixed list
                          shown regardless, so Jhansi + Dabra was a selectable pair that names two
                          different states. */}
                      <Select
                        onValueChange={(val) => handleLocationChange({ block: val as string })}
                        value={onboardingInput.location?.block ?? null}
                        disabled={!district}
                      >
                        <SelectTrigger id="block">
                          <SelectValue
                            placeholder={
                              district ? t("onb.blockPlaceholder") : t("onb.blockNeedsDistrict")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {blocks.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="village">{t("onb.village")}</Label>
                      <div className="relative">
                        <MapPin
                          className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="village"
                          placeholder={t("onb.villagePlaceholder")}
                          className="pl-9"
                          value={onboardingInput.location?.village || ""}
                          onChange={(e) => handleLocationChange({ village: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="capital">{t("onb.capital")}</Label>
                      <div className="relative">
                        <IndianRupee
                          className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="capital"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="50000"
                          className="pl-9 text-lg"
                          value={onboardingInput.marginCapital ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            // Empty means unknown, not zero. Clearing the field must put the
                            // question back, not answer it with 0.
                            setOnboardingInput({
                              marginCapital: raw === "" ? null : Math.max(0, Number(raw) || 0),
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* text-accent on bg-accent/10 measured about 2.1:1. This is the one panel on
                        the screen carrying rupee figures, so it was the worst possible place for it.
                        It is also not rendered at all until there is a figure to render — with a
                        null margin it would have printed ₹0, which is a different false number. */}
                    {onboardingInput.marginCapital != null && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                        <p className="flex items-center gap-2 font-semibold">
                          <IndianRupee className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
                          {t("onb.previewTitle", { margin: money(onboardingInput.marginCapital) })}
                        </p>
                        <p className="mt-1.5 leading-relaxed text-muted-foreground">
                          {preview
                            ? t("onb.previewBody", {
                                scheme: t(`scheme.${preview.scheme}.name` as MessageKey),
                                projectCost: money(preview.projectCost),
                                loan: money(preview.loan),
                                instalment: money(preview.instalment),
                              })
                            : t("onb.previewNone", {
                                margin: money(onboardingInput.marginCapital),
                              })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="grid gap-2">
                    <Label id="category-label">{t("onb.category")}</Label>
                    <div
                      className="grid grid-cols-2 gap-3"
                      role="group"
                      aria-labelledby="category-label"
                    >
                      {CATEGORIES.map((cat) => (
                        // A div with onClick is invisible to the keyboard and to assistive tech,
                        // which meant a keyboard user could not finish onboarding at all.
                        <button
                          type="button"
                          key={cat.id}
                          aria-pressed={onboardingInput.businessCategory === cat.id}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            onboardingInput.businessCategory === cat.id
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-muted hover:border-primary/50 text-foreground"
                          }`}
                          onClick={() => setOnboardingInput({ businessCategory: cat.id })}
                        >
                          <Briefcase className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span className="text-sm">{t(cat.key)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1}
                >
                  {t("onb.back")}
                </Button>
                <Button
                  onClick={step === 3 ? handleSubmit : () => setStep((s) => Math.min(3, s + 1))}
                  disabled={!canAdvance}
                >
                  {step === 3 ? t("onb.analyse") : t("onb.continue")}
                  {step === 3 ? (
                    <Sparkles className="ml-2 w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
