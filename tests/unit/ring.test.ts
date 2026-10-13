import { describe, it, expect } from "vitest";
import { ringGeometry } from "@/lib/ring";

describe("ringGeometry", () => {
  const C = 2 * Math.PI * 40;

  it("is empty with no days left and full with all of them", () => {
    expect(ringGeometry(0, 30, 40)).toEqual({ circumference: C, offset: C, fraction: 0 });
    expect(ringGeometry(30, 30, 40)).toEqual({ circumference: C, offset: 0, fraction: 1 });
  });

  it("is half full at 15 of 30 days, and a sliver at 1 day", () => {
    expect(ringGeometry(15, 30, 40).offset).toBeCloseTo(C / 2);
    expect(ringGeometry(1, 30, 40).fraction).toBeCloseTo(1 / 30);
  });

  it("stays between empty and full", () => {
    expect(ringGeometry(45, 30, 40).fraction).toBe(1);
    expect(ringGeometry(-3, 30, 40).fraction).toBe(0);
  });
});
