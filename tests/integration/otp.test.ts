import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { sendOtp, verifyOtp } from "@/lib/auth/otp";
import { outbox, clearOutbox } from "@/lib/email/send";
import { users } from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

const EMAIL = "citizen@example.com";
const t0 = new Date("2026-10-08T10:00:00Z");
const plus = (min: number) => new Date(t0.getTime() + min * 60_000);

function lastCode(): string {
  const msg = outbox.at(-1);
  const match = msg?.text.match(/\b(\d{6})\b/);
  if (!match) throw new Error("no code in outbox");
  return match[1];
}

describe("email OTP", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    clearOutbox();
  });

  it("emails a 6-digit code and signs in a new citizen", async () => {
    const sent = await sendOtp(EMAIL, t0);
    expect(sent.ok).toBe(true);
    expect(outbox.at(-1)?.to).toBe(EMAIL);
    const result = await verifyOtp(EMAIL, lastCode(), plus(1));
    expect(result.ok && result.user.role).toBe("citizen");
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("stores only a hash of the code", async () => {
    await sendOtp(EMAIL, t0);
    const rows = await db.query.otps.findMany();
    expect(rows[0].codeHash).not.toContain(lastCode());
    expect(rows[0].codeHash).toHaveLength(64);
  });

  it("rejects a code after 10 minutes", async () => {
    await sendOtp(EMAIL, t0);
    const r = await verifyOtp(EMAIL, lastCode(), plus(10.5));
    expect(r).toEqual({ ok: false, error: "expired" });
  });

  it("rejects a code that was already used", async () => {
    await sendOtp(EMAIL, t0);
    const code = lastCode();
    expect((await verifyOtp(EMAIL, code, plus(1))).ok).toBe(true);
    expect(await verifyOtp(EMAIL, code, plus(2))).toEqual({ ok: false, error: "invalid" });
  });

  it("locks after 5 wrong attempts, even if the right code comes next", async () => {
    await sendOtp(EMAIL, t0);
    const code = lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) {
      expect(await verifyOtp(EMAIL, wrong, plus(1))).toEqual({ ok: false, error: "invalid" });
    }
    expect(await verifyOtp(EMAIL, wrong, plus(1))).toEqual({ ok: false, error: "locked" });
    expect(await verifyOtp(EMAIL, code, plus(1))).toEqual({ ok: false, error: "locked" });
  });

  it("allows at most 3 sends per 15 minutes per email", async () => {
    for (let i = 0; i < 3; i++) expect((await sendOtp(EMAIL, plus(i))).ok).toBe(true);
    expect(await sendOtp(EMAIL, plus(4))).toEqual({ ok: false, error: "rate_limited" });
    expect((await sendOtp(EMAIL, plus(16))).ok).toBe(true);
  });

  it("only accepts the newest code", async () => {
    await sendOtp(EMAIL, t0);
    const first = lastCode();
    await sendOtp(EMAIL, plus(1));
    const second = lastCode();
    if (first !== second) {
      expect(await verifyOtp(EMAIL, first, plus(2))).toEqual({ ok: false, error: "invalid" });
    }
    expect((await verifyOtp(EMAIL, second, plus(2))).ok).toBe(true);
  });
});
