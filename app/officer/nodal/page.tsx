import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { nodalInbox } from "@/lib/services/nodal";
import { OfficerQueue } from "@/components/officer-queue";
import { formatDate, plural } from "@/lib/format";

export default async function NodalPage() {
  const user = await requirePageUser("/officer/nodal", ["nodal"]);
  const inbox = await nodalInbox(user, await getNow());
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">Nodal officer</h1>
        <p className="text-sm text-muted">{user.name}. Forward each request to the right CPIO, or transfer it within 5 days.</p>
      </div>
      <OfficerQueue
        title="New requests"
        empty="No new requests. You're up to date."
        items={inbox.map((r) => ({
          id: r.id,
          href: `/requests/${r.id}`,
          regNo: r.regNo,
          subject: r.subject,
          meta: `received ${formatDate(r.filedAt!)}`,
          badge:
            r.transfer.state === "overdue"
              ? { tone: "danger", text: "Transfer deadline passed" }
              : r.transfer.state === "running"
                ? { tone: r.transfer.daysLeft <= 1 ? "warn" : "info", text: `Route within ${plural(r.transfer.daysLeft, "day")}` }
                : null,
        }))}
      />
    </div>
  );
}
