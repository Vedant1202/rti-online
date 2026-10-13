import { THEME_COOKIE } from "./theme";

/** Text size and interface language. Saved in cookies like the theme, and applied before paint. */
export const TEXT_COOKIE = "rti_text";
export const TEXT_SIZES = ["sm", "md", "lg"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const TEXT_SCALE: Record<TextSize, string> = { sm: "87.5%", md: "100%", lg: "125%" };

export function parseTextSize(value: string | undefined): TextSize {
  return value === "sm" || value === "lg" ? value : "md";
}

export const LANG_COOKIE = "rti_lang";
export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];

export function parseLang(value: string | undefined): Lang {
  return value === "hi" ? "hi" : "en";
}

export const ONE_YEAR = 31_536_000;

/** Sets a preference cookie from the browser. */
export function savePref(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * Runs in <head> before the first paint, so the saved theme, text size and language show with no
 * flash, without the root layout reading cookies (which would stop loading screens showing instantly).
 */
export const prefsScript = `(function(){try{var c=document.cookie,d=document.documentElement,m;
m=c.match(/(?:^|; )${THEME_COOKIE}=(light|dark)(?:;|$)/);if(m)d.dataset.theme=m[1];
m=c.match(/(?:^|; )${TEXT_COOKIE}=(sm|lg)(?:;|$)/);if(m)d.dataset.text=m[1];
m=c.match(/(?:^|; )${LANG_COOKIE}=(hi)(?:;|$)/);if(m)d.lang=m[1]}catch(e){}})()`;
