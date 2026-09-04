"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { calculateSchemeEligibility } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from "recharts";
import { IndianRupee, Landmark, Calculator, ArrowRight, ShieldCheck, Clock, TrendingDown } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CalculatorPage() {
  const { onboardingInput, setOnboardingInput } = useAppStore();
  const [margin, setMargin] = useState(onboardingInput.marginCapital || 50000);

  // Sync back to store on unmount or debounce if needed, simple sync here
  useEffect(() => {
    setOnboardingInput({ marginCapital: margin });
  }, [margin, setOnboardingInput]);

  const result = calculateSchemeEligibility(margin);

  // Prepare Pie Chart Data
  const pieData = [
    { name: "Equipment / Setup", value: result.projectCost * 0.65 },
    { name: "Working Capital", value: result.projectCost * 0.25 },
    { name: "Marketing & Ops", value: result.projectCost * 0.10 },
  ];
  const COLORS = ['var(--color-primary)', 'var(--color-chart-2)', 'var(--color-chart-1)'];

  // Formatting helper
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading flex items-center gap-3">
            <Calculator className="w-8 h-8 text-primary" /> Smart Financial Planner
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Adjust your margin capital to auto-select the best government scheme for you.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Inputs & Eligibility Card */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-6 border-b border-primary/10">
              <CardTitle className="text-lg">Your Investment (Margin Money)</CardTitle>
              <CardDescription>How much capital do you have right now?</CardDescription>
              <div className="pt-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <IndianRupee className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    type="number" 
                    value={margin} 
                    onChange={(e) => setMargin(Number(e.target.value) || 0)}
                    className="pl-10 text-xl font-bold h-12"
                  />
                </div>
              </div>
              <div className="pt-6">
                <Slider 
                  value={[margin]} 
                  min={10000} 
                  max={500000} 
                  step={5000}
                  onValueChange={(vals) => setMargin((vals as number[])[0])}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>₹10,000</span>
                  <span>₹5,00,000+</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <h3 className="font-heading font-semibold text-lg mb-4 text-center">Project Funding Breakdown</h3>
              
              {/* The Hero Eligibility Visual */}
              <div className="space-y-3">
                <div className="flex h-12 rounded-full overflow-hidden shadow-inner border border-border/50">
                  <div className="bg-chart-2 flex items-center justify-center text-white font-bold text-sm w-[10%] relative overflow-hidden group">
                    <span className="relative z-10">10%</span>
                  </div>
                  <div className="bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm w-[90%] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                    90%
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-chart-2 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-chart-2" /> Margin Money</span>
                    <span className="font-bold">{formatCurrency(margin)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-medium text-primary flex items-center justify-end gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Max Bank Loan</span>
                    <span className="font-bold">{formatCurrency(result.maxLoanAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-muted/30 rounded-xl border flex flex-col items-center justify-center text-center">
                <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Project Cost</span>
                <span className="text-4xl font-extrabold font-heading text-foreground">{formatCurrency(result.projectCost)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estimated Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scheme Details & EMI */}
        <div className="lg:col-span-7 space-y-6">
          
          <motion.div 
            key={result.scheme}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border-2 shadow-sm overflow-hidden"
          >
            <div className={`p-6 text-white ${result.scheme === 'micro-finance' ? 'bg-gradient-to-r from-teal-600 to-teal-800' : 'bg-gradient-to-r from-blue-600 to-indigo-800'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="secondary" className="mb-2 bg-white/20 text-white hover:bg-white/30 border-none">Auto-Selected Scheme</Badge>
                  <h2 className="text-2xl font-bold font-heading">
                    {result.scheme === 'micro-finance' ? 'Micro Finance Scheme' : 'Term Loan Scheme'}
                  </h2>
                  <p className="text-white/80 mt-1 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Government Backed
                  </p>
                </div>
                <Landmark className="w-12 h-12 opacity-50" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs font-medium uppercase mb-1">Interest Rate</p>
                  <p className="font-bold text-xl">{result.interestRate}% <span className="text-sm font-normal">p.a.</span></p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-white/70 text-xs font-medium uppercase mb-1">Tenure</p>
                  <p className="font-bold text-xl">{result.tenureYears} <span className="text-sm font-normal">Years</span></p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-accent">
                  <p className="text-accent/90 text-xs font-medium uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Moratorium</p>
                  <p className="font-bold text-xl text-accent">{result.moratoriumMonths} <span className="text-sm font-normal text-accent">Months</span></p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg font-heading flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-primary"/> Repayment Schedule (Quarterly)
                </h3>
              </div>
              
              <div className="h-[250px] mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.emiSchedule} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="quarter" tickFormatter={(tick) => `Q${tick}`} stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(tick) => `₹${tick/1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)} 
                      labelFormatter={(label) => `Quarter ${label}`}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="principal" name="Principal" stroke="var(--color-primary)" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="interest" name="Interest" stroke="var(--color-chart-2)" strokeWidth={3} dot={false} />
                    {result.moratoriumMonths > 0 && (
                      <ReferenceLine x={result.moratoriumMonths / 3} stroke="var(--color-accent)" strokeDasharray="3 3" label={{ position: 'top', value: 'Moratorium Ends', fill: 'var(--color-accent)', fontSize: 12 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[100px]">Quarter</TableHead>
                      <TableHead>Principal Repayment</TableHead>
                      <TableHead>Interest Payment</TableHead>
                      <TableHead className="text-right">Total Installment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.emiSchedule.slice(0, 5).map((row, i) => (
                      <TableRow key={row.quarter} className={i < result.moratoriumMonths / 3 ? "bg-accent/5" : ""}>
                        <TableCell className="font-medium">Q{row.quarter}</TableCell>
                        <TableCell>{formatCurrency(row.principal)}</TableCell>
                        <TableCell>{formatCurrency(row.interest)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(row.principal + row.interest)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 bg-muted/20 text-center text-sm text-muted-foreground border-t">
                  Showing first 5 quarters. The first {result.moratoriumMonths / 3} quarter(s) are under moratorium (interest accrues, no principal).
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Link href="/community">
                  <Button size="lg" className="rounded-full px-8 text-lg shadow-md shadow-primary/20 hover:-translate-y-1 transition-transform">
                    Apply for Loan <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

            </div>
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
