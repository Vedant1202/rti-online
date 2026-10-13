"use client";

import { useState } from "react";
import { TEXT_COOKIE, TEXT_SIZES, savePref, type TextSize } from "@/lib/prefs";
import { useT } from "@/lib/i18n/client";

const GLYPH: Record<TextSize, string> = { sm: "A−", md: "A", lg: "A+" };

/** A− / A / A+. Saved in a cookie and applied before paint on the next visit. */
export function TextSizeControl({ initial }: { initial: TextSize }) {
  const { t } = useT();
  const [size, setSize] = useState<TextSize>(initial);
  const label: Record<TextSize, string> = { sm: t.bar.smaller, md: t.bar.defaultSize, lg: t.bar.larger };
  return (
    <div role="group" aria-label={t.bar.textSize} className="inline-flex items-center gap-0.5" data-testid="text-size">
      {TEXT_SIZES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={size === s}
          // The visible glyph is part of the name too (WCAG 2.5.3, label in name).
          aria-label={`${label[s]} (${GLYPH[s]})`}
          title={label[s]}
          className="min-h-8 min-w-8 rounded px-1.5 text-xs font-semibold leading-none hover:bg-white/15 aria-pressed:bg-bar-ink aria-pressed:text-bar"
          onClick={() => {
            savePref(TEXT_COOKIE, s);
            if (s === "md") delete document.documentElement.dataset.text;
            else document.documentElement.dataset.text = s;
            setSize(s);
          }}
        >
          {GLYPH[s]}
        </button>
      ))}
    </div>
  );
}
