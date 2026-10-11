import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { PDF, seeded } from "../helpers/fixtures";
import { fileAndForward } from "../helpers/flows";
import { cpioQueue, replyToRequest, rejectRequest } from "@/lib/services/cpio";
import { getCaseView } from "@/lib/services/views";
import { saveUpload } from "@/lib/services/uploads";
import { documents } from "@/lib/db/schema";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const t0 = new Date("2026-10-08T10:00:00Z");
const t1 = new Date("2026-10-20T10:00:00Z");

describe("CPIO", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
    s = await seeded(db);
  });

  async function setup() {
    const auth = await s.auth("DOPPW");
    const nodal = await s.officer("DOPPW", "nodal");
    const cpio = await s.officer("DOPPW", "cpio1");
    const filed = await fileAndForward(s.citizen, auth.id, nodal, cpio, t0);
    return { ...filed, cpio };
  }

  it("lists assigned requests by due date", async () => {
    const { id, cpio } = await setup();
    const queue = await cpioQueue(cpio, t1);
    expect(queue.map((q) => q.id)).toEqual([id]);
    expect(queue[0].reply).toMatchObject({ state: "running", daysLeft: 18 });
    expect(await cpioQueue(await s.officer("DOPPW", "cpio2"), t1)).toHaveLength(0);
  });

  it("replies with text and a PDF; the citizen sees it and the clock stops", async () => {
    const { id, cpio } = await setup();
    const doc = await saveUpload(cpio, { filename: "reply.pdf", bytes: PDF, kind: "reply" });
    await replyToRequest(cpio, id, { body: "Your PPO was issued on 3 Oct.", documentId: doc.id }, t1);
    const view = await getCaseView(s.citizen, id, t1);
    expect(view.current.status).toBe("replied");
    expect(view.timeline.at(-1)).toMatchObject({ type: "replied", payload: { body: "Your PPO was issued on 3 Oct." } });
    expect(view.clocks.reply).toMatchObject({ state: "met" });
    const [linked] = await db.select().from(documents).where(eq(documents.id, doc.id));
    expect(linked.requestId).toBe(id);
    expect(outbox.at(-1)?.subject).toMatch(/reply/i);
  });

  it("rejects only with a reason", async () => {
    const { id, cpio } = await setup();
    await expect(rejectRequest(cpio, id, { reason: "   " }, t1)).rejects.toThrow();
    await rejectRequest(cpio, id, { reason: "Exempt under section 8(1)(j): personal information." }, t1);
    const view = await getCaseView(s.citizen, id, t1);
    expect(view.current.status).toBe("rejected");
    expect(view.clocks.appeal).toMatchObject({ state: "open" });
  });

  it("only the assigned CPIO can answer, and only once", async () => {
    const { id, cpio } = await setup();
    await expect(replyToRequest(await s.officer("DOPPW", "cpio2"), id, { body: "x" }, t1)).rejects.toThrow();
    await expect(replyToRequest(s.citizen, id, { body: "x" }, t1)).rejects.toThrow();
    await replyToRequest(cpio, id, { body: "Done" }, t1);
    await expect(replyToRequest(cpio, id, { body: "Again" }, t1)).rejects.toThrow(/already/i);
  });
});
