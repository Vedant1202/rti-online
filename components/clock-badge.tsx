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

export function ClockSummary({ clock }: { clock: ReplyClock | null }) {
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
  return <p className="text-sm">{text}</p>;
}
