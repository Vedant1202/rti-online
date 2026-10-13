import { ringGeometry } from "@/lib/ring";

const R = 40;

/**
 * How much of the reply period is left, as a ring (30 days, or 2 for an accepted life-or-liberty claim).
 * A progressbar for screen readers; it fills in from empty unless reduced motion is on.
 */
export function DaysLeftRing({
  left,
  total,
  paused,
  label,
  valueText,
  unit,
}: {
  left: number;
  total: number;
  paused: boolean;
  label: string;
  valueText: string;
  /** "days left", under the number */
  unit: string;
}) {
  const value = Math.max(0, Math.min(left, total));
  const { circumference, offset } = ringGeometry(value, total, R);
  const tone = paused || value <= 3 ? "stroke-warn" : "stroke-accent";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className="relative grid size-28 shrink-0 place-items-center"
    >
      <svg viewBox="0 0 96 96" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="48" cy="48" r={R} fill="none" strokeWidth="9" className="stroke-line" />
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className={tone}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ ["--ring-from" as string]: circumference, animation: "ring-fill 900ms cubic-bezier(0.2, 0.7, 0.2, 1) both" }}
        />
      </svg>
      <span aria-hidden="true" className="grid justify-items-center">
        <span className="font-display text-3xl leading-none font-bold">{value}</span>
        <span className="text-xs text-muted">{unit}</span>
      </span>
    </div>
  );
}
