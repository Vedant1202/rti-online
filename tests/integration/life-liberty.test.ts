import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndForward } from "../helpers/flows";
import { decideLifeLiberty } from "@/lib/services/life-liberty";
import { getCaseView } from "@/lib/services/views";
import type { Db } from "@/lib/db/client";

const t0 = new Date("2026-10-08T10:00:00Z");
const hours = (h: number) => new Date(t0.getTime() + h * 3_600_000);

describe("life-or-liberty claim (s.7(1) proviso)", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  async function setup() {
    const auth = await s.auth("MHOME");
    const cpio = await s.officer("MHOME", "cpio1");
    const filed = await fileAndForward(s.citizen, auth.id, await s.officer("MHOME", "nodal"), cpio, t0, {
      lifeLibertyReason: "My brother has been detained since 2 Oct without being told the grounds.",
    });
    return { ...filed, cpio };
  }

  it("records the claim on the timeline when filed, with the normal 30 days until decided", async () => {
    const { id } = await setup();
    const view = await getCaseView(s.citizen, id, hours(1));
    expect(view.timeline.map((e) => e.type)).toContain("life_liberty_claimed");
    expect(view.clocks.reply).toMatchObject({ state: "running", daysLeft: 30 });
  });

  it("accepting switches to a 48-hour clock", async () => {
    const { id, cpio } = await setup();
    await decideLifeLiberty(cpio, id, { accept: true, reason: "Concerns personal liberty of a detainee." }, hours(2));
    expect((await getCaseView(s.citizen, id, hours(3))).clocks.reply).toMatchObject({ state: "running", daysLeft: 2 });
    expect((await getCaseView(s.citizen, id, hours(49))).clocks.reply).toMatchObject({ state: "overdue" });
  });

  it("declining keeps 30 days and records why", async () => {
    const { id, cpio } = await setup();
    await decideLifeLiberty(cpio, id, { accept: false, reason: "No imminent threat shown." }, hours(2));
    const view = await getCaseView(s.citizen, id, hours(49));
    expect(view.clocks.reply).toMatchObject({ state: "running", daysLeft: 28 });
    expect(view.timeline.at(-1)).toMatchObject({ type: "life_liberty_declined", payload: { reason: "No imminent threat shown." } });
  });

  it("needs a reason and can only be decided once", async () => {
    const { id, cpio } = await setup();
    await expect(decideLifeLiberty(cpio, id, { accept: true, reason: " " }, hours(2))).rejects.toThrow();
    await decideLifeLiberty(cpio, id, { accept: true, reason: "Liberty" }, hours(2));
    await expect(decideLifeLiberty(cpio, id, { accept: false, reason: "Changed" }, hours(3))).rejects.toThrow();
  });
});
