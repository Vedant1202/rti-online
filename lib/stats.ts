import { and, eq, gte, inArray, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities, feeDemands, requestEvents, requests } from "@/lib/db/schema";
import { DAY_MS, replyClock } from "@/lib/rti/deadlines";

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Per central authority, over requests filed in the last 90 days. Counts only, no personal data. */
export async function authorityStats(now: Date) {
  const db = await getDb();
  const since = new Date(now.getTime() - 90 * DAY_MS);
  const auths = await db.select().from(authorities).where(eq(authorities.isCentral, true)).orderBy(authorities.name);
  const rows = await db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.kind, "R"),
        gte(requests.filedAt, since),
        notInArray(requests.status, ["pending_payment", "split", "transferred"]),
      ),
    );
  const ids = rows.map((r) => r.id);
  const [events, demands] = ids.length
    ? await Promise.all([
        db.select().from(requestEvents).where(and(inArray(requestEvents.requestId, ids), inArray(requestEvents.type, ["replied", "rejected"]))),
        db.select().from(feeDemands).where(inArray(feeDemands.requestId, ids)),
      ])
    : [[], []];

  return auths.map((a) => {
    const mine = rows.filter((r) => r.authorityId === a.id);
    const replyDays: number[] = [];
    let overdue = 0;
    for (const r of mine) {
      const decision = events.find((e) => e.requestId === r.id);
      const pauses = demands.filter((d) => d.requestId === r.id).map((d) => ({ from: d.sentAt, to: d.paidAt }));
      const clockInput = { filedAt: r.filedAt!, lifeOrLibertyAccepted: r.lifeLiberty === "accepted", feePauses: pauses, repliedAt: null };
      const at = decision?.at ?? now;
      const state = replyClock(clockInput, at);
      if (state.state === "overdue") overdue++;
      if (decision) {
        const pausedMs = pauses.reduce((sum, p) => sum + ((p.to ?? at).getTime() - p.from.getTime()), 0);
        replyDays.push(Math.round((decision.at.getTime() - r.filedAt!.getTime() - pausedMs) / DAY_MS));
      }
    }
    return {
      code: a.code,
      name: a.name,
      ministry: a.ministry,
      total: mine.length,
      answered: replyDays.length,
      medianDays: median(replyDays),
      overduePct: mine.length ? Math.round((overdue / mine.length) * 100) : null,
    };
  });
}
