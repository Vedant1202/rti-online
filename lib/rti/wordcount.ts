import { SOFT_WORD_LIMIT } from "@/lib/contract";

/**
 * Words are whitespace-separated tokens containing a letter or digit, in any script.
 * Predictable for Hindi and for file numbers like PPO/2019/4471 (one word).
 */
export function countWords(text: string): number {
  return text.split(/\s+/u).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

/** RTI Rules 2012, rule 3: ordinarily 500 words, but never a ground for rejection. */
export function overSoftLimit(text: string): boolean {
  return countWords(text) > SOFT_WORD_LIMIT;
}
