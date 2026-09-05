"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  Download,
  FileWarning,
  Landmark,
  Search,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ACTIVITY_BY_ID } from "@/lib/finance/activities";
import {
  SAMPLE_QUEUE,
  triageQueue,
  type TriageStatus,
  type TriagedApplication,
} from "@/lib/officer/triage";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

const STATUS: Record<
  TriageStatus,
  { label: string; dot: string; chip: string; Icon: typeof CheckCircle2 }
> = {
  BLOCK: {
    label: "Do not sanction",
    dot: "bg-rose-500",
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    Icon: Ban,
  },
  REVIEW: {
    label: "Officer review",
    dot: "bg-amber-500",
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    Icon: FileWarning,
  },
  CLEAR: {
    label: "Clear",
    dot: "bg-emerald-500",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
};

export default function OfficerConsolePage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TriageStatus | "ALL">("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  const { rows, summary } = useMemo(() => triageQueue(SAMPLE_QUEUE), []);

  const visible = rows.filter((r) => {
    if (filter !== "ALL" && r.status !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.application.applicant.toLowerCase().includes(q) ||
      r.application.id.toLowerCase().includes(q) ||
      r.application.village.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      {/* header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/30 bg-primary/5 text-primary">
            <Landmark className="w-3 h-3 mr-1" /> State Channelizing Agency
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">Sanction triage</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl">
            Every pending file, run through the same rules engine the applicant sees. The queue is
            sorted by what will go wrong, not by when it arrived.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full">
            <Download className="w-4 h-4 mr-2" /> Export queue
          </Button>
          <Button className="rounded-full">
            Upload CSV <ArrowUpRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </header>

      {/* summary strip — capBound and deadZone were computed on every render and shown nowhere,
          which is a shame: they are the two counts that name a defect in the SPECIFICATION rather
          than in an application, and an officer seeing "14 files sit in the dead zone" is the
          moment the argument lands. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SummaryTile
          label="In the queue"
          value={String(summary.total)}
          sub={`${summary.clear} clear · ${summary.review} to review · ${summary.block} blocked`}
        />
        <SummaryTile
          label="Gestation-gapped"
          value={String(summary.gestationGapped)}
          sub="repayment starts before income does"
          tone="rose"
        />
        <SummaryTile
          label="Routing mismatches"
          value={String(summary.routingMismatches)}
          sub="filed under the wrong scheme tier"
          tone="amber"
        />
        <SummaryTile
          label="Exposed before income"
          value={`₹${inr(summary.exposedBeforeIncome)}`}
          sub="across the whole queue"
          tone="rose"
        />
        <SummaryTile
          label="Loan cap binding"
          value={String(summary.capBound)}
          sub="the ceiling, not the percentage, sets the loan"
          tone="amber"
        />
        <SummaryTile
          label="In the dead zone"
          value={String(summary.deadZone)}
          sub="the 10% margin rule does not hold here"
          tone="rose"
        />
      </div>

      {/* the finding */}
      {summary.gestationGapped > 0 && (
        <div className="rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent p-5">
          <p className="font-bold flex items-center gap-2 text-rose-800 dark:text-rose-300">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            {summary.gestationGapped} of {summary.total} files schedule repayment before the
            enterprise earns anything
          </p>
          <p className="text-sm mt-2 leading-relaxed max-w-4xl">
            Together they carry{" "}
            <strong className="tabular-nums">₹{inr(summary.exposedBeforeIncome)}</strong> of
            instalments falling due inside the activity&apos;s own gestation period. None of these
            files is irregular — each satisfies the scheme rules exactly. The gap is structural, and
            it is what sends a sanctioned borrower to a moneylender in month nine.
          </p>
        </div>
      )}

      {/* controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Applicant, application number, or village…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["ALL", "BLOCK", "REVIEW", "CLEAR"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === f ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"
              }`}
            >
              {f === "ALL" ? "All" : STATUS[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* queue */}
      <div className="space-y-2">
        {visible.map((row) => (
          <QueueRow
            key={row.application.id}
            row={row}
            open={openId === row.application.id}
            onToggle={() =>
              setOpenId(openId === row.application.id ? null : row.application.id)
            }
          />
        ))}
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nothing matches that filter.
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Sample queue — applicant names are invented and the files are illustrative. In deployment
        this is the SCA&apos;s existing pending-application export, uploaded unchanged. Every figure
        is produced by the same kernel the beneficiary sees, so an officer and an applicant can
        never be shown contradictory numbers.
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "rose" | "amber";
}) {
  const accent = {
    neutral: "text-foreground",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[tone];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {/* text-3xl on a two-column phone grid clipped ₹1,04,32,118. Scaled down until there is
            room for it, and allowed to break. */}
        <p
          className={`text-2xl sm:text-3xl font-bold font-heading mt-1 tabular-nums break-words ${accent}`}
        >
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QueueRow({
  row,
  open,
  onToggle,
}: {
  row: TriagedApplication;
  open: boolean;
  onToggle: () => void;
}) {
  const s = STATUS[row.status];
  const activity = ACTIVITY_BY_ID.get(row.application.statedActivityId);

  return (
    <div
      className={`rounded-xl border bg-card transition-shadow ${open ? "shadow-md" : "hover:shadow-sm"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{row.application.applicant}</span>
            <span className="text-xs text-muted-foreground font-mono">{row.application.id}</span>
          </span>
          <span className="block text-sm text-muted-foreground mt-0.5">{row.reason}</span>
        </span>

        <span className="text-right shrink-0">
          <span className="block text-sm font-bold tabular-nums">
            ₹{inr(row.sanctionedLoan)}
          </span>
          <span className="block text-[10px] text-muted-foreground">
            {activity?.name.split("—")[0].trim() ?? "—"}
          </span>
        </span>

        {row.preIncomeObligation > 0 && (
          <span className="text-right shrink-0 w-28">
            <span className="block text-sm font-bold text-rose-600 tabular-nums flex items-center gap-1 justify-end">
              <TrendingDown className="w-3.5 h-3.5" />₹{inr(row.preIncomeObligation)}
            </span>
            <span className="block text-[10px] text-muted-foreground">before income</span>
          </span>
        )}

        <Badge variant="outline" className={`${s.chip} shrink-0`}>
          {s.label}
        </Badge>

        <ChevronRight
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
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
            <div className="p-4 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Detail label="Village" value={`${row.application.village}, ${row.application.block}`} />
                  <Detail label="Project cost" value={`₹${inr(row.projectCost)}`} />
                  <Detail label="Per quarter" value={`₹${inr(row.quarterlyInstalment)}`} />
                  <Detail
                    label="Declared income"
                    value={`₹${inr(row.application.annualHouseholdIncome)}/yr`}
                  />
                </div>

                {row.issues.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      What the rules flagged
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {row.issues.map((i) => (
                        <span
                          key={i}
                          className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300"
                        >
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col gap-2 md:w-44">
                <Button size="sm" className="rounded-full flex-1">
                  <ShieldCheck className="w-4 h-4 mr-1.5" /> Draft sanction note
                </Button>
                <Button size="sm" variant="outline" className="rounded-full flex-1">
                  Request revision
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
