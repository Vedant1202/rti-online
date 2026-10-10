import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { feeDemands, requestEvents, requests, sentReminders, users } from "@/lib/db/schema";
import { caseClocks } from "@/lib/rti/case-clock";
import { DAY_MS } from "@/lib/rti/deadlines";
import { formatDate } from "@/lib/format";
import { sendEmail } from "@/lib/email/send";
import type { RequestStatus } from "@/lib/contract";

const WATCHED: RequestStatus[] = ["filed", "forwarded", "documents_requested", "replied", "rejected"];
const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

/** Records a reminder; returns false if it was already sent (so a re-run sends nothing twice). */
async function claim(requestId: string, kind: string, now: Date) {
  const db = await getDb();
  const rows = await db
    .insert(sentReminders)
    .values({ requestId, kind, sentAt: now })
    .onConflictDoNothing()
    .returning({ requestId: sentReminders.requestId });
  return rows.length > 0;
}

/** Runs once a day (Vercel Cron on Hobby allows daily jobs only). */
export async function runReminders(now: Date) {
  const db = await getDb();
  const rows = await db.select().from(requests).where(and(eq(requests.kind, "R"), inArray(requests.status, WATCHED)));
  if (rows.length === 0) return { sent: 0 };
  const ids = rows.map((r) => r.id);
  const [events, demands, appeals] = await Promise.all([
    db.select().from(requestEvents).where(inArray(requestEvents.requestId, ids)),
    db.select().from(feeDemands).where(inArray(feeDemands.requestId, ids)),
    db.select({ parentId: requests.parentId }).from(requests).where(and(eq(requests.kind, "A"), inArray(requests.parentId, ids))),
  ]);
  const people = await db.select().from(users);
  const email = (id: string | null) => people.find((u) => u.id === id)?.email;
  const nodalOf = (authorityId: string) => people.filter((u) => u.role === "nodal" && u.authorityId === authorityId);

  let sent = 0;
  const send = async (to: string | undefined, subject: string, text: string) => {
    if (!to) return;
    await sendEmail({ to, subject, text });
    sent++;
  };

  for (const r of rows) {
    const { reply, appeal } = caseClocks(
      r,
      events.filter((e) => e.requestId === r.id),
      demands.filter((d) => d.requestId === r.id),
      now,
    );
    const officers = r.assignedCpioId ? [email(r.assignedCpioId)] : nodalOf(r.authorityId).map((u) => u.email);
    const link = `${appUrl()}/requests/${r.id}`;

    if (reply?.state === "running" && reply.daysLeft <= 3 && (await claim(r.id, "due_soon", now))) {
      for (const to of officers) {
        await send(to, `Reply due in ${reply.daysLeft} days: ${r.regNo}`, `${r.regNo} must be answered by ${formatDate(reply.dueAt)} (RTI Act s.7(1)).\n\n${link}`);
      }
    }
    if (reply?.state === "overdue" && (await claim(r.id, "overdue", now))) {
      for (const to of officers) {
        await send(to, `Overdue: ${r.regNo}`, `The reply to ${r.regNo} was due on ${formatDate(reply.dueAt)}.\n\n${link}`);
      }
      if (appeal && appeal.state !== "not_yet") {
        await send(
          email(r.citizenId),
          `No reply to ${r.regNo}: you can appeal now`,
          `The authority didn't reply by ${formatDate(reply.dueAt)}. You can file a first appeal until ${formatDate(appeal.closesAt)}. It's free and takes one click.\n\n${link}`,
        );
      }
    }
    const appealed = appeals.some((a) => a.parentId === r.id);
    if (
      appeal?.state === "open" &&
      !appealed &&
      appeal.closesAt.getTime() - now.getTime() <= 5 * DAY_MS &&
      (await claim(r.id, "appeal_closing", now))
    ) {
      await send(
        email(r.citizenId),
        `Last days to appeal ${r.regNo}`,
        `Your window to file a first appeal on ${r.regNo} closes on ${formatDate(appeal.closesAt)}.\n\n${link}`,
      );
    }
  }
  return { sent };
}
