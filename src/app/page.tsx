"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, BarChart2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center pt-16 md:pt-24 pb-16 min-h-[calc(100vh-8rem)] px-4 md:px-12 text-center bg-gradient-to-b from-background to-card/50 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-3xl opacity-60 -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-4xl space-y-8 z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold text-sm mb-2 shadow-sm">
          <Sparkles className="w-4 h-4" />
          <span>Empowering Rural Micro-Entrepreneurs</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-heading text-foreground leading-[1.1]">
          Turn your idea into a <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-sm">funded reality.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium">
          UdyamAI is your smart hyper-local advisory and financial structuring assistant.
          Discover opportunities, analyze feasibility, secure loans, and connect with your community—all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link href="/onboarding" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
              Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/discover" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 h-14 rounded-full border-2 hover:bg-muted/50 transition-colors">
              Explore Local Market
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl z-10"
      >
        {[
          {
            icon: MapPin,
            title: "Hyper-local Discovery",
            description: "Find untapped business opportunities specific to your block or village with AI-powered mapping."
          },
          {
            icon: BarChart2,
            title: "AI Feasibility",
            description: "Get instant SWOT analysis, demand forecasting, and competitor mapping for your idea."
          },
          {
            icon: IndianRupee,
            title: "Smart Finance",
            description: "Auto-calculate margins, loan eligibility, subsidy benefits, and EMI schedules instantly."
          }
        ].map((feature, i) => (
          <div key={i} className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border border-primary/10 shadow-lg hover:shadow-xl transition-all group hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <feature.icon className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-heading text-foreground">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
