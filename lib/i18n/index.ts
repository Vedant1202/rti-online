import type { Lang } from "@/lib/prefs";
import { en, type Dict } from "./en";
import { hi } from "./hi";

export type { Dict };

const DICTS: Record<Lang, Dict> = { en, hi };

export function dictFor(lang: Lang): Dict {
  return DICTS[lang];
}

/** fmt("Pay {amount}", { amount: "₹10" }) → "Pay ₹10". Unknown placeholders stay visible. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** plural(3, "{n} day left", "{n} days left") → "3 days left". */
export function plural(n: number, one: string, many: string): string {
  return fmt(n === 1 ? one : many, { n });
}
