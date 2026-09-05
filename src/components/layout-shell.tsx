"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n-landing";
import { JourneyStepper } from "./journey-stepper";
import { Leaf, Menu, X, User, Bell, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { userRole, language, setLanguage } = useAppStore();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isLandingPage = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header 
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          scrolled 
            ? "border-b bg-card/80 backdrop-blur-md shadow-sm py-0" 
            : "bg-transparent border-transparent py-2"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:inline-block text-foreground">
                {t("app.title")}<span className="text-accent">{t("app.titleSuffix")}</span>
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Three languages, all visible. A cycling toggle hides the options from exactly the
                user who most needs to find their own language. */}
            <div className="hidden sm:flex items-center rounded-full border bg-muted/30 p-0.5">
              {([
                { id: "en", label: "EN" },
                { id: "hi", label: "हिन्दी" },
                { id: "hinglish", label: "Hinglish" },
              ] as const).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  aria-pressed={language === l.id}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    language === l.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full"></span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <div className="hidden md:flex items-center gap-2 border-l pl-4 ml-2">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">{t("user.name")}</span>
                <span className="text-xs text-muted-foreground capitalize">{userRole.replace('-', ' ')}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
                R
              </div>
            </div>
          </div>
        </div>
        {/* Stepper only shown globally below header, but hidden on Landing Page for a cleaner look */}
        {!isLandingPage && <JourneyStepper />}

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-14 left-0 w-full bg-background border-b shadow-lg md:hidden flex flex-col p-4 gap-6 animate-in slide-in-from-top-2 duration-200 z-40">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Language / भाषा
              </span>
              <div className="grid grid-cols-1 gap-2">
                {([
                  { id: "en", label: "English" },
                  { id: "hi", label: "हिन्दी (Hindi)" },
                  { id: "hinglish", label: "Hinglish" },
                ] as const).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLanguage(l.id);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "text-left px-4 py-3 rounded-lg text-sm transition-colors border",
                      language === l.id 
                        ? "bg-primary/10 border-primary/30 text-primary font-medium" 
                        : "bg-muted/30 border-transparent hover:bg-muted text-foreground"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4 flex items-center justify-between">
               <div className="flex flex-col">
                  <span className="text-sm font-medium">{t("user.name")}</span>
                  <span className="text-xs text-muted-foreground capitalize">{userRole.replace('-', ' ')}</span>
               </div>
               <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-lg">
                 R
               </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content area */}
      <main className={cn("flex-1 flex flex-col relative w-full overflow-hidden", !isLandingPage && "pt-[8rem]")}>
        {children}
      </main>
      
      {/* Mobile Bottom Nav Spacer */}
      <div className="h-16 md:hidden"></div>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around z-50">
        <Link href="/discover" className="flex flex-col items-center text-muted-foreground hover:text-primary">
          <Leaf className="w-5 h-5" />
          <span className="text-[10px] mt-1">{t("nav.discover")}</span>
        </Link>
        <Link href="/community" className="flex flex-col items-center text-muted-foreground hover:text-primary">
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1">{t("nav.community")}</span>
        </Link>
        <Link href="/profile/me" className="flex flex-col items-center text-muted-foreground hover:text-primary">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1">{t("nav.profile")}</span>
        </Link>
      </nav>
    </div>
  );
}
