import type { ReplyClock } from "@/lib/rti/deadlines";
import { formatDate } from "@/lib/format";
import { en } from "@/lib/i18n/en";
import { fmt, plural, type Dict } from "@/lib/i18n";
import { Pill } from "./pill";

const days = (n: number, t: Dict) => plural(n, t.clock.dayOne, t.clock.dayMany);

/** English unless a citizen page passes its dictionary. */
export function ClockBadge({ clock, t = en }: { clock: ReplyClock | null; t?: Dict }) {
  if (!clock) return null;
  switch (clock.state) {
    case "running":
      return <Pill tone={clock.daysLeft <= 3 ? "warn" : "info"}>{fmt(t.clock.left, { days: days(clock.daysLeft, t) })}</Pill>;
    case "paused":
      return <Pill tone="warn">{fmt(t.clock.paused, { days: days(clock.daysLeftWhenPaused, t) })}</Pill>;
    case "overdue":
      return <Pill tone="danger">{fmt(t.clock.overdue, { days: days(Math.max(clock.daysOver, 0) || 1, t) })}</Pill>;
    case "met":
      return <Pill tone="ok">{fmt(t.clock.answered, { date: formatDate(clock.repliedAt) })}</Pill>;
  }
}

/** A bar showing how much of the reply period is left (30 days, or 2 for an accepted life-or-liberty claim). */
function DaysLeftBar({ left, total, paused, label, valueText }: { left: number; total: number; paused: boolean; label: string; valueText: string }) {
  const value = Math.max(0, Math.min(left, total));
  const tone = paused || value <= 3 ? "bg-warn" : "bg-accent";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className="h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${(value / total) * 100}%` }} />
    </div>
  );
}

export function ClockSummary({ clock, totalDays, t = en }: { clock: ReplyClock | null; totalDays?: number; t?: Dict }) {
  if (!clock) return null;
  const text = {
    running: clock.state === "running" && fmt(t.clock.running, { date: formatDate(clock.dueAt), days: days(clock.daysLeft, t) }),
    paused: clock.state === "paused" && fmt(t.clock.pausedSummary, { days: days(clock.daysLeftWhenPaused, t) }),
    overdue: clock.state === "overdue" && fmt(t.clock.overdueSummary, { date: formatDate(clock.dueAt) }),
    met: clock.state === "met" && fmt(t.clock.met, { date: formatDate(clock.repliedAt) }),
  }[clock.state];
  const left = clock.state === "running" ? clock.daysLeft : clock.state === "paused" ? clock.daysLeftWhenPaused : null;
  return (
    <div className="grid gap-2">
      <p className="text-sm">{text}</p>
      {left !== null && totalDays && (
        <DaysLeftBar
          left={left}
          total={totalDays}
          paused={clock.state === "paused"}
          label={t.case.daysLeftLabel}
          valueText={fmt(t.case.daysLeftValue, { n: left, total: totalDays })}
        />
      )}
    </div>
  );
}
