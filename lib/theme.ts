export const THEME_COOKIE = "rti_theme";
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Anything other than "light" or "dark" means: follow the device setting. */
export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

export function nextTheme(current: Theme): Theme {
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}
