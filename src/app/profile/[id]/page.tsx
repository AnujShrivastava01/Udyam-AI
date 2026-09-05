"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Target, ShieldCheck, Mail, IndianRupee, Store, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";

import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { buildOwnProfile } from "@/lib/profile/build";
import { OwnProfileView } from "@/components/own-profile";

/**
 * A sample profile, and nothing on it is the viewer's.
 *
 * This page used to splice the visitor's OWN business category and district into a hardcoded
 * persona called "Rajesh's Enterprise", beside a green "Funded" badge. That mix is the dangerous
 * part: two values a reader recognises as their own answers, sitting in the same header row as a
 * funding status nobody has, on the page the journey stepper calls the final step. The banner
 * above enumerates "loan history, KYC status and scores" — a funding badge is in none of those
 * three, and proximity beats disclosure anyway.
 *
 * The header now reads entirely as the sample persona. The store is not consulted at all here.
 */
export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const { t } = useT();
  const onboardingInput = useAppStore((st) => st.onboardingInput);
  const visitedSteps = useAppStore((st) => st.visitedSteps);

  // `/profile/me` is the visitor's own, built entirely from their answers and the kernel. Any
  // other id keeps the illustrative persona below, and says so — this page used to splice the
  // visitor's real category and district into that persona, which is the mix that made a reader
  // take the whole card as their own record.
  if (params?.id === "me") {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24">
        <OwnProfileView profile={buildOwnProfile(onboardingInput, visitedSteps)} />
      </div>
    );
  }

  return <SampleProfile notice={t("own.sampleNotice")} />;
}

function SampleProfile({ notice }: { notice: string }) {

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <p className="mb-6 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
        {notice}
      </p>

      {/* Profile Header */}
      <div className="relative mb-16 mt-8">
        <div className="h-48 w-full bg-gradient-to-r from-primary/80 to-accent/80 rounded-3xl overflow-hidden shadow-inner absolute top-0 left-0 -z-10">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>
        <div className="pt-24 px-6 md:px-12 flex flex-col md:flex-row gap-6 items-end">
          <div className="w-32 h-32 rounded-2xl bg-card border-4 border-background shadow-xl flex items-center justify-center overflow-hidden shrink-0">
            <Store className="w-16 h-16 text-primary/50" />
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">
                Dairy &amp; Livestock
              </Badge>
              {/* A green "Funded" badge stood here unconditionally. There is no funding,
                  application or disbursement state anywhere in this app, so it could not be made
                  truthful by wiring it to something — the only correct value for an account-status
                  chip on a product where no loan has ever been applied for is no chip. */}
              <Badge variant="outline" className="text-muted-foreground">
                Sample profile
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-heading text-foreground">Rajesh&apos;s Enterprise</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" aria-hidden="true" /> Bundelkhand, UP
            </p>
          </div>
          <div className="pb-2 w-full md:w-auto flex gap-3">
            <Button className="w-full md:w-auto rounded-full shadow-md"><Mail className="w-4 h-4 mr-2" /> Connect</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary"/> AI Feasibility Score</span>
                  <span className="font-bold text-primary">82/100</span>
                </div>
                <Progress value={82} className="h-2" />
              </div>
              
              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Verification</span>
                  <span className="font-medium flex items-center gap-1 text-green-600"><ShieldCheck className="w-4 h-4" /> KYC Done</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scheme</span>
                  <span className="font-medium">Term Loan (SBI)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">EMI Status</span>
                  <span className="font-medium text-green-600">Up to date</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Products / Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded border bg-muted/20">
                <span className="text-sm font-medium">A2 Cow Milk</span>
                <span className="text-sm">₹65 / L</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded border bg-muted/20">
                <span className="text-sm font-medium">Fresh Paneer</span>
                <span className="text-sm">₹350 / Kg</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="story" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
              <TabsTrigger value="story" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Our Story</TabsTrigger>
              <TabsTrigger value="milestones" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Milestones</TabsTrigger>
            </TabsList>
            <TabsContent value="story" className="space-y-4">
              <h3 className="text-xl font-heading font-semibold">From Idea to Reality</h3>
              <p className="text-muted-foreground leading-relaxed">
                Started in 2023 with just 2 cows, we aim to provide the highest quality unadulterated A2 milk to the urban centers near our block. 
                Thanks to the UdyamAI platform, we secured a term loan that allowed us to expand our herd to 15 cattle and set up a basic cold-chain storage.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our mission is to expand into value-added products like Paneer and Ghee by next year, employing more local youth from the village.
              </p>
            </TabsContent>
            <TabsContent value="milestones" className="space-y-6">
              <div className="relative border-l-2 border-primary/30 pl-6 ml-3 space-y-8">
                <div className="relative">
                  <div className="absolute -left-[31px] bg-primary p-1 rounded-full text-white"><TrendingUp className="w-4 h-4" /></div>
                  <h4 className="font-bold">First 100 Daily Customers</h4>
                  <p className="text-sm text-muted-foreground">Secured daily subscription for 100L milk delivery.</p>
                  <span className="text-xs font-bold text-primary mt-1 block">Feb 2024</span>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] bg-accent p-1 rounded-full text-white"><IndianRupee className="w-4 h-4" /></div>
                  <h4 className="font-bold">Term Loan Disbursed</h4>
                  <p className="text-sm text-muted-foreground">Received ₹4.5 Lakhs from SBI under Govt Scheme.</p>
                  <span className="text-xs font-bold text-accent mt-1 block">Oct 2023</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
