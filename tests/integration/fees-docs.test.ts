import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { PDF, seeded } from "../helpers/fixtures";
import { fileAndForward } from "../helpers/flows";
import { requestFee, closeUnpaid, requestDocuments, uploadRequestedDocument } from "@/lib/services/cpio-extra";
import { completePayment, startCheckout } from "@/lib/services/payments";
import { getCaseView } from "@/lib/services/views";
import { saveUpload } from "@/lib/services/uploads";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const day = (n: number) => new Date(Date.UTC(2026, 9, 8 + n, 10));

describe("additional fee (s.7(3), Rule 4)", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
    s = await seeded(db);
  });

  async function setup() {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    const filed = await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), cpio, day(0));
    return { ...filed, cpio };
  }

  it("totals line items and pauses the clock until paid", async () => {
    const { id, cpio } = await setup();
    await requestFee(cpio, id, { items: [{ label: "Photocopies (A4)", quantity: 12, unitPaise: 200 }] }, day(10));
    const paused = await getCaseView(s.citizen, id, day(20));
    expect(paused.current.status).toBe("fee_requested");
    expect(paused.demands[0].totalPaise).toBe(2400);
    expect(paused.clocks.reply).toMatchObject({ state: "paused", daysLeftWhenPaused: 20 });
    expect(outbox.at(-1)?.text).toContain("₹24");

    const c = await startCheckout(s.citizen, id, day(17));
    expect(c).toMatchObject({ kind: "checkout", amountPaise: 2400 });
    if (c.kind !== "checkout") throw new Error();
    await completePayment(c.paymentId, "success", day(17));

    const resumed = await getCaseView(s.citizen, id, day(18));
    expect(resumed.current.status).toBe("forwarded");
    // Due date moves by exactly the 7 unpaid days: 7 Nov + 7 = 14 Nov.
    expect(resumed.clocks.reply).toMatchObject({ state: "running", dueAt: day(37) });
    expect(resumed.timeline.map((e) => e.type)).toEqual(["filed", "forwarded", "fee_requested", "fee_paid"]);
  });

  it("can close the request after 30 days unpaid, not before", async () => {
    const { id, cpio } = await setup();
    await requestFee(cpio, id, { items: [{ label: "CD copy", quantity: 1, unitPaise: 5000 }] }, day(5));
    await expect(closeUnpaid(cpio, id, day(30))).rejects.toThrow(/30 days/);
    await closeUnpaid(cpio, id, day(36));
    expect((await getCaseView(s.citizen, id, day(36))).current.status).toBe("closed_unpaid");
  });

  it("can't request a fee twice while one is unpaid", async () => {
    const { id, cpio } = await setup();
    await requestFee(cpio, id, { items: [{ label: "Pages", quantity: 2, unitPaise: 200 }] }, day(5));
    await expect(requestFee(cpio, id, { items: [{ label: "Pages", quantity: 2, unitPaise: 200 }] }, day(6))).rejects.toThrow();
  });
});

describe("documents requested", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  it("lets only the citizen upload, then returns it to the CPIO", async () => {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    const { id } = await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), cpio, day(0));
    await requestDocuments(cpio, id, { note: "Please upload your PPO copy." }, day(3));
    expect((await getCaseView(s.citizen, id, day(3))).current.status).toBe("documents_requested");

    const otherDoc = await saveUpload(s.other, { filename: "x.pdf", bytes: PDF, kind: "requested_document" });
    await expect(uploadRequestedDocument(s.other, id, { documentId: otherDoc.id }, day(4))).rejects.toThrow();

    const doc = await saveUpload(s.citizen, { filename: "ppo.pdf", bytes: PDF, kind: "requested_document" });
    await uploadRequestedDocument(s.citizen, id, { documentId: doc.id }, day(4));
    const view = await getCaseView(cpio, id, day(4));
    expect(view.current.status).toBe("forwarded");
    expect(view.timeline.at(-1)).toMatchObject({ type: "documents_uploaded" });
    expect(view.documents.some((d) => d.id === doc.id)).toBe(true);
  });
});
