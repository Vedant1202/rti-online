import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { seed } from "@/scripts/seed-data";
import { seedDemo } from "@/scripts/demo-data";
import { requests } from "@/lib/db/schema";

describe("demo seed", () => {
  it("creates cases in every main state", async () => {
    const db = await createTestDb();
    await seed(db, { emailBase: "team@example.com" });
    await seedDemo(db, { emailBase: "team@example.com", now: new Date("2026-12-01T10:00:00Z") });
    const statuses = new Set((await db.select().from(requests)).map((r) => r.status));
    for (const s of ["replied", "fee_requested", "forwarded", "transferred", "filed", "split", "rejected", "appeal_decided"]) {
      expect(statuses).toContain(s);
    }
  });
});
