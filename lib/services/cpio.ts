import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { feeDemands, requestEvents, requests } from "@/lib/db/schema";
import { caseClocks } from "@/lib/rti/case-clock";
import type { RequestStatus } from "@/lib/contract";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { addEvent } from "./events";
import { linkUpload } from "./documents";
import { notifyCitizen } from "./notify";

const OPEN: RequestStatus[] = ["forwarded", "fee_requested", "documents_requested"];
const ANSWERABLE: RequestStatus[] = ["forwarded", "documents_requested"];

/** Requests assigned to this CPIO that still need an answer, soonest deadline first. */
export async function cpioQueue(user: User, now: Date) {
  if (user.role !== "cpio" && user.role !== "admin") throw forbidden();
  const db = await getDb();
  const rows = await db
    .select()
    .from(requests)
    .where(
      and(
        inArray(requests.status, OPEN),
        eq(requests.kind, "R"),
        user.role === "admin" ? undefined : eq(requests.assignedCpioId, user.id),
      ),
    );
  const ids = rows.map((r) => r.id);
  const [events, demands] = ids.length
    ? await Promise.all([
        db.select().from(requestEvents).where(inArray(requestEvents.requestId, ids)),
        db.select().from(feeDemands).where(inArray(feeDemands.requestId, ids)),
      ])
    : [[], []];
  const withClocks = rows.map((r) => ({
    ...r,
    reply: caseClocks(r, events.filter((e) => e.requestId === r.id), demands.filter((d) => d.requestId === r.id), now).reply,
  }));
  const dueTime = (c: (typeof withClocks)[number]["reply"]) =>
    c?.state === "running" || c?.state === "overdue" ? c.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
  return withClocks.sort((a, b) => dueTime(a.reply) - dueTime(b.reply));
}

/** Loads a request the user may act on as its assigned CPIO. */
export async function loadAssigned(user: User, requestId: string) {
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
  if (!req) throw notFound();
  if (user.role !== "admin" && (user.role !== "cpio" || req.assignedCpioId !== user.id)) throw forbidden();
  return req;
}

async function decide(
  user: User,
  requestId: string,
  now: Date,
  decision: { status: "replied" | "rejected"; payload: Record<string, unknown>; documentId?: string },
) {
  const req = await loadAssigned(user, requestId);
  if (!ANSWERABLE.includes(req.status)) throw conflict("This request has already been answered or is waiting on the applicant.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(requests)
      .set({ status: decision.status, closedAt: now })
      .where(and(eq(requests.id, req.id), inArray(requests.status, ANSWERABLE)))
      .returning({ id: requests.id });
    if (claimed.length === 0) throw conflict("This request has already been answered.");
    if (decision.documentId) await linkUpload(tx, user, decision.documentId, req.id, "reply");
    await addEvent(tx, {
      requestId: req.id,
      type: decision.status,
      actorId: user.id,
      at: now,
      payload: { ...decision.payload, documentId: decision.documentId ?? null },
    });
  });
  return req;
}

export async function replyToRequest(user: User, requestId: string, input: { body: string; documentId?: string }, now: Date) {
  if (!input.body.trim()) throw badRequest("Write the reply.");
  const req = await decide(user, requestId, now, {
    status: "replied",
    payload: { body: input.body.trim() },
    documentId: input.documentId,
  });
  await notifyCitizen(req.citizenId, {
    subject: `Reply to your RTI request ${req.regNo}`,
    lines: [
      `The CPIO has replied to ${req.regNo}.`,
      input.body.trim(),
      "If you're not satisfied, you can file a first appeal within 30 days.",
    ],
    requestId: req.id,
  });
}

export async function rejectRequest(user: User, requestId: string, input: { reason: string }, now: Date) {
  if (!input.reason.trim()) throw badRequest("Give the reason for rejecting this request.");
  const req = await decide(user, requestId, now, { status: "rejected", payload: { reason: input.reason.trim() } });
  await notifyCitizen(req.citizenId, {
    subject: `Your RTI request ${req.regNo} was rejected`,
    lines: [
      `The CPIO rejected ${req.regNo}.`,
      `Reason: ${input.reason.trim()}`,
      "You can file a first appeal within 30 days.",
    ],
    requestId: req.id,
  });
}
