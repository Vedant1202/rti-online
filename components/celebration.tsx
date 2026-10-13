import { PartyPopper } from "lucide-react";
import type { Dict } from "@/lib/i18n";

// Confetti pieces: where each one drifts to, how it turns, and its colour token. Fixed, not random,
// so the server and the browser render the same thing.
const PIECES = [
  { left: "8%", dx: "-30px", rot: "200deg", color: "var(--glow)" },
  { left: "18%", dx: "24px", rot: "-160deg", color: "var(--hero-ink)" },
  { left: "30%", dx: "-12px", rot: "260deg", color: "var(--tile-teal-fg)" },
  { left: "44%", dx: "36px", rot: "-220deg", color: "var(--glow)" },
  { left: "58%", dx: "-26px", rot: "180deg", color: "var(--tile-rose-fg)" },
  { left: "70%", dx: "18px", rot: "-200deg", color: "var(--hero-ink)" },
  { left: "82%", dx: "-20px", rot: "240deg", color: "var(--glow)" },
  { left: "92%", dx: "28px", rot: "-180deg", color: "var(--tile-teal-fg)" },
];

/** Shown once, right after filing: the registration number, big, with a short confetti burst. */
export function Celebration({ regNo, t }: { regNo: string; t: Dict }) {
  return (
    <section
      role="status"
      data-testid="celebration"
      className="bg-hero rise relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="absolute top-2 h-3 w-1.5 rounded-sm opacity-0"
            style={{
              left: p.left,
              background: p.color,
              ["--dx" as string]: p.dx,
              ["--rot" as string]: p.rot,
              animation: `confetti 1400ms cubic-bezier(0.2, 0.6, 0.3, 1) ${i * 70}ms both`,
            }}
          />
        ))}
      </div>
      <div className="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-1">
          <p className="inline-flex items-center gap-2 font-display text-2xl font-bold text-hero-ink">
            <PartyPopper size={26} aria-hidden="true" /> {t.case.celebrateTitle}
          </p>
          <p className="text-sm text-hero-muted">{t.case.emailed}</p>
        </div>
        <div className="rounded-2xl bg-white/12 px-5 py-3 ring-1 ring-white/25">
          <p className="text-xs text-hero-muted">{t.case.regNoLabel}</p>
          <p className="font-mono text-xl font-semibold text-hero-ink">{regNo}</p>
        </div>
      </div>
    </section>
  );
}
