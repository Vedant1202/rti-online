"use client";

import { countWords } from "@/lib/rti/wordcount";
import { SOFT_WORD_LIMIT } from "@/lib/contract";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

export function WordCount({ text }: { text: string }) {
  const { t } = useT();
  const words = countWords(text);
  const over = words > SOFT_WORD_LIMIT;
  return (
    <p className={`text-xs ${over ? "text-warn" : "text-muted"}`} aria-live="polite" data-testid="word-count">
      {fmt(t.words.count, { n: words, limit: SOFT_WORD_LIMIT })}
      {over && t.words.over}
    </p>
  );
}
