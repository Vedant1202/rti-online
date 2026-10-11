import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndForward } from "../helpers/flows";
import { replyToRequest } from "@/lib/services/cpio";
import { authorityStats } from "@/lib/stats";
import type { Db } from "@/lib/db/client";

const day = (n: number) => new Date(Date.UTC(2026, 9, 8 + n, 10));

describe("public reply-time stats", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  it("gives median reply days and % overdue per authority over 90 days, without personal data", async () => {
    const auth = await s.auth("DOPPW");
    const nodal = await s.officer("DOPPW", "nodal");
    const cpio = await s.officer("DOPPW", "cpio1");
    const a = await fileAndForward(s.citizen, auth.id, nodal, cpio, day(0), { subject: "A" });
    const b = await fileAndForward(s.citizen, auth.id, nodal, cpio, day(0), { subject: "B" });
    await fileAndForward(s.citizen, auth.id, nodal, cpio, day(0), { subject: "C" }); // never answered
    await replyToRequest(cpio, a.id, { body: "ok" }, day(10));
    await replyToRequest(cpio, b.id, { body: "late" }, day(40));

    const stats = await authorityStats(day(45));
    const row = stats.find((r) => r.code === "DOPPW")!;
    expect(row).toMatchObject({ total: 3, answered: 2, medianDays: 25, overduePct: 67 });
    expect(Object.keys(row).sort()).toEqual(["answered", "code", "medianDays", "ministry", "name", "overduePct", "total"]);
    expect(stats.find((r) => r.code === "MORLY")).toMatchObject({ total: 0, medianDays: null, overduePct: null });
  });

  it("ignores requests filed more than 90 days ago", async () => {
    const auth = await s.auth("DOPPW");
    await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), await s.officer("DOPPW", "cpio1"), day(0));
    expect((await authorityStats(day(91))).find((r) => r.code === "DOPPW")?.total).toBe(0);
  });
});
