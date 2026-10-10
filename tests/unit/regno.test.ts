import { describe, it, expect } from "vitest";
import { formatRegNo, parseRegNo, splitRegNo } from "@/lib/rti/regno";

describe("registration numbers (manual p.29 format)", () => {
  it("formats AUTHCODE/R|A/receipt/YY/NNNNN", () => {
    expect(
      formatRegNo({ authorityCode: "DOPAT", kind: "R", receipt: "E", year: 2026, serial: 412 }),
    ).toBe("DOPAT/R/E/26/00412");
    expect(
      formatRegNo({ authorityCode: "MHOME", kind: "A", receipt: "T", year: 2031, serial: 1 }),
    ).toBe("MHOME/A/T/31/00001");
  });

  it("rejects serials that don't fit in 5 digits", () => {
    expect(() =>
      formatRegNo({ authorityCode: "DOPAT", kind: "R", receipt: "E", year: 2026, serial: 100_000 }),
    ).toThrow();
  });

  it("appends /n for split parts", () => {
    expect(splitRegNo("DOPAT/R/E/26/00412", 2)).toBe("DOPAT/R/E/26/00412/2");
  });

  it("parses numbers, including split parts", () => {
    expect(parseRegNo("DOPAT/R/E/26/00412")).toEqual({
      authorityCode: "DOPAT",
      kind: "R",
      receipt: "E",
      year: 2026,
      serial: 412,
      part: null,
    });
    expect(parseRegNo("DOPAT/R/E/26/00412/3")?.part).toBe(3);
    expect(parseRegNo("not a number")).toBeNull();
    expect(parseRegNo("DOPAT/Z/E/26/00412")).toBeNull();
  });
});
