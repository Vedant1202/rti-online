import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { requests } from "@/lib/db/schema";
import { badRequest, conflict } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { addEvent } from "./events";
import { loadAssigned } from "./cpio";
import { notifyCitizen } from "./notify";

/**
 * s.7(1) proviso: 48 hours when information concerns life or liberty. Commissions have held that the
 * applicant must show this, so the CPIO accepts or declines the claim and records why.
 */
export async function decideLifeLiberty(user: User, requestId: string, input: { accept: boolean; reason: string }, now: Date) {
  const req = await loadAssigned(user, requestId);
  if (!input.reason.trim()) throw badRequest("Record the reason for your decision.");
  if (req.lifeLiberty !== "claimed") throw conflict("There is no undecided life-or-liberty claim on this request.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(requests)
      .set({ lifeLiberty: input.accept ? "accepted" : "declined" })
      .where(and(eq(requests.id, req.id), eq(requests.lifeLiberty, "claimed")))
      .returning({ id: requests.id });
    if (updated.length === 0) throw conflict("This claim has already been decided.");
    await addEvent(tx, {
      requestId: req.id,
      type: input.accept ? "life_liberty_accepted" : "life_liberty_declined",
      actorId: user.id,
      at: now,
      payload: { reason: input.reason.trim() },
    });
  });
  await notifyCitizen(req.citizenId, {
    subject: input.accept ? `48-hour reply accepted for ${req.regNo}` : `48-hour reply declined for ${req.regNo}`,
    lines: [
      input.accept
        ? "The CPIO accepted that your request concerns life or liberty. A reply is due within 48 hours of filing."
        : "The CPIO decided the 48-hour limit doesn't apply. The normal 30 days apply.",
      `Reason: ${input.reason.trim()}`,
    ],
    requestId: req.id,
  });
}
