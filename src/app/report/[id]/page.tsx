"use client";

import { useAppStore } from "@/lib/store";
import { mockFeasibilityReport } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, AlertTriangle, Map, BarChart3, ShieldAlert, Zap, ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import Link from "next/link";
import { motion } from "framer-motion";

export default function FeasibilityReportPage() {
  const { onboardingInput } = useAppStore();
  const report = mockFeasibilityReport;

  const scoreColor = report.feasibilityScore > 75 ? "text-green-600" : report.feasibilityScore > 50 ? "text-yellow-600" : "text-red-600";
  
  // Data for pricing chart
  const pricingData = [
    { name: "Min Price", price: report.pricing.min, fill: "var(--color-chart-5)" },
    { name: "Recommended", price: report.pricing.recommended, fill: "var(--color-primary)" },
    { name: "Max Price", price: report.pricing.max, fill: "var(--color-chart-2)" }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-24">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-6 items-center bg-card p-6 md:p-10 rounded-3xl border shadow-sm"
      >
        <div className="flex-shrink-0 relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted opacity-20" />
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="8" 
              strokeDasharray={`${(report.feasibilityScore / 100) * 283} 283`}
              className={`${scoreColor} drop-shadow-md transition-all duration-1000 ease-out`} 
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-4xl font-extrabold font-heading ${scoreColor}`}>{report.feasibilityScore}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</span>
          </div>
        </div>
        
        <div className="text-center md:text-left flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> 
            AI Feasibility Complete
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">
            Your {onboardingInput.businessCategory || 'Business'} Idea Analysis
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            "{report.summary}"
          </p>
        </div>
        
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <Link href="/calculator" className="w-full">
            <Button size="lg" className="w-full rounded-full shadow-md">
              Calculate Funding <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="w-full rounded-full no-print" onClick={() => window.print()}>
            Download PDF
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Market Reach & Saturation */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-xl font-heading">
                <Map className="w-5 h-5 text-primary" /> 1. Market Reach & Competitor Map
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-muted/30 rounded-xl border p-4 flex flex-col justify-between h-[300px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=25.4358,78.5678&zoom=12&size=600x300&maptype=roadmap&style=feature:all|element:labels.text.fill|color:0x333333&style=feature:water|element:geometry|color:0x004c5c|lightness:70')] bg-cover bg-center opacity-60 mix-blend-multiply"></div>
                  {/* Mock Map Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-2 border-primary bg-primary/20 animate-pulse flex items-center justify-center">
                      <MapPin className="text-primary w-6 h-6" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm p-3 rounded-lg border shadow-sm text-sm">
                    <strong>{report.competitors.length}</strong> competitors in {report.marketReach.radiusKm}km
                  </div>
                </div>
                <div className="w-full md:w-64 space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Estimated Consumers</p>
                    <p className="text-2xl font-bold">{report.marketReach.estimatedConsumers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Distribution Channels</p>
                    <div className="flex flex-wrap gap-2">
                      {report.marketReach.channels.map(c => (
                        <Badge key={c} variant="secondary">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm text-muted-foreground">Market Saturation</p>
                      <span className="text-sm font-medium">{report.saturationScore}%</span>
                    </div>
                    <Progress value={report.saturationScore} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {report.saturationScore < 50 ? 'Low competition - High opportunity' : 'High competition - Differentiation needed'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SWOT Analysis */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-xl font-heading">
                <Target className="w-5 h-5 text-primary" /> 3. SWOT Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 p-0 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                  <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2"><Zap className="w-4 h-4"/> Strengths</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-green-900/80">
                    {report.swot.strengths.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                  <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Weaknesses</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-red-900/80">
                    {report.swot.weaknesses.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                  <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2"><Target className="w-4 h-4"/> Opportunities</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-blue-900/80">
                    {report.swot.opportunities.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                  <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Threats</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-orange-900/80">
                    {report.swot.threats.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Data */}
        <div className="space-y-6">
          {/* Opportunities */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-xl font-heading">
                <Zap className="w-5 h-5 text-primary" /> 2. Top Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {report.opportunities.map((opp, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border">
                  <span className="font-medium text-sm">{opp.title}</span>
                  <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 shadow-none border-0">
                    {opp.confidence}% Match
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Local Threats */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-xl font-heading">
                <ShieldAlert className="w-5 h-5 text-destructive" /> 4. Local Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {report.threats.map((threat, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm">{threat.label}</span>
                  <Badge variant={threat.severity === 'high' ? 'destructive' : threat.severity === 'medium' ? 'secondary' : 'outline'}>
                    {threat.severity}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pricing Chart */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-xl font-heading">
                <BarChart3 className="w-5 h-5 text-primary" /> 6. Pricing Strategy
              </CardTitle>
              <CardDescription>Predicted local market value (₹)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pricingData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="price" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
