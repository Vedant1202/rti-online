import authorityData from "@/data/authorities.json";

/** The six authorities citizens ask most often (marked `popular` in the data), shown as one-click chips. */
export const POPULAR: { code: string; label: string }[] = authorityData.flatMap((a) =>
  "popular" in a && a.popular ? [{ code: a.code, label: a.short }] : [],
);

export const POPULAR_CODES = POPULAR.map((p) => p.code);
