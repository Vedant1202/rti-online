import data from "@/data/state-terms.json";
import { containsTerm } from "./suggest-authority";

const STATE_PHRASES = data.states.flatMap((s) => [`government of ${s}`, `${s} government`, `${s} state government`]);

/**
 * Returns the phrase that suggests a state-government body, or null.
 * RTI Online returns such requests without refunding the fee, so we warn before payment.
 */
export function detectStateBody(text: string): string | null {
  for (const phrase of [...STATE_PHRASES, ...data.terms]) {
    if (containsTerm(text, phrase)) return phrase;
  }
  return null;
}
