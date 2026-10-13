"use client";

import { useState } from "react";
import { TEXT_COOKIE, TEXT_SIZES, savePref, type TextSize } from "@/lib/prefs";

const BUTTONS: Record<TextSize, { text: string; label: string }> = {
  sm: { text: "A−", label: "Smaller text" },
  md: { text: "A", label: "Default text size" },
  lg: { text: "A+", label: "Larger text" },
};

/** A− / A / A+. Saved in a cookie and applied before paint on the next visit. */
export function TextSizeControl({ initial, labels = BUTTONS, groupLabel = "Text size" }: {
  initial: TextSize;
  labels?: Record<TextSize, { text: string; label: string }>;
  groupLabel?: string;
}) {
  const [size, setSize] = useState<TextSize>(initial);
  return (
    <div role="group" aria-label={groupLabel} className="inline-flex items-center gap-0.5" data-testid="text-size">
      {TEXT_SIZES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={size === s}
          aria-label={labels[s].label}
          title={labels[s].label}
          className="min-h-8 min-w-8 rounded px-1.5 text-xs font-semibold leading-none hover:bg-white/15 aria-pressed:bg-white aria-pressed:text-bar"
          onClick={() => {
            savePref(TEXT_COOKIE, s);
            if (s === "md") delete document.documentElement.dataset.text;
            else document.documentElement.dataset.text = s;
            setSize(s);
          }}
        >
          {labels[s].text}
        </button>
      ))}
    </div>
  );
}
