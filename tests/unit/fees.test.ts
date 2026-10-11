import { describe, it, expect } from "vitest";
import { feeTotalPaise, formatRupees } from "@/lib/rti/fees";

describe("fees", () => {
  it("sums line items in paise (Rule 4: ₹2 per page)", () => {
    expect(
      feeTotalPaise([
        { label: "Photocopies (A4)", quantity: 12, unitPaise: 200 },
        { label: "Postage above ₹50", quantity: 1, unitPaise: 0 },
      ]),
    ).toBe(2400);
  });

  it("formats rupees without trailing zeros", () => {
    expect(formatRupees(1000)).toBe("₹10");
    expect(formatRupees(2450)).toBe("₹24.50");
    expect(formatRupees(0)).toBe("₹0");
  });
});
