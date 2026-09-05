"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n-landing";
import { JourneyStepper } from "./journey-stepper";
import { Leaf, User, Bell, Settings } from "lucide-react";
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

  // The store is not persisted, so the server cannot know the locale — a client effect is the
  // only route. Without it the document claims lang="en" while rendering Devanagari, which
  // misleads screen readers and breaks hyphenation and voice selection.
  useEffect(() => {
    document.documentElement.lang = language === "hi" ? "hi" : "en";
  }, [language]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            {/* Was `hidden sm:flex`, which removed the ONLY language control below 640px — on a product
                whose users are most likely to be on a small phone and least likely to read English.
                It now wraps instead of hiding. */}
            <div className="flex items-center rounded-full border bg-muted/30 p-0.5 shrink-0">
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
            
            {/* The hamburger opened nothing. An inert affordance in the header is worse than no
                affordance: it teaches the user that tapping does nothing. Removed until it has a
                menu; the bottom nav already carries mobile navigation. */}

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
