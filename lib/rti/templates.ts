import templates from "@/data/templates.json";

export type Template = (typeof templates)[number];
export const TEMPLATES: Template[] = templates;

/** Placeholders like [date] that the applicant still has to replace, in order, without repeats. */
export function unfilledPlaceholders(text: string): string[] {
  return [...new Set(text.match(/\[[^\]\n]{1,40}\]/g) ?? [])];
}
