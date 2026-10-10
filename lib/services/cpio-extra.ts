import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { feeDemands, requests } from "@/lib/db/schema";
import type { FeeItem } from "@/lib/contract";
import { DAY_MS } from "@/lib/rti/deadlines";
import { feeTotalPaise, formatRupees } from "@/lib/rti/fees";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { addEvent } from "./events";
import { linkUpload } from "./documents";
import { loadAssigned } from "./cpio";
import { notifyCitizen } from "./notify";

/** s.7(3): ask for an additional fee with its calculation. The reply clock pauses until it's paid. */
export async function requestFee(user: User, requestId: string, input: { items: FeeItem[] }, now: Date) {
  const req = await loadAssigned(user, requestId);
  if (req.status !== "forwarded") throw conflict("A fee can only be requested on an open request.");
  const total = feeTotalPaise(input.items);
  if (total <= 0) throw badRequest("The fee must be more than ₹0.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(requests)
      .set({ status: "fee_requested" })
      .where(and(eq(requests.id, req.id), eq(requests.status, "forwarded")))
      .returning({ id: requests.id });
    if (claimed.length === 0) throw conflict("This request changed. Reload and try again.");
    const [demand] = await tx
      .insert(feeDemands)
      .values({ requestId: req.id, items: input.items, totalPaise: total, sentAt: now })
      .returning();
    await addEvent(tx, {
      requestId: req.id,
      type: "fee_requested",
      actorId: user.id,
      at: now,
      payload: { demandId: demand.id, items: input.items, totalPaise: total },
    });
  });
  const breakdown = input.items.map((i) => `• ${i.label}: ${i.quantity} × ${formatRupees(i.unitPaise)}`).join("\n");
  await notifyCitizen(req.citizenId, {
    subject: `Additional fee of ${formatRupees(total)} requested for ${req.regNo}`,
    lines: [
      `The CPIO needs an additional fee of ${formatRupees(total)} to provide the information:`,
      breakdown,
      "The 30-day reply clock is paused until you pay (RTI Act s.7(3)).",
    ],
    requestId: req.id,
  });
}

/** Our rule (not the Act's): a request may be closed once a fee has been unpaid for 30 days. */
export async function closeUnpaid(user: User, requestId: string, now: Date) {
  const req = await loadAssigned(user, requestId);
  if (req.status !== "fee_requested") throw conflict("There is no unpaid fee on this request.");
  const db = await getDb();
  const [demand] = await db
    .select()
    .from(feeDemands)
    .where(and(eq(feeDemands.requestId, req.id), isNull(feeDemands.paidAt)))
    .orderBy(desc(feeDemands.sentAt))
    .limit(1);
  if (!demand || now.getTime() - demand.sentAt.getTime() < 30 * DAY_MS) {
    throw conflict("The fee must stay unpaid for 30 days before the request can be closed.");
  }
  await db.transaction(async (tx) => {
    await tx.update(requests).set({ status: "closed_unpaid", closedAt: now }).where(eq(requests.id, req.id));
    await addEvent(tx, { requestId: req.id, type: "closed_unpaid", actorId: user.id, at: now });
  });
  await notifyCitizen(req.citizenId, {
    subject: `${req.regNo} closed: additional fee not paid`,
    lines: [`The additional fee for ${req.regNo} wasn't paid within 30 days, so the request was closed.`],
    requestId: req.id,
  });
}

export async function requestDocuments(user: User, requestId: string, input: { note: string }, now: Date) {
  const req = await loadAssigned(user, requestId);
  if (req.status !== "forwarded") throw conflict("Documents can only be requested on an open request.");
  if (!input.note.trim()) throw badRequest("Say which document you need.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(requests).set({ status: "documents_requested" }).where(eq(requests.id, req.id));
    await addEvent(tx, { requestId: req.id, type: "documents_requested", actorId: user.id, at: now, payload: { note: input.note.trim() } });
  });
  await notifyCitizen(req.citizenId, {
    subject: `Document needed for ${req.regNo}`,
    lines: [`The CPIO asked for a document: ${input.note.trim()}`, "Upload it from your request page."],
    requestId: req.id,
  });
}

export async function uploadRequestedDocument(user: User, requestId: string, input: { documentId: string }, now: Date) {
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
  if (!req) throw notFound();
  if (req.citizenId !== user.id) throw forbidden();
  if (req.status !== "documents_requested") throw conflict("No document has been requested.");
  await db.transaction(async (tx) => {
    await linkUpload(tx, user, input.documentId, req.id, "requested_document");
    await tx.update(requests).set({ status: "forwarded" }).where(eq(requests.id, req.id));
    await addEvent(tx, {
      requestId: req.id,
      type: "documents_uploaded",
      actorId: user.id,
      at: now,
      payload: { documentId: input.documentId },
    });
  });
}
