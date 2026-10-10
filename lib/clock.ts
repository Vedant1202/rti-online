/**
 * The app's notion of "now". End-to-end tests move time forward through a test-only offset
 * (see app/api/test/clock); in production the offset is always zero.
 */
let offsetMs = 0;

export async function getNow(): Promise<Date> {
  return new Date(Date.now() + offsetMs);
}

export function setClockOffsetForTests(ms: number) {
  offsetMs = ms;
}
