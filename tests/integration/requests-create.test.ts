import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { PDF, seeded } from "../helpers/fixtures";
import { saveUpload } from "@/lib/services/uploads";
import { createRequest } from "@/lib/services/requests";
import { authorities } from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

const now = new Date("2026-10-08T10:00:00Z");

describe("uploads", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  it("accepts a PDF up to 1 MB", async () => {
    const doc = await saveUpload(s.citizen, { filename: "letter.pdf", bytes: PDF, kind: "attachment" });
    expect(doc.sizeBytes).toBe(PDF.length);
  });

  it("rejects files that aren't PDFs", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await expect(saveUpload(s.citizen, { filename: "x.pdf", bytes: png, kind: "attachment" })).rejects.toThrow(
      /PDF/,
    );
  });

  it("rejects files over 1 MB", async () => {
    const big = new Uint8Array(1_000_001);
    big.set(PDF);
    await expect(saveUpload(s.citizen, { filename: "big.pdf", bytes: big, kind: "attachment" })).rejects.toThrow(
      /1 MB/,
    );
  });
});

describe("createRequest", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });

  const hindi = "कृपया मेरी पेंशन फ़ाइल की स्थिति बताएं। ".repeat(100); // 700 words

  it("saves a long Hindi request as pending payment", async () => {
    const auth = await s.auth("DOPPW");
    const req = await createRequest(s.citizen, { authorityId: auth.id, subject: "पेंशन स्थिति", body: hindi, bpl: false }, now);
    expect(req.status).toBe("pending_payment");
    expect(req.regNo).toBeNull();
    expect(req.body).toBe(hindi.trim());
  });

  it("links an attachment the citizen uploaded", async () => {
    const auth = await s.auth("DOPPW");
    const doc = await saveUpload(s.citizen, { filename: "ppo.pdf", bytes: PDF, kind: "attachment" });
    const req = await createRequest(
      s.citizen,
      { authorityId: auth.id, subject: "Pension", body: "Status of PPO 4471", bpl: false, attachmentId: doc.id },
      now,
    );
    const linked = await db.query.documents.findFirst({ where: (d, { eq }) => eq(d.id, doc.id) });
    expect(linked?.requestId).toBe(req.id);
  });

  it("refuses someone else's attachment", async () => {
    const auth = await s.auth("DOPPW");
    const doc = await saveUpload(s.other, { filename: "x.pdf", bytes: PDF, kind: "attachment" });
    await expect(
      createRequest(s.citizen, { authorityId: auth.id, subject: "x", body: "y", bpl: false, attachmentId: doc.id }, now),
    ).rejects.toThrow(/attachment/i);
  });

  it("requires a BPL certificate when BPL is declared", async () => {
    const auth = await s.auth("DOPPW");
    await expect(
      createRequest(s.citizen, { authorityId: auth.id, subject: "x", body: "y", bpl: true }, now),
    ).rejects.toThrow(/certificate/i);
  });

  it("refuses non-central authorities", async () => {
    const [state] = await db
      .insert(authorities)
      .values({ code: "MHSTA", name: "State body", ministry: "State", isCentral: false })
      .returning();
    await expect(
      createRequest(s.citizen, { authorityId: state.id, subject: "x", body: "y", bpl: false }, now),
    ).rejects.toThrow(/central/i);
  });

  it("records a life-or-liberty claim only with a justification", async () => {
    const auth = await s.auth("MHOME");
    const req = await createRequest(
      s.citizen,
      { authorityId: auth.id, subject: "Detention", body: "Grounds of detention", bpl: false, lifeLibertyReason: "My brother is detained since 2 Oct" },
      now,
    );
    expect(req.lifeLiberty).toBe("claimed");
  });

  it("only citizens can file", async () => {
    const auth = await s.auth("DOPPW");
    const cpio = await s.officer("DOPPW", "cpio1");
    await expect(
      createRequest(cpio, { authorityId: auth.id, subject: "x", body: "y", bpl: false }, now),
    ).rejects.toThrow(/citizen/i);
  });
});
