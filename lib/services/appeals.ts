import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities, documents, feeDemands, requestEvents, requests } from "@/lib/db/schema";
import type { AppealGround } from "@/lib/contract";
import { caseClocks } from "@/lib/rti/case-clock";
import { faaClock, secondAppealWindow } from "@/lib/rti/deadlines";
import { formatDate } from "@/lib/format";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { addEvent } from "./events";
import { assertCanView } from "./access";
import { linkUpload } from "./documents";
import { nextRegNo } from "./regno-db";
import { notifyCitizen } from "./notify";
import { assertOfficer } from "./officers";

async function appealable(user: User, requestId: string, now: Date) {
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
  if (!req || req.kind !== "R") throw notFound();
  if (req.citizenId !== user.id) throw forbidden();
  if (req.status === "split") throw badRequest("This request was split. Appeal the part you're not satisfied with.");
  if (req.status === "transferred") throw badRequest("This request was transferred. Appeal the transferred request.");
  const [events, demands] = await Promise.all([
    db.select().from(requestEvents).where(eq(requestEvents.requestId, req.id)),
    db.select().from(feeDemands).where(eq(feeDemands.requestId, req.id)),
  ]);
  const clocks = caseClocks(req, events, demands, now);
  return { req, clocks };
}

/** Preselects the ground from what happened: no reply, a rejection, or a reply. */
export async function suggestedGround(user: User, requestId: string, now: Date): Promise<AppealGround> {
  const { req, clocks } = await appealable(user, requestId, now);
  if (clocks.reply?.state === "overdue") return "No response within the time limit";
  if (req.status === "rejected") return "Refused access to information requested";
  if (req.status === "fee_requested") return "Unreasonable amount of fee required to pay";
  return "Provided incomplete, misleading or false information";
}

export async function getAppealWindow(user: User, requestId: string, now: Date) {
  return (await appealable(user, requestId, now)).clocks.appeal;
}

export async function fileAppeal(
  user: User,
  input: { requestId: string; ground: AppealGround; body: string; delayReason?: string },
  now: Date,
) {
  const { req, clocks } = await appealable(user, input.requestId, now);
  const window = clocks.appeal;
  if (!window || window.state === "not_yet") {
    throw conflict(
      window?.opensAt
        ? `You can appeal from ${formatDate(window.opensAt)}, when the reply deadline passes.`
        : "You can appeal once the authority replies or the reply deadline passes.",
    );
  }
  const delayReason = input.delayReason?.trim() || null;
  if (window.state === "late" && !delayReason) {
    throw badRequest("The 30-day appeal window has passed. Give the reason for the delay (s.19(1)).");
  }
  const db = await getDb();
  const [authority] = await db.select().from(authorities).where(eq(authorities.id, req.authorityId));

  const appeal = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: requests.id })
      .from(requests)
      .where(and(eq(requests.parentId, req.id), eq(requests.kind, "A")));
    if (existing.length) throw conflict("You have already appealed this request.");
    const regNo = await nextRegNo(tx, { authorityCode: authority.code, kind: "A", receipt: "E", at: now });
    const [created] = await tx
      .insert(requests)
      .values({
        regNo,
        kind: "A",
        receipt: "E",
        parentId: req.id,
        citizenId: req.citizenId,
        authorityId: req.authorityId,
        subject: `First appeal: ${req.subject}`,
        body: input.body.trim(),
        appealGround: input.ground,
        appealDelayReason: delayReason,
        status: "appeal_filed",
        filedAt: now,
        createdAt: now,
      })
      .returning();
    const payload = { regNo, appealId: created.id, ground: input.ground, late: window.state === "late" };
    await addEvent(tx, { requestId: created.id, type: "appeal_filed", actorId: user.id, at: now, payload });
    await addEvent(tx, { requestId: req.id, type: "appeal_filed", actorId: user.id, at: now, payload });
    return created;
  });

  await notifyCitizen(req.citizenId, {
    subject: `First appeal filed: ${appeal.regNo}`,
    lines: [
      `Your first appeal against ${req.regNo} was filed as ${appeal.regNo}. No fee is charged.`,
      "The First Appellate Authority must decide within 30 days, or 45 days if extended with reasons.",
    ],
    requestId: req.id,
  });
  return appeal;
}

async function loadAppeal(id: string) {
  const db = await getDb();
  const [appeal] = await db.select().from(requests).where(eq(requests.id, id));
  if (!appeal || appeal.kind !== "A") throw notFound();
  const events = await db.select().from(requestEvents).where(eq(requestEvents.requestId, id)).orderBy(asc(requestEvents.at));
  const extended = events.some((e) => e.type === "appeal_extended");
  const decided = events.find((e) => e.type === "appeal_decided");
  return { appeal, events, extended, decidedAt: decided?.at ?? null };
}

const clockOf = (a: Awaited<ReturnType<typeof loadAppeal>>, now: Date) =>
  faaClock({ filedAt: a.appeal.filedAt!, extended: a.extended, decidedAt: a.decidedAt }, now);

export async function faaQueue(user: User, now: Date) {
  if (user.role !== "faa" && user.role !== "admin") throw forbidden();
  const db = await getDb();
  const rows = await db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.kind, "A"),
        inArray(requests.status, ["appeal_filed"]),
        user.role === "admin" ? undefined : eq(requests.authorityId, user.authorityId!),
      ),
    )
    .orderBy(asc(requests.filedAt));
  const out = [];
  for (const r of rows) out.push({ ...r, clock: clockOf(await loadAppeal(r.id), now) });
  return out;
}

export async function extendAppeal(user: User, appealId: string, input: { reason: string }, now: Date) {
  const a = await loadAppeal(appealId);
  assertOfficer(user, "faa", a.appeal.authorityId);
  if (!input.reason.trim()) throw badRequest("Record the reason for the extension (s.19(6)).");
  if (!clockOf(a, now).canExtend) throw conflict("This appeal can't be extended: it was already extended, decided, or day 30 has passed.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const payload = { reason: input.reason.trim(), appealRegNo: a.appeal.regNo };
    await addEvent(tx, { requestId: a.appeal.id, type: "appeal_extended", actorId: user.id, at: now, payload });
    await addEvent(tx, { requestId: a.appeal.parentId!, type: "appeal_extended", actorId: user.id, at: now, payload });
  });
  await notifyCitizen(a.appeal.citizenId, {
    subject: `Decision on ${a.appeal.regNo} extended to 45 days`,
    lines: [`The First Appellate Authority extended the time to decide your appeal. Reason: ${input.reason.trim()}`],
    requestId: a.appeal.parentId!,
  });
}

export async function decideAppeal(user: User, appealId: string, input: { order: string; documentId?: string }, now: Date) {
  const a = await loadAppeal(appealId);
  assertOfficer(user, "faa", a.appeal.authorityId);
  if (!input.order.trim()) throw badRequest("Write the order.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(requests)
      .set({ status: "appeal_decided", closedAt: now })
      .where(and(eq(requests.id, a.appeal.id), eq(requests.status, "appeal_filed")))
      .returning({ id: requests.id });
    if (claimed.length === 0) throw conflict("This appeal has already been decided.");
    if (input.documentId) await linkUpload(tx, user, input.documentId, a.appeal.id, "order");
    const payload = { order: input.order.trim(), documentId: input.documentId ?? null, appealRegNo: a.appeal.regNo };
    await addEvent(tx, { requestId: a.appeal.id, type: "appeal_decided", actorId: user.id, at: now, payload });
    await addEvent(tx, { requestId: a.appeal.parentId!, type: "appeal_decided", actorId: user.id, at: now, payload });
  });
  await notifyCitizen(a.appeal.citizenId, {
    subject: `Decision on your first appeal ${a.appeal.regNo}`,
    lines: [
      input.order.trim(),
      `If you're still not satisfied, you can file a second appeal with the Central Information Commission within 90 days (by ${formatDate(secondAppealWindow(now))}).`,
    ],
    requestId: a.appeal.parentId!,
  });
}

export async function getAppealView(user: User, appealId: string, now: Date) {
  const a = await loadAppeal(appealId);
  assertCanView(user, a.appeal);
  const db = await getDb();
  const [original] = await db.select().from(requests).where(eq(requests.id, a.appeal.parentId!));
  const [authority] = await db.select().from(authorities).where(eq(authorities.id, a.appeal.authorityId));
  const docs = await db
    .select()
    .from(documents)
    .where(inArray(documents.requestId, [a.appeal.id, original.id]))
    .orderBy(asc(documents.createdAt));
  const clock = clockOf(a, now);
  const deadlineForSecond = a.decidedAt ?? (clock.state !== "met" ? clock.dueAt : null);
  return {
    appeal: a.appeal,
    original,
    authority: authority.name,
    events: a.events.map((e) => ({ ...e, actorRole: null, actorName: null })),
    documents: docs,
    clock,
    extended: a.extended,
    secondAppealBy: deadlineForSecond ? secondAppealWindow(deadlineForSecond) : null,
  };
}
