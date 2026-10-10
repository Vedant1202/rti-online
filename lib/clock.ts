/**
 * The app's notion of "now". End-to-end tests move time forward through a test-only offset
 * (see app/api/test/clock), enabled only when E2E_CLOCK=true and never on Vercel.
 * Kept on globalThis so route handlers and pages (bundled separately) share it.
 */
const g = globalThis as unknown as { __rtiClockOffsetMs?: number };

export function testClockEnabled(): boolean {
  return process.env.E2E_CLOCK === "true" && !process.env.VERCEL;
}

export async function getNow(): Promise<Date> {
  const offset = testClockEnabled() ? (g.__rtiClockOffsetMs ?? 0) : 0;
  return new Date(Date.now() + offset);
}

export function setClockOffset(ms: number) {
  if (!testClockEnabled()) throw new Error("The test clock is disabled.");
  g.__rtiClockOffsetMs = ms;
}
