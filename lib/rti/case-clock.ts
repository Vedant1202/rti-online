import type { EventType, LifeLiberty, RequestStatus } from "@/lib/contract";
import { appealWindow, replyClock, type AppealWindow, type ReplyClock } from "./deadlines";

type ClockRequest = { filedAt: Date | null; lifeLiberty: LifeLiberty; status: RequestStatus };
type ClockEvent = { type: EventType; at: Date };
type ClockDemand = { sentAt: Date; paidAt: Date | null };

const DECISIONS: EventType[] = ["replied", "rejected"];
const NO_CLOCK: RequestStatus[] = ["pending_payment", "transferred", "split", "closed_unpaid"];

/** Reply clock and first-appeal window for one request (or one split part), derived from its events. */
export function caseClocks(
  req: ClockRequest,
  events: ClockEvent[],
  demands: ClockDemand[],
  now: Date,
): { reply: ReplyClock | null; appeal: AppealWindow | null } {
  if (!req.filedAt || NO_CLOCK.includes(req.status)) return { reply: null, appeal: null };

  const decision = events.find((e) => DECISIONS.includes(e.type));
  const reply = replyClock(
    {
      filedAt: req.filedAt,
      lifeOrLibertyAccepted: req.lifeLiberty === "accepted",
      feePauses: demands.map((d) => ({ from: d.sentAt, to: d.paidAt })),
      repliedAt: decision?.at ?? null,
    },
    now,
  );
  const appeal = appealWindow(
    {
      repliedAt: decision?.at ?? null,
      replyDueAt: reply.state === "running" || reply.state === "overdue" ? reply.dueAt : null,
      paused: reply.state === "paused",
    },
    now,
  );
  return { reply, appeal };
}
