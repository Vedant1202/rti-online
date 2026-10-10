import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { faaQueue } from "@/lib/services/appeals";
import { OfficerQueue } from "@/components/officer-queue";
import { plural } from "@/lib/format";

export default async function FaaPage() {
  const user = await requirePageUser("/officer/faa", ["faa"]);
  const queue = await faaQueue(user, await getNow());
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">First Appellate Authority</h1>
        <p className="text-sm text-muted">{user.name}. Decide each appeal within 30 days, or 45 with recorded reasons.</p>
      </div>
      <OfficerQueue
        title="Appeals to decide"
        empty="No pending appeals."
        items={queue.map((a) => ({
          id: a.id,
          href: `/appeals/${a.id}`,
          regNo: a.regNo,
          subject: a.subject,
          meta: a.appealGround ?? undefined,
          badge:
            a.clock.state === "running"
              ? { tone: a.clock.daysLeft <= 5 ? "warn" : "info", text: `${plural(a.clock.daysLeft, "day")} left` }
              : a.clock.state === "overdue"
                ? { tone: "danger", text: "Overdue" }
                : null,
        }))}
      />
    </div>
  );
}
