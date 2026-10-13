import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { seed } from "@/scripts/seed-data";
import { authorities, users } from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";
import authorityData from "@/data/authorities.json";

describe("seed", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("loads at least 20 central authorities across at least 10 ministries, keeping the original 4", async () => {
    await seed(db, { emailBase: "team@example.com" });
    const auths = await db.select().from(authorities);
    expect(auths.length).toBeGreaterThanOrEqual(20);
    expect(new Set(auths.map((a) => a.ministry)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(auths.map((a) => a.code)).size).toBe(auths.length);
    expect(auths.map((a) => a.code)).toEqual(expect.arrayContaining(["DOPAT", "DOPPW", "MHOME", "MORLY"]));
  });

  it("gives every authority 1 nodal officer, 2 CPIOs and 1 FAA", async () => {
    await seed(db, { emailBase: "team@example.com" });
    const auths = await db.select().from(authorities);
    for (const a of auths) {
      const officers = await db.select().from(users).where(eq(users.authorityId, a.id));
      const roles = officers.map((o) => o.role).sort();
      expect(roles).toEqual(["cpio", "cpio", "faa", "nodal"]);
    }
  });

  it("uses plus-addresses of the team email for officers", async () => {
    await seed(db, { emailBase: "team@example.com" });
    const [nodal] = await db.select().from(users).where(eq(users.email, "team+dopat.nodal@example.com"));
    expect(nodal?.role).toBe("nodal");
  });

  it("is safe to run twice", async () => {
    await seed(db, { emailBase: "team@example.com" });
    await seed(db, { emailBase: "team@example.com" });
    expect(await db.select().from(authorities)).toHaveLength(authorityData.length);
    expect(await db.select().from(users)).toHaveLength(authorityData.length * 4 + 1); // 4 officers each + 1 admin
  });
});
