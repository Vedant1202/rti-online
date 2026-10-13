import type { ReplyClock } from "@/lib/rti/deadlines";
import { formatDate, plural } from "@/lib/format";
import { Pill } from "./pill";

export function ClockBadge({ clock }: { clock: ReplyClock | null }) {
  if (!clock) return null;
  switch (clock.state) {
    case "running":
      return <Pill tone={clock.daysLeft <= 3 ? "warn" : "info"}>{plural(clock.daysLeft, "day")} left</Pill>;
    case "paused":
      return <Pill tone="warn">Clock paused · {plural(clock.daysLeftWhenPaused, "day")} left</Pill>;
    case "overdue":
      return <Pill tone="danger">Overdue by {plural(Math.max(clock.daysOver, 0) || 1, "day")}</Pill>;
    case "met":
      return <Pill tone="ok">Answered {formatDate(clock.repliedAt)}</Pill>;
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

export function ClockSummary({
  clock,
  totalDays,
  barLabel,
  barValue,
}: {
  clock: ReplyClock | null;
  totalDays?: number;
  /** Accessible name and value text for the days-left bar (from the dictionary). */
  barLabel?: string;
  barValue?: (left: number, total: number) => string;
}) {
  if (!clock) return null;
  const text = {
    running: clock.state === "running" && `Reply due by ${formatDate(clock.dueAt)} (${plural(clock.daysLeft, "day")} left).`,
    paused:
      clock.state === "paused" &&
      `The reply clock is paused until the additional fee is paid. ${plural(clock.daysLeftWhenPaused, "day")} will be left when it restarts (RTI Act s.7(3)).`,
    overdue:
      clock.state === "overdue" &&
      `The reply was due on ${formatDate(clock.dueAt)}. You can file a first appeal now.`,
    met: clock.state === "met" && `The authority answered on ${formatDate(clock.repliedAt)}.`,
  }[clock.state];
  const left = clock.state === "running" ? clock.daysLeft : clock.state === "paused" ? clock.daysLeftWhenPaused : null;
  return (
    <div className="grid gap-2">
      <p className="text-sm">{text}</p>
      {left !== null && totalDays && barLabel && barValue && (
        <DaysLeftBar left={left} total={totalDays} paused={clock.state === "paused"} label={barLabel} valueText={barValue(left, totalDays)} />
      )}
    </div>
  );
}
