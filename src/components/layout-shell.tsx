"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation, type DictionaryKeys } from "@/lib/i18n-landing";
import { JourneyStepper } from "./journey-stepper";
import { Leaf, Menu, X, User, Settings, IndianRupee } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";
import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const BOTTOM_NAV = [
  { href: "/discover", icon: Leaf, key: "nav.discover" },
  { href: "/calculator", icon: IndianRupee, key: "nav.calculator" },
  { href: "/community", icon: User, key: "nav.community" },
  { href: "/profile/me", icon: Settings, key: "nav.profile" },
] as const;

const LANGUAGES = [
  { id: "en", short: "EN", long: "English" },
  { id: "hi", short: "हिन्दी", long: "हिन्दी (Hindi)" },
  { id: "hinglish", short: "Hinglish", long: "Hinglish" },
] as const;

// BCP 47 tags. Hinglish is Hindi written in Latin script, which is exactly what hi-Latn means —
// a screen reader given "en" would read "Aapka loan" with English phonology.
const HTML_LANG: Record<string, string> = { hi: "hi", hinglish: "hi-Latn", en: "en" };

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, theme } = useAppStore();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  /**
   * The menu remembers WHERE it was opened, so a route change closes it without an effect.
   *
   * The straightforward version — `useEffect(() => setMobileMenuOpen(false), [pathname])` — is a
   * state sync, and React lints it for good reason: it renders the menu open on the new route for
   * one frame before closing it. Deriving from the pathname it was opened at has no such frame.
   */
  const [menu, setMenu] = useState({ open: false, at: pathname });
  const mobileMenuOpen = menu.open && menu.at === pathname;
  const setMobileMenuOpen = (open: boolean) => setMenu({ open, at: pathname });
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language] ?? "en";
  }, [language]);

  /**
   * Apply the theme.
   *
   * globals.css carries a complete `.dark` palette and roughly a hundred `dark:` variants are
   * written throughout the components — but nothing ever put the class on <html>, so every one of
   * them was dead. The OS preference is honoured by default and overridden only when the user says
   * so; the media listener stays attached in 'system' mode so a phone that switches at sunset
   * still switches the app with it.
   */
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && query.matches),
      );
    apply();
    if (theme !== "system") return;
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape closes it too — a dropdown you can only dismiss with a pointer is a trap for anyone
  // navigating by keyboard.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu((m) => ({ ...m, open: false }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

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
            {/* Three languages, all visible from sm upward. Below that the pills crowd the bar, so
                the same three live in the menu instead — a cycling toggle would hide the options
                from exactly the user who most needs to find their own language. */}
            <div
              role="group"
              aria-label={t("nav.language")}
              className="hidden sm:flex items-center rounded-full border bg-muted/30 p-0.5 shrink-0"
            >
              {LANGUAGES.map((l) => (
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
                  {l.short}
                </button>
              ))}
            </div>

            <ThemeToggle className="hidden sm:inline-flex" />

            {/* A notification bell used to sit here and opened nothing, with a red dot implying
                unread news that did not exist. The hamburger beside it was inert too — it now
                opens the menu below, so it stays. */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label={t("nav.menu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        {!isLandingPage && <JourneyStepper />}

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 sm:hidden"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="absolute top-14 right-4 w-[220px] bg-card border rounded-lg shadow-xl z-50 sm:hidden flex flex-col p-3 gap-2"
          >
            {/* The menu used to end with a name and role for a signed-in user. There is no sign-in
                and no user — that block named a persona and presented it as the reader. */}
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {t("nav.language")} / भाषा
            </span>
            <div role="group" aria-label={t("nav.language")} className="flex flex-col gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={language === l.id}
                  onClick={() => {
                    setLanguage(l.id);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "text-left px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    language === l.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  {l.long}
                </button>
              ))}
            </div>

            <div className="border-t pt-2 mt-1 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                {t("theme.label")}
              </span>
              <ThemeToggle variant="list" />
            </div>
          </div>
        )}
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
