import authorityData from "@/data/authorities.json";
import type { Lang } from "@/lib/prefs";

/** The six authorities citizens ask most often (marked `popular` in the data), shown as one-click chips. */
const POPULAR_DATA = authorityData.flatMap((a) =>
  "popular" in a && a.popular ? [{ code: a.code, label: a.short, labelHi: a.shortHi }] : [],
);

export const POPULAR_CODES = POPULAR_DATA.map((p) => p.code);

/** Chip labels in the visitor's language (authority names themselves stay as published, in English). */
export function popularFor(lang: Lang): { code: string; label: string }[] {
  return POPULAR_DATA.map((p) => ({ code: p.code, label: lang === "hi" ? p.labelHi : p.label }));
}
