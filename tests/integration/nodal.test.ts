import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { PDF, seeded } from "../helpers/fixtures";
import { fileAndPay } from "../helpers/flows";
import { forwardRequest, transferRequest, nodalInbox } from "@/lib/services/nodal";
import { getCaseView } from "@/lib/services/views";
import { saveUpload } from "@/lib/services/uploads";
import { createRequest } from "@/lib/services/requests";
import { completePayment, startCheckout } from "@/lib/services/payments";
import { documents, requests } from "@/lib/db/schema";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const t0 = new Date("2026-10-08T10:00:00Z");
const t1 = new Date("2026-10-10T10:00:00Z");

describe("nodal officer", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
    s = await seeded(db);
  });

  it("sees new requests for their authority with a 5-day transfer timer", async () => {
    const pension = await s.auth("DOPPW");
    const rail = await s.auth("MORLY");
    const { regNo } = await fileAndPay(s.citizen, pension.id, t0);
    await fileAndPay(s.citizen, rail.id, t0);
    const inbox = await nodalInbox(await s.officer("DOPPW", "nodal"), t1);
    expect(inbox.map((r) => r.regNo)).toEqual([regNo]);
    expect(inbox[0].transfer).toMatchObject({ state: "running", daysLeft: 3 });
  });

  it("forwards to one CPIO", async () => {
    const auth = await s.auth("DOPPW");
    const { id } = await fileAndPay(s.citizen, auth.id, t0);
    const cpio = await s.officer("DOPPW", "cpio1");
    await forwardRequest(await s.officer("DOPPW", "nodal"), id, { cpioIds: [cpio.id] }, t1);
    const [req] = await db.select().from(requests).where(eq(requests.id, id));
    expect(req).toMatchObject({ status: "forwarded", assignedCpioId: cpio.id });
    expect(outbox.at(-1)?.subject).toMatch(/forwarded/i);
  });

  it("splits across several CPIOs into numbered parts under one case", async () => {
    const auth = await s.auth("DOPPW");
    const { id, regNo } = await fileAndPay(s.citizen, auth.id, t0);
    const c1 = await s.officer("DOPPW", "cpio1");
    const c2 = await s.officer("DOPPW", "cpio2");
    await forwardRequest(await s.officer("DOPPW", "nodal"), id, { cpioIds: [c1.id, c2.id] }, t1);
    const view = await getCaseView(s.citizen, id, t1);
    expect(view.current.status).toBe("split");
    expect(view.parts.map((p) => p.regNo)).toEqual([`${regNo}/1`, `${regNo}/2`]);
    expect(view.parts.map((p) => p.assignedCpioId)).toEqual([c1.id, c2.id]);
    expect(view.parts[0].clocks.reply).toMatchObject({ state: "running", daysLeft: 28 });
  });

  it("transfers to another authority with a new T number, on the same case page", async () => {
    const pension = await s.auth("DOPPW");
    const home = await s.auth("MHOME");
    const req = await createRequest(
      s.citizen,
      { authorityId: pension.id, subject: "Visa", body: "Visa file status", bpl: false,
        attachmentId: (await saveUpload(s.citizen, { filename: "a.pdf", bytes: PDF, kind: "attachment" })).id },
      t0,
    );
    const c = await startCheckout(s.citizen, req.id, t0);
    if (c.kind !== "checkout") throw new Error("checkout");
    await completePayment(c.paymentId, "success", t0);

    const moved = await transferRequest(
      await s.officer("DOPPW", "nodal"),
      req.id,
      { toAuthorityId: home.id, note: "Visas are handled by the Ministry of Home Affairs." },
      t1,
    );
    expect(moved.regNo).toBe("MHOME/R/T/26/00001");

    const view = await getCaseView(s.citizen, req.id, t1);
    expect(view.current.id).toBe(moved.id);
    expect(view.chain.map((c) => c.regNo)).toEqual(["DOPPW/R/E/26/00001", "MHOME/R/T/26/00001"]);
    expect(view.timeline.map((e) => e.type)).toEqual(["filed", "transferred_out", "transferred_in"]);
    // The new authority's 30 days start on receipt.
    expect(view.clocks.reply).toMatchObject({ state: "running", daysLeft: 30 });
    // The receiving authority can see the attachment.
    const docs = await db.select().from(documents).where(eq(documents.requestId, moved.id));
    expect(docs).toHaveLength(1);
    expect((await nodalInbox(await s.officer("MHOME", "nodal"), t1)).map((r) => r.id)).toEqual([moved.id]);
  });

  it("only that authority's nodal officer can act", async () => {
    const auth = await s.auth("DOPPW");
    const { id } = await fileAndPay(s.citizen, auth.id, t0);
    const cpio = await s.officer("DOPPW", "cpio1");
    await expect(forwardRequest(await s.officer("MORLY", "nodal"), id, { cpioIds: [cpio.id] }, t1)).rejects.toThrow();
    await expect(forwardRequest(cpio, id, { cpioIds: [cpio.id] }, t1)).rejects.toThrow();
    await expect(forwardRequest(s.citizen, id, { cpioIds: [cpio.id] }, t1)).rejects.toThrow();
  });

  it("can't forward to a CPIO of another authority", async () => {
    const auth = await s.auth("DOPPW");
    const { id } = await fileAndPay(s.citizen, auth.id, t0);
    const foreign = await s.officer("MORLY", "cpio1");
    await expect(
      forwardRequest(await s.officer("DOPPW", "nodal"), id, { cpioIds: [foreign.id] }, t1),
    ).rejects.toThrow(/CPIO/);
  });

  it("can't act twice on the same request", async () => {
    const auth = await s.auth("DOPPW");
    const { id } = await fileAndPay(s.citizen, auth.id, t0);
    const nodal = await s.officer("DOPPW", "nodal");
    const cpio = await s.officer("DOPPW", "cpio1");
    await forwardRequest(nodal, id, { cpioIds: [cpio.id] }, t1);
    await expect(forwardRequest(nodal, id, { cpioIds: [cpio.id] }, t1)).rejects.toThrow(/already/i);
  });
});
