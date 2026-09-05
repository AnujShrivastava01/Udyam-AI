"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useAppStore, type ThemeMode } from "@/lib/store";
import { useTranslation, type DictionaryKeys } from "@/lib/i18n-landing";
import { cn } from "@/lib/utils";

const MODES: { id: ThemeMode; icon: typeof Sun; key: DictionaryKeys }[] = [
  { id: "system", icon: Monitor, key: "theme.system" },
  { id: "light", icon: Sun, key: "theme.light" },
  { id: "dark", icon: Moon, key: "theme.dark" },
];

/**
 * Light / dark / system.
 *
 * Two variants, because the header and the mobile menu want different shapes:
 *
 *   "button" (default) — one icon button that cycles. The icon shows the mode that is ACTIVE, and
 *     the accessible name says what pressing it will switch TO, since a cycling control is
 *     otherwise unreadable to anyone who cannot see the icon change.
 *   "list" — the three modes as explicit rows, for the mobile menu where there is room to show
 *     them and no reason to make the user cycle.
 *
 * `system` is not a null state. It means "keep following the OS", and it has to stay reachable —
 * a plain light/dark switch silently discards a preference the user already expressed once.
 */
export function ThemeToggle({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "list";
  className?: string;
}) {
  const { t } = useTranslation();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  if (variant === "list") {
    return (
      <div role="group" aria-label={t("theme.label")} className={cn("flex flex-col gap-1", className)}>
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={theme === m.id}
              onClick={() => setTheme(m.id)}
              className={cn(
                "flex items-center gap-2 text-left px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                theme === m.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-foreground",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {t(m.key)}
            </button>
          );
        })}
      </div>
    );
  }

  const index = MODES.findIndex((m) => m.id === theme);
  const current = MODES[index === -1 ? 0 : index];
  const nextMode = MODES[(index === -1 ? 0 : index + 1) % MODES.length];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextMode.id)}
      // Names the destination, not the current state: "Switch to dark" tells you what the press
      // does. A label reading "System" would leave a screen-reader user guessing.
      aria-label={t("theme.switchTo", { mode: t(nextMode.key) })}
      title={t("theme.switchTo", { mode: t(nextMode.key) })}
      className={cn(
        "items-center justify-center rounded-full border bg-muted/30 p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span className="sr-only">{t(current.key)}</span>
    </button>
  );
}
