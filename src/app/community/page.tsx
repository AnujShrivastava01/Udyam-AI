"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, MessageSquare, ThumbsUp, Share2, BadgeCheck, Send, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const MOCK_POSTS = [
  {
    id: 1,
    author: { name: "Rajesh Kumar", role: "entrepreneur", verified: false, initials: "RK", avatar: "" },
    content: "Just secured my loan under the Mudra scheme! Thanks to everyone here who helped me with the documentation process. The new dairy farm setup starts next week.",
    time: "2 hours ago",
    likes: 24,
    comments: 5,
    category: "Dairy & Livestock"
  },
  {
    id: 2,
    author: { name: "Bundelkhand Vikas NGO", role: "ngo", verified: true, initials: "BV", avatar: "" },
    content: "We are organizing a free veterinary camp this Sunday at Moth block. All dairy farmers are welcome to bring their cattle for checkups.",
    time: "5 hours ago",
    likes: 89,
    comments: 12,
    category: "Dairy & Livestock"
  },
  {
    id: 3,
    author: { name: "State Bank of India", role: "financial-institution", verified: true, initials: "SBI", avatar: "" },
    content: "Attention Micro-Entrepreneurs: Term loan interest rates have been revised. Check your eligibility in the app to see how this affects your EMI.",
    time: "1 day ago",
    likes: 156,
    comments: 45,
    category: "Finance"
  }
];

export default function CommunityPage() {
  const { onboardingInput, userRole } = useAppStore();
  const [newPost, setNewPost] = useState("");
  
  const currentCategory = onboardingInput.businessCategory || "Dairy";
  const location = onboardingInput.location?.district || "Bundelkhand";

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      
      {/* Header Area */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 md:p-8 rounded-3xl border shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <Badge variant="outline" className="mb-2 bg-background">Community Hub</Badge>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">
            <span className="capitalize">{currentCategory}</span> Entrepreneurs — <span className="capitalize text-primary">{location}</span>
          </h1>
          <p className="text-muted-foreground mt-2">Connect, share, and grow with 1,200+ local businesses, NGOs, and mentors.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-card p-4 rounded-xl border text-center min-w-[100px] shadow-sm">
            <Users className="w-6 h-6 mx-auto text-primary mb-1" />
            <span className="text-xl font-bold">1.2k</span>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Members</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar - Groups & Mentors */}
        <div className="lg:col-span-3 space-y-6 hidden lg:block">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50 cursor-pointer font-medium">
                <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center">🐮</div>
                Local Dairy Farmers
              </div>
              <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-muted-foreground">
                <div className="w-8 h-8 rounded bg-accent/20 text-accent flex items-center justify-center">💰</div>
                Mudra Loan Seekers
              </div>
              <Button variant="ghost" className="w-full text-xs mt-2 justify-start"><PlusCircle className="w-4 h-4 mr-2"/> Join More Groups</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top Mentors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-primary">
                  <AvatarFallback className="bg-primary/10 text-primary">DS</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold">Dr. Sharma</p>
                  <p className="text-xs text-muted-foreground">Vet Expert</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs">View Directory</Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-6 space-y-6">
          {/* Create Post */}
          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4 flex gap-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Input 
                  placeholder="Share an update, ask a question, or post a requirement..." 
                  className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Question</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Requirement</Badge>
                  </div>
                  <Button size="sm" className="rounded-full px-6" disabled={!newPost}>
                    Post <Send className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feed Posts */}
          {MOCK_POSTS.map((post) => (
            <Card key={post.id} className="shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-start gap-4 space-y-0">
                <Avatar>
                  <AvatarFallback className={post.author.role === 'ngo' || post.author.role === 'financial-institution' ? "bg-accent text-white" : "bg-muted"}>
                    {post.author.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-sm">{post.author.name}</h3>
                    {post.author.verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="capitalize">{post.author.role.replace('-', ' ')}</span> • {post.time}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{post.category}</Badge>
              </CardHeader>
              <CardContent className="pb-3 text-sm leading-relaxed">
                {post.content}
              </CardContent>
              <CardFooter className="border-t p-2 flex">
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-primary">
                  <ThumbsUp className="w-4 h-4 mr-2" /> {post.likes}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-primary">
                  <MessageSquare className="w-4 h-4 mr-2" /> {post.comments}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-primary">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Right Sidebar - Active Bids / Marketplace */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-accent/20 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-accent">Active Bids (Marketplace)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-card p-3 rounded-lg border text-sm shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold">Need 50L A2 Milk Daily</span>
                  <Badge variant="destructive" className="text-[10px]">2d left</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Posted by: FreshFoods Inc.</p>
                <Button size="sm" variant="outline" className="w-full text-xs border-accent text-accent hover:bg-accent hover:text-white">Submit Offer</Button>
              </div>
              <div className="bg-card p-3 rounded-lg border text-sm shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold">Looking for Cattle Feed Supplier</span>
                  <Badge variant="destructive" className="text-[10px]">5h left</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Posted by: Local Cooperative</p>
                <Button size="sm" variant="outline" className="w-full text-xs border-accent text-accent hover:bg-accent hover:text-white">Submit Offer</Button>
              </div>
              <Link href="/marketplace">
                <Button variant="link" className="w-full text-xs">View all marketplace bids →</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
