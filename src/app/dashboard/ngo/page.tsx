"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Landmark, Users, CheckCircle2, XCircle, Clock, Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

const APPLICATIONS = [
  { id: "APP-401", name: "Rajesh's Enterprise", category: "Dairy & Livestock", amount: "₹4.5L", score: 82, status: "pending" },
  { id: "APP-402", name: "Bundelkhand Weavers", category: "Textiles", amount: "₹1.2L", score: 91, status: "approved" },
  { id: "APP-403", name: "Fresh Bakes", category: "Food Processing", amount: "₹3.0L", score: 65, status: "reviewing" },
  { id: "APP-404", name: "Local Mandi Connect", category: "Retail", amount: "₹50k", score: 45, status: "rejected" },
];

export default function NGODashboardPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Badge variant="outline" className="mb-2 bg-accent/10 text-accent border-accent/20">FI / NGO Portal</Badge>
          <h1 className="text-3xl font-bold font-heading">Partner Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage applications, view portfolio health, and connect with entrepreneurs.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" /> State Bank of India
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold uppercase text-primary">Pending Applications</span>
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-4xl font-extrabold font-heading text-foreground">12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold uppercase text-muted-foreground">Active Portfolio</span>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-4xl font-extrabold font-heading text-foreground">145</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold uppercase text-muted-foreground">Portfolio Health (On-Time EMI)</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-extrabold font-heading text-green-600">92%</p>
              <Progress value={92} className="w-24 h-2 mb-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Review AI Feasibility Reports and approve funding.</CardDescription>
          </div>
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search ID or Name..." className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {APPLICATIONS.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.id}</TableCell>
                  <TableCell>
                    <p className="font-semibold">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.category}</p>
                  </TableCell>
                  <TableCell>{app.amount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${app.score >= 80 ? 'text-green-600' : app.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {app.score}
                      </span>
                      <Progress value={app.score} className="w-12 h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      app.status === 'approved' ? 'default' : 
                      app.status === 'rejected' ? 'destructive' : 
                      app.status === 'reviewing' ? 'secondary' : 'outline'
                    } className={app.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8">Review <ArrowRight className="w-3 h-3 ml-1" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
