import { countWords } from "@/lib/rti/wordcount";
import { SOFT_WORD_LIMIT } from "@/lib/contract";

export function WordCount({ text }: { text: string }) {
  const words = countWords(text);
  const over = words > SOFT_WORD_LIMIT;
  return (
    <p className={`text-xs ${over ? "text-warn" : "text-muted"}`} aria-live="polite" data-testid="word-count">
      {words} / {SOFT_WORD_LIMIT} words suggested
      {over &&
        ". The RTI Rules suggest keeping a request under 500 words, but a longer request can't be rejected for its length."}
    </p>
  );
}
