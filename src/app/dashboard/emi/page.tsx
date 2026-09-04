"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CalendarCheck, CreditCard, Download, IndianRupee, BellRing, CheckCircle2 } from "lucide-react";

export default function EMITrackingDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">My Finance Dashboard</h1>
          <p className="text-muted-foreground mt-2">Track your active loans, EMI schedule, and moratorium period.</p>
        </div>
      </div>

      {/* Hero Status Card */}
      <Card className="bg-primary text-primary-foreground overflow-hidden border-none shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <CalendarCheck className="w-32 h-32 transform rotate-12" />
        </div>
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-3">Status: Moratorium Active</Badge>
              <h2 className="text-4xl font-extrabold font-heading mb-1">2 Months Left</h2>
              <p className="text-white/80 text-lg">Before your first principal EMI starts.</p>
            </div>
            
            <div className="bg-black/20 p-5 rounded-2xl border border-white/10 w-full md:w-auto">
              <p className="text-white/70 text-sm uppercase font-semibold mb-1">Next Payment Due</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                ₹ 3,450 <span className="text-sm font-normal text-white/80">(Interest Only)</span>
              </p>
              <p className="text-sm text-accent mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Due on 5th Nov
              </p>
              <Button size="sm" className="w-full mt-4 bg-white text-primary hover:bg-white/90">Pay Now</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
            <CardDescription>Term Loan under Mudra Scheme (SBI)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Total Disbursed</span>
                <span className="font-bold">₹ 4,50,000</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Principal Paid</span>
                <span className="font-bold text-green-600">₹ 0 (Moratorium)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining Balance</span>
                <span className="font-bold">₹ 4,50,000</span>
              </div>
              <Progress value={0} className="h-2 mt-4" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Interest Rate</p>
                <p className="font-medium">8.0% p.a.</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Tenure</p>
                <p className="font-medium">7 Years</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reminders & Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <BellRing className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-accent">Upcoming Interest Payment</h4>
                <p className="text-xs text-muted-foreground mt-1">Please ensure your linked SBI account has sufficient balance before 5th Nov.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-muted/30 border rounded-lg">
              <IndianRupee className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Subsidy Credited</h4>
                <p className="text-xs text-muted-foreground mt-1">₹ 25,000 margin money subsidy has been credited to your loan account.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Repayment History</CardTitle>
            <CardDescription>Your past transactions and receipts.</CardDescription>
          </div>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Statement</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: "5 Oct 2023", amount: "₹ 3,450", type: "Interest Only", status: "Paid via Auto-Debit" },
              { date: "5 Sep 2023", amount: "₹ 3,450", type: "Interest Only", status: "Paid via UPI" },
              { date: "5 Aug 2023", amount: "₹ 3,450", type: "Interest Only", status: "Paid via Auto-Debit" },
            ].map((t, i) => (
              <div key={i} className="flex justify-between items-center p-3 border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t.amount}</p>
                    <p className="text-xs text-muted-foreground">{t.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{t.date}</p>
                  <p className="text-xs text-green-600">{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
