import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndPay } from "../helpers/flows";
import { forwardRequest } from "@/lib/services/nodal";
import { rejectRequest } from "@/lib/services/cpio";
import { fileAppeal } from "@/lib/services/appeals";
import { getCaseView } from "@/lib/services/views";
import { countWords } from "@/lib/rti/wordcount";
import { users } from "@/lib/db/schema";
import { outbox, clearOutbox } from "@/lib/email/send";
import type { Db } from "@/lib/db/client";

const day = (n: number) => new Date(Date.UTC(2026, 9, 8 + n, 10));

describe("spec success criteria", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
    s = await seeded(db);
  });

  it("#4: a 600-word Hindi request is saved intact and shows correctly in the email", async () => {
    const auth = await s.auth("DOPPW");
    const body = "मेरी पेंशन फ़ाइल की स्थिति अभी क्या है ".repeat(75).trim();
    expect(countWords(body)).toBe(600);
    const { id } = await fileAndPay(s.citizen, auth.id, day(0), { subject: "पेंशन फ़ाइल की स्थिति", body });
    const view = await getCaseView(s.citizen, id, day(0));
    expect(view.root.body).toBe(body);
    expect(outbox.at(-1)?.text).toContain("Subject: पेंशन फ़ाइल की स्थिति");
  });

  it("#6: a request split across 3 CPIOs is one case with 3 parts, each appealable", async () => {
    const auth = await s.auth("DOPPW");
    const [c3] = await db
      .insert(users)
      .values({ email: "team+doppw.cpio3@example.com", name: "CPIO (Section C), DOPPW", role: "cpio", authorityId: auth.id })
      .returning();
    const cpios = [await s.officer("DOPPW", "cpio1"), await s.officer("DOPPW", "cpio2"), c3];
    const { id, regNo } = await fileAndPay(s.citizen, auth.id, day(0));
    await forwardRequest(await s.officer("DOPPW", "nodal"), id, { cpioIds: cpios.map((c) => c.id) }, day(1));
    const view = await getCaseView(s.citizen, id, day(1));
    expect(view.parts.map((p) => p.regNo)).toEqual([1, 2, 3].map((n) => `${regNo}/${n}`));
    for (const [i, part] of view.parts.entries()) {
      await rejectRequest(cpios[i], part.id, { reason: "Not held" }, day(2));
      const appeal = await fileAppeal(s.citizen, { requestId: part.id, ground: "Any other ground", body: "x" }, day(3));
      expect(appeal.parentId).toBe(part.id);
    }
    expect((await getCaseView(s.citizen, id, day(3))).appeals).toHaveLength(3);
  });
});
