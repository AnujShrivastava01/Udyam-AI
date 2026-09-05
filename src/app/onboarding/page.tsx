"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, IndianRupee, Briefcase, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const { onboardingInput, setOnboardingInput } = useAppStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setLoadingText("Analyzing local market...");
    
    // Simulate AI loading states
    setTimeout(() => setLoadingText("Checking scheme eligibility..."), 1500);
    setTimeout(() => setLoadingText("Generating feasibility report..."), 3000);
    
    setTimeout(() => {
      // Navigate to a mocked report ID
      router.push("/report/rep-12345");
    }, 4500);
  };

  const handleLocationChange = (updates: Partial<{district: string, block: string, village: string}>) => {
    const current = onboardingInput.location || { village: '', block: '', district: '', lat: 25.4358, lng: 78.5678 };
    setOnboardingInput({ location: { ...current, ...updates } });
  };

  const districtValue: string | undefined = onboardingInput.location?.district || undefined;
  const blockValue: string | undefined = onboardingInput.location?.block || undefined;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-4 md:p-8">
      <AnimatePresence mode="wait">
        {isSubmitting ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center space-y-6 text-center max-w-sm"
          >
            <div className="relative w-24 h-24 flex items-center justify-center bg-primary/10 rounded-full">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold font-heading">{loadingText}</h2>
            <p className="text-muted-foreground">Please wait while UdyamAI structures your business roadmap.</p>
          </motion.div>
        ) : (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            <Card className="border-none shadow-xl bg-card">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Step {step} of 3</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                <CardTitle className="text-2xl font-heading">
                  {step === 1 && "Where are you located?"}
                  {step === 2 && "What is your initial capital?"}
                  {step === 3 && "What kind of business?"}
                </CardTitle>
                <CardDescription>
                  {step === 1 && "Select your village, block, or district."}
                  {step === 2 && "Enter the amount you can invest from your own pocket (Margin Money)."}
                  {step === 3 && "Choose a category that best describes your idea."}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="district">District</Label>
                      <Select 
                        onValueChange={(val) => handleLocationChange({ district: val as string, block: '', village: '' })}
                        value={districtValue}
                      >
                        <SelectTrigger id="district">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jhansi">Jhansi</SelectItem>
                          <SelectItem value="lalitpur">Lalitpur</SelectItem>
                          <SelectItem value="jalaun">Jalaun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="block">Block / Tehsil</Label>
                      <Select 
                        onValueChange={(val) => handleLocationChange({ block: val as string })}
                        value={blockValue}
                      >
                        <SelectTrigger id="block">
                          <SelectValue placeholder="Select Block" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="babina">Babina</SelectItem>
                          <SelectItem value="moth">Moth</SelectItem>
                          <SelectItem value="maurampur">Mauranipur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="village">Village (Optional)</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="village" 
                          placeholder="Search or drop a pin..." 
                          className="pl-9"
                          value={onboardingInput.location?.village || ""}
                          onChange={(e) => handleLocationChange({ village: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="capital">Available Margin Capital (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="capital" 
                          type="number"
                          placeholder="e.g. 50000" 
                          className="pl-9 text-lg"
                          value={onboardingInput.marginCapital || ""}
                          onChange={(e) => setOnboardingInput({ marginCapital: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="bg-accent/10 text-accent p-4 rounded-lg text-sm flex items-start gap-3">
                      <IndianRupee className="w-5 h-5 shrink-0" />
                      <p>
                        With <strong>₹{(onboardingInput.marginCapital || 0).toLocaleString('en-IN')}</strong> margin capital, 
                        you could be eligible for a project cost up to <strong>₹{((onboardingInput.marginCapital || 0) * 10).toLocaleString('en-IN')}</strong>!
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Business Category</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "dairy", label: "Dairy & Livestock" },
                          { id: "retail", label: "Retail & Kirana" },
                          { id: "textiles", label: "Textiles & Tailoring" },
                          { id: "food", label: "Food Processing" },
                          { id: "handicrafts", label: "Handicrafts" },
                          { id: "services", label: "Local Services" },
                        ].map((cat) => (
                          // A div with onClick is invisible to the keyboard and to assistive
                          // tech, which meant a keyboard user could not finish onboarding at all.
                          <button
                            type="button"
                            key={cat.id}
                            aria-pressed={onboardingInput.businessCategory === cat.id}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                              onboardingInput.businessCategory === cat.id
                                ? "border-primary bg-primary/5 text-primary font-medium"
                                : "border-muted hover:border-primary/50 text-muted-foreground"
                            }`}
                            onClick={() => setOnboardingInput({ businessCategory: cat.id })}
                          >
                            <Briefcase className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span className="text-sm">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between pt-4">
                <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
                  Back
                </Button>
                <Button onClick={step === 3 ? handleSubmit : handleNext} disabled={
                  (step === 1 && !onboardingInput.location?.district) ||
                  (step === 2 && !onboardingInput.marginCapital) ||
                  (step === 3 && !onboardingInput.businessCategory)
                }>
                  {step === 3 ? "Analyse Feasibility" : "Continue"}
                  {step === 3 ? <Sparkles className="ml-2 w-4 h-4" /> : <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
