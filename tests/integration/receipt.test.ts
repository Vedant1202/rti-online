import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndForward } from "../helpers/flows";
import { createRequest } from "@/lib/services/requests";
import { completePayment, startCheckout } from "@/lib/services/payments";
import { requestFee } from "@/lib/services/cpio-extra";
import { getCaseView } from "@/lib/services/views";
import { payments } from "@/lib/db/schema";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const now = new Date("2026-10-11T10:00:00Z");

describe("payment receipt", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
    s = await seeded(db);
  });

  it("stores only the card brand and last 4, and shows them on the timeline and in the email", async () => {
    const auth = await s.auth("DOPPW");
    const req = await createRequest(s.citizen, { authorityId: auth.id, subject: "Pension", body: "Status", bpl: false }, now);
    const c = await startCheckout(s.citizen, req.id, now);
    if (c.kind !== "checkout") throw new Error();
    await completePayment(c.paymentId, "success", now, { brand: "visa", last4: "4242" });

    const [p] = await db.select().from(payments).where(eq(payments.id, c.paymentId));
    expect(p).toMatchObject({ cardBrand: "visa", cardLast4: "4242" });
    const view = await getCaseView(s.citizen, req.id, now);
    expect(view.timeline[0].payload).toMatchObject({ card: { brand: "visa", last4: "4242" }, amountPaise: 1000 });
    expect(outbox.at(-1)?.text).toContain("Paid ₹10 with Visa •••• 4242");
  });

  it("records the card used for an additional fee", async () => {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    const { id } = await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), cpio, now);
    await requestFee(cpio, id, { items: [{ label: "Pages", quantity: 5, unitPaise: 200 }] }, now);
    const c = await startCheckout(s.citizen, id, now);
    if (c.kind !== "checkout") throw new Error();
    await completePayment(c.paymentId, "success", now, { brand: "mastercard", last4: "4444" });
    const view = await getCaseView(s.citizen, id, now);
    expect(view.timeline.at(-1)).toMatchObject({ type: "fee_paid", payload: { card: { brand: "mastercard", last4: "4444" } } });
    expect(outbox.at(-1)?.text).toContain("Mastercard •••• 4444");
  });
});
