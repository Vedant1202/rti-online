import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndForward } from "../helpers/flows";
import { runReminders } from "@/lib/services/reminders";
import { replyToRequest } from "@/lib/services/cpio";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const day = (n: number) => new Date(Date.UTC(2026, 9, 8 + n, 4));

describe("daily reminders", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  async function setup() {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    const filed = await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), cpio, day(0));
    clearOutbox();
    return { ...filed, cpio };
  }

  it("reminds the CPIO 3 days before the reply is due, once", async () => {
    const { cpio } = await setup();
    expect(await runReminders(day(20))).toMatchObject({ sent: 0 });
    await runReminders(day(27));
    expect(outbox.map((m) => m.to)).toEqual([cpio.email]);
    expect(outbox[0].subject).toMatch(/due in/i);
    await runReminders(day(28));
    expect(outbox).toHaveLength(1);
  });

  it("tells the CPIO and the citizen when the reply is overdue (appeal opens)", async () => {
    const { cpio } = await setup();
    await runReminders(day(31));
    const to = outbox.map((m) => m.to).sort();
    expect(to).toContain(cpio.email);
    expect(to).toContain(s.citizen.email);
    expect(outbox.find((m) => m.to === s.citizen.email)?.text).toMatch(/first appeal/i);
  });

  it("warns the citizen 5 days before the appeal window closes, unless they appealed", async () => {
    const { id, cpio } = await setup();
    await replyToRequest(cpio, id, { body: "Here you go" }, day(5));
    clearOutbox();
    await runReminders(day(30)); // window closes day 35
    expect(outbox.filter((m) => m.to === s.citizen.email && /appeal/i.test(m.subject))).toHaveLength(1);
    await runReminders(day(31));
    expect(outbox).toHaveLength(1);
  });
});
