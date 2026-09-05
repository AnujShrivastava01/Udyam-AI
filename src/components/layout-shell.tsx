"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation, type DictionaryKeys } from "@/lib/i18n-landing";
import { JourneyStepper } from "./journey-stepper";
import { Leaf, User, Settings, IndianRupee } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const BOTTOM_NAV = [
  { href: "/discover", icon: Leaf, key: "nav.discover" },
  { href: "/calculator", icon: IndianRupee, key: "nav.calculator" },
  { href: "/community", icon: User, key: "nav.community" },
  { href: "/profile/me", icon: Settings, key: "nav.profile" },
] as const;

// BCP 47 tags. Hinglish is Hindi written in Latin script, which is exactly what hi-Latn means —
// a screen reader given "en" would read "Aapka loan" with English phonology.
const HTML_LANG: Record<string, string> = { hi: "hi", hinglish: "hi-Latn", en: "en" };

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useAppStore();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language] ?? "en";
  }, [language]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * The header is fixed, so main has to reserve its height by hand. That reservation used to be a
   * hardcoded 8rem against a header that measures ~153px unscrolled — every page's first heading
   * sat under the bar. It cannot be a constant: the header shrinks on scroll, the stepper reflows
   * on a narrow screen, and Devanagari labels are taller than Latin ones. Measure it instead.
   */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const write = () =>
      document.documentElement.style.setProperty("--app-header-h", `${el.offsetHeight}px`);
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isLandingPage = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a href="#main" className="skip-link rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-lg">
        {t("nav.skipToContent")}
      </a>

      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-b bg-card/80 backdrop-blur-md shadow-sm py-0"
            : "bg-transparent border-transparent py-2",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Leaf className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight hidden sm:inline-block text-foreground">
              {t("app.title")}
              <span className="text-accent">{t("app.titleSuffix")}</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Three languages, all visible. A cycling toggle hides the options from exactly the
                user who most needs to find their own language. Was `hidden sm:flex`, which removed
                the ONLY language control below 640px — on a product whose users are most likely to
                be on a small phone and least likely to read English. */}
            <div
              role="group"
              aria-label={t("nav.language")}
              className="flex items-center rounded-full border bg-muted/30 p-0.5 shrink-0"
            >
              {(
                [
                  { id: "en", label: "EN" },
                  { id: "hi", label: "हिन्दी" },
                  { id: "hinglish", label: "Hinglish" },
                ] as const
              ).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  aria-pressed={language === l.id}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    language === l.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* A notification bell and a hamburger used to sit here. Neither opened anything. An
                inert affordance is worse than no affordance: it teaches the user that tapping does
                nothing, and the red dot on the bell implied unread news that did not exist. */}
          </div>
        </div>
        {!isLandingPage && <JourneyStepper />}
      </header>

      {/* overflow-hidden here created a scrollport that silently killed every `sticky` inside it —
          the calculator's summary rail and both table headers. overflow-x-clip contains the same
          horizontal overflow without establishing one. */}
      <main
        id="main"
        tabIndex={-1}
        className={cn("flex-1 flex flex-col relative w-full overflow-x-clip", !isLandingPage && "pt-[var(--app-header-h,9.5rem)]")}
      >
        {children}
      </main>

      <div className="h-16 md:hidden" />

      <nav
        aria-label={t("nav.primary")}
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around z-50"
      >
        {BOTTOM_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center px-3 py-1 rounded-md",
                active ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary",
              )}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] mt-1">{t(item.key as DictionaryKeys)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
