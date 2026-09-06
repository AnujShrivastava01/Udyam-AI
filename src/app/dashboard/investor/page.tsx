"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Ban,
  ChevronRight,
  Download,
  HandCoins,
  Info,
  Sprout,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/stat-tile";
import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import { downloadCsv } from "@/lib/export/csv";
import { SAMPLE_QUEUE_NOTE, queueFilename, queueToCsv } from "@/lib/officer/export";
import { rankByOpportunity, summarise, type Opportunity } from "@/lib/officer/opportunity";
import { SAMPLE_QUEUE, triageQueue } from "@/lib/officer/triage";

/**
 * The same queue, asked the opposite question.
 *
 * `/dashboard/ngo` answers "what will go wrong". A bank, an NGO with a corpus, or an impact
 * investor asks "which of these should I fund first" — and that is a genuinely different sort
 * order, not a reversal of the first one. A file with no flags is not automatically the one that
 * changes a household's income the most.
 *
 * Nothing new is computed here. Every figure comes from the same kernel the applicant sees, so an
 * investor, an officer and a borrower can never be shown contradictory numbers. The ranking itself
 * is a published weighted sum of four kernel figures — shown in full on every row, because a score
 * a reader cannot take apart is a score they should not act on.
 */

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

export default function InvestorConsolePage() {
  const [district, setDistrict] = useState<string>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [explain, setExplain] = useState(false);

  const { rows } = useMemo(() => triageQueue(SAMPLE_QUEUE), []);

  const districts = useMemo(
    () => [...new Set(rows.map((r) => r.application.district))].sort(),
    [rows],
  );

  const scoped = useMemo(
    () => (district === "ALL" ? rows : rows.filter((r) => r.application.district === district)),
    [rows, district],
  );

  const ranked = useMemo(() => rankByOpportunity(scoped), [scoped]);
  const summary = useMemo(() => summarise(ranked), [ranked]);

  function exportPortfolio() {
    const generatedAt = new Date().toISOString();
    downloadCsv(
      queueFilename(generatedAt, "udyamai-portfolio"),
      queueToCsv(
        ranked.map((o) => o.row),
        {
          note: SAMPLE_QUEUE_NOTE,
          generatedAt,
          filter:
            district === "ALL"
              ? "ranked by opportunity"
              : `district=${district}, ranked by opportunity`,
        },
      ),
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 border-accent/40 bg-accent/5 text-accent">
            <HandCoins className="w-3 h-3 mr-1" aria-hidden="true" /> Lender / NGO / Investor
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">Funding view</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl">
            The same pending files, ranked by what they would achieve rather than by what could go
            wrong. Every number comes from the kernel the applicant sees.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={exportPortfolio}
            disabled={ranked.length === 0}
          >
            <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export
          </Button>
          <Link href="/dashboard/ngo">
            <Button variant="outline" className="rounded-full">
              Risk view <ArrowUpRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </header>

      {/* summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Fundable now"
          value={String(summary.fundable)}
          sub={`${summary.blocked} blocked by the rules`}
        />
        <StatTile
          label="Capital to deploy"
          value={`₹${inr(summary.deployable)}`}
          sub="sanctionable across fundable files"
          tone="emerald"
        />
        <StatTile
          label="Annual surplus created"
          /* ₹0 and "no figure on record" are different facts and must not render identically —
             a zero here reads as "this portfolio achieves nothing". */
          value={summary.surplusKnownFor === 0 ? "—" : `₹${inr(summary.annualSurplus)}`}
          /* The denominator travels with the figure. A headline impact number computed over an
             unstated subset is the exact shape of an overstated claim. */
          sub={
            summary.surplusKnownFor === 0
              ? "no surplus figure on record for these activities"
              : `stated for ${summary.surplusKnownFor} of ${summary.fundable} files`
          }
          tone="emerald"
        />
        <StatTile
          label="Median score"
          value={summary.medianScore == null ? "—" : String(summary.medianScore)}
          /* Only files assessed on all four components. Including partial scores put the median at
             100, driven entirely by files nothing was known about. */
          sub={
            summary.medianOver === 0
              ? "no file has all four figures on record"
              : `across ${summary.medianOver} fully assessed file${summary.medianOver === 1 ? "" : "s"}`
          }
        />
      </div>

      {/* how the ranking works — collapsed, but one tap away and complete */}
      <div className="rounded-2xl border bg-muted/30">
        <button
          type="button"
          onClick={() => setExplain((e) => !e)}
          aria-expanded={explain}
          className="w-full text-left p-4 flex items-center gap-3"
        >
          <Info className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-sm font-medium">
            This score is a sort order, not a credit rating — here is exactly what it is made of
          </span>
          <ChevronRight
            className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${explain ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>
        <AnimatePresence initial={false}>
          {explain && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t"
            >
              <div className="p-4 space-y-3 text-sm leading-relaxed">
                <p>
                  It does not predict default, it is not calibrated against outcomes, and no model
                  produced it. It is a weighted sum of four figures the kernel already computes,
                  every one of which is printed on the row it belongs to:
                </p>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <strong>Repayment coverage — 35%.</strong> Annual surplus ÷ peak annual debt
                    service, scored from 1.5× (the lending norm) to 3×.
                  </li>
                  <li>
                    <strong>Income uplift — 30%.</strong> The activity&apos;s surplus as a share of
                    the household&apos;s declared income. What the loan changes, not what it returns.
                  </li>
                  <li>
                    <strong>Time to first income — 20%.</strong> From the activity&apos;s NABARD
                    record, scored from 24 months down to immediate.
                  </li>
                  <li>
                    <strong>Exposure before income — 15%.</strong> Instalments falling due before the
                    unit earns, as a share of the sanctioned loan. Lower is better.
                  </li>
                </ul>
                <p className="text-muted-foreground">
                  The anchors are absolute, not relative to this queue — so a score means the same
                  thing in every district and does not move when an unrelated file is added. Where a
                  figure is missing the component is dropped and the remaining weights are
                  renormalised. Treating &ldquo;not stated&rdquo; as zero would rank an unknown
                  below a known-bad file, which is backwards.
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Partly assessed files are ranked separately.</strong>{" "}
                  NABARD&apos;s unit-cost tables give capital cost and gestation but not
                  profitability, so many livestock files have no surplus on record and can only be
                  scored on two of the four components. A score built from two is not on the same
                  scale as one built from four, so the two are never compared — the fully assessed
                  files come first, and the rest follow as an explicitly less-informed list.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {districts.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            District
          </span>
          {["ALL", ...districts].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDistrict(d)}
              aria-pressed={district === d}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                district === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {d === "ALL"
                ? `All (${rows.length})`
                : `${d} (${rows.filter((r) => r.application.district === d).length})`}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {ranked.map((o, i) => (
          <OpportunityRow
            key={o.row.application.id}
            rank={i + 1}
            opportunity={o}
            open={openId === o.row.application.id}
            onToggle={() =>
              setOpenId(openId === o.row.application.id ? null : o.row.application.id)
            }
          />
        ))}
        {ranked.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No files in that district.
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Sample queue — applicant names are invented and the files are illustrative. In deployment
        this is the agency&apos;s own pending-application export, uploaded unchanged. Surplus and
        gestation figures come from NABARD unit-cost records and are marked as needing verification
        against the primary document; where a record states none, the component is left out rather
        than estimated.
      </p>
    </div>
  );
}


function OpportunityRow({
  rank,
  opportunity,
  open,
  onToggle,
}: {
  rank: number;
  opportunity: Opportunity;
  open: boolean;
  onToggle: () => void;
}) {
  const { row, score, components, signalsUsed, assessed, blocked, rationale } = opportunity;
  const activity = ACTIVITY_BY_ID.get(row.application.statedActivityId);

  return (
    <div
      className={`rounded-xl border bg-card transition-shadow ${open ? "shadow-md" : "hover:shadow-sm"} ${blocked ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        <span className="w-7 shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
          {blocked ? "—" : rank}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{row.application.applicant}</span>
            <span className="text-xs text-muted-foreground font-mono">{row.application.id}</span>
            <span className="text-xs text-muted-foreground">
              {row.application.village}, {row.application.district}
            </span>
          </span>
          <span className="block text-sm text-muted-foreground mt-0.5">{rationale}</span>
        </span>

        <span className="text-right shrink-0">
          <span className="block text-sm font-bold tabular-nums">₹{inr(row.sanctionedLoan)}</span>
          <span className="block text-[10px] text-muted-foreground">
            {activity?.name.split("—")[0].trim() ?? "—"}
          </span>
        </span>

        {row.annualSurplus != null && !blocked && (
          <span className="text-right shrink-0 w-28">
            <span className="flex items-center gap-1 justify-end text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              <Sprout className="w-3.5 h-3.5" aria-hidden="true" />₹{inr(row.annualSurplus)}
            </span>
            <span className="block text-[10px] text-muted-foreground">surplus a year</span>
          </span>
        )}

        {blocked ? (
          <Badge
            variant="outline"
            className="shrink-0 border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          >
            <Ban className="w-3 h-3 mr-1" aria-hidden="true" /> Blocked
          </Badge>
        ) : (
          <span className="shrink-0 w-28">
            <ScoreBar score={score} signals={signalsUsed} assessed={assessed} />
          </span>
        )}

        <ChevronRight
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t"
          >
            <div className="p-4 space-y-4">
              {blocked && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm">
                  <strong>Not fundable as filed.</strong> {row.reason} It is listed so the file is
                  not lost, not because it is a near miss.
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {components.map((c) => (
                  <div key={c.key} className="rounded-lg border p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {Math.round(c.weight * 100)}% weight
                      </p>
                    </div>
                    <p
                      className={`mt-1 text-sm font-bold tabular-nums ${c.normalised == null ? "text-muted-foreground font-normal italic" : ""}`}
                    >
                      {c.display}
                    </p>
                    {c.normalised != null && (
                      <div
                        className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"
                        role="img"
                        aria-label={`${Math.round(c.normalised * 100)} out of 100`}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(c.normalised * 100)}%` }}
                        />
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                      {c.note}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Detail label="Project cost" value={`₹${inr(row.projectCost)}`} />
                <Detail label="Per quarter" value={`₹${inr(row.quarterlyInstalment)}`} />
                <Detail
                  label="Declared income"
                  value={`₹${inr(row.application.annualHouseholdIncome)}/yr`}
                />
                <Detail
                  label="Scored on"
                  value={`${signalsUsed} of ${components.length} signals`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * A partial score must never be mistaken for a complete one.
 *
 * A file with no surplus on record scores on speed and exposure alone, and both of those routinely
 * max out — so it renders 100. That number is not wrong, but it means "nothing bad is known", not
 * "this is the best file in the queue". It is drawn muted, dashed, and labelled with its own
 * denominator; the sort keeps it out of the fully-assessed group entirely.
 */
function ScoreBar({
  score,
  signals,
  assessed,
}: {
  score: number;
  signals: number;
  assessed: "full" | "partial" | "none";
}) {
  if (assessed === "none") {
    return (
      <span className="block text-right text-[11px] text-muted-foreground italic">
        not enough data
      </span>
    );
  }

  const partial = assessed === "partial";

  return (
    <span className="block">
      <span className="flex items-baseline justify-end gap-1">
        <TrendingUp
          className={`w-3.5 h-3.5 ${partial ? "text-muted-foreground" : "text-primary"}`}
          aria-hidden="true"
        />
        <span
          className={`text-sm font-bold tabular-nums ${partial ? "text-muted-foreground" : ""}`}
        >
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{signals} of 4</span>
      </span>
      <span
        className={`mt-1 block h-1.5 rounded-full overflow-hidden ${partial ? "bg-muted/60 outline-1 outline-dashed outline-muted-foreground/40" : "bg-muted"}`}
        role="img"
        aria-label={
          partial
            ? `Partly assessed: score ${score} out of 100, from ${signals} of 4 components`
            : `Opportunity score ${score} out of 100, all four components known`
        }
      >
        <span
          className={`block h-full rounded-full ${partial ? "bg-muted-foreground/40" : "bg-primary"}`}
          style={{ width: `${score}%` }}
        />
      </span>
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
