import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndForward, fileAndPay } from "../helpers/flows";
import { fileAppeal, faaQueue, extendAppeal, decideAppeal, getAppealView, suggestedGround } from "@/lib/services/appeals";
import { forwardRequest } from "@/lib/services/nodal";
import { rejectRequest } from "@/lib/services/cpio";
import { getCaseView } from "@/lib/services/views";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const day = (n: number) => new Date(Date.UTC(2026, 9, 8 + n, 10));

describe("first appeal (s.19(1)) and FAA (s.19(6))", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
    s = await seeded(db);
  });

  async function forwarded() {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    return { ...(await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), cpio, day(0))), cpio };
  }

  it("is not allowed before the reply deadline, and says when it opens", async () => {
    const { id } = await forwarded();
    await expect(
      fileAppeal(s.citizen, { requestId: id, ground: "No response within the time limit", body: "No reply" }, day(10)),
    ).rejects.toThrow(/7 Nov 2026/);
  });

  it("opens when the deadline passes with no reply, preselecting 'No response'", async () => {
    const { id, regNo } = await forwarded();
    expect(await suggestedGround(s.citizen, id, day(31))).toBe("No response within the time limit");
    const appeal = await fileAppeal(
      s.citizen,
      { requestId: id, ground: "No response within the time limit", body: "The CPIO has not replied." },
      day(31),
    );
    expect(appeal.regNo).toBe("DOPPW/A/E/26/00001");
    const view = await getCaseView(s.citizen, id, day(31));
    expect(view.appeals.map((a) => a.regNo)).toEqual(["DOPPW/A/E/26/00001"]);
    expect(view.timeline.at(-1)).toMatchObject({ type: "appeal_filed", payload: { regNo: "DOPPW/A/E/26/00001" } });
    expect(outbox.at(-1)?.subject).toContain("DOPPW/A/E/26/00001");
    expect(regNo).toBe("DOPPW/R/E/26/00001");
  });

  it("allows a late appeal only with a reason for the delay", async () => {
    const { id, cpio } = await forwarded();
    await rejectRequest(cpio, id, { reason: "Exempt under 8(1)(j)" }, day(5));
    expect(await suggestedGround(s.citizen, id, day(40))).toBe("Refused access to information requested");
    await expect(
      fileAppeal(s.citizen, { requestId: id, ground: "Refused access to information requested", body: "x" }, day(40)),
    ).rejects.toThrow(/reason for the delay/i);
    const a = await fileAppeal(
      s.citizen,
      { requestId: id, ground: "Refused access to information requested", body: "x", delayReason: "I was in hospital." },
      day(40),
    );
    expect(a.appealDelayReason).toBe("I was in hospital.");
  });

  it("allows one appeal per request, and a split part is appealed on its own", async () => {
    const auth = await s.auth("DOPPW");
    const { id } = await fileAndPay(s.citizen, auth.id, day(0));
    const c1 = await s.officer("DOPPW", "cpio1");
    const c2 = await s.officer("DOPPW", "cpio2");
    await forwardRequest(await s.officer("DOPPW", "nodal"), id, { cpioIds: [c1.id, c2.id] }, day(1));
    const view = await getCaseView(s.citizen, id, day(1));
    await expect(
      fileAppeal(s.citizen, { requestId: id, ground: "Any other ground", body: "x" }, day(35)),
    ).rejects.toThrow(/part/i);
    const part2 = view.parts[1];
    await rejectRequest(c2, part2.id, { reason: "Not held" }, day(3));
    const a = await fileAppeal(s.citizen, { requestId: part2.id, ground: "Any other ground", body: "x" }, day(4));
    expect(a.parentId).toBe(part2.id);
    await expect(
      fileAppeal(s.citizen, { requestId: part2.id, ground: "Any other ground", body: "again" }, day(5)),
    ).rejects.toThrow(/already/i);
    expect((await getCaseView(s.citizen, id, day(5))).appeals).toHaveLength(1);
  });

  it("FAA has 30 days, can extend once to 45 with a reason, then decides", async () => {
    const { id } = await forwarded();
    const appeal = await fileAppeal(
      s.citizen,
      { requestId: id, ground: "No response within the time limit", body: "No reply" },
      day(31),
    );
    const faa = await s.officer("DOPPW", "faa");
    const queue = await faaQueue(faa, day(32));
    expect(queue.map((q) => q.id)).toEqual([appeal.id]);
    expect(queue[0].clock).toMatchObject({ state: "running", daysLeft: 29, canExtend: true });

    await expect(extendAppeal(faa, appeal.id, { reason: " " }, day(40))).rejects.toThrow();
    await extendAppeal(faa, appeal.id, { reason: "Records are with the regional office." }, day(40));
    await expect(extendAppeal(faa, appeal.id, { reason: "Again" }, day(41))).rejects.toThrow(/extend/i);
    expect((await faaQueue(faa, day(70))).at(0)?.clock).toMatchObject({ state: "running", daysLeft: 6 });

    await decideAppeal(faa, appeal.id, { order: "The CPIO shall reply within 15 days." }, day(70));
    const view = await getAppealView(s.citizen, appeal.id, day(71));
    expect(view.appeal.status).toBe("appeal_decided");
    expect(view.clock).toMatchObject({ state: "met" });
    expect(view.secondAppealBy).toEqual(day(160));
    expect((await getCaseView(s.citizen, id, day(71))).timeline.map((e) => e.type)).toContain("appeal_decided");
    expect(outbox.at(-1)?.text).toMatch(/90 days/);
  });

  it("only the authority's FAA can decide", async () => {
    const { id } = await forwarded();
    const appeal = await fileAppeal(s.citizen, { requestId: id, ground: "No response within the time limit", body: "x" }, day(31));
    await expect(decideAppeal(await s.officer("MORLY", "faa"), appeal.id, { order: "x" }, day(32))).rejects.toThrow();
    await expect(decideAppeal(await s.officer("DOPPW", "cpio1"), appeal.id, { order: "x" }, day(32))).rejects.toThrow();
  });
});
