"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Store, MapPin, Tag, ArrowRight, CheckCircle2 } from "lucide-react";

const MOCK_BIDS = [
  {
    id: "B-101",
    title: "Need 50L A2 Milk Daily (6 Month Contract)",
    postedBy: "FreshFoods Inc.",
    location: "Jhansi City",
    category: "Dairy & Livestock",
    deadline: "2 days left",
    budget: "₹55 - ₹60 / litre",
    offers: 3,
    status: "open"
  },
  {
    id: "B-102",
    title: "Bulk order: 500 hand-woven baskets for Diwali",
    postedBy: "CraftsVilla Exports",
    location: "Lalitpur",
    category: "Handicrafts",
    deadline: "12 hours left",
    budget: "₹1.5 Lakh total",
    offers: 8,
    status: "open"
  },
  {
    id: "B-103",
    title: "Seeking organic jaggery supplier (100kg/week)",
    postedBy: "Local Cooperative",
    location: "Jalaun",
    category: "Food Processing",
    deadline: "5 days left",
    budget: "Negotiable",
    offers: 1,
    status: "open"
  }
];

export default function MarketplacePage() {
  const [bids] = useState(MOCK_BIDS);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">B2B Marketplace</h1>
          <p className="text-muted-foreground mt-2">Find bulk buyers and suppliers in your region.</p>
        </div>
        <Button size="lg" className="rounded-full shadow-md">Post a Requirement</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bids.map((bid) => (
          <Card key={bid.id} className="flex flex-col hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">{bid.category}</Badge>
                <div className="flex items-center text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                  <Clock className="w-3 h-3 mr-1" /> {bid.deadline}
                </div>
              </div>
              <CardTitle className="text-lg leading-tight">{bid.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary/70" /> 
                  <span className="font-medium text-foreground">{bid.postedBy}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary/70" /> {bid.location}
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary/70" /> Budget: <span className="font-medium text-foreground">{bid.budget}</span>
                </div>
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center text-sm border">
                <span className="text-muted-foreground">Current Offers</span>
                <span className="font-bold flex items-center gap-1">{bid.offers} <CheckCircle2 className="w-4 h-4 text-green-600" /></span>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" className="w-full justify-between group">
                Submit Offer 
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
