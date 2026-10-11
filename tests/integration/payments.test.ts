import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { PDF, seeded } from "../helpers/fixtures";
import { createRequest } from "@/lib/services/requests";
import { saveUpload } from "@/lib/services/uploads";
import { startCheckout, completePayment, signWebhook, handleWebhook } from "@/lib/services/payments";
import { payments, requestEvents, requests } from "@/lib/db/schema";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const now = new Date("2026-10-08T10:00:00Z");

describe("mock payments", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  let requestId: string;

  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
    s = await seeded(db);
    const auth = await s.auth("DOPPW");
    requestId = (await createRequest(s.citizen, { authorityId: auth.id, subject: "Pension", body: "Status", bpl: false }, now)).id;
  });

  it("charges ₹10 and reuses the open checkout on a double click", async () => {
    const a = await startCheckout(s.citizen, requestId, now);
    const b = await startCheckout(s.citizen, requestId, now);
    expect(a).toEqual(b);
    expect(a.kind).toBe("checkout");
    const [p] = await db.select().from(payments);
    expect(p.amountPaise).toBe(1000);
  });

  it("assigns a registration number and files the request on success", async () => {
    const c = await startCheckout(s.citizen, requestId, now);
    if (c.kind !== "checkout") throw new Error("expected checkout");
    const result = await completePayment(c.paymentId, "success", now);
    expect(result.regNo).toBe("DOPPW/R/E/26/00001");
    const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
    expect(req).toMatchObject({ status: "filed", regNo: "DOPPW/R/E/26/00001" });
    expect(req.filedAt).toEqual(now);
    const events = await db.select().from(requestEvents).where(eq(requestEvents.requestId, requestId));
    expect(events.map((e) => e.type)).toEqual(["filed"]);
    expect(outbox.at(-1)?.subject).toContain("DOPPW/R/E/26/00001");
  });

  it("creates exactly one payment and one number when the webhook fires 5 times at once", async () => {
    const c = await startCheckout(s.citizen, requestId, now);
    if (c.kind !== "checkout") throw new Error("expected checkout");
    const signature = signWebhook(c.paymentId, "success");
    const results = await Promise.all(
      Array.from({ length: 5 }, () => handleWebhook(c.paymentId, { outcome: "success", signature }, now)),
    );
    expect(new Set(results.map((r) => r.regNo))).toEqual(new Set(["DOPPW/R/E/26/00001"]));
    expect(await db.select().from(payments)).toHaveLength(1);
    const events = await db.select().from(requestEvents);
    expect(events.filter((e) => e.type === "filed")).toHaveLength(1);
    expect(outbox.filter((m) => m.subject.includes("filed"))).toHaveLength(1);
  });

  it("rejects a webhook with a bad signature", async () => {
    const c = await startCheckout(s.citizen, requestId, now);
    if (c.kind !== "checkout") throw new Error("expected checkout");
    await expect(handleWebhook(c.paymentId, { outcome: "success", signature: "bad" }, now)).rejects.toThrow(
      /signature/i,
    );
  });

  it("leaves the request payable after a failed payment", async () => {
    const c = await startCheckout(s.citizen, requestId, now);
    if (c.kind !== "checkout") throw new Error("expected checkout");
    await completePayment(c.paymentId, "failure", now);
    const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
    expect(req).toMatchObject({ status: "pending_payment", regNo: null });
    const retry = await startCheckout(s.citizen, requestId, now);
    expect(retry.kind === "checkout" && retry.paymentId).not.toBe(c.paymentId);
  });

  it("numbers requests per authority in sequence", async () => {
    const auth = await s.auth("DOPPW");
    const ids = [requestId];
    for (let i = 0; i < 2; i++) {
      ids.push((await createRequest(s.citizen, { authorityId: auth.id, subject: `R${i}`, body: "x", bpl: false }, now)).id);
    }
    const nums = [];
    for (const id of ids) {
      const c = await startCheckout(s.citizen, id, now);
      if (c.kind !== "checkout") throw new Error("expected checkout");
      nums.push((await completePayment(c.paymentId, "success", now)).regNo);
    }
    expect(nums).toEqual(["DOPPW/R/E/26/00001", "DOPPW/R/E/26/00002", "DOPPW/R/E/26/00003"]);
  });

  it("files a BPL request without payment", async () => {
    const auth = await s.auth("DOPPW");
    const cert = await saveUpload(s.citizen, { filename: "bpl.pdf", bytes: PDF, kind: "bpl_certificate" });
    const bplReq = await createRequest(
      s.citizen,
      { authorityId: auth.id, subject: "BPL", body: "x", bpl: true, bplCertificateId: cert.id },
      now,
    );
    const r = await startCheckout(s.citizen, bplReq.id, now);
    expect(r).toEqual({ kind: "filed", regNo: "DOPPW/R/E/26/00001" });
  });

  it("refuses to start a checkout for someone else's request", async () => {
    await expect(startCheckout(s.other, requestId, now)).rejects.toThrow();
  });
});
