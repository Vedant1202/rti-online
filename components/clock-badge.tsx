import type { ReplyClock } from "@/lib/rti/deadlines";
import { formatDate } from "@/lib/format";
import { en } from "@/lib/i18n/en";
import { fmt, plural, type Dict } from "@/lib/i18n";
import { Pill } from "./pill";
import { DaysLeftRing } from "./days-left-ring";

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
      return <Pill tone="ok">{fmt(t.clock.answered, { date: formatDate(clock.repliedAt, t.meta.locale) })}</Pill>;
  }
}

export function ClockSummary({ clock, totalDays, t = en }: { clock: ReplyClock | null; totalDays?: number; t?: Dict }) {
  if (!clock) return null;
  const text = {
    running: clock.state === "running" && fmt(t.clock.running, { date: formatDate(clock.dueAt, t.meta.locale), days: days(clock.daysLeft, t) }),
    paused: clock.state === "paused" && fmt(t.clock.pausedSummary, { days: days(clock.daysLeftWhenPaused, t) }),
    overdue: clock.state === "overdue" && fmt(t.clock.overdueSummary, { date: formatDate(clock.dueAt, t.meta.locale) }),
    met: clock.state === "met" && fmt(t.clock.met, { date: formatDate(clock.repliedAt, t.meta.locale) }),
  }[clock.state];
  const left = clock.state === "running" ? clock.daysLeft : clock.state === "paused" ? clock.daysLeftWhenPaused : null;
  return (
    <div className="flex items-center gap-5">
      {left !== null && totalDays && (
        <DaysLeftRing
          left={left}
          total={totalDays}
          paused={clock.state === "paused"}
          label={t.case.daysLeftLabel}
          valueText={fmt(t.case.daysLeftValue, { n: left, total: totalDays })}
          unit={t.case.daysLeftUnit}
        />
      )}
      <p className="text-sm">{text}</p>
    </div>
  );
}
