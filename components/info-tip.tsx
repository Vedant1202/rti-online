"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * A small "i" button that reveals a plain-language explanation.
 * Works with mouse, keyboard (Enter/Space to open, Escape to close) and screen readers.
 */
export function InfoTip({ label, children, align = "left" }: { label: string; children: React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span ref={wrapper} className="relative inline-flex align-middle">
      <button
        ref={button}
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-accent"
        aria-label={`More about ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      <span
        id={id}
        role="region"
        aria-label={label}
        hidden={!open}
        className={`absolute top-7 z-30 w-72 max-w-[80vw] rounded-md border border-line bg-surface p-3 text-left text-sm font-normal text-ink shadow-lg ${align === "right" ? "right-0" : "left-0"}`}
      >
        {children}
      </span>
    </span>
  );
}
