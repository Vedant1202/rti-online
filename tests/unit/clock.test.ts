import { describe, it, expect, afterEach } from "vitest";
import { getNow, setClockOffset, testClockEnabled } from "@/lib/clock";

describe("test clock", () => {
  afterEach(() => {
    delete process.env.E2E_CLOCK;
    delete process.env.VERCEL;
  });

  it("is off by default and refuses to move", async () => {
    expect(testClockEnabled()).toBe(false);
    expect(() => setClockOffset(1000)).toThrow();
    expect(Math.abs((await getNow()).getTime() - Date.now())).toBeLessThan(1000);
  });

  it("stays off on Vercel even if E2E_CLOCK is set", () => {
    process.env.E2E_CLOCK = "true";
    process.env.VERCEL = "1";
    expect(testClockEnabled()).toBe(false);
  });

  it("moves time when enabled", async () => {
    process.env.E2E_CLOCK = "true";
    setClockOffset(2 * 86_400_000);
    expect((await getNow()).getTime() - Date.now()).toBeGreaterThan(86_400_000 * 1.9);
    setClockOffset(0);
  });
});
