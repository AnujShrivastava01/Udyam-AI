"use client";

import { useAppStore } from "@/lib/store";
import { JourneyStepper } from "./journey-stepper";
import { Leaf, Menu, User, Bell, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { userRole, language, setLanguage } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:inline-block text-foreground">
                Udyam<span className="text-accent">AI</span>
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex text-xs font-medium"
              onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            >
              {language === 'hi' ? 'English' : 'हिंदी'}
            </Button>
            
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full"></span>
            </Button>
            
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>

            <div className="hidden md:flex items-center gap-2 border-l pl-4 ml-2">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">Rajesh Kumar</span>
                <span className="text-xs text-muted-foreground capitalize">{userRole.replace('-', ' ')}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
                R
              </div>
            </div>
          </div>
        </div>
        {/* Stepper only shown globally below header */}
        <JourneyStepper />
      </header>

      {/* Main Content area */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {children}
      </main>
      
      {/* Mobile Bottom Nav Spacer */}
      <div className="h-16 md:hidden"></div>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around z-50">
        <Link href="/discover" className="flex flex-col items-center text-muted-foreground hover:text-primary">
          <Leaf className="w-5 h-5" />
          <span className="text-[10px] mt-1">Discover</span>
        </Link>
        <Link href="/community" className="flex flex-col items-center text-muted-foreground hover:text-primary">
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1">Community</span>
        </Link>
        <Link href="/profile/me" className="flex flex-col items-center text-muted-foreground hover:text-primary">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
