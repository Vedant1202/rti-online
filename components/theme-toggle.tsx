"use client";

import { useState } from "react";
import { THEME_COOKIE, nextTheme, type Theme } from "@/lib/theme";
import { savePref } from "@/lib/prefs";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

function Icon({ theme }: { theme: Theme }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;
  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

/** Cycles System → Light → Dark. Saved in a cookie so the server renders the right theme with no flash. */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const { t } = useT();
  const [theme, setTheme] = useState<Theme>(initial);
  const next = nextTheme(theme);
  const label = { system: t.bar.themeSystem, light: t.bar.themeLight, dark: t.bar.themeDark };
  return (
    <button
      type="button"
      className="inline-flex min-h-8 items-center gap-1.5 rounded border border-white/30 px-2 text-xs hover:bg-white/15"
      aria-label={fmt(t.bar.themeLabel, { current: label[theme], next: label[next] })}
      title={label[theme]}
      data-testid="theme-toggle"
      onClick={() => {
        savePref(THEME_COOKIE, next);
        if (next === "system") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = next;
        setTheme(next);
      }}
    >
      <Icon theme={theme} />
      <span className="hidden sm:inline">{label[theme]}</span>
    </button>
  );
}
