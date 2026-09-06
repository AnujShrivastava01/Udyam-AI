"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, BarChart2, IndianRupee, ShieldCheck, Zap, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation, type DictionaryKeys } from "@/lib/i18n-landing";
import { plan } from "@/lib/finance";
import { optimiseStack } from "@/lib/finance/stack";
import { money } from "@/lib/i18n/render";
import GatewayFlow from "@/components/ui/gateway-flow";

export default function LandingPage() {
  const { t } = useTranslation();

  /**
   * The hero used to be a drawing: an invented feasibility score of 82 for an invented "Organic
   * Dairy Farm", with invented percentage matches and a fake browser URL. For a product whose whole
   * claim is that its numbers are traceable, opening with fabricated ones is the wrong first move.
   *
   * It now runs the kernel. Every figure below is computed in the browser, on this render, from the
   * same code path the calculator uses — which also means the hero cannot drift away from the
   * product the way a hardcoded mockup does.
   */
  const hero = useMemo(() => {
    const p = plan({
      marginCapital: 10_000,
      activityId: "goat-10-1",
      useNeedBasedCosting: false,
      annualHouseholdIncome: 120_000,
    });
    return {
      projectCost: p.structure.projectCost,
      loan: p.structure.sanctionedLoan,
      instalment: p.schedule.instalment,
      preIncome: p.solvency.preIncomeObligation,
      gestation: p.activity?.gestationMonths ?? 0,
      moratorium: p.structure.moratoriumMonths,
      gap: p.solvency.gapMonths ?? 0,
    };
  }, []);

  const stackDemo = useMemo(() => {
    const s = optimiseStack({ projectCost: 500_000, marginAvailable: 60_000 });
    return { cost: 500_000, best: s.best, spec: s.specRouted, saving: s.saving };
  }, []);
  
  // Hero Parallax Setup
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden flex flex-col items-center">
        
        {/* Converging flow lines, drawn on canvas. Follows the app's own light/dark toggle, holds
            one static frame under prefers-reduced-motion, and stops the loop once the hero scrolls
            away. `inset-0` rather than a fixed 800x600 box so it fills the hero on any viewport. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <GatewayFlow mode="auto" density={0.9} opacity={0.55} speed={0.9} />
          {/* Fades the lines out behind the copy so the headline keeps its contrast. */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
        </div>

        {/* Abstract Background Gradients */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-primary rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-accent rounded-full blur-[100px] mix-blend-screen opacity-50" />
        </div>

        <motion.div 
          style={{ opacity, scale, y }}
          className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border shadow-sm text-sm font-medium text-muted-foreground"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>{t("landing.badge")}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight font-heading leading-[1.1]"
          >
            {t("landing.headline.part1")} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary to-accent">
              {t("landing.headline.part2")}
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            {t("landing.description")}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto"
          >
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 h-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                {t("landing.cta.start")} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/discover" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-14 rounded-full border-2 bg-card hover:bg-muted/50 transition-colors">
                {t("landing.cta.explore")}
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Live engine panel */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", stiffness: 50 }}
          className="relative w-full max-w-5xl mx-auto mt-24 z-20"
        >
          <div className="rounded-2xl md:rounded-3xl border bg-card/70 backdrop-blur-xl p-5 md:p-8 shadow-2xl ring-1 ring-border/50">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b">
              <div className="flex items-center gap-2 text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                  {t("hero.panel.verdict")}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground font-medium">
                  {t("hero.panel.case")}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground/80 font-mono">
                {t("hero.panel.caption")}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-5 items-center">
              <div className="md:col-span-2 text-left">
                <div className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {money(hero.preIncome)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-snug">
                  {t("hero.panel.preIncome")}
                </p>
              </div>

              <div className="md:col-span-3 space-y-3 text-left">
                {/* Two bars on one shared 0..gestation scale: the whole argument in one picture. */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                    <span>{t("hero.panel.gestation")}</span>
                    <span className="tabular-nums">
                      {hero.gestation} {t("hero.panel.months")}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-primary/15 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                    <span>{t("hero.panel.moratorium")}</span>
                    <span className="tabular-nums">
                      {hero.moratorium} {t("hero.panel.months")}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(hero.moratorium / Math.max(hero.gestation, 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{t("hero.panel.gap")}</div>
                    <div className="font-semibold tabular-nums">
                      {hero.gap} {t("hero.panel.months")}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{t("hero.panel.instalment")}</div>
                    <div className="font-semibold tabular-nums">{money(hero.instalment)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 -bottom-8 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </motion.div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 border-y bg-muted/20 relative z-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-8">
            {t("landing.trusted.title")}
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
            {/* Minimal SVG Logos */}
            {/* These are the bodies whose PUBLISHED figures the engine actually reads — NABARD
                unit costs and gestation periods, NSFDC scheme terms, MoSPI survey data. SIDBI and
                NRLM were listed here and are not sources we use; naming a body you do not draw
                from reads as endorsement, which is a claim we have no right to make. */}
            <div className="flex items-center gap-2 font-heading font-bold text-xl"><ShieldCheck className="w-6 h-6"/> NABARD</div>
            <div className="flex items-center gap-2 font-heading font-bold text-xl"><Zap className="w-6 h-6"/> NSFDC</div>
            <div className="flex items-center gap-2 font-heading font-bold text-xl"><Activity className="w-6 h-6"/> MoSPI</div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 md:py-32 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(300px,auto)]">
            
            {/* Feature 1 - Large Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="col-span-1 md:col-span-8 bg-card border rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
            >
              <div className="relative z-10 md:w-2/3 h-full flex flex-col justify-center">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold font-heading mb-4 leading-tight">
                  {t("landing.feature1.title" as DictionaryKeys)}
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {t("landing.feature1.desc" as DictionaryKeys)}
                </p>
              </div>
              
              {/* Decorative Abstract Map */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 translate-x-1/4 translate-y-1/4 group-hover:translate-x-0 transition-transform duration-700 ease-out pointer-events-none hidden md:block">
                <div className="w-64 h-64 border-[40px] border-primary rounded-full absolute" />
                <div className="w-96 h-96 border-[1px] border-primary rounded-full absolute -top-16 -left-16" />
                <div className="w-32 h-32 bg-accent rounded-full absolute top-32 left-32 blur-3xl" />
              </div>
            </motion.div>

            {/* Feature 2 - Tall Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="col-span-1 md:col-span-4 bg-primary text-primary-foreground border-transparent rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden group"
            >
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-2xl flex items-center justify-center mb-6">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold font-heading mb-4 leading-tight">
                  {t("landing.feature2.title" as DictionaryKeys)}
                </h3>
                <p className="text-primary-foreground/80 text-lg leading-relaxed mt-auto">
                  {t("landing.feature2.desc" as DictionaryKeys)}
                </p>
              </div>
            </motion.div>

            {/* Feature 3 - Wide Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="col-span-1 md:col-span-12 bg-card border rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-12"
            >
              <div className="flex-1">
                <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center mb-6 text-accent-foreground">
                  <IndianRupee className="w-6 h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold font-heading mb-4 leading-tight">
                  {t("landing.feature3.title" as DictionaryKeys)}
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
                  {t("landing.feature3.desc" as DictionaryKeys)}
                </p>
              </div>

              {/* Not decoration: optimiseStack() runs here and the two columns are what it
                  returns. The point of the section is that single-scheme routing leaves money on
                  the table, so the figure that matters is the difference between them. */}
              <div className="flex-1 w-full bg-muted/30 rounded-2xl p-6 border group-hover:-translate-y-2 transition-transform duration-500 text-left">
                <div className="flex justify-between items-baseline mb-5">
                  <span className="text-sm font-medium">{t("stack.demo.cost")}</span>
                  <span className="font-mono font-bold text-xl tabular-nums">{money(stackDemo.cost)}</span>
                </div>

                {([
                  { label: t("stack.demo.spec"), c: stackDemo.spec },
                  { label: t("stack.demo.best"), c: stackDemo.best },
                ] as const).map(({ label, c }) =>
                  c ? (
                    <div key={label} className="mb-4 last:mb-0">
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</div>
                      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full bg-accent" style={{ width: `${(c.subsidy / stackDemo.cost) * 100}%` }} />
                        <div className="h-full bg-primary" style={{ width: `${(c.totalBorrowed / stackDemo.cost) * 100}%` }} />
                        <div className="h-full bg-muted-foreground/40" style={{ width: `${(c.ownContribution / stackDemo.cost) * 100}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-accent" /> {t("stack.demo.subsidy")} {money(c.subsidy)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary" /> {t("stack.demo.loan")} {money(c.totalBorrowed)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> {t("stack.demo.own")} {money(c.ownContribution)}
                        </span>
                      </div>
                    </div>
                  ) : null,
                )}

                {stackDemo.saving != null && stackDemo.saving > 0 && (
                  <div className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary tabular-nums">
                    {money(stackDemo.saving)}{" "}
                    <span className="font-normal text-primary/80">{t("stack.demo.saving")}</span>
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 md:py-32 px-6 border-t relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-3xl mx-auto text-center space-y-8"
        >
          {/* "Join thousands of micro-entrepreneurs securing funding through data" stood here.
              There are no thousands. Nobody has been funded through this. A traction claim on a
              product with no users is the one kind of copy a judge can falsify in a single
              question. */}
          <h2 className="text-4xl md:text-5xl font-bold font-heading">{t("footer.title")}</h2>
          <p className="text-xl text-muted-foreground">{t("footer.subtitle")}</p>
          <Link href="/onboarding" className="inline-block mt-4">
            <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
              {t("landing.cta.start")}
            </Button>
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
