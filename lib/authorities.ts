import authorityData from "@/data/authorities.json";

/** The six authorities citizens ask most often (marked `popular` in the data), shown as one-click chips. */
export const POPULAR_CODES: string[] = authorityData.filter((a) => "popular" in a && a.popular).map((a) => a.code);
