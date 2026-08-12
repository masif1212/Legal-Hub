"use client";

import {
  persistTheme,
  readStoredTheme,
  resolveTheme,
  THEME_EVENT_NAME,
  type ThemeMode,
} from "@/lib/theme";
import { Monitor, Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeModeSelectorProps {
  className?: string;
}

const OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof SunMedium;
}> = [
  { mode: "light", label: "Light", icon: SunMedium },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "system", label: "System", icon: Monitor },
];

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function ThemeModeSelector({ className }: ThemeModeSelectorProps) {
  const [themePreference, setThemePreference] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const syncThemeState = () => {
      const stored = readStoredTheme();
      setThemePreference(stored);
      setResolvedTheme(resolveTheme(stored));
    };

    syncThemeState();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (readStoredTheme() === "system") {
        syncThemeState();
      }
    };
    const handleThemeChange = () => syncThemeState();

    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener(THEME_EVENT_NAME, handleThemeChange as EventListener);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener(THEME_EVENT_NAME, handleThemeChange as EventListener);
    };
  }, []);

  const summary =
    themePreference === "system"
      ? `System \u00b7 ${resolvedTheme} now`
      : `${themePreference[0].toUpperCase()}${themePreference.slice(1)} active`;

  const handleThemeSelect = (mode: ThemeMode) => {
    setThemePreference(mode);
    setResolvedTheme(resolveTheme(mode));
    persistTheme(mode);
  };

  return (
    <section
      className={joinClassNames(
        "rounded-[18px] border border-[var(--border-subtle)] bg-[var(--background-card-nested)] p-3",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--heading)]">Appearance</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Light, dark, or follow the system.</p>
        </div>
        <span className="rounded-[14px] bg-[var(--background-surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
          {summary}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map(({ mode, label, icon: Icon }) => {
          const active = themePreference === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleThemeSelect(mode)}
              className={joinClassNames(
                "inline-flex items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-xs font-semibold transition",
                active
                  ? "bg-[var(--primary)] text-white shadow-[0_14px_28px_rgba(76,47,94,0.2)]"
                  : "bg-[var(--background-surface)] text-[var(--foreground)] hover:bg-[var(--background-page)]",
              )}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
