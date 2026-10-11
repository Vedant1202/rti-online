import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { fileAndForward } from "../helpers/flows";
import { rejectRequest } from "@/lib/services/cpio";
import { fileAppeal, decideAppeal } from "@/lib/services/appeals";
import { buildCaseBundle } from "@/lib/services/bundle";
import type { Db } from "@/lib/db/client";

const day = (n: number) => new Date(Date.UTC(2026, 9, 8 + n, 10));

describe("second-appeal case bundle", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  it("includes the request, rejection, appeal, order and the 90-day CIC deadline, Hindi intact", async () => {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    const { id, regNo } = await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), cpio, day(0), {
      subject: "पेंशन <स्थिति>",
      body: "मेरी पेंशन फ़ाइल की स्थिति बताएं",
    });
    await rejectRequest(cpio, id, { reason: "Exempt under 8(1)(j)" }, day(5));
    const appeal = await fileAppeal(s.citizen, { requestId: id, ground: "Refused access to information requested", body: "Not personal info" }, day(6));
    await decideAppeal(await s.officer("DOPPW", "faa"), appeal.id, { order: "Rejection upheld." }, day(20));

    const { filename, html } = await buildCaseBundle(s.citizen, appeal.id, day(21));
    expect(filename).toBe("case-bundle-DOPPW-A-E-26-00001.html");
    for (const text of [regNo, appeal.regNo!, "मेरी पेंशन फ़ाइल की स्थिति बताएं", "Exempt under 8(1)(j)", "Not personal info", "Rejection upheld.", "26 Jan 2027"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("पेंशन &lt;स्थिति&gt;"); // escaped
    expect(html).not.toContain("<स्थिति>");
  });

  it("is only available to the applicant and the authority", async () => {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    const { id } = await fileAndForward(s.citizen, auth.id, await s.officer("DOPPW", "nodal"), cpio, day(0));
    await rejectRequest(cpio, id, { reason: "x" }, day(1));
    const appeal = await fileAppeal(s.citizen, { requestId: id, ground: "Any other ground", body: "y" }, day(2));
    await expect(buildCaseBundle(s.other, appeal.id, day(3))).rejects.toThrow();
  });
});
