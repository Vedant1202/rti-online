import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { authorities, users } from "@/lib/db/schema";
import { createRequest } from "@/lib/services/requests";
import { completePayment, startCheckout } from "@/lib/services/payments";
import { forwardRequest, transferRequest } from "@/lib/services/nodal";
import { replyToRequest, rejectRequest } from "@/lib/services/cpio";
import { requestFee } from "@/lib/services/cpio-extra";
import { fileAppeal, decideAppeal } from "@/lib/services/appeals";
import { plusAddress } from "./seed-data";

const DAY = 86_400_000;

/**
 * Demo cases in every interesting state, dated relative to now, for presentations.
 * Uses fake citizens on plus-addresses of the team inbox. Run after the base seed.
 */
export async function seedDemo(db: Db, opts: { emailBase: string; now: Date }) {
  const ago = (days: number) => new Date(opts.now.getTime() - days * DAY);
  const auth = async (code: string) => (await db.select().from(authorities).where(eq(authorities.code, code)))[0];
  const officer = async (code: string, tag: string) =>
    (await db.select().from(users).where(eq(users.email, plusAddress(opts.emailBase, `${code.toLowerCase()}.${tag}`))))[0];
  const citizen = async (tag: string, name: string) => {
    const email = plusAddress(opts.emailBase, tag);
    const [row] = await db.insert(users).values({ email, name }).onConflictDoNothing({ target: users.email }).returning();
    return row ?? (await db.select().from(users).where(eq(users.email, email)))[0];
  };
  const file = async (who: Awaited<ReturnType<typeof citizen>>, code: string, subject: string, body: string, at: Date) => {
    const req = await createRequest(who, { authorityId: (await auth(code)).id, subject, body, bpl: false }, at);
    const c = await startCheckout(who, req.id, at);
    if (c.kind === "checkout") await completePayment(c.paymentId, "success", at);
    return req.id;
  };

  const asha = await citizen("citizen.asha", "Asha (demo)");
  const ravi = await citizen("citizen.ravi", "Ravi (demo)");

  // 1. Replied in 12 days.
  const pension = await file(asha, "DOPPW", "Status of my pension file", "Please give the current status of my pension case, PPO 4471, and the file notings since July 2026.", ago(20));
  await forwardRequest(await officer("DOPPW", "nodal"), pension, { cpioIds: [(await officer("DOPPW", "cpio1")).id] }, ago(19));
  await replyToRequest(await officer("DOPPW", "cpio1"), pension, { body: "The pension was sanctioned on 2 October 2026. File notings are attached to the physical file and can be inspected on any working day." }, ago(8));

  // 2. Additional fee requested, clock paused.
  const tender = await file(ravi, "MORLY", "Lift tender at Pune station", "Copies of the tender documents and work order for the lift at platform 3, Pune station.", ago(15));
  await forwardRequest(await officer("MORLY", "nodal"), tender, { cpioIds: [(await officer("MORLY", "cpio1")).id] }, ago(14));
  await requestFee(await officer("MORLY", "cpio1"), tender, { items: [{ label: "Photocopies (A4), ₹2 per page", quantity: 42, unitPaise: 200 }] }, ago(6));

  // 3. Overdue: no reply in 30 days, appeal open (Hindi request).
  const overdue = await file(asha, "DOPPW", "ग्रेच्युटी भुगतान में देरी", "कृपया मेरी ग्रेच्युटी भुगतान में देरी का कारण और फ़ाइल की वर्तमान स्थिति बताएं। PPO संख्या 4471।", ago(34));
  await forwardRequest(await officer("DOPPW", "nodal"), overdue, { cpioIds: [(await officer("DOPPW", "cpio2")).id] }, ago(33));

  // 4. Transferred from DoPT to Home Affairs, waiting with the new nodal officer.
  const visa = await file(ravi, "DOPAT", "OCI card application status", "Status of my OCI card application filed in August 2026, reference OCI-2026-55821.", ago(3));
  await transferRequest(await officer("DOPAT", "nodal"), visa, { toAuthorityId: (await auth("MHOME")).id, note: "OCI cards are handled by the Ministry of Home Affairs." }, ago(2));

  // 5. Split across two CPIOs; one rejected, appealed, decided.
  const split = await file(asha, "MORLY", "Refund rules and my PNR refund", "1. The refund rules for cancelled tatkal tickets. 2. The status of the refund for PNR 4512398760.", ago(40));
  await forwardRequest(await officer("MORLY", "nodal"), split, { cpioIds: [(await officer("MORLY", "cpio1")).id, (await officer("MORLY", "cpio2")).id] }, ago(39));
  const parts = await db.query.requests.findMany({ where: (r, { eq }) => eq(r.parentId, split) });
  const [p1, p2] = parts.sort((a, b) => (a.regNo ?? "").localeCompare(b.regNo ?? ""));
  await replyToRequest(await officer("MORLY", "cpio1"), p1.id, { body: "The refund rules are in the Railway Passengers (Cancellation of Tickets and Refund of Fare) Rules, 2015, copy attached in the physical file." }, ago(30));
  await rejectRequest(await officer("MORLY", "cpio2"), p2.id, { reason: "Refund status is personal information of a third party under section 8(1)(j)." }, ago(28));
  const appeal = await fileAppeal(asha, { requestId: p2.id, ground: "Refused access to information requested", body: "The PNR is my own booking, so section 8(1)(j) does not apply." }, ago(25));
  await decideAppeal(await officer("MORLY", "faa"), appeal.id, { order: "The appeal is allowed. The PNR belongs to the appellant. The CPIO shall give the refund status within 15 days." }, ago(10));
}
