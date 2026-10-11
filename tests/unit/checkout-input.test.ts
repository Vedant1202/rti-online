import { describe, it, expect } from "vitest";
import { checkoutInput } from "@/lib/contract";

describe("checkout input", () => {
  it("accepts only brand and last 4", () => {
    expect(checkoutInput.parse({ brand: "visa", last4: "4242" })).toEqual({ brand: "visa", last4: "4242" });
  });

  it("rejects a full card number, CVC or expiry if a client ever sends one", () => {
    for (const extra of [{ number: "4242424242424242" }, { cvc: "123" }, { expiry: "12/30" }]) {
      expect(() => checkoutInput.parse({ brand: "visa", last4: "4242", ...extra })).toThrow();
    }
    expect(() => checkoutInput.parse({ brand: "visa", last4: "424242" })).toThrow();
  });
});
