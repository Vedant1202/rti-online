import { describe, it, expect } from "vitest";
import { createSessionToken, readSessionToken } from "@/lib/auth/session";

describe("session token", () => {
  it("round-trips the user id and role", async () => {
    const token = await createSessionToken({ id: "1f0c7c2e-0000-4000-8000-000000000001", role: "cpio" });
    expect(await readSessionToken(token)).toEqual({
      userId: "1f0c7c2e-0000-4000-8000-000000000001",
      role: "cpio",
    });
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({ id: "1f0c7c2e-0000-4000-8000-000000000001", role: "citizen" });
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "x", role: "admin" })).toString("base64url");
    expect(await readSessionToken(`${h}.${forged}.${s}`)).toBeNull();
  });
});
