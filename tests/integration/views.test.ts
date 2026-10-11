import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndPay } from "../helpers/flows";
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
});
