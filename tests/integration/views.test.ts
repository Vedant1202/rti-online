import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndForward, fileAndPay } from "../helpers/flows";
import { createRequest } from "@/lib/services/requests";
import { forwardRequest } from "@/lib/services/nodal";
import { requestFee } from "@/lib/services/cpio-extra";
import { replyToRequest } from "@/lib/services/cpio";
import { getCaseView, listCitizenRequests } from "@/lib/services/views";
import type { Db } from "@/lib/db/client";

const t0 = new Date("2026-10-08T10:00:00Z");
const later = new Date("2026-10-10T10:00:00Z");

describe("case view", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  it("shows the filed event, the due date and days left", async () => {
    const auth = await s.auth("DOPPW");
    const { id, regNo } = await fileAndPay(s.citizen, auth.id, t0);
    const view = await getCaseView(s.citizen, id, later);
    expect(view.current.regNo).toBe(regNo);
    expect(view.timeline.map((e) => e.type)).toEqual(["filed"]);
    expect(view.clocks.reply).toMatchObject({ state: "running", daysLeft: 28 });
  });

  it("is visible to officers of the authority but not to other citizens or other authorities", async () => {
    const auth = await s.auth("DOPPW");
    const { id } = await fileAndPay(s.citizen, auth.id, t0);
    await expect(getCaseView(s.other, id, later)).rejects.toThrow();
    await expect(getCaseView(await s.officer("MORLY", "nodal"), id, later)).rejects.toThrow();
    expect((await getCaseView(await s.officer("DOPPW", "nodal"), id, later)).current.id).toBe(id);
  });

  it("lists a citizen's requests, newest first, with status and days left", async () => {
    const pension = await s.auth("DOPPW");
    const rail = await s.auth("MORLY");
    await fileAndPay(s.citizen, pension.id, t0, { subject: "First" });
    await fileAndPay(s.citizen, rail.id, new Date("2026-10-09T10:00:00Z"), { subject: "Second" });
    await fileAndPay(s.other, rail.id, t0, { subject: "Not mine" });
    const list = await listCitizenRequests(s.citizen, later);
    expect(list.map((r) => r.subject)).toEqual(["Second", "First"]);
    expect(list[0]).toMatchObject({ status: "filed", reply: { state: "running", daysLeft: 29 } });
  });

  it("gives each listed request the citizen's next action", async () => {
    const pension = await s.auth("DOPPW");
    const unpaid = await createRequest(s.citizen, { authorityId: pension.id, subject: "Unpaid", body: "PPO 4471 status.", bpl: false }, t0);
    const cpio = await s.officer("DOPPW", "cpio1");
    const withFee = await fileAndForward(s.citizen, pension.id, await s.officer("DOPPW", "nodal"), cpio, t0, { subject: "Fee" });
    await requestFee(cpio, withFee.id, { items: [{ label: "Pages", quantity: 12, unitPaise: 200 }] }, later);
    const quiet = await fileAndPay(s.citizen, pension.id, t0, { subject: "Quiet" });

    const list = await listCitizenRequests(s.citizen, later);
    const bySubject = Object.fromEntries(list.map((r) => [r.subject, r.actions]));
    expect(bySubject.Unpaid).toEqual([{ kind: "pay_fee", requestId: unpaid.id, amountPaise: 1000, href: `/requests/${unpaid.id}/pay` }]);
    expect(bySubject.Fee).toEqual([{ kind: "pay_additional", requestId: withFee.id, amountPaise: 2400, href: `/requests/${withFee.id}/pay` }]);
    expect(bySubject.Quiet).toEqual([]);
    expect(quiet.id).toBeTruthy();
  });

  it("collects actions from the parts of a split request", async () => {
    const pension = await s.auth("DOPPW");
    const { id } = await fileAndPay(s.citizen, pension.id, t0, { subject: "Split" });
    const [c1, c2] = [await s.officer("DOPPW", "cpio1"), await s.officer("DOPPW", "cpio2")];
    await forwardRequest(await s.officer("DOPPW", "nodal"), id, { cpioIds: [c1.id, c2.id] }, t0);
    const view = await getCaseView(s.citizen, id, later);
    const part2 = view.parts.find((p) => p.assignedCpioId === c2.id)!;
    const part1 = view.parts.find((p) => p.assignedCpioId === c1.id)!;
    await requestFee(c2, part2.id, { items: [{ label: "CD", quantity: 1, unitPaise: 5000 }] }, later);
    await replyToRequest(c1, part1.id, { body: "Here is the information." }, later);

    const [item] = await listCitizenRequests(s.citizen, later);
    expect(item.actions.map((a) => [a.kind, a.requestId])).toEqual([
      ["read_reply", part1.id],
      ["pay_additional", part2.id],
    ]);
  });
});
