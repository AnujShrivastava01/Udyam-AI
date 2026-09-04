"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, BarChart2, IndianRupee, ShieldCheck, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

export default function LandingPage() {
  const { t } = useTranslation();
  
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

        {/* Dashboard Mockup Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", stiffness: 50 }}
          className="relative w-full max-w-6xl mx-auto mt-24 z-20"
        >
          <div className="rounded-2xl md:rounded-3xl border bg-card/50 backdrop-blur-xl p-2 md:p-4 shadow-2xl overflow-hidden ring-1 ring-border/50">
            {/* Mockup Browser Chrome */}
            <div className="flex items-center gap-2 px-3 pb-3 border-b border-border/50 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="mx-auto bg-muted/50 rounded-md px-24 py-1.5 text-[10px] text-muted-foreground font-mono hidden md:block">
                app.udyam.ai/report/D-8472
              </div>
            </div>
            {/* Mockup Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[300px] md:h-[500px]">
              <div className="col-span-2 bg-muted/30 rounded-xl border p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6">
                  <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin-slow flex items-center justify-center relative">
                    <span className="text-xl font-bold font-heading text-primary absolute">82</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent"/> AI Feasibility Score</div>
                  <div className="text-2xl font-bold font-heading text-foreground mb-1">Organic Dairy Farm</div>
                  <div className="text-sm text-muted-foreground">High potential in this block. Low competition.</div>
                </div>
                <div className="grid grid-cols-4 gap-2 items-end h-32 mt-8 relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-dashed w-full h-px" />
                    <div className="border-b border-dashed w-full h-px" />
                    <div className="border-b border-dashed w-full h-px" />
                  </div>
                  <div className="bg-primary/20 rounded-t-md h-[40%] flex items-end justify-center pb-2 text-xs font-medium text-primary">Q1</div>
                  <div className="bg-primary/40 rounded-t-md h-[70%] flex items-end justify-center pb-2 text-xs font-medium text-primary">Q2</div>
                  <div className="bg-primary/60 rounded-t-md h-[50%] flex items-end justify-center pb-2 text-xs font-medium text-primary-foreground">Q3</div>
                  <div className="bg-primary rounded-t-md h-[90%] flex items-end justify-center pb-2 text-xs font-medium text-primary-foreground">Q4</div>
                </div>
              </div>
              <div className="space-y-4 flex flex-col">
                <div className="bg-muted/30 rounded-xl border p-4 flex-1">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-1"><Zap className="w-3 h-3"/> Top Opportunities</div>
                  <div className="space-y-2">
                    <div className="w-full bg-green-500/10 text-green-700 text-xs font-medium px-2 py-1.5 rounded-md flex justify-between items-center">A2 Milk Premium <span className="bg-green-500/20 px-1.5 py-0.5 rounded">85% Match</span></div>
                    <div className="w-full bg-green-500/10 text-green-700 text-xs font-medium px-2 py-1.5 rounded-md flex justify-between items-center">Paneer Export <span className="bg-green-500/20 px-1.5 py-0.5 rounded">78% Match</span></div>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl border p-4 flex-1">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Key Threats</div>
                  <div className="space-y-2">
                    <div className="w-full bg-red-500/10 text-red-700 text-xs font-medium px-2 py-1.5 rounded-md flex justify-between items-center">Cold Chain Logistics <span className="bg-red-500/20 px-1.5 py-0.5 rounded">High Risk</span></div>
                    <div className="w-full bg-red-500/10 text-red-700 text-xs font-medium px-2 py-1.5 rounded-md flex justify-between items-center">Summer Yield Drop <span className="bg-red-500/20 px-1.5 py-0.5 rounded">Medium Risk</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Fading bottom edge */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
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
            <div className="flex items-center gap-2 font-heading font-bold text-xl"><ShieldCheck className="w-6 h-6"/> NABARD</div>
            <div className="flex items-center gap-2 font-heading font-bold text-xl"><Zap className="w-6 h-6"/> SIDBI</div>
            <div className="flex items-center gap-2 font-heading font-bold text-xl"><Activity className="w-6 h-6"/> NRLM</div>
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
                  {t("landing.feature1.title" as any)}
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {t("landing.feature1.desc" as any)}
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
                  {t("landing.feature2.title" as any)}
                </h3>
                <p className="text-primary-foreground/80 text-lg leading-relaxed mt-auto">
                  {t("landing.feature2.desc" as any)}
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
                  {t("landing.feature3.title" as any)}
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
                  {t("landing.feature3.desc" as any)}
                </p>
              </div>

              {/* Decorative Financial UI */}
              <div className="flex-1 w-full bg-muted/30 rounded-2xl p-6 border group-hover:-translate-y-2 transition-transform duration-500">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-medium">Project Cost</span>
                  <span className="font-mono font-bold text-xl">₹5,00,000</span>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary w-[65%]" />
                    <div className="h-full bg-accent w-[25%]" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"/> Bank Loan (65%)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-accent"/> Subsidy (25%)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-muted-foreground"/> Margin (10%)</span>
                  </div>
                </div>
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
          <h2 className="text-4xl md:text-5xl font-bold font-heading">Ready to build your business?</h2>
          <p className="text-xl text-muted-foreground">Join thousands of micro-entrepreneurs securing funding through data.</p>
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
