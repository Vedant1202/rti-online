import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { seed } from "@/scripts/seed-data";
import { authorities, users } from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

describe("seed", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("loads 4 authorities, each with 1 nodal officer, 2 CPIOs and 1 FAA", async () => {
    await seed(db, { emailBase: "team@example.com" });
    const auths = await db.select().from(authorities);
    expect(auths.map((a) => a.code).sort()).toEqual(["DOPAT", "DOPPW", "MHOME", "MORLY"]);
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
    expect(await db.select().from(authorities)).toHaveLength(4);
    expect(await db.select().from(users)).toHaveLength(17); // 16 officers + 1 admin
  });
});
