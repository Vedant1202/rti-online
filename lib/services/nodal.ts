import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities, documents, requests, users } from "@/lib/db/schema";
import { transferClock } from "@/lib/rti/deadlines";
import { splitRegNo } from "@/lib/rti/regno";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { addEvent } from "./events";
import { nextRegNo } from "./regno-db";
import { notifyCitizen } from "./notify";
import { assertOfficer } from "./officers";

/** New requests waiting for routing, with the s.6(3) five-day timer. */
export async function nodalInbox(user: User, now: Date) {
  if (user.role !== "nodal" && user.role !== "admin") throw forbidden();
  const db = await getDb();
  const rows = await db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.status, "filed"),
        eq(requests.kind, "R"),
        user.role === "admin" ? undefined : eq(requests.authorityId, user.authorityId!),
      ),
    )
    .orderBy(asc(requests.filedAt));
  return rows.map((r) => ({ ...r, transfer: transferClock(r.filedAt!, null, now) }));
}

async function loadFiled(user: User, requestId: string) {
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
  if (!req) throw notFound();
  assertOfficer(user, "nodal", req.authorityId);
  if (req.status !== "filed") throw conflict("This request has already been routed.");
  return req;
}

/** Forward to one CPIO, or split into numbered parts when several CPIOs hold the information. */
export async function forwardRequest(user: User, requestId: string, input: { cpioIds: string[] }, now: Date) {
  const req = await loadFiled(user, requestId);
  const db = await getDb();
  const cpioIds = [...new Set(input.cpioIds)];
  const cpios = await db
    .select()
    .from(users)
    .where(and(inArray(users.id, cpioIds), eq(users.role, "cpio"), eq(users.authorityId, req.authorityId)));
  if (cpios.length !== cpioIds.length) throw badRequest("Choose CPIOs from this authority.");
  const ordered = cpioIds.map((id) => cpios.find((c) => c.id === id)!);

  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(requests)
      .set(ordered.length === 1 ? { status: "forwarded", assignedCpioId: ordered[0].id } : { status: "split" })
      .where(and(eq(requests.id, req.id), eq(requests.status, "filed")))
      .returning({ id: requests.id });
    if (claimed.length === 0) throw conflict("This request has already been routed.");

    if (ordered.length === 1) {
      await addEvent(tx, {
        requestId: req.id,
        type: "forwarded",
        actorId: user.id,
        at: now,
        payload: { cpioIds: [ordered[0].id], cpioNames: ordered[0].name },
      });
      return;
    }

    await addEvent(tx, { requestId: req.id, type: "split", actorId: user.id, at: now, payload: { parts: ordered.length } });
    const parentDocs = await tx.select().from(documents).where(eq(documents.requestId, req.id));
    for (const [i, cpio] of ordered.entries()) {
      const [part] = await tx
        .insert(requests)
        .values({
          regNo: splitRegNo(req.regNo!, i + 1),
          kind: "R",
          receipt: req.receipt,
          parentId: req.id,
          citizenId: req.citizenId,
          authorityId: req.authorityId,
          assignedCpioId: cpio.id,
          subject: req.subject,
          body: req.body,
          bpl: req.bpl,
          lifeLiberty: req.lifeLiberty,
          lifeLibertyReason: req.lifeLibertyReason,
          status: "forwarded",
          filedAt: req.filedAt,
          createdAt: now,
        })
        .returning();
      await addEvent(tx, {
        requestId: part.id,
        type: "forwarded",
        actorId: user.id,
        at: now,
        payload: { cpioIds: [cpio.id], cpioNames: cpio.name },
      });
      // Each part can open the original attachments.
      for (const d of parentDocs.filter((x) => x.kind === "attachment")) {
        await tx.insert(documents).values({ ...d, id: undefined, requestId: part.id });
      }
    }
  });

  const names = ordered.map((c) => c.name).join(", ");
  await notifyCitizen(req.citizenId, {
    subject: `${req.regNo} forwarded to ${ordered.length === 1 ? "the CPIO" : `${ordered.length} officers`}`,
    lines: [
      ordered.length === 1
        ? `Your request ${req.regNo} was forwarded to ${names}, who will reply.`
        : `Your request ${req.regNo} was sent to ${ordered.length} officers (${names}). Each part has its own number and reply.`,
    ],
    requestId: req.id,
  });
}

/** s.6(3): move the request to the authority that holds the information, under a new "T" number. */
export async function transferRequest(
  user: User,
  requestId: string,
  input: { toAuthorityId: string; note: string },
  now: Date,
) {
  const req = await loadFiled(user, requestId);
  const db = await getDb();
  if (input.toAuthorityId === req.authorityId) throw badRequest("Choose a different authority.");
  const [target] = await db.select().from(authorities).where(eq(authorities.id, input.toAuthorityId));
  if (!target?.isCentral) throw badRequest("Choose a central authority to transfer to.");
  const [source] = await db.select().from(authorities).where(eq(authorities.id, req.authorityId));

  const moved = await db.transaction(async (tx) => {
    const claimed = await tx
      .update(requests)
      .set({ status: "transferred", closedAt: now })
      .where(and(eq(requests.id, req.id), eq(requests.status, "filed")))
      .returning({ id: requests.id });
    if (claimed.length === 0) throw conflict("This request has already been routed.");

    const regNo = await nextRegNo(tx, { authorityCode: target.code, kind: "R", receipt: "T", at: now });
    const [created] = await tx
      .insert(requests)
      .values({
        regNo,
        kind: "R",
        receipt: "T",
        transferredFromId: req.id,
        citizenId: req.citizenId,
        authorityId: target.id,
        subject: req.subject,
        body: req.body,
        bpl: req.bpl,
        lifeLiberty: req.lifeLiberty,
        lifeLibertyReason: req.lifeLibertyReason,
        status: "filed",
        filedAt: now, // the receiving authority's clock starts on receipt
        createdAt: now,
      })
      .returning();
    await addEvent(tx, {
      requestId: req.id,
      type: "transferred_out",
      actorId: user.id,
      at: now,
      payload: { toAuthority: target.name, newRegNo: regNo, newRequestId: created.id, note: input.note.trim() },
    });
    await addEvent(tx, {
      requestId: created.id,
      type: "transferred_in",
      actorId: user.id,
      at: now,
      payload: { authority: target.name, regNo, fromRegNo: req.regNo, fromAuthority: source.name },
    });
    const docs = await tx.select().from(documents).where(eq(documents.requestId, req.id));
    for (const d of docs) await tx.insert(documents).values({ ...d, id: undefined, requestId: created.id });
    return created;
  });

  await notifyCitizen(req.citizenId, {
    subject: `${req.regNo} transferred to ${target.name}`,
    lines: [
      `${source.name} transferred your request to ${target.name} under section 6(3) of the RTI Act.`,
      `New registration number: ${moved.regNo}. Reason: ${input.note.trim()}`,
      `${target.name} must reply within 30 days of receiving it.`,
    ],
    requestId: req.id,
  });
  return moved;
}
