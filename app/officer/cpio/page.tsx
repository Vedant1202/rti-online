import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { cpioQueue } from "@/lib/services/cpio";
import { OfficerQueue } from "@/components/officer-queue";
import { STATUS } from "@/lib/status";
import { plural } from "@/lib/format";
import type { ReplyClock } from "@/lib/rti/deadlines";
import type { Tone } from "@/lib/status";

function badge(clock: ReplyClock | null, status: keyof typeof STATUS): { tone: Tone; text: string } | null {
  if (status !== "forwarded") return { tone: STATUS[status].tone, text: STATUS[status].label };
  if (!clock) return null;
  if (clock.state === "overdue") return { tone: "danger", text: `Overdue by ${plural(Math.max(1, clock.daysOver), "day")}` };
  if (clock.state === "running") return { tone: clock.daysLeft <= 3 ? "warn" : "info", text: `${plural(clock.daysLeft, "day")} left` };
  return null;
}

export default async function CpioPage() {
  const user = await requirePageUser("/officer/cpio", ["cpio"]);
  const queue = await cpioQueue(user, await getNow());
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">CPIO workspace</h1>
        <p className="text-sm text-muted">{user.name}. Requests assigned to you, soonest deadline first.</p>
      </div>
      <OfficerQueue
        title="Needs a reply"
        empty="Nothing assigned to you right now."
        items={queue.map((r) => ({
          id: r.id,
          href: `/requests/${r.id}`,
          regNo: r.regNo,
          subject: r.subject,
          badge: badge(r.reply, r.status),
          meta: r.lifeLiberty === "claimed" ? "life-or-liberty claimed" : undefined,
        }))}
      />
    </div>
  );
}
