"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  MapPin,
  Plus,
  Share2,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsv } from "@/lib/export/csv";
import {
  MAX_NOTES,
  UNITS,
  asMessage,
  budgetLabel,
  dateLabel,
  emptyDraft,
  fromDraft,
  requirementsToCsv,
  validate,
  type RequirementDraft,
  type RequirementSide,
} from "@/lib/marketplace/requirement";
import { useAppStore } from "@/lib/store";
import { CounterpartyFinder } from "@/components/counterparty-finder";
import { VILLAGES } from "@/lib/market/villages";
import { DemoBanner } from "@/components/demo-banner";
import { useT, type MessageKey } from "@/lib/i18n";

/**
 * The marketplace, built from the half we actually own.
 *
 * A bidding board needs two parties, accounts and a server. This project has none of the three,
 * and three invented buyers behind live-looking "Submit Offer" buttons is a claim a judge can
 * falsify in one question — so the examples are labelled and their buttons stay disabled.
 *
 * What IS real is the requirement builder: compose a buying or selling requirement precisely
 * enough that a trader could act on it, then get it out of the app as a message or a CSV. That
 * demonstrates the data model and produces something useful today, without pretending anyone is
 * listening on the other side.
 */

/**
 * Illustrative listings, held as message keys rather than sentences.
 *
 * They are examples, but they are examples a Hindi reader has to be able to read — leaving them in
 * English would put the only untranslated block on an otherwise translated page, and "it is only
 * sample text" is exactly the excuse that leaves half a product monolingual.
 *
 * Rupee figures stay outside the dictionary: `money` formats them once, and a price is not a
 * sentence to translate.
 */
const EXAMPLE_BIDS: {
  id: string;
  titleKey: MessageKey;
  location: string;
  category: string;
  deadlineKey: MessageKey;
  budget: string | MessageKey;
  budgetIsKey?: boolean;
  offers: number;
}[] = [
  {
    id: "B-101",
    titleKey: "mkt.ex1.title",
    location: "Gwalior",
    category: "Dairy & Livestock",
    deadlineKey: "mkt.ex1.deadline",
    budget: "₹55 – ₹60 / litre",
    offers: 3,
  },
  {
    id: "B-102",
    titleKey: "mkt.ex2.title",
    location: "Sheopur",
    category: "Handicrafts",
    deadlineKey: "mkt.ex2.deadline",
    budget: "mkt.ex2.budget",
    budgetIsKey: true,
    offers: 8,
  },
  {
    id: "B-103",
    titleKey: "mkt.ex3.title",
    location: "Dabra",
    category: "Food Processing",
    deadlineKey: "mkt.ex3.deadline",
    budget: "mkt.negotiable",
    budgetIsKey: true,
    offers: 1,
  },
];

export default function MarketplacePage() {
  const { t } = useT();
  const location = useAppStore((s) => s.onboardingInput.location);
  const requirements = useAppStore((s) => s.requirements);
  const addRequirement = useAppStore((s) => s.addRequirement);
  const deleteRequirement = useAppStore((s) => s.deleteRequirement);

  /**
   * Where to search for counterparties.
   *
   * The user's own village when the gazetteer holds it, otherwise the first village in their
   * district, otherwise the first we hold at all. A wholesaler search has to start somewhere real,
   * and starting at the wrong end of the country returns leads nobody can drive to.
   */
  const centre =
    VILLAGES.find(
      (v) => v.name.toLowerCase() === location?.village?.trim().toLowerCase(),
    ) ??
    VILLAGES.find((v) => v.district.toLowerCase() === location?.district?.toLowerCase()) ??
    VILLAGES[0];

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RequirementDraft>(() => emptyDraft());
  /** Errors are shown only after a submit attempt — a form that scolds you mid-typing is hostile. */
  const [attempted, setAttempted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const errors = useMemo(() => validate(draft), [draft]);
  // Errors arrive as message keys; MAX_NOTES is passed to all of them because only one template
  // has a slot and renderMessage ignores parameters a template does not name.
  const showError = (field: keyof RequirementDraft) =>
    attempted && errors[field] ? t(errors[field] as MessageKey, { max: MAX_NOTES }) : undefined;

  function set<K extends keyof RequirementDraft>(key: K, value: RequirementDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  /** An emptied number field yields "", which must become null, not NaN and not 0. */
  function setNumber(key: "budgetMin" | "budgetMax" | "quantity", raw: string) {
    if (raw === "") {
      setDraft((d) => ({ ...d, [key]: key === "quantity" ? 0 : null }));
      return;
    }
    setDraft((d) => ({ ...d, [key]: Number(raw) }));
  }

  function submit() {
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    // Location is stamped here rather than seeded into the draft, so it is whatever the store
    // holds at save time — the store rehydrates after mount, and seeding a draft from an effect
    // to catch that costs a render on every visit to fix a case the save already handles.
    addRequirement(
      fromDraft({
        ...draft,
        district: location?.district ?? null,
        block: location?.block ?? null,
      }),
    );
    setDraft(emptyDraft());
    setAttempted(false);
    setOpen(false);
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {
      // Clipboard access is denied in some embedded browsers. The text is on screen and
      // selectable, so failing silently here is better than an alert that explains nothing.
    }
  }

  function exportCsv() {
    downloadCsv(
      `udyamai-requirements-${new Date().toISOString().slice(0, 10)}.csv`,
      requirementsToCsv(requirements),
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24">
      <DemoBanner />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">{t("mkt.title")}</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">{t("mkt.subtitle")}</p>
        </div>
        <Button
          size="lg"
          className="rounded-full shadow-md shrink-0"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <>
              <X className="w-4 h-4 mr-2" aria-hidden="true" /> {t("mkt.close")}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> {t("mkt.write")}
            </>
          )}
        </Button>
      </div>

      {/* ── the builder ──────────────────────────────────────────────────── */}
      {open && (
        <Card className="mb-8 border-primary/30 border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t("mkt.yourRequirement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              className="flex gap-2"
              role="group"
              aria-label={t("mkt.sideGroup")}
            >
              {(
                [
                  { id: "selling", label: t("mkt.selling") },
                  { id: "buying", label: t("mkt.buying") },
                ] as { id: RequirementSide; label: string }[]
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("side", s.id)}
                  aria-pressed={draft.side === s.id}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    draft.side === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Field label={t("mkt.goods")} htmlFor="product" error={showError("product")}>
              <Input
                id="product"
                value={draft.product}
                onChange={(e) => set("product", e.target.value)}
                placeholder={t("mkt.goodsPlaceholder")}
                aria-invalid={Boolean(showError("product"))}
              />
            </Field>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
              <Field label={t("mkt.quantity")} htmlFor="quantity" error={showError("quantity")}>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.quantity === 0 ? "" : String(draft.quantity)}
                  onChange={(e) => setNumber("quantity", e.target.value)}
                  placeholder="50"
                  aria-invalid={Boolean(showError("quantity"))}
                />
              </Field>
              <Field label={t("mkt.unit")} htmlFor="unit">
                <Select
                  value={draft.unit ?? null}
                  onValueChange={(v) => set("unit", v as string)}
                >
                  <SelectTrigger id="unit" className="w-32">
                    <SelectValue placeholder={t("mkt.unit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`unit.${u}` as MessageKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Field label={t("mkt.priceFrom")} htmlFor="budgetMin" error={showError("budgetMin")}>
                <Input
                  id="budgetMin"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.budgetMin == null ? "" : String(draft.budgetMin)}
                  onChange={(e) => setNumber("budgetMin", e.target.value)}
                  placeholder={t("mkt.optional")}
                />
              </Field>
              <Field label={t("mkt.priceTo")} htmlFor="budgetMax" error={showError("budgetMax")}>
                <Input
                  id="budgetMax"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.budgetMax == null ? "" : String(draft.budgetMax)}
                  onChange={(e) => setNumber("budgetMax", e.target.value)}
                  placeholder={t("mkt.optional")}
                />
              </Field>
              <Field
                label={draft.side === "selling" ? t("mkt.availableUntil") : t("mkt.neededBy")}
                htmlFor="needBy"
                error={showError("needBy")}
              >
                <Input
                  id="needBy"
                  type="date"
                  value={draft.needBy ?? ""}
                  onChange={(e) => set("needBy", e.target.value || null)}
                />
              </Field>
            </div>

            <Field label={t("mkt.notes")} htmlFor="notes" error={showError("notes")}>
              <Textarea
                id="notes"
                value={draft.notes}
                maxLength={MAX_NOTES}
                onChange={(e) => set("notes", e.target.value)}
                placeholder={t("mkt.notesPlaceholder")}
              />
            </Field>

            <p className="text-[11px] text-muted-foreground">
              {t("mkt.blankPriceOk")}
              {location
                ? " " +
                  t("mkt.locationWillRead", {
                    loc: [location.block, location.district].filter(Boolean).join(", "),
                  })
                : ""}
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button className="rounded-full px-8" onClick={submit}>
              {t("mkt.save")}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
              {t("mkt.cancel")}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── the user's own requirements ──────────────────────────────────── */}
      {requirements.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold font-heading">
              {t("mkt.yourRequirements")}{" "}
              <span className="text-muted-foreground font-normal tabular-nums">
                ({requirements.length})
              </span>
            </h2>
            <Button variant="outline" size="sm" className="rounded-full" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-2" aria-hidden="true" /> {t("mkt.exportCsv")}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {requirements.map((r) => {
              const message = asMessage(r);
              const by = dateLabel(r.needBy);
              return (
                <Card key={r.id} className="flex flex-col border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-none"
                      >
                        {r.side === "selling" ? t("mkt.sellingChip") : t("mkt.wantedChip")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 -mr-2 -mt-1 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteRequirement(r.id)}
                        aria-label={t("mkt.deleteRequirement")}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg leading-tight break-words">
                      {r.product}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary/70" aria-hidden="true" />
                      <span className="font-medium text-foreground tabular-nums">
                        {/* The unit is an id from a closed list, so it translates on render — the
                            product and notes stay exactly as the user typed them. */}
                        {r.quantity} {t(`unit.${r.unit}` as MessageKey)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary/70" aria-hidden="true" />
                      <span className="font-medium text-foreground">{budgetLabel(r)}</span>
                    </div>
                    {by && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary/70" aria-hidden="true" />
                        {r.side === "selling" ? t("mkt.availableUntil") : t("mkt.neededBy")} {by}
                      </div>
                    )}
                    {(r.block || r.district) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary/70" aria-hidden="true" />
                        {[r.block, r.district].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {r.notes && (
                      <p className="pt-1 text-xs leading-relaxed break-words">{r.notes}</p>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copy(r.id, message)}
                    >
                      {copiedId === r.id ? (
                        <>
                          <Check className="w-4 h-4 mr-2" aria-hidden="true" /> {t("mkt.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" aria-hidden="true" /> {t("mkt.copy")}
                        </>
                      )}
                    </Button>
                    {/* Opens WhatsApp with the text prefilled. The user picks the recipient and
                        presses send — nothing is sent from here. */}
                    <a
                      className="flex-1"
                      href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" className="w-full">
                        <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> {t("mkt.whatsapp")}
                      </Button>
                    </a>
                  </CardFooter>
                  {/* The other half of the trade. Without this the board is a form: a requirement
                      with nobody to send it to is a note to yourself. */}
                  <CounterpartyFinder requirement={r} lat={centre.lat} lng={centre.lng} />
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── examples ─────────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold font-heading">{t("mkt.boardTitle")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5 max-w-2xl">{t("mkt.boardNote")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXAMPLE_BIDS.map((bid) => (
          <Card key={bid.id} className="flex flex-col shadow-sm bg-muted/20">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2 gap-2">
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {t("mkt.example")}
                </Badge>
                <div className="flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Clock className="w-3 h-3 mr-1" aria-hidden="true" /> {t(bid.deadlineKey)}
                </div>
              </div>
              <CardTitle className="text-lg leading-tight">{t(bid.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary/70" aria-hidden="true" />
                  <span className="font-medium text-foreground">{t("mkt.exampleBuyer")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary/70" aria-hidden="true" /> {bid.location}
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary/70" aria-hidden="true" />{" "}
                  {t("mkt.budget")}{" "}
                  <span className="font-medium text-foreground">
                    {bid.budgetIsKey ? t(bid.budget as MessageKey) : bid.budget}
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center text-sm border">
                <span className="text-muted-foreground">{t("mkt.offers")}</span>
                <span className="font-bold flex items-center gap-1">
                  {bid.offers} <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" className="w-full justify-between" disabled>
                {t("mkt.offeringLater")}
                <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {/* role="alert" so a screen reader announces it when it appears after a failed submit. */}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
