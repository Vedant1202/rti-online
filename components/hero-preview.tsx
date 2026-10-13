import { Check, CreditCard, MailOpen } from "lucide-react";
import type { Dict } from "@/lib/i18n";

const STEPS = ["filed", "with_officer", "reply", "appeal", "decided"] as const;
const R = 26;
const C = 2 * Math.PI * R;

/**
 * Decorative "product preview" for the hero: a sample request mid-way, built from styled HTML so it
 * needs no image file. Hidden from screen readers; the page text says the same thing.
 */
export function HeroPreview({ t }: { t: Dict }) {
  const left = 12;
  return (
    <div data-testid="hero-preview" aria-hidden="true" className="relative mx-auto hidden w-full max-w-sm md:block">
      <div className="rotate-[-2deg] rounded-2xl border border-white/20 bg-surface p-5 text-ink" style={{ boxShadow: "var(--shadow-lg)" }}>
        <p className="font-mono text-xs text-muted">DOPPW/R/E/26/00412</p>
        <p className="mt-1 font-display text-lg font-bold">{t.home.preview.title}</p>
        <div className="mt-4 flex items-center justify-between gap-1">
          {STEPS.map((s, i) => (
            <span key={s} className="grid flex-1 justify-items-center gap-1">
              <span className={`grid size-6 place-items-center rounded-full text-[0.65rem] font-bold ${i < 2 ? "bg-brand text-hero-ink" : i === 2 ? "border-2 border-accent text-accent" : "border-2 border-line text-muted"}`}>
                {i < 2 ? <Check size={12} /> : i + 1}
              </span>
              <span className="text-[0.65rem] leading-tight text-muted">{t.case.stages[s]}</span>
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-4">
          <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7" className="stroke-line" />
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-accent" strokeDasharray={C} strokeDashoffset={C * (1 - left / 30)} />
          </svg>
          <p className="grid">
            <span className="font-display text-2xl font-bold leading-none">{left}</span>
            <span className="text-sm text-muted">{t.home.preview.daysLeft}</span>
          </p>
        </div>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-tile-teal-bg px-3 py-1.5 text-sm font-semibold text-tile-teal-fg">
          <MailOpen size={16} /> {t.home.preview.reply}
        </p>
      </div>
      <p className="absolute -bottom-4 -left-6 inline-flex rotate-[3deg] items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-ink" style={{ boxShadow: "var(--shadow-md)" }}>
        <span className="grid size-6 place-items-center rounded-lg bg-tile-saffron-bg text-tile-saffron-fg">
          <CreditCard size={14} />
        </span>
        {t.home.preview.paid}
      </p>
    </div>
  );
}
