import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { saveDraft, loadDraft } from "@/lib/services/drafts";
import { createRequest } from "@/lib/services/requests";
import type { Db } from "@/lib/db/client";

const now = new Date("2026-10-08T10:00:00Z");

describe("drafts", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  it("saves and restores the latest draft for the citizen only", async () => {
    await saveDraft(s.citizen, { subject: "Pen", body: "Draft one" }, now);
    await saveDraft(s.citizen, { subject: "Pension", body: "Draft two" }, now);
    expect((await loadDraft(s.citizen))?.payload).toEqual({ subject: "Pension", body: "Draft two" });
    expect(await loadDraft(s.other)).toBeNull();
  });

  it("is deleted once the request is filed", async () => {
    const auth = await s.auth("DOPPW");
    await saveDraft(s.citizen, { subject: "Pension", body: "x" }, now);
    await createRequest(s.citizen, { authorityId: auth.id, subject: "Pension", body: "x", bpl: false }, now);
    expect(await loadDraft(s.citizen)).toBeNull();
  });

  it("only citizens have drafts", async () => {
    await expect(saveDraft(await s.officer("DOPPW", "cpio1"), { a: 1 }, now)).rejects.toThrow();
  });
});
