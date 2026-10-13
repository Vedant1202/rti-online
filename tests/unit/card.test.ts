import { en } from "@/lib/i18n/en";
import { describe, it, expect } from "vitest";
import {
  detectBrand,
  formatCardNumber,
  formatExpiry,
  luhnValid,
  validateCard,
  isDeclined,
  SAVED_CARDS,
} from "@/lib/card";

const now = new Date("2026-10-11T10:00:00Z");
const ok = { number: "4242 4242 4242 4242", expiry: "12/30", cvc: "123", name: "Asha Sharma" };

describe("detectBrand", () => {
  it("detects each supported brand from its first digits", () => {
    expect(detectBrand("4")).toBe("visa");
    expect(detectBrand("51")).toBe("mastercard");
    expect(detectBrand("55")).toBe("mastercard");
    expect(detectBrand("2221")).toBe("mastercard");
    expect(detectBrand("2720")).toBe("mastercard");
    expect(detectBrand("34")).toBe("amex");
    expect(detectBrand("37")).toBe("amex");
    expect(detectBrand("60")).toBe("rupay");
    expect(detectBrand("65")).toBe("rupay");
    expect(detectBrand("81")).toBe("rupay");
    expect(detectBrand("508")).toBe("rupay");
  });

  it("returns null until a brand is identifiable, or for unknown prefixes", () => {
    expect(detectBrand("")).toBeNull();
    expect(detectBrand("2")).toBeNull();
    expect(detectBrand("2721")).toBeNull();
    expect(detectBrand("9")).toBeNull();
  });
});

describe("formatting", () => {
  it("groups digits 4-4-4-4, or 4-6-5 for American Express", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("4242-4242 42abc")).toBe("4242 4242 42");
  });

  it("caps length per brand", () => {
    expect(formatCardNumber("42424242424242424242424")).toBe("4242 4242 4242 4242 424");
    expect(formatCardNumber("3782822463100059999")).toBe("3782 822463 10005");
  });

  it("formats expiry as MM/YY while typing", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12/");
    expect(formatExpiry("1230")).toBe("12/30");
    expect(formatExpiry("12/305")).toBe("12/30");
    expect(formatExpiry("9")).toBe("09/");
  });
});

describe("luhnValid", () => {
  it("accepts valid checksums and rejects invalid ones", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("5555555555554444")).toBe(true);
    expect(luhnValid("378282246310005")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
  });
});

describe("validateCard", () => {
  it("accepts a complete valid card and returns brand and last 4", () => {
    expect(validateCard(ok, now)).toEqual({ valid: true, errors: {}, brand: "visa", last4: "4242" });
  });

  it("gives a specific message for each problem", () => {
    expect(validateCard({ ...ok, number: "4242 4242 4242 4241" }, now).errors.number).toMatch(/isn't valid/);
    expect(validateCard({ ...ok, number: "4242 4242" }, now).errors.number).toMatch(/incomplete/);
    expect(validateCard({ ...ok, number: "9999 9999 9999 9999" }, now).errors.number).toMatch(/Visa, Mastercard, RuPay/);
    expect(validateCard({ ...ok, expiry: "09/26" }, now).errors.expiry).toMatch(/expired/);
    expect(validateCard({ ...ok, expiry: "13/30" }, now).errors.expiry).toMatch(/month/);
    expect(validateCard({ ...ok, expiry: "12/50" }, now).errors.expiry).toMatch(/year/);
    expect(validateCard({ ...ok, cvc: "12" }, now).errors.cvc).toMatch(/3 digits/);
    expect(validateCard({ ...ok, number: "3782 822463 10005", cvc: "123" }, now).errors.cvc).toMatch(/4 digits/);
    expect(validateCard({ ...ok, name: " " }, now).errors.name).toMatch(/name/);
  });

  it("uses the messages it's given, so the checkout can show them in Hindi", () => {
    const messages = { ...en.card.errors, numberInvalid: "कार्ड नंबर सही नहीं है।", cvcBack: "कार्ड के पीछे के {n} अंक लिखें।" };
    const r = validateCard({ ...ok, number: "4242 4242 4242 4241", cvc: "1" }, now, messages);
    expect(r.errors.number).toBe("कार्ड नंबर सही नहीं है।");
    expect(r.errors.cvc).toBe("कार्ड के पीछे के 3 अंक लिखें।");
  });

  it("accepts a card expiring this month", () => {
    expect(validateCard({ ...ok, expiry: "10/26" }, now).valid).toBe(true);
  });
});

describe("saved cards and the declined number", () => {
  it("has two valid saved cards", () => {
    expect(SAVED_CARDS).toHaveLength(2);
    for (const c of SAVED_CARDS) expect(validateCard(c, now).valid).toBe(true);
    expect(SAVED_CARDS.map((c) => detectBrand(c.number))).toEqual(["visa", "mastercard"]);
  });

  it("recognises the number that is always declined", () => {
    expect(validateCard({ ...ok, number: "4000 0000 0000 0002" }, now).valid).toBe(true);
    expect(isDeclined("4000 0000 0000 0002")).toBe(true);
    expect(isDeclined(ok.number)).toBe(false);
  });
});
